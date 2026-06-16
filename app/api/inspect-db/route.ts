import { NextResponse } from "next/server";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
    }

    const sql = postgres(databaseUrl, { max: 1, prepare: false });

    // Apply the latest migration if it exists
    const migrationPath = path.join(process.cwd(), "supabase/migrations/0043_purchase_booking_transfer_with_actor.sql");
    let migrationResult = { applied: false, error: null as string | null };
    
    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, "utf8");
      try {
        await sql.unsafe(migrationSql);
        migrationResult = { applied: true, error: null };
      } catch (e: any) {
        migrationResult = { applied: false, error: e.message };
      }
    }

    // Verify the function was created
    const funcs = await sql`
      SELECT proname, pg_get_function_arguments(oid) as args
      FROM pg_proc 
      WHERE proname = 'post_purchase_booking_transfer'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `;

    await sql.end();
    return NextResponse.json({
      success: true,
      migration: migrationResult,
      functions: funcs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
