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
  const columns = await sql.unsafe(
    `select column_name, data_type 
     from information_schema.columns 
     where table_schema='public' and table_name='enterprise_accounts'
     order by column_name`
  );
  console.log("enterprise_accounts columns:", columns);

  const ledgersColumns = await sql.unsafe(
    `select column_name, data_type 
     from information_schema.columns 
     where table_schema='public' and table_name='ledgers'
     order by column_name`
  );
  console.log("ledgers columns:", ledgersColumns);

  // Let's check profiles table
  const profilesCount = await sql.unsafe(
    `select count(*) as cnt from profiles`
  );
  console.log("profiles count:", profilesCount[0]);

  // Check a sample profile
  const sampleProfile = await sql.unsafe(
    `select * from profiles limit 1`
  );
  console.log("sample profile:", sampleProfile);

} catch (e) {
  console.error(e);
} finally {
  await sql.end();
}
