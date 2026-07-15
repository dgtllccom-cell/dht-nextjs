import { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    authorizeApiScope(session, { resource: "whatsapp", action: "read" });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");           // open|assigned|resolved|spam|all
    const accountId = searchParams.get("accountId");
    const assignedUserId = searchParams.get("assignedUserId");
    const countryId = searchParams.get("countryId");
    const cityBranchId = searchParams.get("cityBranchId");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 25)));
    const offset = (page - 1) * limit;

    const supabase = await createServerSupabaseClient();

    let query = (supabase as any)
      .from("whatsapp_conversations")
      .select(`
        id, status, unread_count, last_message_text, last_message_at, last_message_dir,
        labels, created_at, updated_at,
        whatsapp_accounts:whatsapp_account_id(id, display_name, phone_number),
        whatsapp_contacts:contact_id(
          id, phone_number, wa_profile_name, display_name, customer_id, labels
        ),
        assigned_profiles:assigned_user_id(id, full_name),
        countries:country_id(id, name),
        city_branches:city_branch_id(id, name, city_name)
      `, { count: "exact" })
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Scope filters
    if (!session.isSuperAdmin) {
      if (session.cityBranchIds.length > 0) {
        query = query.in("city_branch_id", session.cityBranchIds);
      } else if (session.countryIds.length > 0) {
        query = query.in("country_id", session.countryIds);
      }
    }

    // Optional filters
    if (status && status !== "all") query = query.eq("status", status);
    if (accountId) query = query.eq("whatsapp_account_id", accountId);
    if (assignedUserId) query = query.eq("assigned_user_id", assignedUserId);
    if (countryId) query = query.eq("country_id", countryId);
    if (cityBranchId) query = query.eq("city_branch_id", cityBranchId);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    // Client-side search filter (contact name / phone)
    let results = data ?? [];
    if (search) {
      const s = search.toLowerCase();
      results = results.filter((conv: any) => {
        const contact = conv.whatsapp_contacts;
        return (
          contact?.display_name?.toLowerCase().includes(s) ||
          contact?.wa_profile_name?.toLowerCase().includes(s) ||
          contact?.phone_number?.includes(s) ||
          conv.last_message_text?.toLowerCase().includes(s)
        );
      });
    }

    return apiOk({
      conversations: results,
      pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
