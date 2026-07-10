import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cmd = searchParams.get("cmd") || "git status";
  try {
    const output = execSync(cmd, { encoding: "utf8" });
    return NextResponse.json({ success: true, cmd, output });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      cmd,
      error: error.message,
      stderr: error.stderr?.toString(),
    });
  }
}
