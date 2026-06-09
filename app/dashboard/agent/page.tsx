import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, ClipboardCheck, ClipboardList, Clock, Container, FileText, RefreshCw, Ship, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";
import { getCurrentErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AssignmentRow = {
  id: string;
  assignment_no: string;
  title: string;
  message: string | null;
  status: string;
  due_at: string | null;
  target_type: string;
};

type ShipmentRow = {
  id: string;
  shipping_line_name: string;
  bl_number: string;
  container_number: string | null;
  vessel_name: string | null;
  eta: string | null;
  shipment_status: string;
};

type AgentDashboardData = {
  openAssignmentsCount: number;
  activeShipmentsCount: number;
  clearedShipmentsCount: number;
  assignments: AssignmentRow[];
  shipments: ShipmentRow[];
  databaseReady: boolean;
  error: string | null;
};

async function loadAgentDashboardData(userId: string): Promise<AgentDashboardData> {
  try {
    const supabase = createSupabaseAdminClient();

    const [
      openAssignmentsRes,
      activeShipmentsRes,
      clearedShipmentsRes,
      assignmentsListRes,
      shipmentsListRes
    ] = await Promise.all([
      supabase.from("erp_assignments").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]).is("deleted_at", null),
      supabase.from("shipping_bl_records").select("id", { count: "exact", head: true }).in("shipment_status", ["loaded", "in_transit", "draft"]).is("deleted_at", null),
      supabase.from("shipping_bl_records").select("id", { count: "exact", head: true }).in("shipment_status", ["cleared", "delivered"]).is("deleted_at", null),
      supabase
        .from("erp_assignments")
        .select("id, assignment_no, title, message, status, due_at, target_type")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("shipping_bl_records")
        .select("id, shipping_line_name, bl_number, container_number, vessel_name, eta, shipment_status")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8)
    ]);

    const openAssignmentsCount = openAssignmentsRes.count || 0;
    const activeShipmentsCount = activeShipmentsRes.count || 0;
    const clearedShipmentsCount = clearedShipmentsRes.count || 0;

    const assignments = (assignmentsListRes.data ?? []).map((row: any) => ({
      id: row.id,
      assignment_no: row.assignment_no,
      title: row.title,
      message: row.message,
      status: row.status,
      due_at: row.due_at,
      target_type: row.target_type
    }));

    const shipments = (shipmentsListRes.data ?? []).map((row: any) => ({
      id: row.id,
      shipping_line_name: row.shipping_line_name,
      bl_number: row.bl_number,
      container_number: row.container_number,
      vessel_name: row.vessel_name,
      eta: row.eta,
      shipment_status: row.shipment_status
    }));

    return {
      openAssignmentsCount,
      activeShipmentsCount,
      clearedShipmentsCount,
      assignments,
      shipments,
      databaseReady: true,
      error: null
    };
  } catch (error) {
    return {
      openAssignmentsCount: 0,
      activeShipmentsCount: 0,
      clearedShipmentsCount: 0,
      assignments: [],
      shipments: [],
      databaseReady: false,
      error: error instanceof Error ? error.message : "Failed to load clearing agent metrics"
    };
  }
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "completed" || value === "cleared" || value === "delivered"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
      : value === "open" || value === "in_progress" || value === "in_transit"
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
        : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

export default async function AgentDashboardPage() {
  const session = await getCurrentErpSession();

  if (!session) {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold">Authentication Scoping Error</h2>
            <p className="text-sm mt-1">Please log in to view the Clearing Agent dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await loadAgentDashboardData(session.userId);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-700/10 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/20">
              Operations Agent Scope
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Clearing Agent Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Clearance tracking, container status, clearing assignment tasks, and quick custom entry forms.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={"/dashboard/clearing-agent" as Route}>
              <ClipboardList className="mr-2 h-4 w-4" /> Go to Operations List
            </Link>
          </Button>
          <Button asChild>
            <Link href={"/dashboard/clearing-agent/agent-custom-entry" as Route}>
              Customs Entry Form
            </Link>
          </Button>
        </div>
      </section>

      {!data.databaseReady ? (
        <Card className="border-red-200 bg-red-50 text-red-900 dark:border-red-950/40 dark:bg-red-950/20 dark:text-red-300">
          <CardContent className="p-4 text-sm font-semibold">
            Operational dashboard data could not load: {data.error}
          </CardContent>
        </Card>
      ) : null}

      {/* Grid of stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Open Task Assignments" value={String(data.openAssignmentsCount)} icon={Clock} />
        <StatCard label="Shipments In Clearance" value={String(data.activeShipmentsCount)} icon={Ship} />
        <StatCard label="Cleared Shipments" value={String(data.clearedShipmentsCount)} icon={ClipboardCheck} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {/* Task Assignments list */}
        <Card className="xl:col-span-2 border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-500" /> Clearance Instructions & Assignments
            </CardTitle>
            <p className="text-xs text-muted-foreground">Priority clearance requests assigned to clearing agent branches.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.assignments.length ? (
                data.assignments.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition duration-150">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {task.assignment_no}
                          </span>
                          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-muted-foreground capitalize">
                            {task.target_type}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">{task.title}</p>
                        {task.message && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.message}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusPill value={task.status} />
                        {task.due_at && (
                          <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">
                            Due: {new Date(task.due_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground p-6 italic text-center">No clearance tasks assigned.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Shortcuts */}
        <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold">Quick Action Shortcuts</CardTitle>
            <p className="text-xs text-muted-foreground">Actionable entries for custom clearance agents.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { label: "Agent Custom Entry", desc: "Submit customs entry declarations", href: "/dashboard/clearing-agent/agent-custom-entry", icon: ClipboardList },
              { label: "Agent Billing Entries", desc: "Book operational clearing agent bills", href: "/dashboard/clearing-agent/bill-entry", icon: FileText },
              { label: "Agent Payments Booking", desc: "Log clearance payments and disbursements", href: "/dashboard/clearing-agent/payment-bill-entry", icon: ClipboardCheck }
            ].map((shortcut, idx) => (
              <Link key={idx} href={shortcut.href as Route} className="block group">
                <div className="rounded-lg border border-slate-200/80 p-4 hover:border-primary/80 transition duration-150 bg-card hover:bg-primary/[0.02] dark:border-slate-800/80 dark:hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/5 group-hover:bg-primary/10 p-2 rounded-md transition duration-150">
                      <shortcut.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-primary dark:text-slate-200 truncate">{shortcut.label}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition duration-150 shrink-0" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{shortcut.desc}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Scoped Shipping BL Records list */}
        <Card className="xl:col-span-3 border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Container className="h-5 w-5 text-indigo-500" /> Cargo Clearance & Shipments Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">Latest bills of lading and cargo container loads tracking logs.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-start font-semibold">BL Number</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Shipping Line</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Container Number</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Vessel / Voyage</th>
                    <th className="px-4 py-2.5 text-start font-semibold">ETA</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shipments.length ? (
                    data.shipments.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{row.bl_number}</td>
                        <td className="px-4 py-3 text-xs">{row.shipping_line_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{row.container_number || "N/A"}</td>
                        <td className="px-4 py-3 text-xs">{row.vessel_name || "N/A"}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{row.eta ? new Date(row.eta).toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3"><StatusPill value={row.shipment_status} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                        No bills of lading or container shipments found in system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
