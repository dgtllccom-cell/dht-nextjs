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
  const columns = await sql.unsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'enterprise_accounts'
  `);
  console.log("enterprise_accounts columns:", columns);
} catch (e) {
  console.error(e);
} finally {
  await sql.end();
}

