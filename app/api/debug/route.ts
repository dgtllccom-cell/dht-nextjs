import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
    const { data, error } = await supabase.from('purchase_orders').select('id, purchase_order_no, country_id, payment_status, created_at, deleted_at').order('created_at', { ascending: false }).limit(5);
    return NextResponse.json({ ok: true, data, error });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
