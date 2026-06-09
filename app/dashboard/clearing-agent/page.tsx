import Link from "next/link";
import type { Route } from "next";
import { ClipboardList, FileText, Landmark, ShieldCheck, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClearingAgentDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-700/10 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/20">
              Clearance Module
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Clearing Agent Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage customs declarations, container bill entries, and clearance payment records.
          </p>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Custom Entry */}
        <Link href={"/dashboard/clearing-agent/agent-custom-entry" as Route} className="group">
          <Card className="h-full border border-slate-200/80 transition duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-md dark:border-slate-800 dark:hover:border-primary/50">
            <CardHeader className="p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition">Agent Custom Entry</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Log and track customs clearance declaration sheets, container release orders, and clearance dates.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <span>Open declaration forms</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition duration-200" />
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Bill Entry */}
        <Link href={"/dashboard/clearing-agent/bill-entry" as Route} className="group">
          <Card className="h-full border border-slate-200/80 transition duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-md dark:border-slate-800 dark:hover:border-primary/50">
            <CardHeader className="p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition">Bill Entry</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Book clearing agent freight invoices, port handling charges, customs duties, and secondary expenses.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Create invoice bookings</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition duration-200" />
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Payment Bill Entry */}
        <Link href={"/dashboard/clearing-agent/payment-bill-entry" as Route} className="group">
          <Card className="h-full border border-slate-200/80 transition duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-md dark:border-slate-800 dark:hover:border-primary/50">
            <CardHeader className="p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition group-hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400">
                <Landmark className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition">Payment Bill Entry</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Post customer payments, advance clearance deposits, duty payments, and agent bank cheque deposits.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-medium">
              <span>Record payment deposits</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition duration-200" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Auxiliary Help / Instructions card */}
      <Card className="border border-slate-200/60 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Customs Agent Guidelines</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              When registering customs clearance declarations, ensure that all BL (Bill of Lading) numbers precisely match the documents received from shipping lines. Secondary expenses and container holding fees must be booked under the respective Bill Entry to ensure accurate ledger balancing.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
