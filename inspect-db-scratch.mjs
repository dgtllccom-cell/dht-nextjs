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

try {
  const entries = await sql.unsafe(
    `select id, entry_date, voucher_no, narration, status, deleted_at, super_admin_serial_number 
     from roznamcha_entries 
     order by created_at desc 
     limit 20`
  );
  console.log("Recent 20 roznamcha_entries:", entries);
} catch (e) {
  console.error(e);
} finally {
  await sql.end();
}
