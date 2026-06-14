import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action");
    const supabase = createSupabaseAdminClient() as any;

    if (action === "test") {
      const { data: countData, error } = await supabase
        .from("roznamcha_entries")
        .select("id")
        .is("deleted_at", null);
      
      return NextResponse.json({
        success: true,
        message: "Supabase connection is working!",
        total_entries: countData ? countData.length : 0,
        error: error ? error.message : null
      });
    }

    if (action === "inspect-serials") {
      const { data: sequences, error: seqErr } = await supabase
        .from("transaction_serial_sequences")
        .select("*");
      if (seqErr) throw new Error(seqErr.message);

      const { data: maxSA } = await supabase
        .from("roznamcha_entries")
        .select("super_admin_serial_number")
        .is("deleted_at", null)
        .order("super_admin_serial_number", { ascending: false })
        .limit(1);

      const { data: maxCountry } = await supabase
        .from("roznamcha_entries")
        .select("country_transaction_serial_number")
        .is("deleted_at", null)
        .order("country_transaction_serial_number", { ascending: false })
        .limit(1);

      const { data: maxBranch } = await supabase
        .from("roznamcha_entries")
        .select("branch_transaction_serial_number")
        .is("deleted_at", null)
        .order("branch_transaction_serial_number", { ascending: false })
        .limit(1);

      const { data: countData } = await supabase
        .from("roznamcha_entries")
        .select("id")
        .is("deleted_at", null);

      const { data: recent_entries } = await supabase
        .from("roznamcha_entries")
        .select("id, type, super_admin_serial_number, country_transaction_serial_number, branch_transaction_serial_number, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      return NextResponse.json({
        success: true,
        sequences,
        max_serials: {
          max_super_admin: maxSA?.[0]?.super_admin_serial_number || null,
          max_country: maxCountry?.[0]?.country_transaction_serial_number || null,
          max_branch: maxBranch?.[0]?.branch_transaction_serial_number || null,
          total_entries: countData ? countData.length : 0
        },
        recent_entries
      });
    }

    if (action === "sync-serials") {
      const { data: entries, error: entriesErr } = await supabase
        .from("roznamcha_entries")
        .select("super_admin_serial_number, country_transaction_serial_number, branch_transaction_serial_number, country_id, country_branch_id, city_branch_id")
        .is("deleted_at", null);
      
      if (entriesErr) throw new Error(entriesErr.message);

      const updates: any[] = [];

      const parseSerial = (serial: string | null) => {
        if (!serial) return null;
        const parts = serial.split("-");
        if (parts.length < 2) return null;
        const num = parseInt(parts[parts.length - 1], 10);
        return isNaN(num) ? null : num;
      };

      // 1. Global
      let maxGlobal = 0;
      for (const entry of entries) {
        const val = parseSerial(entry.super_admin_serial_number);
        if (val !== null && val > maxGlobal) {
          maxGlobal = val;
        }
      }

      if (maxGlobal > 0) {
        const { error: upsertErr } = await supabase
          .from("transaction_serial_sequences")
          .upsert({
            scope_type: "global",
            scope_key: "global",
            prefix: "SA",
            next_value: maxGlobal + 1,
            updated_at: new Date().toISOString()
          }, { onConflict: "scope_type,scope_key" });
        
        if (upsertErr) throw new Error(upsertErr.message);
        updates.push({ scope_type: 'global', scope_key: 'global', next_value: maxGlobal + 1 });
      }

      // 2. Country
      const countryMaxMap = new Map<string, { max: number, prefix: string }>();
      for (const entry of entries) {
        if (!entry.country_id || !entry.country_transaction_serial_number) continue;
        const val = parseSerial(entry.country_transaction_serial_number);
        if (val !== null) {
          const existing = countryMaxMap.get(entry.country_id);
          const prefix = entry.country_transaction_serial_number.split("-")[0] || "CNT";
          if (!existing || val > existing.max) {
            countryMaxMap.set(entry.country_id, { max: val, prefix });
          }
        }
      }

      for (const [countryId, info] of countryMaxMap.entries()) {
        const { error: upsertErr } = await supabase
          .from("transaction_serial_sequences")
          .upsert({
            scope_type: "country",
            scope_key: countryId,
            prefix: info.prefix,
            next_value: info.max + 1,
            updated_at: new Date().toISOString()
          }, { onConflict: "scope_type,scope_key" });
        
        if (upsertErr) throw new Error(upsertErr.message);
        updates.push({ scope_type: 'country', scope_key: countryId, next_value: info.max + 1 });
      }

      // 3. Branch
      const branchMaxMap = new Map<string, { max: number, prefix: string }>();
      for (const entry of entries) {
        const branchId = entry.city_branch_id ?? entry.country_branch_id;
        if (!branchId || !entry.branch_transaction_serial_number) continue;
        const val = parseSerial(entry.branch_transaction_serial_number);
        if (val !== null) {
          const existing = branchMaxMap.get(branchId);
          const prefix = entry.branch_transaction_serial_number.split("-")[0] || "BR";
          if (!existing || val > existing.max) {
            branchMaxMap.set(branchId, { max: val, prefix });
          }
        }
      }

      for (const [branchId, info] of branchMaxMap.entries()) {
        const { error: upsertErr } = await supabase
          .from("transaction_serial_sequences")
          .upsert({
            scope_type: "branch",
            scope_key: branchId,
            prefix: info.prefix,
            next_value: info.max + 1,
            updated_at: new Date().toISOString()
          }, { onConflict: "scope_type,scope_key" });

        if (upsertErr) throw new Error(upsertErr.message);
        updates.push({ scope_type: 'branch', scope_key: branchId, next_value: info.max + 1 });
      }

      return NextResponse.json({
        success: true,
        message: "Serials synced successfully using Supabase client",
        updates
      });
    }

    if (action === "test-post") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);
      
      const userId = profiles?.[0]?.id;
      if (!userId) throw new Error("No profiles found to act as user");

      // Fetch the two ledgers to get their enterprise_account_ids
      const { data: ledger1 } = await supabase
        .from("ledgers")
        .select("id, enterprise_account_id")
        .eq("id", "6eeeeb96-5bf8-466c-b1bf-95ea89d2dcf7")
        .single();

      const { data: ledger2 } = await supabase
        .from("ledgers")
        .select("id, enterprise_account_id")
        .eq("id", "a29e9b31-51a8-47fe-b3a4-d1abdab786b9")
        .single();

      const payload = {
        mode: "post",
        type: "branch",
        countryId: "dec26827-2ba2-4517-97cb-2d85729511a2",
        countryBranchId: "04723132-7910-413b-a3ea-48b78f73e071",
        cityBranchId: null,
        journalNo: "J-TEST-" + Math.floor(Math.random() * 100000),
        voucherNo: "V-TEST-" + Math.floor(Math.random() * 100000),
        entryDate: new Date().toISOString().split("T")[0],
        narration: "Test posting for Pakistan from diagnose",
        lines: [
          {
            paymentEntryType: "cash_receipt",
            enterpriseAccountId: ledger1?.enterprise_account_id || null,
            ledgerId: "6eeeeb96-5bf8-466c-b1bf-95ea89d2dcf7",
            description: "Receive from ASMATULLAH & CO",
            debit: 500,
            credit: 0,
            currency: "PKR",
            exchangeRate: 1
          },
          {
            paymentEntryType: "cash_receipt",
            enterpriseAccountId: ledger2?.enterprise_account_id || null,
            ledgerId: "a29e9b31-51a8-47fe-b3a4-d1abdab786b9",
            description: "Cash in Hand",
            debit: 0,
            credit: 500,
            currency: "PKR",
            exchangeRate: 1
          }
        ]
      };

      // Import the post logic
      const { postRoznamchaWithErpSession } = require("../erp/roznamcha/route");
      const result = await postRoznamchaWithErpSession({
        sessionUserId: userId,
        body: payload
      });

      return NextResponse.json({
        success: true,
        result
      });
    }

    if (action === "check-balances") {
      const { data: balances, error } = await supabase
        .from("ledger_balances")
        .select("id, ledger_id, balance_date, debit_total, credit_total");
      if (error) throw new Error(error.message);

      const countMap = new Map<string, any[]>();
      const duplicates: any[] = [];
      if (balances) {
        for (const b of balances) {
          const key = `${b.ledger_id}:${b.balance_date}`;
          if (!countMap.has(key)) {
            countMap.set(key, []);
          }
          countMap.get(key)!.push(b);
        }

        for (const [key, list] of countMap.entries()) {
          if (list.length > 1) {
            duplicates.push({ key, count: list.length, items: list });
          }
        }
      }

      return NextResponse.json({
        success: true,
        total_rows: balances?.length || 0,
        duplicates_count: duplicates.length,
        duplicates
      });
    }

    if (action === "search-files") {
      const fs = require("fs");
      const path = require("path");

      const results: string[] = [];
      const searchDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (file !== "node_modules" && file !== ".next" && file !== ".git") {
              searchDir(fullPath);
            }
          } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            const content = fs.readFileSync(fullPath, "utf8");
            if (content.includes("payment_entry_type") || content.includes("paymentEntryType")) {
              const lines = content.split("\n");
              lines.forEach((line, idx) => {
                if (line.includes("receive") || line.includes("Receive")) {
                  results.push(`${fullPath}:${idx + 1}: ${line.trim()}`);
                }
              });
            }
          }
        }
      };

      searchDir("c:/Users/dgtll/OneDrive/Documents/ACCOUNTS.DGT.LLC");
      return NextResponse.json({
        success: true,
        results
      });
    }

    if (action === "list-ledgers") {
      const { data: ledgers, error: ledgersErr } = await supabase
        .from("ledgers")
        .select("id, name, code, scope, country_id, country_branch_id, city_branch_id, is_active, currency")
        .is("deleted_at", null);
      if (ledgersErr) throw new Error(ledgersErr.message);

      const { data: countries } = await supabase
        .from("countries")
        .select("id, name, currency_code")
        .is("deleted_at", null);

      return NextResponse.json({
        success: true,
        ledgers,
        countries
      });
    }

    return NextResponse.json({
      success: true,
      message: "Please specify action=test, inspect-serials, sync-serials, or list-ledgers"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 200 }); // Status 200 to ensure we can read the body on error
  }
}
