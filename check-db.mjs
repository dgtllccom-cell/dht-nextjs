import postgres from 'postgres';

const dbUrl = "postgresql://postgres.csesvyxxjivnkkozgopt:Gulistan%409090@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";

async function checkDB() {
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log("Checking roznamcha entries...");
    const entries = await sql`SELECT id, journal_no, status, city_branch_id, branch_transaction_serial_number FROM roznamcha_entries ORDER BY created_at DESC LIMIT 5;`;
    console.log("Entries:", entries);

    console.log("Checking roznamcha lines...");
    const lines = await sql`SELECT entry_id, ledger_id, debit, credit, branch_transaction_serial_number FROM roznamcha_lines ORDER BY id DESC LIMIT 10;`;
    console.log("Lines:", lines);
    
    console.log("Checking purchase order payments...");
    const payments = await sql`SELECT id, purchase_order_id, roznamcha_entry_id FROM purchase_order_payments ORDER BY created_at DESC LIMIT 5;`;
    console.log("Payments:", payments);

  } catch (err) {
    console.error("❌ Failed:", err);
  } finally {
    await sql.end();
  }
}

checkDB();
