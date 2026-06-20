import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function reload() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }
  const sql = postgres(dbUrl);
  try {
    await sql`NOTIFY pgrst, 'reload schema'`;
    console.log("PostgREST schema cache reloaded successfully via NOTIFY");
  } catch (err) {
    console.error("Failed to reload schema:", err);
  } finally {
    await sql.end();
  }
}
reload();
