import { NextRequest } from "next/server";
import { z } from "zod";
import { apiCreated, apiOk, handleApiError, apiError } from "@/lib/api/response";
import { purchaseOrderCreateSchema, uuidSchema } from "@/lib/api/erp-validation";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { requireErpSession } from "@/lib/auth/session";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const listQuerySchema = z.object({
  countryId: uuidSchema.optional(),
  countryBranchId: uuidSchema.optional(),
  cityBranchId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

function cleanSerialPrefix(val: string | null | undefined, fallback: string) {
  if (!val) return fallback;
  const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return clean || fallback;
}

async function nextTransactionSerial(admin: any, scopeType: string, scopeKey: string, prefix: string) {
  const { data, error } = await admin.rpc("next_transaction_serial", {
    p_scope_type: scopeType,
    p_scope_key: scopeKey,
    p_prefix: prefix
  });
  if (error) throw new Error(error.message);
  return data;
}

async function resolveCountryCurrency(admin: any, countryId: string | null | undefined, fallback = "USD") {
  if (!countryId) return fallback;
  const { data } = await admin
    .from("countries")
    .select("currency_code")
    .eq("id", countryId)
    .maybeSingle();
  return data?.currency_code || fallback;
}

async function resolveEffectiveScope(input: {
  session: Awaited<ReturnType<typeof requireErpSession>>;
  requested: { countryId?: string | null; countryBranchId?: string | null; cityBranchId?: string | null };
}) {
  const session = input.session;
  const req = input.requested;

  // Super Admin can choose, but at minimum should provide countryId for country-scope records.
  if (session.isSuperAdmin) {
    return {
      countryId: req.countryId ?? null,
      countryBranchId: req.countryBranchId ?? null,
      cityBranchId: req.cityBranchId ?? null
    };
  }

  // Strictest scope first.
  const supabase = await createApiSupabaseClient();

  if (session.cityBranchIds.length) {
    const cityBranchId = session.cityBranchIds[0]!;
    const row = await requireSupabaseData(
      supabase
        .from("city_branches")
        .select("id, country_id, country_branch_id")
        .eq("id", cityBranchId)
        .is("deleted_at", null)
        .maybeSingle()
    );
    return {
      countryId: (row as any)?.country_id ?? session.countryIds[0] ?? null,
      countryBranchId: (row as any)?.country_branch_id ?? session.countryBranchIds[0] ?? null,
      cityBranchId
    };
  }

  if (session.countryBranchIds.length) {
    const countryBranchId = session.countryBranchIds[0]!;
    const row = await requireSupabaseData(
      supabase
        .from("country_branches")
        .select("id, country_id")
        .eq("id", countryBranchId)
        .is("deleted_at", null)
        .maybeSingle()
    );
    return {
      countryId: (row as any)?.country_id ?? session.countryIds[0] ?? null,
      countryBranchId,
      cityBranchId: null
    };
  }

  return {
    countryId: session.countryIds[0] ?? null,
    countryBranchId: null,
    cityBranchId: null
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const query = listQuerySchema.parse({
      countryId: request.nextUrl.searchParams.get("countryId") ?? undefined,
      countryBranchId: request.nextUrl.searchParams.get("countryBranchId") ?? undefined,
      cityBranchId: request.nextUrl.searchParams.get("cityBranchId") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    authorizeApiScope(session, {
      resource: "purchases",
      action: "read",
      countryId: query.countryId ?? null,
      countryBranchId: query.countryBranchId ?? null,
      cityBranchId: query.cityBranchId ?? null
    });

    const supabase = await createApiSupabaseClient();
    let q = supabase
      .from("purchase_orders")
      .select(
        "id, purchase_order_no, purchase_contract_no, country_id, country_branch_id, city_branch_id, supplier_company_id, companies(name), currency_code, exchange_rate, order_total, advance_paid, remaining_paid, credit_amount, remaining_due, payment_status, ledger_posting_status, form_data, super_admin_serial_number, country_transaction_serial_number, branch_transaction_serial_number, created_at, updated_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Enforce strict scope isolation: city branch first, then main branch, then country.
    if (query.cityBranchId) {
      q = q.eq("city_branch_id", query.cityBranchId);
    } else if (!session.isSuperAdmin && session.cityBranchIds.length) {
      q = q.in("city_branch_id", session.cityBranchIds);
    } else if (query.countryBranchId) {
      q = q.eq("country_branch_id", query.countryBranchId);
    } else if (!session.isSuperAdmin && session.countryBranchIds.length) {
      q = q.in("country_branch_id", session.countryBranchIds);
    } else if (query.countryId) {
      q = q.eq("country_id", query.countryId);
    } else if (!session.isSuperAdmin) {
      q = q.in("country_id", session.countryIds.length ? session.countryIds : ["00000000-0000-0000-0000-000000000000"]);
    }

    const rows = await requireSupabaseData(q.limit(query.limit));

    return apiOk({ orders: rows ?? [], limit: query.limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = purchaseOrderCreateSchema.parse(await request.json());

    const effective = await resolveEffectiveScope({
      session,
      requested: {
        countryId: body.countryId ?? null,
        countryBranchId: body.countryBranchId ?? null,
        cityBranchId: body.cityBranchId ?? null
      }
    });

    authorizeApiScope(session, {
      resource: "purchases",
      action: "create",
      countryId: effective.countryId,
      countryBranchId: effective.countryBranchId,
      cityBranchId: effective.cityBranchId
    });

    const supabase = await createApiSupabaseClient();

    const lps = String(body.ledgerPostingStatus || "draft").toLowerCase();
    const ledgerPostingStatus = lps === "posted" ? "posted" : lps === "cancelled" ? "cancelled" : "draft";

    const admin = createSupabaseAdminClient() as any;
    const recordCurrencyCode = await resolveCountryCurrency(admin, effective.countryId, body.currencyCode || "USD");

    const superAdminSerialNumber = await nextTransactionSerial(admin, "global", "global", "SA");

    let countryPrefix = "CNT";
    if (effective.countryId) {
      const { data: country } = await admin.from("countries").select("iso2, iso3, name").eq("id", effective.countryId).maybeSingle();
      countryPrefix = cleanSerialPrefix(country?.iso2 || country?.iso3 || country?.name, "CNT");
    }

    let mainBranchPrefix = "MB";
    if (effective.countryBranchId) {
      const { data: branch } = await admin.from("country_branches").select("code, name").eq("id", effective.countryBranchId).maybeSingle();
      mainBranchPrefix = cleanSerialPrefix(branch?.code || branch?.name, "MB");
    }

    let cityBranchPrefix = "CB";
    if (effective.cityBranchId) {
      const { data: branch } = await admin.from("city_branches").select("code, name").eq("id", effective.cityBranchId).maybeSingle();
      cityBranchPrefix = cleanSerialPrefix(branch?.code || branch?.name, "CB");
    }

    const countryTransactionSerialNumber = effective.countryId ? await nextTransactionSerial(admin, "country", effective.countryId, countryPrefix) : null;
    const branchTransactionSerialNumber = effective.cityBranchId || effective.countryBranchId ? await nextTransactionSerial(admin, "branch", effective.cityBranchId || effective.countryBranchId || "", effective.cityBranchId ? cityBranchPrefix : mainBranchPrefix) : null;
    const mainBranchTransactionSerialNumber = effective.countryBranchId ? await nextTransactionSerial(admin, "main_branch", effective.countryBranchId, mainBranchPrefix) : null;
    const cityBranchTransactionSerialNumber = effective.cityBranchId ? await nextTransactionSerial(admin, "city_branch", effective.cityBranchId, cityBranchPrefix) : null;
    const purchaseOrderNo = await nextTransactionSerial(admin, "module_purchase", "global", "PUR");
    const paymentStatusRaw = String(body.paymentStatus || "pending").toLowerCase();
    const form = (body.formData as any)?.form ?? {};
    const advancePercent = Number(form.advancePercent ?? 10);
    const orderTotal = Number(body.orderTotal || 0);
    const advanceAmount = ledgerPostingStatus === "posted" ? ((orderTotal * advancePercent) / 100) : 0;
    const remainingDue = ledgerPostingStatus === "posted" ? Math.max(0, orderTotal - advanceAmount) : orderTotal;
    const paymentStatus = ledgerPostingStatus === "posted" 
      ? (remainingDue === 0 ? "completed" : advanceAmount > 0 ? "partial" : "pending") 
      : (["pending", "partial", "completed", "cancelled"].includes(paymentStatusRaw) ? paymentStatusRaw : "pending");

    const payload = {
      country_id: effective.countryId,
      country_branch_id: effective.countryBranchId,
      city_branch_id: effective.cityBranchId,
      purchase_order_no: purchaseOrderNo,
      purchase_contract_no: body.purchaseContractNo?.trim() || null,
      supplier_company_id: body.supplierCompanyId ?? null,
      
      // purchase_currency: body.currencyCode || "USD",
      // payment_currency: body.paymentCurrencyCode || "USD",
      currency_code: recordCurrencyCode, // Country currency is the source of truth
      exchange_rate: body.exchangeRate,
      order_total: body.orderTotal,
      
      // total_goods_original: body.totalGoodsOriginal,
      // total_goods_local: body.totalGoodsLocal,
      // total_goods_usd: body.totalGoodsUsd,
      // total_expenses_original: body.totalExpensesOriginal,
      // total_expenses_local: body.totalExpensesLocal,
      // total_expenses_usd: body.totalExpensesUsd,
      // landed_cost_original: body.landedCostOriginal,
      // landed_cost_local: body.landedCostLocal,
      // landed_cost_usd: body.landedCostUsd,

      form_data: body.formData ?? null,
      payment_status: paymentStatus,
      ledger_posting_status: ledgerPostingStatus,
      advance_paid: advanceAmount,
      remaining_due: remainingDue,
      super_admin_serial_number: superAdminSerialNumber,
      country_transaction_serial_number: countryTransactionSerialNumber,
      branch_transaction_serial_number: branchTransactionSerialNumber,
      // main_branch_transaction_serial: mainBranchTransactionSerialNumber,
      // city_branch_transaction_serial: cityBranchTransactionSerialNumber
    };

    let inserted;
    try {
      inserted = await requireSupabaseData(
        supabase.from("purchase_orders").insert(payload).select("id, purchase_order_no").single()
      );
    } catch (e: any) {
      return apiError("INSERT_FAILED", e.message || String(e), 400);
    }

    const orderId = (inserted as any).id;

    if (body.items && body.items.length > 0) {
      const itemsPayload = body.items.map((it: any) => ({
        purchase_order_id: orderId,
        product_id: it.productId || null,
        goods_name: it.goodsName || "Unknown",
        hs_code: it.hsCode || null,
        size: it.size || null,
        brand: it.brand || null,
        origin: it.origin || null,
        quantity: it.quantity || 0,
        unit_name: it.unitName || "pcs",
        unit_weight: it.unitWeight || 0,
        gross_weight: it.grossWeight || 0,
        net_weight: it.netWeight || 0,
        // rate_original: it.rateOriginal || 0,
        // rate_local: it.rateLocal || 0,
        // rate_usd: it.rateUsd || 0,
        // total_original: it.totalOriginal || 0,
        // total_local: it.totalLocal || 0,
        // total_usd: it.totalUsd || 0
      }));
      try {
        await requireSupabaseData(supabase.from("purchase_order_items").insert(itemsPayload));
      } catch (e: any) {
        return apiError("ITEMS_INSERT_FAILED", e.message || String(e), 400);
      }
    }

    if (body.expenses && body.expenses.length > 0) {
      const expPayload = body.expenses.map((ex: any) => ({
        purchase_order_id: orderId,
        expense_type: ex.expenseType,
        ledger_id: ex.ledgerId || null,
        description: ex.description || null,
        // expense_currency: ex.expenseCurrency || "USD",
        exchange_rate: ex.exchangeRate || 1,
        // amount_original: ex.amountOriginal || 0,
        // amount_local: ex.amountLocal || 0,
        // amount_usd: ex.amountUsd || 0
      }));
      try {
        await requireSupabaseData(supabase.from("purchase_order_expenses").insert(expPayload));
      } catch (e: any) {
        return apiError("EXPENSES_INSERT_FAILED", e.message || String(e), 400);
      }
    }

    if (ledgerPostingStatus === "posted") {
      const entryDate = form.advancePaymentDate || form.purchaseDate || new Date().toISOString().slice(0, 10);
      
      const debitLedgerId = await getLedgerIdByCode(supabase, form.purchaseAccountNo);
      const creditLedgerId = await getLedgerIdByCode(supabase, form.salesAccountNo);
      
      if (!debitLedgerId) {
        throw new Error(`Debit Ledger (Inventory) not found for account code: ${form.purchaseAccountNo}`);
      }
      if (!creditLedgerId) {
        throw new Error(`Credit Ledger (Supplier Payable) not found for account code: ${form.salesAccountNo}`);
      }

      // 1. Stage 1: Credit purchase entry: Debit Inventory, Credit Supplier Payable
      const { error: transferError } = await supabase.rpc("post_purchase_booking_transfer", {
        p_actor_id: session.userId,
        p_purchase_order_id: orderId,
        p_kind: "booking",
        p_entry_date: entryDate,
        p_amount: orderTotal,
        p_currency_code: recordCurrencyCode,
        p_exchange_rate: Number(body.exchangeRate || 1),
        p_debit_ledger_id: debitLedgerId,
        p_credit_ledger_id: creditLedgerId,
        p_reference_no: body.purchaseContractNo || null,
        p_narration: `Booking Transfer for PO ${purchaseOrderNo}${form.orderReportRemarks || form.remarks ? ` - ${form.orderReportRemarks || form.remarks}` : ""}`
      });

      if (transferError) {
        throw new Error(`Booking Transfer Ledger Entry failed: ${transferError.message}`);
      }
    }

    await writeAuditLog({
      action: "create",
      entityTable: "purchase_orders",
      entityId: orderId ?? null,
      before: null,
      after: payload,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    // Requirement 9 & 11: Real-time Synchronization
    revalidatePath("/dashboard/purchases", "layout");
    revalidatePath("/dashboard/reports", "layout");

    return apiCreated({
      purchaseOrderId: orderId as string,
      purchaseOrderNo: (inserted as any).purchase_order_no as string
    });
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
