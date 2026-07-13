import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: "DATABASE_URL not configured" });
    }

    const sql = postgres(databaseUrl, { max: 1, prepare: false });

    const ordersCount = await sql`SELECT count(*)::int as count FROM purchase_orders`;
    const loadingCount = await sql`SELECT count(*)::int as count FROM purchase_loading_records`;
    
    const recentOrders = await sql`
      SELECT id, purchase_order_no, country_id, country_branch_id, city_branch_id, ledger_posting_status, payment_status, remaining_due 
      FROM purchase_orders 
      LIMIT 10
    `;

    const recentLoading = await sql`
      SELECT id, loading_record_no, purchase_order_no, country_id, country_branch_id, city_branch_id, loading_status 
      FROM purchase_loading_records 
      LIMIT 10
    `;

    await sql.end();

    return NextResponse.json({
      success: true,
      counts: {
        orders: ordersCount[0]?.count ?? 0,
        loading: loadingCount[0]?.count ?? 0
      },
      recentOrders,
      recentLoading
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) });
  }
}
