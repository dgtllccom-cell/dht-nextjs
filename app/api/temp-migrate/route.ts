import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Migration endpoint is disabled." }, { status: 403 });
}
