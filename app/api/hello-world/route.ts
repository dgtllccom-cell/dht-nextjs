import { NextResponse } from "next/server";
import { ledgerReportService } from "@/lib/services/ledger-report-service";

export async function GET() {
  try {
    const session = {
      userId: "7719341b-bfcb-4a31-b852-0f67e8062e95",
      isSuperAdmin: true,
      cityBranchIds: [],
      countryBranchIds: [],
      countryIds: []
    } as any;

    const ledgers = await ledgerReportService.listLedgers({
      session,
      reportScope: "branch",
      countryId: "7b757efe-7aea-4e9e-9cc4-34b2e842958f",
      countryBranchId: "a7a7f280-825b-4fdd-8205-78e224a17100",
      cityBranchId: "18ca382f-928c-42bf-9c4a-4db301679e8b",
      limit: 250
    });

    return NextResponse.json({
      success: true,
      ledgersCount: ledgers.length,
      ledgers: ledgers.map(l => ({
        ledgerId: l.ledgerId,
        ledgerCode: l.ledgerCode,
        ledgerName: l.ledgerName,
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
