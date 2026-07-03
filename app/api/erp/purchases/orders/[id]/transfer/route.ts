import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";

const paramsSchema = z.object({
  id: uuidSchema
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);
    const body = await request.json().catch(() => ({}));

    const supabase = await createApiSupabaseClient();
    const order = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select("id, country_id, country_branch_id, city_branch_id, order_total, currency_code, exchange_rate, purchase_order_no, purchase_contract_no, form_data, ledger_posting_status, is_edited_since_transfer")
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

    if (((order as any).ledger_posting_status === "posted" || (order as any).form_data?.workflow?.transferStatus === "transferred" || (order as any).form_data?.form?.transferAudit) && !(order as any).is_edited_since_transfer) {
      return handleApiError(new Error("This booking has already been transferred to Payment and cannot be transferred again."));
    }

    const formData = (order as any).form_data || {};
    const form = formData.form || {};
    const totals = formData.totals || {};
    
    const rawTotal = String((order as any).order_total || totals.grandFinal || "0").replace(/,/g, "");
    let totalPurchaseAmount = Number(rawTotal);

    if (isNaN(totalPurchaseAmount) || totalPurchaseAmount <= 0) {
      throw new Error("Purchase order total must be a valid number greater than zero to transfer.");
    }
    
    const advancePaid = 0;

    if (!form.purchaseAccountNo) {
      throw new Error("Purchase Account is required for automated ledger posting.");
    }
    if (!form.salesAccountNo) {
      throw new Error("Sales/Payable Account is required for automated ledger posting.");
    }

    async function getLedgerByAccountNumber(accountNumber: string) {
      const { data: account, error: accErr } = await supabase
        .from("enterprise_accounts")
        .select("id")
        .eq("account_number", accountNumber)
        .is("deleted_at", null)
        .single();
      if (accErr || !account) throw new Error(`Account not found: ${accountNumber}`);
      
      const { data: ledger, error: ledErr } = await supabase
        .from("ledgers")
        .select("id")
        .eq("enterprise_account_id", account.id)
        .is("deleted_at", null)
        .single();
      if (ledErr || !ledger) throw new Error(`Ledger not found for account: ${accountNumber}`);
      return ledger.id;
    }

    const debitLedgerId = await getLedgerByAccountNumber(form.purchaseAccountNo);
    const creditLedgerId = await getLedgerByAccountNumber(form.salesAccountNo);

    const orderRow = order as any;
    let exchangeRate = Number(orderRow.exchange_rate || 0);
    if (exchangeRate <= 1) exchangeRate = Number(form.exchangeRate || 1);
    if (exchangeRate <= 0) exchangeRate = 1;

    const orderTotalUSD = Number(orderRow.order_total || 0) / exchangeRate;
    const bodyAmount = orderTotalUSD * exchangeRate; // Post the full amount 
    
    // Execute automated posting
    const entryDateVal = form.purchaseDate || form.orderDate || new Date().toISOString();
    
    const { data: paymentId, error: rpcError } = await supabase.rpc("post_purchase_booking_transfer", {
      p_actor_id: session.userId,
      p_purchase_order_id: params.id,
      p_kind: "booking",
      p_entry_date: entryDateVal,
      p_amount: bodyAmount,
      p_currency_code: orderRow.currency_code || form.currencyType || "USD",
      p_exchange_rate: exchangeRate,
      p_debit_ledger_id: debitLedgerId,
      p_credit_ledger_id: creditLedgerId,
      p_reference_no: form.billNo || form.purchaseContractNo || null,
      p_narration: `Automated Transfer Posting: ${form.billNo || form.purchaseContractNo || orderRow.purchase_order_no}`
    });

    if (rpcError) {
      throw new Error(`Failed to automate ledger posting: ${rpcError.message}`);
    }

    const { data: paymentRecord, error: paymentError } = await supabase
      .from("purchase_order_payments")
      .select("roznamcha_entry_id, original_currency_code, currency_name, base_currency_amount")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError) throw new Error(`Payment query error: ${paymentError.message}`);
    if (!paymentRecord) throw new Error(`Payment record not found after insert! paymentId: ${paymentId}`);

    const { data: journalRecord, error: journalError } = await supabase
      .from("roznamcha_entries")
      .select("super_admin_serial_number, country_transaction_serial_number, branch_transaction_serial_number")
      .eq("id", paymentRecord.roznamcha_entry_id)
      .maybeSingle();

    if (journalError) throw new Error(`Journal query error: ${journalError.message}`);
    if (!journalRecord) throw new Error(`Journal record not found! roznamcha_entry_id: ${paymentRecord.roznamcha_entry_id}`);

    const updatedFormData = {
      ...(formData || {}),
      form: {
        ...(form || {}),
        transferAudit: {
          userId: session.userId,
          userName: session.fullName || session.email || "User",
          transferDate: new Date().toISOString()
        }
      },
      workflow: {
        ...(formData.workflow || {}),
        transferStatus: "transferred",
        invoiceStatus: "available",
        paymentStatus: "pending",
        journalStatus: "posted",
        ledgerStatus: "posted",
        currentStep: "payment_posted",
        lastPaymentId: paymentId,
        lastRoznamchaEntryId: paymentRecord.roznamcha_entry_id,
        lastPaymentPostedAt: new Date().toISOString(),
        transferredAt: new Date().toISOString(),
        transferredBy: session.userId
      },
      lastPaymentTrace: {
        paymentId,
        roznamchaEntryId: paymentRecord.roznamcha_entry_id,
        debitLedgerId,
        creditLedgerId,
        originalCurrencyCode: paymentRecord.original_currency_code || orderRow.currency_code,
        currencyName: paymentRecord.currency_name || orderRow.currency_code,
        exchangeRate: exchangeRate,
        baseCurrencyAmount: paymentRecord.base_currency_amount,
        superAdminSerialNumber: journalRecord.super_admin_serial_number,
        countryTransactionSerialNumber: journalRecord.country_transaction_serial_number,
        branchTransactionSerialNumber: journalRecord.branch_transaction_serial_number
      }
    };

    const patch = {
      ledger_posting_status: "posted",
      is_edited_since_transfer: false,
      payment_status: "pending",
      advance_paid: 0,
      remaining_due: orderRow.order_total, // Depends on advance, but keeping consistent
      updated_at: new Date().toISOString(),
      form_data: updatedFormData
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from("purchase_orders")
      .update(patch)
      .eq("id", params.id)
      .select("id")
      .maybeSingle();

    if (updateError) throw new Error(`Update query error: ${updateError.message}`);
    if (!updatedOrder) throw new Error(`Update failed! Order not found or not updated: ${params.id}`);

    await writeAuditLog({
      action:       "automated_transfer_posting",
      entityTable:  "purchase_orders",
      entityId:     params.id,
      before:       order,
      after:        patch,
    });

    return apiOk({
      success:          true,
      purchaseOrderId:  params.id,
      paymentStatus:    "posted",
      advancePaid:      0,
      remainingDue:     orderRow.order_total
    });
  } catch (error) {
    console.error("AUTOMATED_TRANSFER_ERROR:", error);
    return handleApiError(error);
  }
}

