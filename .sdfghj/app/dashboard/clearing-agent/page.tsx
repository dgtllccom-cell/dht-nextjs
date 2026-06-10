import Link from "next/link";
import type { Route } from "next";
import { ClipboardList } from "lucide-react";

export default function ClearingAgentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clearing Agent Dashboard</h1>
        <p className="text-sm text-muted-foreground">Clearing entries and billing.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={"/dashboard/clearing-agent/agent-custom-entry" as Route}
          className="rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-sm"
        >
          <ClipboardList className="mb-4 h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Agent Custom Entry</h2>
        </Link>
        <Link
          href={"/dashboard/clearing-agent/bill-entry" as Route}
          className="rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-sm"
        >
          <ClipboardList className="mb-4 h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Bill Entry</h2>
        </Link>
        <Link
          href={"/dashboard/clearing-agent/payment-bill-entry" as Route}
          className="rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-sm"
        >
          <ClipboardList className="mb-4 h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-semibold">Payment Bill Entry</h2>
        </Link>
      </div>
    </div>
  );
}

