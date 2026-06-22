import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
    }

    const sql = postgres(databaseUrl, { max: 1, prepare: false });

    // Check ifsupabase_migrations.schema_migrations exists
    const checkTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'supabase_migrations' 
        AND table_name = 'schema_migrations'
      )
    `.then(r => r[0].exists);

    let migrations = [];
    if (checkTable) {
      migrations = await sql`
        SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC
      `;
    }

    await sql.end();
    return NextResponse.json({
      success: true,
      hasMigrationsTable: checkTable,
      appliedMigrations: migrations.map(r => r.version)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