export async function revertOrderBookingTransfer(orderId: string, supabase: any, adminSupabase: any) {
  // Find ALL existing purchase order payments of kind 'booking' or 'credit' (the transfer records)
  const { data: existingPayments } = await supabase
    .from("purchase_order_payments")
    .select("id, roznamcha_entry_id, entry_date")
    .eq("purchase_order_id", orderId)
    .in("kind", ["booking", "credit"])
    .eq("status", "posted");

  if (!existingPayments || existingPayments.length === 0) {
    return;
  }

  for (const existingPayment of existingPayments) {
    if (!existingPayment.roznamcha_entry_id) continue;

    // Retrieve roznamcha lines to revert the ledger totals
    const { data: lines } = await supabase
      .from("roznamcha_lines")
      .select("ledger_id, enterprise_account_id, debit, credit")
      .eq("roznamcha_entry_id", existingPayment.roznamcha_entry_id);

    if (lines && lines.length > 0) {
      for (const line of lines) {
        // Revert ledgers totals
        const { data: ledger } = await adminSupabase
          .from("ledgers")
          .select("debit_total, credit_total, current_balance")
          .eq("id", line.ledger_id)
          .maybeSingle();
        if (ledger) {
          await adminSupabase
            .from("ledgers")
            .update({
              debit_total: Number(ledger.debit_total || 0) - Number(line.debit || 0),
              credit_total: Number(ledger.credit_total || 0) - Number(line.credit || 0),
              current_balance: Number(ledger.current_balance || 0) - Number(line.debit || 0) + Number(line.credit || 0),
              updated_at: new Date().toISOString()
            })
            .eq("id", line.ledger_id);
        }

        // Revert enterprise_accounts totals
        if (line.enterprise_account_id) {
          const { data: entAcc } = await adminSupabase
            .from("enterprise_accounts")
            .select("current_balance")
            .eq("id", line.enterprise_account_id)
            .maybeSingle();
          if (entAcc) {
            await adminSupabase
              .from("enterprise_accounts")
              .update({
                current_balance: Number(entAcc.current_balance || 0) - Number(line.debit || 0) + Number(line.credit || 0),
                updated_at: new Date().toISOString()
              })
              .eq("id", line.enterprise_account_id);
          }
        }

        // Revert ledger_balances records
        const { data: balRecord } = await adminSupabase
          .from("ledger_balances")
          .select("debit_total, credit_total, closing_balance")
          .eq("ledger_id", line.ledger_id)
          .eq("balance_date", existingPayment.entry_date)
          .maybeSingle();
        if (balRecord) {
          await adminSupabase
            .from("ledger_balances")
            .update({
              debit_total: Number(balRecord.debit_total || 0) - Number(line.debit || 0),
              credit_total: Number(balRecord.credit_total || 0) - Number(line.credit || 0),
              closing_balance: Number(balRecord.closing_balance || 0) - Number(line.debit || 0) + Number(line.credit || 0),
              updated_at: new Date().toISOString()
            })
            .eq("ledger_id", line.ledger_id)
            .eq("balance_date", existingPayment.entry_date);
        }
      }
    }

    // Delete the existing payment row
    await adminSupabase
      .from("purchase_order_payments")
      .delete()
      .eq("id", existingPayment.id);

    // Delete the roznamcha_entries row (cascades to roznamcha_lines)
    await adminSupabase
      .from("roznamcha_entries")
      .delete()
      .eq("id", existingPayment.roznamcha_entry_id);
  }
}

