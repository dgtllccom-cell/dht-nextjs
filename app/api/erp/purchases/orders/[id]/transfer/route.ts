import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";
import { ensurePurchaseSchemaAndEnums } from "@/lib/services/purchase-table-manager";

const paramsSchema = z.object({
  id: uuidSchema
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensurePurchaseSchemaAndEnums();
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);
    const body = await request.json().catch(() => ({}));

    const supabase = await createApiSupabaseClient();
    const order = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select("id, country_id, country_branch_id, city_branch_id, order_total, currency_code, exchange_rate, purchase_order_no, purchase_contract_no, form_data, ledger_posting_status, payment_status, is_edited_since_transfer")
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    );

    authorizeApiScope(session, {
      resource: "purchases",
      action: "post",
      countryId: (order as any)?.country_id ?? null,
      countryBranchId: (order as any)?.country_branch_id ?? null,
      cityBranchId: (order as any)?.city_branch_id ?? null,
    });

    const orderRow = order as any;
    const formData = orderRow.form_data || {};
    const form = formData.form || {};
    const workflow = formData.workflow || {};

    const alreadyTransferred =
      orderRow.ledger_posting_status === "transferred" ||
      orderRow.ledger_posting_status === "posted" ||
      workflow.transferStatus === "transferred" ||
      Boolean(form.transferAudit);

    if (alreadyTransferred && !orderRow.is_edited_since_transfer) {
      return handleApiError(new Error("This booking has already been transferred to Purchase Transfer Payment and cannot be transferred again."));
    }

    const rawTotal = String(orderRow.order_total || formData.totals?.grandFinal || "0").replace(/,/g, "");
    const totalPurchaseAmount = Number(rawTotal);
    if (!Number.isFinite(totalPurchaseAmount) || totalPurchaseAmount <= 0) {
      throw new Error("Purchase order total must be a valid number greater than zero to transfer.");
    }

    if (!form.purchaseAccountNo) {
      throw new Error("Purchase Account is required before transfer to payment.");
    }
    if (!form.salesAccountNo) {
      throw new Error("Sales/Payable Account is required before transfer to payment.");
    }

    const systemBillNumber = String(orderRow.purchase_order_no || form.purchaseOrderNo || "").trim();
    const manualBillNumber = String(
      form.manualBillNumber || form.manual_bill_number || form.billNo || form.purchaseContractNo || orderRow.purchase_contract_no || ""
    ).trim();
    const partyName = String(form.purchaseAccountName || form.supplierName || form.salesAccountName || form.customerName || "Purchase Party").trim();
    const referenceNo = [systemBillNumber, manualBillNumber].filter(Boolean).join(" / ") || systemBillNumber || manualBillNumber || null;
    const now = new Date().toISOString();

    const updatedFormData = {
      ...formData,
      form: {
        ...form,
        transferAudit: {
          userId: session.userId,
          userName: session.fullName || session.email || "User",
          transferDate: now,
          transferOnly: true,
          systemBillNumber,
          manualBillNumber,
          referenceNo,
          remarks: typeof body?.remarks === "string" ? body.remarks : null
        }
      },
      workflow: {
        ...workflow,
        transferStatus: "transferred",
        invoiceStatus: workflow.invoiceStatus || "available",
        paymentStatus: "pending",
        journalStatus: "posted",
        ledgerStatus: "posted",
        currentStep: "purchase_transfer_payment",
        currentStepName: "Purchase Transfer Payment",
        nextStepName: "Post Payment",
        transferredAt: now,
        transferredBy: session.userId,
        systemBillNumber,
        manualBillNumber,
        partyName,
        referenceNo,
        sourceModule: "purchase",
        sourceTransactionType: "purchase_transfer_to_payment"
      },
      transferTrace: {
        transferOnly: true,
        purchaseOrderId: params.id,
        systemBillNumber,
        manualBillNumber,
        partyName,
        referenceNo,
        countryId: orderRow.country_id,
        countryBranchId: orderRow.country_branch_id,
        cityBranchId: orderRow.city_branch_id,
        currencyCode: orderRow.currency_code || form.currencyType || "USD",
        exchangeRate: orderRow.exchange_rate || form.exchangeRate || 1,
        amount: totalPurchaseAmount,
        purchaseAccountNo: form.purchaseAccountNo,
        salesAccountNo: form.salesAccountNo,
        transferredAt: now,
        transferredBy: session.userId
      }
    };

    // --- AUTOMATIC ROZNAMCHA POSTING LOGIC ---
    
    // Helper to get enterpriseAccountId and ledgerId
    const getAccountInfo = async (accountCode: string) => {
      const { data: entAccount, error } = await supabase
        .from("enterprise_accounts")
        .select("id, currency")
        .eq("account_number", accountCode)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (error || !entAccount) return null;

      const { data: ledger } = await supabase
        .from("ledgers")
        .select("id")
        .eq("enterprise_account_id", entAccount.id)
        .limit(1)
        .maybeSingle();
      
      return {
        enterpriseAccountId: entAccount.id,
        ledgerId: ledger?.id || null,
        currency: entAccount.currency || "USD"
      };
    };

    const purchaseAccountInfo = await getAccountInfo(form.purchaseAccountNo);
    const salesAccountInfo = await getAccountInfo(form.salesAccountNo);

    if (!purchaseAccountInfo?.ledgerId) {
      throw new Error(`Could not resolve ledger for Purchase Account: ${form.purchaseAccountNo}. Please ensure the account exists and has a ledger.`);
    }
    if (!salesAccountInfo?.ledgerId) {
      throw new Error(`Could not resolve ledger for Sales Account: ${form.salesAccountNo}. Please ensure the account exists and has a ledger.`);
    }

    const roznamchaType = orderRow.city_branch_id ? "branch" : orderRow.country_branch_id ? "country" : orderRow.country_id ? "country" : "super_admin";

    const roznamchaPayload = {
      mode: "post",
      type: roznamchaType,
      countryId: orderRow.country_id,
      countryBranchId: orderRow.country_branch_id,
      cityBranchId: orderRow.city_branch_id,
      entryDate: now.split("T")[0],
      journalNo: systemBillNumber,
      voucherNo: manualBillNumber || systemBillNumber,
      referenceNo: referenceNo,
      narration: "Purchase Booking Auto-Transfer",
      lines: [
        {
          enterpriseAccountId: purchaseAccountInfo.enterpriseAccountId,
          ledgerId: purchaseAccountInfo.ledgerId,
          debit: totalPurchaseAmount,
          credit: 0,
          currency: form.purchaseCurrency || form.currencyType || purchaseAccountInfo.currency,
          exchangeRate: form.exchangeRate || 1,
          paymentEntryType: "transfer",
          description: `Purchase Auto Debit - ${partyName}`
        },
        {
          enterpriseAccountId: salesAccountInfo.enterpriseAccountId,
          ledgerId: salesAccountInfo.ledgerId,
          debit: 0,
          credit: totalPurchaseAmount,
          currency: form.salesAccountCurrency || form.secondaryCurrency || salesAccountInfo.currency,
          exchangeRate: form.exchangeRate || 1,
          paymentEntryType: "transfer",
          description: `Purchase Auto Credit - ${partyName}`
        }
      ]
    };

    // Check if Roznamcha entry already exists for this order to prevent double posting and duplicate key errors
    const { data: existingRoz } = await supabase
      .from("roznamcha_entries")
      .select("id")
      .eq("journal_no", systemBillNumber)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (!existingRoz) {
      const baseUrl = request.nextUrl.origin;
      const roznamchaRes = await fetch(`${baseUrl}/api/erp/roznamcha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || ""
        },
        body: JSON.stringify({
          ...roznamchaPayload,
          // Append a timestamp or unique suffix to ensure it doesn't violate unique constraints if voucherNo was used elsewhere
          voucherNo: `${manualBillNumber || systemBillNumber}-TRF-${Date.now()}`
        })
      });
      
      const roznamchaData = await roznamchaRes.json().catch(() => ({}));
      if (!roznamchaRes.ok || !roznamchaData.success) {
        throw new Error(roznamchaData?.error?.message || roznamchaData?.error || "Failed to post to Roznamcha automatically.");
      }
    }

    // --- END ROZNAMCHA POSTING LOGIC ---

    const patch = {
      ledger_posting_status: "posted",
      payment_status: "pending",
      is_edited_since_transfer: false,
      advance_paid: 0,
      remaining_due: orderRow.order_total,
      updated_at: now,
      form_data: updatedFormData
    };

    const updatedOrder = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .update(patch)
        .eq("id", params.id)
        .select("id, purchase_order_no, purchase_contract_no, ledger_posting_status, payment_status")
        .maybeSingle()
    );

    await writeAuditLog({
      action: "transfer_to_purchase_payment",
      entityTable: "purchase_orders",
      entityId: params.id,
      before: order,
      after: patch,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiOk({
      success: true,
      purchaseOrderId: params.id,
      purchaseOrderNo: (updatedOrder as any).purchase_order_no,
      systemBillNumber,
      manualBillNumber,
      referenceNo,
      transferOnly: true,
      ledgerPostingStatus: "posted",
      paymentStatus: "pending",
      advancePaid: 0,
      remainingDue: orderRow.order_total
    });
  } catch (error) {
    console.error("PURCHASE_TRANSFER_TO_PAYMENT_ERROR:", error);
    return handleApiError(error);
  }
}
