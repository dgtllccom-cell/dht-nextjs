/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { SupabaseApprovalsRepository } from "@/lib/api/approval-repository";
import { ApprovalService } from "@/lib/services/approval-service";
import crypto from "crypto";

function toRate(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

async function resolveProfileActor(admin: any, userId: string | null | undefined) {
  if (!userId) return null;
  const { data, error } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    await requireErpSession();

    const countryId = request.nextUrl.searchParams.get("countryId");
    const countryBranchId = request.nextUrl.searchParams.get("countryBranchId");
    const currency = request.nextUrl.searchParams.get("currency")?.trim().toUpperCase();
    const branchCurrency = request.nextUrl.searchParams.get("branchCurrency")?.trim().toUpperCase();

    if (!countryId || !currency) {
      return apiOk({ rate: 1, source: "default" });
    }

    const supabase = createSupabaseAdminClient() as any;

    // Fetch the country's local currency
    const { data: countryData, error: countryError } = await supabase
      .from("countries")
      .select("currency_code")
      .eq("id", countryId)
      .maybeSingle();
    
    if (countryError) throw new Error(countryError.message);
    const localCurrency = countryData?.currency_code?.trim().toUpperCase();

    const targetBranchCurrency = branchCurrency || localCurrency;
    const isUsdOrLocal = currency === "USD" || (localCurrency && currency === localCurrency);

    if (isUsdOrLocal) {
      let query = supabase
        .from("daily_usd_rates")
        .select(`
          selling_rate,
          buying_rate,
          credit_rate,
          debit_rate,
          rate_date,
          country_branch_id,
          updated_at,
          profiles:entered_by (
            full_name
          )
        `)
        .eq("country_id", countryId)
        .is("deleted_at", null)
        .order("rate_date", { ascending: false })
        .limit(10);

      if (countryBranchId) {
        query = query.or(`country_branch_id.eq.${countryBranchId},country_branch_id.is.null`);
      } else {
        query = query.is("country_branch_id", null);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      let row = null;
      if (Array.isArray(data) && data.length > 0) {
        // Sort in JS: latest rate_date first, then country_branch_id not null (branch specific) first
        data.sort((a: any, b: any) => {
          const dateComp = b.rate_date.localeCompare(a.rate_date);
          if (dateComp !== 0) return dateComp;
          if (a.country_branch_id && !b.country_branch_id) return -1;
          if (!a.country_branch_id && b.country_branch_id) return 1;
          return 0;
        });
        row = data[0];
      }

      const isSelfConversion = targetBranchCurrency ? currency === targetBranchCurrency : false;
      const rateVal = isSelfConversion ? 1 : toRate(row?.selling_rate ?? row?.buying_rate);

      return apiOk({
        rate: rateVal,
        buyRate: toRate(row?.buying_rate),
        sellRate: toRate(row?.selling_rate),
        creditRate: toRate(row?.credit_rate ?? row?.selling_rate),
        debitRate: toRate(row?.debit_rate ?? row?.buying_rate),
        effectiveDate: row?.rate_date ?? null,
        source: row ? "daily_usd_rates" : currency === "USD" ? "usd" : "default",
        lastUpdatedBy: row?.profiles?.full_name || "System"
      });
    }

    const { data, error } = await supabase
      .from("exchange_rate_history")
      .select(`
        new_rate,
        effective_date,
        created_at,
        profiles:changed_by (
          full_name
        )
      `)
      .eq("country_id", countryId)
      .eq("from_currency", currency)
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : null;
    return apiOk({
      rate: toRate(row?.new_rate),
      effectiveDate: row?.effective_date ?? null,
      source: row ? "exchange_rate_history" : "default",
      lastUpdatedBy: row?.profiles?.full_name || "System"
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = (await request.json()) as {
      countryId?: string;
      countryBranchId?: string | null;
      rateDate?: string;
      buyingRate?: number | string;
      sellingRate?: number | string;
      creditRate?: number | string;
      debitRate?: number | string;
    };

    const countryId = String(body.countryId ?? "").trim();
    if (!countryId) throw new Error("Country is required.");
    if (!session.isSuperAdmin && !session.countryIds.includes(countryId)) {
      throw new Error("You cannot update currency rates for another country.");
    }

    const countryBranchId = body.countryBranchId ? String(body.countryBranchId).trim() : null;
    const rateDate = String(body.rateDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    const buyingRate = toRate(body.buyingRate);
    const sellingRate = toRate(body.sellingRate);
    const creditRate = toRate(body.creditRate ?? body.sellingRate);
    const debitRate = toRate(body.debitRate ?? body.buyingRate);
    const admin = createSupabaseAdminClient() as any;
    const actorId = await resolveProfileActor(admin, session.userId);

    let existingQuery = admin
      .from("daily_usd_rates")
      .select("id, selling_rate")
      .eq("country_id", countryId)
      .eq("rate_date", rateDate)
      .is("deleted_at", null);

    if (countryBranchId) {
      existingQuery = existingQuery.eq("country_branch_id", countryBranchId);
    } else {
      existingQuery = existingQuery.is("country_branch_id", null);
    }

    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const payload = {
      country_id: countryId,
      country_branch_id: countryBranchId,
      rate_date: rateDate,
      buying_rate: buyingRate,
      selling_rate: sellingRate,
      credit_rate: creditRate,
      debit_rate: debitRate,
      entered_by: actorId,
      updated_at: new Date().toISOString()
    };

    if (!session.isSuperAdmin) {
      const targetId = existing?.id || crypto.randomUUID();
      const repo = new SupabaseApprovalsRepository();
      const service = new ApprovalService(repo);

      const approval = await service.requestApproval(session, {
        resource: "daily_usd_rates",
        action: "update",
        targetTable: "daily_usd_rates",
        targetId,
        countryId,
        countryBranchId,
        cityBranchId: null,
        reason: `Exchange rate update request via currency monitoring. Buying: ${buyingRate}, Selling: ${sellingRate}`,
        beforeData: existing || null,
        afterData: payload
      });

      return apiOk({
        status: "pending",
        message: "Exchange rate update request has been submitted to the Approval Queue for Admin approval.",
        approvalRequestId: approval.id,
        requestNo: approval.requestNo
      });
    }

    let saved;
    if (existing?.id) {
      const { data, error } = await admin.from("daily_usd_rates").update(payload).eq("id", existing.id).select("*").single();
      if (error) throw new Error(error.message);
      saved = data;
    } else {
      const { data, error } = await admin.from("daily_usd_rates").insert(payload).select("*").single();
      if (error) throw new Error(error.message);
      saved = data;
    }

    const { data: countryData } = await admin
      .from("countries")
      .select("currency_code")
      .eq("id", countryId)
      .maybeSingle();
    const fromCurrency = countryData?.currency_code || "LOCAL";

    await admin.from("exchange_rate_history").insert({
      country_id: countryId,
      from_currency: fromCurrency,
      to_currency: "USD",
      old_rate: existing?.selling_rate ?? null,
      new_rate: sellingRate,
      effective_date: rateDate,
      changed_by: actorId,
      reason: "Active country USD rate updated from ERP currency monitoring."
    });

    return apiOk({
      id: saved.id,
      countryId,
      rateDate,
      buyingRate,
      sellingRate,
      creditRate,
      debitRate
    });
  } catch (error) {
    return handleApiError(error);
  }
}