export async function revertAllOrderPayments(orderId: string, supabase: any, adminSupabase: any) {
  // Find ALL posted payments for this order
  const { data: payments } = await supabase
    .from("purchase_order_payments")
    .select("id, roznamcha_entry_id, entry_date")
    .eq("purchase_order_id", orderId)
    .eq("status", "posted")
    .not("roznamcha_entry_id", "is", null);

  if (!payments || payments.length === 0) {
    return;
  }

  for (const payment of payments) {
    // Retrieve roznamcha lines to revert the ledger totals
    const { data: lines } = await supabase
      .from("roznamcha_lines")
      .select("ledger_id, enterprise_account_id, debit, credit")
      .eq("roznamcha_entry_id", payment.roznamcha_entry_id);

    if (lines && lines.length > 0) {
      for (const line of lines) {
        // Revert ledgers totals
        const { data: ledger } = await adminSupabase
          .from("ledgers")
          .select("debit_total, credit_total, current_balance")
          .eq("id", line.ledger_id)
          .maybeSingle();
        if (ledger) {
          await adminSupabase
            .from("ledgers")
            .update({
              debit_total: Number(ledger.debit_total || 0) - Number(line.debit || 0),
              credit_total: Number(ledger.credit_total || 0) - Number(line.credit || 0),
              current_balance: Number(ledger.current_balance || 0) - Number(line.debit || 0) + Number(line.credit || 0),
              updated_at: new Date().toISOString()
            })
            .eq("id", line.ledger_id);
        }

        // Revert enterprise_accounts totals
        if (line.enterprise_account_id) {
          const { data: entAcc } = await adminSupabase
            .from("enterprise_accounts")
            .select("current_balance")
            .eq("id", line.enterprise_account_id)
            .maybeSingle();
          if (entAcc) {
            await adminSupabase
              .from("enterprise_accounts")
              .update({
                current_balance: Number(entAcc.current_balance || 0) - Number(line.debit || 0) + Number(line.credit || 0),
                updated_at: new Date().toISOString()
              })
              .eq("id", line.enterprise_account_id);
          }
        }

        // Revert ledger_balances records
        const { data: balRecord } = await adminSupabase
          .from("ledger_balances")
          .select("debit_total, credit_total, closing_balance")
          .eq("ledger_id", line.ledger_id)
          .eq("balance_date", payment.entry_date)
          .maybeSingle();
        if (balRecord) {
          await adminSupabase
            .from("ledger_balances")
            .update({
              debit_total: Number(balRecord.debit_total || 0) - Number(line.debit || 0),
              credit_total: Number(balRecord.credit_total || 0) - Number(line.credit || 0),
              closing_balance: Number(balRecord.closing_balance || 0) - Number(line.debit || 0) + Number(line.credit || 0),
              updated_at: new Date().toISOString()
            })
            .eq("ledger_id", line.ledger_id)
            .eq("balance_date", payment.entry_date);
        }
      }
    }

    // Delete the existing payment row
    await adminSupabase
      .from("purchase_order_payments")
      .delete()
      .eq("id", payment.id);

    // Delete the roznamcha_entries row (cascades to roznamcha_lines)
    await adminSupabase
      .from("roznamcha_entries")
      .delete()
      .eq("id", payment.roznamcha_entry_id);
  }
}



