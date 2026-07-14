"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  MapPinned,
  PackageCheck,
  RefreshCw,
  Search,
  Ship,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LogisticsShipment = {
  id: string;
  shippingLineName: string;
  blNumber: string;
  containerNumber: string;
  vesselName: string;
  eta: string;
  status: string;
};

export type LogisticsTask = {
  id: string;
  assignmentNo: string;
  title: string;
  message: string;
  status: string;
  dueAt: string;
  targetType: string;
};

export type LogisticsDashboardData = {
  assignedShipments: number;
  pendingClearance: number;
  inTransit: number;
  trackedContainers: number;
  documents: number;
  delivered: number;
  completedShipments: number;
  pendingTasks: number;
  notifications: number;
  shipments: LogisticsShipment[];
  tasks: LogisticsTask[];
  databaseReady: boolean;
  error?: string | null;
};

const statusColors = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed"];

const quickActions = [
  { label: "Shipment Details", href: "/dashboard/shipping-line/shipment-details", icon: Ship },
  { label: "Shipment Report", href: "/dashboard/shipping-line/shipment-report", icon: FileText },
  { label: "Shipping Agent Entry", href: "/dashboard/shipping-line/shipping-agent-entry", icon: Truck },
  { label: "Agent Custom Entry", href: "/dashboard/clearing-agent/agent-custom-entry", icon: ShieldCheck },
  { label: "Bill Entry", href: "/dashboard/clearing-agent/bill-entry", icon: ClipboardList },
  { label: "Payment Bill Entry", href: "/dashboard/clearing-agent/payment-bill-entry", icon: PackageCheck },
];

function formatStatus(status: string) {
  return (status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadgeClass(status: string) {
  const normalized = (status || "").toLowerCase();
  if (["delivered", "cleared", "completed"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["delayed", "overdue", "blocked"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["in_transit", "loaded", "sailing"].includes(normalized)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function KpiCard({
  title,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  caption: string;
  icon: typeof Ship;
  tone: "blue" | "green" | "amber" | "rose" | "purple" | "slate";
}) {
  const toneMap = {
    blue: "from-blue-50 to-white text-blue-700 ring-blue-100",
    green: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-100",
    purple: "from-violet-50 to-white text-violet-700 ring-violet-100",
    slate: "from-slate-50 to-white text-slate-700 ring-slate-100",
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${toneMap[tone]} p-4 shadow-sm ring-1`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{caption}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function LogisticsDashboardOverview({ data }: { data: LogisticsDashboardData }) {
  const statusData = [
    { name: "Assigned", value: data.assignedShipments },
    { name: "In Transit", value: data.inTransit },
    { name: "Pending", value: data.pendingClearance },
    { name: "Delivered", value: data.delivered },
    { name: "Tasks", value: data.pendingTasks },
  ].filter((item) => item.value > 0);

  const trendData = [
    { name: "Assigned", value: data.assignedShipments },
    { name: "Pending", value: data.pendingClearance },
    { name: "Tracking", value: data.trackedContainers },
    { name: "Delivered", value: data.delivered },
    { name: "Completed", value: data.completedShipments },
  ];

  const progressData = [
    { name: "Documents", value: data.documents },
    { name: "Containers", value: data.trackedContainers },
    { name: "Notifications", value: data.notifications },
    { name: "Tasks", value: data.pendingTasks },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-6 text-white lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-100 ring-1 ring-white/15">
              <Ship className="h-4 w-4" />
              Logistics Command Center
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Clearing Agent & Shipping Line Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
              One shared workspace for assigned shipments, clearance work, container tracking,
              documents, delivery status, pending tasks, and operational notifications.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="text-xs font-semibold uppercase text-blue-100">Live Shipments</p>
              <p className="mt-2 text-3xl font-black">{data.assignedShipments}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="text-xs font-semibold uppercase text-blue-100">Pending Tasks</p>
              <p className="mt-2 text-3xl font-black">{data.pendingTasks}</p>
            </div>
          </div>
        </div>
      </section>

      {!data.databaseReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Logistics data tables are not fully ready yet. Showing the dashboard shell with available data.
          {data.error ? ` ${data.error}` : ""}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Assigned Shipments" value={data.assignedShipments} caption="Open logistics workload" icon={Boxes} tone="blue" />
        <KpiCard title="Pending Clearance" value={data.pendingClearance} caption="Needs clearance action" icon={AlertTriangle} tone="amber" />
        <KpiCard title="Shipping Status" value={data.inTransit} caption="Currently in transit" icon={Ship} tone="purple" />
        <KpiCard title="Container Tracking" value={data.trackedContainers} caption="Containers with tracking" icon={MapPinned} tone="green" />
        <KpiCard title="Documents" value={data.documents} caption="BL and shipment records" icon={FileText} tone="slate" />
        <KpiCard title="Delivery Status" value={data.delivered} caption="Delivered or released" icon={CheckCircle2} tone="green" />
        <KpiCard title="Completed Shipments" value={data.completedShipments} caption="Closed logistics files" icon={PackageCheck} tone="blue" />
        <KpiCard title="Notifications" value={data.notifications} caption="Open system alerts" icon={Bell} tone="rose" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Shipment & Clearance Trend</h2>
              <p className="text-xs text-slate-500">Operational movement by current stage</p>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="logisticsTrend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#logisticsTrend)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-950">Status Mix</h2>
            <p className="text-xs text-slate-500">Shipment status distribution</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData.length ? statusData : [{ name: "No Data", value: 1 }]} dataKey="value" innerRadius={55} outerRadius={92} paddingAngle={3}>
                  {(statusData.length ? statusData : [{ name: "No Data", value: 1 }]).map((entry, index) => (
                    <Cell key={entry.name} fill={statusData.length ? statusColors[index % statusColors.length] : "#cbd5e1"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-950">Quick Actions</h2>
            <p className="text-xs text-slate-500">Common logistics workflows</p>
          </div>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href as any}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </span>
                  <span>{"->"}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-black text-slate-950">Shipment Operations</h2>
              <p className="text-xs text-slate-500">Container, vessel, ETA and delivery status</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Search className="h-4 w-4" />
              Search and filters ready
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">BL No</th>
                  <th className="px-4 py-3">Shipping Line</th>
                  <th className="px-4 py-3">Container</th>
                  <th className="px-4 py-3">Vessel</th>
                  <th className="px-4 py-3">ETA</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.shipments.length ? (
                  data.shipments.map((shipment) => (
                    <tr key={shipment.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/70 hover:bg-blue-50/60">
                      <td className="px-4 py-3 font-black text-blue-700">{shipment.blNumber || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{shipment.shippingLineName || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{shipment.containerNumber || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{shipment.vesselName || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{shipment.eta || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusBadgeClass(shipment.status)}`}>
                          {formatStatus(shipment.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-400">
                      No logistics shipments found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Pending Tasks</h2>
              <p className="text-xs text-slate-500">Clearance and shipping follow-ups</p>
            </div>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="space-y-3">
            {data.tasks.length ? (
              data.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{task.title || task.assignmentNo || "Assignment"}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.message || task.targetType || "Pending logistics task"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${statusBadgeClass(task.status)}`}>
                      {formatStatus(task.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Due: {task.dueAt || "Not scheduled"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-3 text-sm font-black text-slate-700">No pending tasks</p>
                <p className="mt-1 text-xs text-slate-400">New assignments will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Documents, Containers & Alerts</h2>
            <p className="text-xs text-slate-500">Compact management view for operational control</p>
          </div>
          <RefreshCw className="h-5 w-5 text-slate-500" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}


