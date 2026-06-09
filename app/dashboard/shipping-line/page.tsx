import Link from "next/link";
import type { Route } from "next";
import { FileText, Ship } from "lucide-react";

export default function ShippingLineDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shipping Line Dashboard</h1>
        <p className="text-sm text-muted-foreground">Shipping entries and documents.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href={"/dashboard/shipping-line/shipment-details" as Route}
          className="rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-sm"
        >
          <Ship className="mb-4 h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Shipment Details</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enter shipping line, vessel, voyage, ports, ETA and ETD.</p>
        </Link>
        <Link
          href={"/dashboard/shipping-line/shipment-report" as Route}
          className="rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-sm"
        >
          <FileText className="mb-4 h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Shipment Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">Shipment tracking, port, ETA/ETD and vessel status report.</p>
        </Link>
        <Link
          href={"/dashboard/shipping-line/agent-entry" as Route}
          className="rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-sm"
        >
          <FileText className="mb-4 h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Shipping Agent Entry</h2>
          <p className="mt-1 text-sm text-muted-foreground">Agent onboarding (placeholder).</p>
        </Link>
      </div>
    </div>
  );
}
