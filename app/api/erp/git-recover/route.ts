import { execSync } from 'child_process';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const stdout = execSync('git checkout features/journal/components/purchase-order-payment-journal.tsx').toString();
    return NextResponse.json({ success: true, stdout });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stderr: error.stderr?.toString() });
  }
}
