import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { purchaseOrderUpdateSchema, uuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revertOrderBookingTransfer } from "./transfer/route";

const paramsSchema = z.object({
  id: uuidSchema
});

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);

    const supabase = await createApiSupabaseClient();
    const row = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select(
          "id, purchase_order_no, purchase_contract_no, country_id, country_branch_id, city_branch_id, supplier_company_id, companies(name), currency_code, exchange_rate, order_total, advance_paid, remaining_paid, credit_amount, remaining_due, payment_status, ledger_posting_status, form_data, created_at, updated_at"
        )
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    );

    authorizeApiScope(session, {
      resource: "purchases",
      action: "read",
      countryId: (row as any)?.country_id ?? null,
      countryBranchId: (row as any)?.country_branch_id ?? null,
      cityBranchId: (row as any)?.city_branch_id ?? null
    });

    return apiOk({ order: row });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);
    const body = purchaseOrderUpdateSchema.parse(await request.json());

    const supabase = await createApiSupabaseClient();
    const before = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select(
          "id, country_id, country_branch_id, city_branch_id, supplier_company_id, currency_code, exchange_rate, order_total, form_data"
        )
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    );

    authorizeApiScope(session, {
      resource: "purchases",
      action: "update",
      countryId: (before as any)?.country_id ?? null,
      countryBranchId: (before as any)?.country_branch_id ?? null,
      cityBranchId: (before as any)?.city_branch_id ?? null
    });

    const patch: Record<string, unknown> = {};
    if (body.supplierCompanyId !== undefined) patch.supplier_company_id = body.supplierCompanyId ?? null;
    if (body.purchaseContractNo !== undefined) patch.purchase_contract_no = body.purchaseContractNo?.trim() || null;
    if (body.currencyCode !== undefined) patch.currency_code = body.currencyCode;
    if (body.exchangeRate !== undefined) patch.exchange_rate = body.exchangeRate;
    if (body.orderTotal !== undefined) patch.order_total = body.orderTotal;
    if (body.formData !== undefined) patch.form_data = body.formData ?? null;
    if (body.ledgerPostingStatus !== undefined) {
      const s = String(body.ledgerPostingStatus).toLowerCase();
      patch.ledger_posting_status = s === "posted" ? "posted" : s === "cancelled" ? "cancelled" : "draft";
    }
    if (body.paymentStatus !== undefined) {
      const s = String(body.paymentStatus).toLowerCase();
      patch.payment_status = ["pending", "partial", "completed", "cancelled"].includes(s) ? s : "pending";
    }
    patch.updated_at = new Date().toISOString();

    const isAlreadyPosted = (before as any)?.ledger_posting_status === "posted";
    const shouldPost =
      (patch.ledger_posting_status === "posted" && !isAlreadyPosted) ||
      (isAlreadyPosted && (body.ledgerPostingStatus === "posted" || body.orderTotal !== undefined || body.formData !== undefined));

    if (shouldPost) {
      if (isAlreadyPosted) {
        patch.ledger_posting_status = "posted";
        const adminSupabase = createSupabaseAdminClient() as any;
        await revertOrderBookingTransfer(params.id, supabase, adminSupabase);
      }
      const orderId = params.id;
      const orderTotal = body.orderTotal !== undefined ? body.orderTotal : (before as any).order_total;
      const currencyCode = body.currencyCode !== undefined ? body.currencyCode : (before as any).currency_code;
      const exchangeRate = body.exchangeRate !== undefined ? body.exchangeRate : (before as any).exchange_rate;
      const formData = body.formData !== undefined ? body.formData : (before as any).form_data;
      
      const form = formData?.form ?? {};
      const advancePercent = Number(form.advancePercent ?? 10);
      const advanceAmount = (Number(orderTotal) * advancePercent) / 100;
      const remainingDue = Math.max(0, Number(orderTotal) - advanceAmount);
      const entryDate = form.advancePaymentDate || form.purchaseDate || new Date().toISOString().slice(0, 10);

      patch.advance_paid = advanceAmount;
      patch.remaining_due = remainingDue;
      patch.payment_status = remainingDue === 0 ? "completed" : advanceAmount > 0 ? "partial" : "pending";
      const debitLedgerId = await getLedgerIdByCode(supabase, form.purchaseAccountNo);
      const creditLedgerId = await getLedgerIdByCode(supabase, form.salesAccountNo);
      
      if (!debitLedgerId) {
        throw new Error(`Debit Ledger (Inventory) not found for account code: ${form.purchaseAccountNo}`);
      }
      if (!creditLedgerId) {
        throw new Error(`Credit Ledger (Supplier Payable) not found for account code: ${form.salesAccountNo}`);
      }

      // 1. Stage 1: Credit purchase entry: Debit Inventory, Credit Supplier Payable
      const { error: transferError } = await supabase.rpc("post_purchase_order_payment", {
        p_purchase_order_id: orderId,
        p_kind: "credit",
        p_entry_date: entryDate,
        p_amount: Number(orderTotal),
        p_currency_code: currencyCode || "USD",
        p_exchange_rate: Number(exchangeRate || 1),
        p_debit_ledger_id: debitLedgerId,
        p_credit_ledger_id: creditLedgerId,
        p_reference_no: body.purchaseContractNo || (before as any).purchase_contract_no || null,
        p_narration: `Booking Transfer for PO ${(before as any).purchase_order_no}${form.orderReportRemarks || form.remarks ? ` - ${form.orderReportRemarks || form.remarks}` : ""}`
      });

      if (transferError) {
        throw new Error(`Booking Transfer Ledger Entry failed: ${transferError.message}`);
      }
    }

    const updated = await requireSupabaseData(
      supabase.from("purchase_orders").update(patch).eq("id", params.id).select("id").single()
    );

    await writeAuditLog({
      action: "update",
      entityTable: "purchase_orders",
      entityId: (updated as any).id ?? params.id,
      before,
      after: patch,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiOk({ purchaseOrderId: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}

async function getLedgerIdByCode(supabase: any, code: string) {
  const lookup = String(code || "").trim();
  if (!lookup) return null;

  const { data, error } = await supabase
    .from("ledgers")
    .select("id")
    .eq("code", lookup)
    .is("deleted_at", null)
    .maybeSingle();
  if (!error && data?.id) return data.id;

  const { data: account } = await supabase
    .from("enterprise_accounts")
    .select("id, code, account_number, manual_reference_number, customer_number")
    .or(`code.eq.${lookup},account_number.eq.${lookup},manual_reference_number.eq.${lookup},customer_number.eq.${lookup}`)
    .is("deleted_at", null)
    .maybeSingle();

  if (!account?.id) return null;

  const { data: ledgerByAccount } = await supabase
    .from("ledgers")
    .select("id")
    .eq("enterprise_account_id", account.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (ledgerByAccount?.id) return ledgerByAccount.id;

  const accountCodes = [account.code, account.account_number, account.manual_reference_number, account.customer_number].filter(Boolean);
  if (!accountCodes.length) return null;

  const { data: ledgerByCode } = await supabase
    .from("ledgers")
    .select("id")
    .in("code", accountCodes)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return ledgerByCode?.id ?? null;
}

async function resolveOrCreateCashLedger(
  supabase: any,
  input: {
    cashAccountCode?: string;
    currencyCode: string;
    countryId: string | null;
    countryBranchId: string | null;
    cityBranchId: string | null;
    userId: string;
  }
) {
  const code = (input.cashAccountCode || "CASH-001").trim();
  
  // 1. Try to find ledger by code
  const ledgerId = await getLedgerIdByCode(supabase, code);
  if (ledgerId) return ledgerId;

  // 2. Try to find any active ledger containing "cash" (case insensitive)
  const { data: cashL } = await supabase
    .from("ledgers")
    .select("id")
    .ilike("name", "%cash%")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (cashL?.id) return cashL.id;

  // 3. Try to find any active ledger containing "bank" (case insensitive)
  const { data: bankL } = await supabase
    .from("ledgers")
    .select("id")
    .ilike("name", "%bank%")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (bankL?.id) return bankL.id;

  // 4. Create standard fallback Cash Account and Ledger
  const scope = input.cityBranchId 
    ? "city_branch" 
    : input.countryBranchId 
      ? "main_branch" 
      : "super_admin";

  const { data: existingAccount } = await supabase
    .from("enterprise_accounts")
    .select("id")
    .eq("code", "CASH-001")
    .is("deleted_at", null)
    .maybeSingle();

  let accountId = existingAccount?.id;

  if (!accountId) {
    // Generate serials and codes
    let branchCode = "BRANCH";
    let branchPrefix = "BR";
    let countryPrefix = "CT";

    if (input.cityBranchId) {
      const { data: cb } = await supabase
        .from("city_branches")
        .select("code, city_name")
        .eq("id", input.cityBranchId)
        .maybeSingle();
      if (cb) {
        branchCode = cb.code || cb.city_name || "CITY";
        branchPrefix = cb.city_name || cb.code || "CITY";
      }
    } else if (input.countryBranchId) {
      const { data: cb } = await supabase
        .from("country_branches")
        .select("code, name")
        .eq("id", input.countryBranchId)
        .maybeSingle();
      if (cb) {
        branchCode = cb.code || cb.name || "MAIN";
        branchPrefix = "MAIN";
      }
    }

    if (input.countryId) {
      const { data: c } = await supabase
        .from("countries")
        .select("name, iso2")
        .eq("id", input.countryId)
        .maybeSingle();
      if (c) {
        countryPrefix = c.name?.toLowerCase().includes("united arab emirates") ? "UAE" : (c.iso2 || "CT");
      }
    }

    // Count total enterprise accounts
    const { count: totalCount } = await supabase
      .from("enterprise_accounts")
      .select("id", { count: "exact", head: true });

    // Count branch-specific enterprise accounts
    let branchQuery = supabase
      .from("enterprise_accounts")
      .select("id", { count: "exact", head: true })
      .eq("scope", scope)
      .is("deleted_at", null);
    if (input.countryId) branchQuery = branchQuery.eq("country_id", input.countryId);
    if (input.countryBranchId) branchQuery = branchQuery.eq("country_branch_id", input.countryBranchId);
    if (input.cityBranchId) branchQuery = branchQuery.eq("city_branch_id", input.cityBranchId);
    const { count: branchCount } = await branchQuery;

    // Count country-specific enterprise accounts
    let countryQuery = supabase
      .from("enterprise_accounts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    if (input.countryId) countryQuery = countryQuery.eq("country_id", input.countryId);
    const { count: countryCount } = await countryQuery;

    const accountSerialNumber = Number(totalCount ?? 0) + 1;
    const branchAccountSequence = Number(branchCount ?? 0) + 1;
    const countrySerialNumber = `${countryPrefix.toUpperCase()}-${String(Number(countryCount ?? 0) + 1).padStart(6, "0")}`;
    const branchSerialNumber = `${countryPrefix.toUpperCase()}-${branchPrefix.slice(0, 3).toUpperCase()}-${String(branchAccountSequence).padStart(6, "0")}`;

    const { data: newAccount, error: accError } = await supabase
      .from("enterprise_accounts")
      .insert({
        scope,
        country_id: input.countryId,
        country_branch_id: input.countryBranchId,
        city_branch_id: input.cityBranchId,
        code: "CASH-001",
        account_number: "CASH-001",
        customer_number: "CUST-CASH-001",
        account_serial_number: accountSerialNumber,
        country_serial_number: countrySerialNumber,
        branch_serial_number: branchSerialNumber,
        branch_code: branchCode.slice(0, 6).toUpperCase(),
        branch_account_sequence: branchAccountSequence,
        name: "General Cash Account",
        kind: "asset",
        currency: input.currencyCode || "USD",
        status: "active",
        is_control_account: false,
        opening_balance: 0,
        current_balance: 0,
        creation_date: new Date().toISOString(),
        created_by: input.userId
      })
      .select("id")
      .single();

    if (accError) {
      console.error("Failed to create fallback cash enterprise account:", accError);
      throw new Error(`Failed to create fallback cash account: ${accError.message}`);
    }
    accountId = newAccount.id;
  }

  // Create the ledger record bound to this enterprise account
  const { data: newLedger, error: ledgerError } = await supabase
    .from("ledgers")
    .insert({
      scope,
      country_id: input.countryId,
      country_branch_id: input.countryBranchId,
      city_branch_id: input.cityBranchId,
      enterprise_account_id: accountId,
      code: "CASH-001",
      name: "General Cash Account",
      currency: input.currencyCode || "USD",
      opening_balance: 0,
      current_balance: 0,
      debit_total: 0,
      credit_total: 0,
      normal_balance: "debit",
      is_active: true,
      created_by: input.userId
    })
    .select("id")
    .single();

  if (ledgerError) {
    console.error("Failed to create fallback cash ledger:", ledgerError);
    throw new Error(`Failed to create fallback cash ledger: ${ledgerError.message}`);
  }

  return newLedger.id;
}
