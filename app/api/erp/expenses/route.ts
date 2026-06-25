import { NextResponse } from "next/server";
import { getErpSessionFromCookies } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { z } from "zod";

const expensesBillLineSchema = z.object({
  rowSerial: z.number(),
  details: z.string().min(1),
  qty: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  amount: z.number(),
  currency: z.string().min(2).max(10),
  operation: z.string(),
  exchangeRate: z.number().positive(),
  finalAmount: z.number(),
  taxOn: z.boolean(),
  taxPct: z.number().nonnegative(),
  taxAmt: z.number().nonnegative(),
  grandAmount: z.number()
});

const expensesBillPayloadSchema = z.object({
  header: z.object({
    billSerial: z.string().min(1),
    branch: z.string().min(1),
    billDate: z.string().date(),
    billMode: z.string(),
    billTitle: z.string(),
    referenceNo: z.string().nullable().optional()
  }),
  entries: z.array(expensesBillLineSchema).min(1)
});

export async function POST(req: Request) {
  try {
    const session = await getErpSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = expensesBillPayloadSchema.parse(body);
    const { header, entries } = parsed;

    const supabase = createSupabaseAdminClient() as any;

    // Begin simulated transaction by inserting header then lines
    const { data: billData, error: billError } = await supabase
      .from("expenses_bills")
      .insert({
        serial_no: header.billSerial,
        branch_id: header.branch,
        bill_date: header.billDate,
        bill_mode: header.billMode,
        bill_title: header.billTitle,
        reference_no: header.referenceNo || null,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (billError) throw new Error("Failed to insert bill header: " + billError.message);

    const billId = billData.id;

    const linesToInsert = entries.map((e) => ({
      bill_id: billId,
      row_serial: e.rowSerial,
      details: e.details,
      qty: e.qty,
      unit_price: e.unitPrice,
      amount: e.amount,
      currency: e.currency,
      operation: e.operation,
      exchange_rate: e.exchangeRate,
      final_amount: e.finalAmount,
      tax_on: e.taxOn,
      tax_pct: e.taxPct,
      tax_amt: e.taxAmt,
      grand_amount: e.grandAmount,
      created_at: new Date().toISOString()
    }));

    const { error: linesError } = await supabase.from("expenses_bill_lines").insert(linesToInsert);
    if (linesError) throw new Error("Failed to insert bill lines: " + linesError.message);

    return NextResponse.json({ success: true, billId });
  } catch (err: any) {
    console.error("Expenses POST Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save expenses bill" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getErpSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseAdminClient() as any;
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 50);

    const { data, error } = await supabase
      .from("expenses_bills")
      .select("*, expenses_bill_lines(*)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return NextResponse.json({ bills: data });
  } catch (err: any) {
    console.error("Expenses GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch expenses bills" }, { status: 500 });
  }
}
