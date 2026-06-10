import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient } from "@/lib/api/supabase";
import { requireErpSession } from "@/lib/auth/session";
import { ledgerScopeSchema, optionalUuidSchema, scopeSchema } from "@/lib/api/erp-validation";

const updateSchema = scopeSchema.extend({
  scope: ledgerScopeSchema.optional(),
  parentId: optionalUuidSchema,
  code: z.string().trim().min(2).max(50).optional(),
  name: z.string().trim().min(2).max(200).optional(),
  kind: z.enum(["asset", "liability", "equity", "income", "expense"]).optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  openingBalance: z.coerce.number().finite().optional(),
  status: z.enum(["active", "archived"]).optional(),
  isControlAccount: z.coerce.boolean().optional()
});

type ApiSupabaseClient = Awaited<ReturnType<typeof createApiSupabaseClient>>;

async function loadAccount(supabase: ApiSupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("enterprise_accounts")
    .select(
      "id, scope, country_id, country_branch_id, city_branch_id, parent_id, code, name, kind, currency, opening_balance, current_balance, status, is_control_account, created_at, updated_at, deleted_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as
    | {
        id: string;
        scope: "super_admin" | "country" | "main_branch" | "city_branch";
        country_id: string | null;
        country_branch_id: string | null;
        city_branch_id: string | null;
        parent_id: string | null;
        code: string;
        name: string;
        kind: "asset" | "liability" | "equity" | "income" | "expense";
        currency: string;
        opening_balance: string | number;
        current_balance: string | number;
        status: "active" | "archived";
        is_control_account: boolean;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }
    | null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const { id } = await context.params;
    const supabase = await createApiSupabaseClient();
    const account = await loadAccount(supabase, id);

    if (!account || account.deleted_at) {
      return apiOk({ account: null }, { status: 404 });
    }

    authorizeApiScope(session, {
      resource: "accounts",
      action: "read",
      countryId: account.country_id,
      countryBranchId: account.country_branch_id,
      cityBranchId: account.city_branch_id
    });

    const { data: ledger, error: ledgerError } = await supabase
      .from("ledgers")
      .select("id, enterprise_account_id, parent_ledger_id, code, name, currency, opening_balance, current_balance, debit_total, credit_total, normal_balance, is_active, created_at, updated_at, deleted_at")
      .eq("enterprise_account_id", account.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (ledgerError) throw new Error(ledgerError.message);

    return apiOk({ account, ledger: ledger ?? null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const supabase = await createApiSupabaseClient();
    const current = await loadAccount(supabase, id);

    if (!current || current.deleted_at) {
      return apiOk({ account: null }, { status: 404 });
    }

    authorizeApiScope(session, {
      resource: "accounts",
      action: "update",
      countryId: body.countryId ?? current.country_id,
      countryBranchId: body.countryBranchId ?? current.country_branch_id,
      cityBranchId: body.cityBranchId ?? current.city_branch_id
    });

    const nextScope = body.scope ?? current.scope;
    const nextCountryId = body.countryId ?? current.country_id;
    const nextCountryBranchId = body.countryBranchId ?? current.country_branch_id;
    const nextCityBranchId = body.cityBranchId ?? current.city_branch_id;

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (body.scope) updatePayload.scope = body.scope;
    if (body.parentId !== undefined) updatePayload.parent_id = body.parentId;
    if (body.code !== undefined) updatePayload.code = body.code;
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.kind !== undefined) updatePayload.kind = body.kind;
    if (body.currency !== undefined) updatePayload.currency = body.currency;
    if (body.openingBalance !== undefined) {
      updatePayload.opening_balance = body.openingBalance;
      updatePayload.current_balance = body.openingBalance;
    }
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.isControlAccount !== undefined) updatePayload.is_control_account = body.isControlAccount;
    if (nextScope === "super_admin") {
      updatePayload.country_id = null;
      updatePayload.country_branch_id = null;
      updatePayload.city_branch_id = null;
    } else if (nextScope === "country") {
      updatePayload.country_id = nextCountryId;
      updatePayload.country_branch_id = null;
      updatePayload.city_branch_id = null;
    } else if (nextScope === "main_branch") {
      updatePayload.country_id = nextCountryId;
      updatePayload.country_branch_id = nextCountryBranchId;
      updatePayload.city_branch_id = null;
    } else {
      updatePayload.country_id = nextCountryId;
      updatePayload.country_branch_id = nextCountryBranchId;
      updatePayload.city_branch_id = nextCityBranchId;
    }

    const { data: updatedAccount, error: accountError } = await supabase
      .from("enterprise_accounts")
      .update(updatePayload)
      .eq("id", id)
      .select(
        "id, scope, country_id, country_branch_id, city_branch_id, parent_id, code, name, kind, currency, opening_balance, current_balance, status, is_control_account, created_at, updated_at, deleted_at"
      )
      .single();

    if (accountError) throw new Error(accountError.message);

    const ledgerUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.code !== undefined) ledgerUpdate.code = body.code;
    if (body.name !== undefined) ledgerUpdate.name = body.name;
    if (body.currency !== undefined) ledgerUpdate.currency = body.currency;
    if (body.openingBalance !== undefined) ledgerUpdate.opening_balance = body.openingBalance;
    if (body.status !== undefined) ledgerUpdate.is_active = body.status === "active";

    await supabase
      .from("ledgers")
      .update(ledgerUpdate)
      .eq("enterprise_account_id", id);

    return apiOk({ account: updatedAccount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const { id } = await context.params;
    const supabase = await createApiSupabaseClient();
    const current = await loadAccount(supabase, id);

    if (!current || current.deleted_at) {
      return apiOk({ deleted: false }, { status: 404 });
    }

    authorizeApiScope(session, {
      resource: "accounts",
      action: "delete",
      countryId: current.country_id,
      countryBranchId: current.country_branch_id,
      cityBranchId: current.city_branch_id
    });

    const timestamp = new Date().toISOString();
    const { error: accountError } = await supabase
      .from("enterprise_accounts")
      .update({
        status: "archived",
        deleted_at: timestamp,
        updated_at: timestamp
      })
      .eq("id", id);

    if (accountError) throw new Error(accountError.message);

    const { error: ledgerError } = await supabase
      .from("ledgers")
      .update({
        is_active: false,
        deleted_at: timestamp,
        updated_at: timestamp
      })
      .eq("enterprise_account_id", id);

    if (ledgerError) throw new Error(ledgerError.message);

    return apiOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
