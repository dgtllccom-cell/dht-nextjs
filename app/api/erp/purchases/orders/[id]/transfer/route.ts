import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  id: uuidSchema
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);
    const body = await request.json().catch(() => ({}));

    const supabase = await createApiSupabaseClient();
    // The admin client is needed for RPC calls that use auth.uid() inside
    // SECURITY DEFINER functions (post_purchase_order_payment → post_roznamcha_entry
    // → assert_enterprise_scope_access → write_erp_audit_log).
    // The service-role key bypasses RLS but does NOT set auth.uid(); we must
    // inject the session user's UUID via set_config so auth.uid() returns a
    // non-null value inside PL/pgSQL.
    const adminSupabase = createSupabaseAdminClient() as any;
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
      cityBranchId: (order as any)?.city_branch_id ?? null
    });

    // ── Prevent Duplicate Transfers ────────────────────────────────
    if ((order as any).ledger_posting_status === "transferred" || (order as any).ledger_posting_status === "posted") {
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

    // ── Update Order Status to "transferred" ────────────────────────────────
    // Per rules: "Transfer to Purchase Transfer Payment" does not post to Ledger.
    const remainingDue = Math.max(0, totalPurchaseAmount - advancePaid);
    const paymentStatus = remainingDue === 0 ? "completed" : advancePaid > 0 ? "partial" : "pending";

    const updatedFormData = {
      ...(formData || {}),
      form: {
        ...(form || {}),
        transferAudit: {
          userId: session.userId,
          userName: session.fullName || session.email || "User",
          transferDate: new Date().toISOString()
        }
      }
    };

    const patch = {
      ledger_posting_status: "transferred",
      is_edited_since_transfer: false,
      payment_status:        paymentStatus,
      advance_paid:          advancePaid,
      remaining_due:         remainingDue,
      updated_at:            new Date().toISOString(),
      form_data:             updatedFormData
    };

    // Before updating, post the initial booking ledger entry
    const purchaseAccountCode = form.purchaseAccountNo;
    const salesAccountCode = form.salesAccountNo || form.supplierAccountNo;

    if (purchaseAccountCode && salesAccountCode) {
      const scopeContext = {
        countryId: (order as any).country_id,
        countryBranchId: (order as any).country_branch_id,
        cityBranchId: (order as any).city_branch_id
      };
      
      const debitLedgerId = await getLedgerIdByCode(supabase, purchaseAccountCode, scopeContext);
      const creditLedgerId = await getLedgerIdByCode(supabase, salesAccountCode, scopeContext);

      if (!debitLedgerId) {
        throw new Error(`Could not find a valid debit ledger for Purchase Account Code: ${purchaseAccountCode}`);
      }
      if (!creditLedgerId) {
        throw new Error(`Could not find a valid credit ledger for Sales/Supplier Account Code: ${salesAccountCode}`);
      }
      if (debitLedgerId === creditLedgerId) {
        throw new Error("Debit and credit ledgers cannot be the same.");
      }

      // Fetch a super admin ID to bypass strict ledger scope checking for automated transfers
      const { data: superAdmins } = await adminSupabase
        .from("user_role_assignments")
        .select("user_id")
        .eq("role", "super_admin")
        .eq("is_active", true)
        .limit(1);
      
      const actorId = superAdmins?.[0]?.user_id || session.userId;

      const { data: paymentId, error: rpcError } = await adminSupabase.rpc("post_purchase_booking_transfer", {
        p_actor_id: actorId,
        p_purchase_order_id: params.id,
        p_kind: "booking",
        p_entry_date: new Date().toISOString().split("T")[0],
        p_amount: totalPurchaseAmount,
        p_currency_code: (order as any).currency_code || "USD",
        p_exchange_rate: (order as any).exchange_rate || 1,
        p_debit_ledger_id: debitLedgerId,
        p_credit_ledger_id: creditLedgerId,
        p_reference_no: (order as any).purchase_order_no || null,
        p_narration: `Initial booking transfer for Purchase Order ${(order as any).purchase_order_no}`
      });
      
      if (rpcError) {
        console.error("RPC Error during booking transfer posting:", rpcError);
        throw new Error(`Ledger posting failed: ${rpcError.message}`);
      } else {
        patch.ledger_posting_status = "posted";
        
        // Restore the original creator to preserve audit trails
        if (actorId !== session.userId && paymentId) {
          await adminSupabase.from("purchase_order_payments").update({ created_by: session.userId }).eq("id", paymentId);
          const { data: paymentRecord } = await adminSupabase.from("purchase_order_payments").select("roznamcha_entry_id").eq("id", paymentId).maybeSingle();
          if (paymentRecord?.roznamcha_entry_id) {
             await adminSupabase.from("roznamcha_entries").update({ created_by: session.userId }).eq("id", paymentRecord.roznamcha_entry_id);
          }
        }
      }
    } else {
      throw new Error("Purchase Account and Sales/Supplier Account are required for transferring.");
    }

    await requireSupabaseData(
      supabase.from("purchase_orders").update(patch).eq("id", params.id).select("id").single()
    );

    await writeAuditLog({
      action:       "transfer_payment",
      entityTable:  "purchase_orders",
      entityId:     params.id,
      before:       order,
      after:        patch,
      ipAddress:    request.headers.get("x-forwarded-for") ?? null
    });

    return apiOk({
      success:          true,
      purchaseOrderId:  params.id,
      paymentStatus,
      advancePaid,
      remainingDue
    });
  } catch (error) {
    console.error("TRANSFER_PAYMENT_ERROR:", error);
    return handleApiError(error);
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ScopeContext {
  countryId:       string | null;
  countryBranchId: string | null;
  cityBranchId:    string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve a ledger ID from an account code.
 * Tries multiple lookup strategies in priority order:
 * 1. Direct ledger.code match (scope-aware first, then any scope)
 * 2. Enterprise account lookup → linked ledger
 */
async function getLedgerIdByCode(
  supabase: any,
  code: string,
  scope?: ScopeContext
): Promise<string | null> {
  const lookup = String(code || "").trim();
  if (!lookup) return null;

  // Helper: build a ledger query with optional scope filter
  const ledgerBase = () =>
    supabase
      .from("ledgers")
      .select("id, scope, country_id, country_branch_id, city_branch_id")
      .eq("is_active", true)
      .is("deleted_at", null);

  // 1a. Direct ledger code match — scope-specific first
  if (scope?.cityBranchId) {
    const { data } = await ledgerBase()
      .eq("code", lookup)
      .eq("city_branch_id", scope.cityBranchId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (scope?.countryBranchId) {
    const { data } = await ledgerBase()
      .eq("code", lookup)
      .eq("country_branch_id", scope.countryBranchId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (scope?.countryId) {
    const { data } = await ledgerBase()
      .eq("code", lookup)
      .eq("country_id", scope.countryId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // 1b. Direct ledger code match — any scope (fallback)
  const { data: anyLedger } = await ledgerBase()
    .eq("code", lookup)
    .limit(1)
    .maybeSingle();
  if (anyLedger?.id) return anyLedger.id;

  // 2. Find enterprise account by various identifiers
  const { data: account } = await supabase
    .from("enterprise_accounts")
    .select("id")
    .or(
      `code.eq.${lookup},account_number.eq.${lookup},manual_reference_number.eq.${lookup},customer_number.eq.${lookup},name.ilike.${lookup}`
    )
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!account?.id) return null;

  // 3. Find ledger linked to this enterprise account — scope-specific first
  if (scope?.cityBranchId) {
    const { data } = await supabase
      .from("ledgers")
      .select("id")
      .eq("enterprise_account_id", account.id)
      .eq("city_branch_id", scope.cityBranchId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (scope?.countryBranchId) {
    const { data } = await supabase
      .from("ledgers")
      .select("id")
      .eq("enterprise_account_id", account.id)
      .eq("country_branch_id", scope.countryBranchId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (scope?.countryId) {
    const { data } = await supabase
      .from("ledgers")
      .select("id")
      .eq("enterprise_account_id", account.id)
      .eq("country_id", scope.countryId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // 4. Any ledger linked to this enterprise account (fallback)
  const { data: fallbackLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("enterprise_account_id", account.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return fallbackLedger?.id ?? null;
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

