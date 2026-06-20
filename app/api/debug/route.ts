import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createSupabaseAdminClient() as any;

  const { data: constraints, error } = await admin.rpc("execute_sql", {
    sql_query: `
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'roznamcha_entries' AND c.conname = 'roznamcha_scope_chk';
    `
  });

  return NextResponse.json({ ok: true, constraints, error });
}
