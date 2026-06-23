import { NextResponse } from "next/server";
import postgres from "postgres";

export async function GET() {
  try {
    const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
    
    // Execute the NOTIFY command to reload PostgREST schema cache
    await sql`NOTIFY pgrst, 'reload schema'`;
    
    await sql.end();
    
    return NextResponse.json({ success: true, message: "Schema cache reloaded successfully!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
