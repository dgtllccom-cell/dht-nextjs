import fs from "node:fs";
import postgres from "postgres";

function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

async function wipeTransactions() {
  try {
    console.log("Starting Transaction Data Wipe...");
    console.log("WARNING: This will permanently delete all transactions, ledgers, and purchase data.");
    
    // Start transaction
    await sql.begin(async sql => {
      
      // 1. Delete Purchase Payments and related dependencies
      console.log("Deleting Purchase Order Payments...");
      await sql`DELETE FROM purchase_order_payments`;
      
      // 2. Delete Purchase Orders
      console.log("Deleting Purchase Orders...");
      await sql`DELETE FROM purchase_orders`;

      // 3. Delete Sales Orders (If exists)
      console.log("Deleting Sales Orders (if exists)...");
      try {
        await sql`DELETE FROM sales_orders`;
      } catch (e) {
        // Table might not exist, ignore
      }

      // 4. Delete Roznamcha Entries and Lines
      console.log("Deleting Roznamcha Lines...");
      await sql`DELETE FROM roznamcha_lines`;
      
      console.log("Deleting Roznamcha Entries...");
      await sql`DELETE FROM roznamcha_entries`;

      // 5. Delete Ledger Entries and Balances
      console.log("Deleting Ledger Entries...");
      try {
        await sql`DELETE FROM ledger_entries`;
      } catch(e) {}
      
      console.log("Deleting Ledger Balances...");
      try {
        await sql`DELETE FROM ledger_balances`;
      } catch(e) {}

      console.log("Deleting Journal Lines and Entries...");
      try {
        await sql`DELETE FROM journal_lines`;
        await sql`DELETE FROM journal_entries`;
      } catch(e) {}

      console.log("Deleting General Transactions...");
      try {
        await sql`DELETE FROM transactions`;
      } catch(e) {}

      console.log("Deleting Cash Transactions...");
      try {
        await sql`DELETE FROM cash_transactions`;
      } catch(e) {}

      // 6. Reset Ledgers and Enterprise Accounts balances to 0
      console.log("Resetting Ledger Totals to 0...");
      try {
        await sql`UPDATE ledgers SET debit_total = 0, credit_total = 0, current_balance = 0`;
      } catch (e) {}

      console.log("Resetting Enterprise Accounts Balances to 0...");
      try {
        await sql`UPDATE enterprise_accounts SET current_balance = 0`;
      } catch (e) {}

      // 7. Delete Audit Logs
      console.log("Deleting Audit Logs...");
      try {
        await sql`DELETE FROM audit_logs WHERE entity_table IN ('purchase_orders', 'purchase_order_payments', 'roznamcha_entries', 'ledgers', 'enterprise_accounts', 'transactions')`;
      } catch(e) {}
      
      console.log("Transaction Data Wipe Complete!");
    });
    
  } catch(e) {
    console.error("Error during wipe:", e);
  } finally {
    await sql.end();
  }
}

wipeTransactions();
