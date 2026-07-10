import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cmd = "git log -p -n 3 features/reports/ledger-report/components/super-admin-detailed-ledger.tsx";
  try {
    const output = execSync(cmd, { encoding: "utf8" });
    const safeOutput = output.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return new Response(safeOutput, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error: any) {
    return new Response(`Error: ${error.message}\nStderr: ${error.stderr?.toString()}`, {
      headers: { "Content-Type": "text/plain" },
    });
  }
}
