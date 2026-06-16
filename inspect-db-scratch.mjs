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
  // Search functions for search terms
  console.log("--- Searching PG Functions ---");
  const functions = await sql.unsafe(
    `SELECT n.nspname as schema, p.proname as name, p.prosrc
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.prosrc ILIKE '%currency%' OR p.prosrc ILIKE '%matching%' OR p.prosrc ILIKE '%failure%'`
  );
  
  for (const f of functions) {
    if (f.prosrc.includes("currency") && (f.prosrc.includes("matching") || f.prosrc.includes("failure") || f.prosrc.includes("mismatch"))) {
      console.log(`Matched function: ${f.schema}.${f.name}`);
      console.log("Source snippet around match:");
      const lines = f.prosrc.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes("currency") || line.toLowerCase().includes("matching") || line.toLowerCase().includes("failure")) {
          console.log(`  Line ${idx+1}: ${line.trim()}`);
        }
      });
    }
  }

  // Search check constraints
  console.log("\n--- Searching Check Constraints ---");
  const constraints = await sql.unsafe(
    `SELECT conname, pg_get_constraintdef(oid) as def
     FROM pg_constraint
     WHERE contype = 'c'`
  );
  for (const c of constraints) {
    if (c.def.toLowerCase().includes("currency") || c.def.toLowerCase().includes("match")) {
      console.log(`Matched constraint ${c.conname}: ${c.def}`);
    }
  }

  // Search triggers
  console.log("\n--- Searching Triggers ---");
  const triggers = await sql.unsafe(
    `SELECT tgname, relname
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'`
  );
  console.log("Found triggers:", triggers.map(t => `${t.relname}: ${t.tgname}`));

} catch (e) {
  console.error(e);
} finally {
  await sql.end();
}


