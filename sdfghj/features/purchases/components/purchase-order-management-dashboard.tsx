"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Container,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Landmark,
  PackageCheck,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Ship,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PurchaseReport = {
  id: string;
  purchaseBookingOrderNumber: string;
  purchaseDate: string;
  bookingDate: string;
  purchaseAccountName: string;
  purchaseAccountNumber: string;
  salesAccountName: string;
  salesAccountNumber: string;
  supplierName: string;
  buyerName: string;
  productName: string;
  goodsDescription: string;
  quantity: number;
  unit: string;
  totalWeight: number;
  containerCount: number;
  purchaseRate: number;
  totalPurchaseAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  branchName: string;
  countryName: string;
  createdAt: string;
  audit: {
    userName: string;
    userId: string;
    branchCode: string;
  };
};

type ApiPayload = {
  reports: PurchaseReport[];
  selected: PurchaseReport | null;
  summary: {
    total: number;
    totalAmount: number;
    totalQuantity: number;
    totalContainers: number;
  };
  warning?: string;
};

const sampleReports: PurchaseReport[] = [
  {
    id: "sample-po-1",
    purchaseBookingOrderNumber: "PO-2026-0001",
    purchaseDate: "2026-01-02",
    bookingDate: "2026-01-02",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "Pistachio Kernels",
    goodsDescription: "Premium dry fruits container booking",
    quantity: 500,
    unit: "Boxes",
    totalWeight: 25000,
    containerCount: 10,
    purchaseRate: 250,
    totalPurchaseAmount: 125000,
    currency: "USD",
    status: "Booking Confirmed",
    paymentStatus: "Advance Paid",
    branchName: "Quetta Main Branch",
    countryName: "Pakistan",
    createdAt: "2026-01-02T10:00:00.000Z",
    audit: { userName: "Admin User", userId: "USR-001", branchCode: "QTA-001" }
  },
  {
    id: "sample-po-2",
    purchaseBookingOrderNumber: "PO-2026-0002",
    purchaseDate: "2026-01-04",
    bookingDate: "2026-01-04",
    purchaseAccountName: "Food Imports Purchase",
    purchaseAccountNumber: "PA-2201",
    salesAccountName: "Wholesale Sales Account",
    salesAccountNumber: "SA-4401",
    supplierName: "Global Food Traders",
    buyerName: "Damaan Pakistan",
    productName: "Chocolate",
    goodsDescription: "Chocolate cartons for wholesale branch inventory",
    quantity: 500,
    unit: "Boxes",
    totalWeight: 12000,
    containerCount: 4,
    purchaseRate: 100,
    totalPurchaseAmount: 50000,
    currency: "PKR",
    status: "Booking Pending",
    paymentStatus: "Pending",
    branchName: "Chaman City Branch",
    countryName: "Pakistan",
    createdAt: "2026-01-04T09:15:00.000Z",
    audit: { userName: "Branch User", userId: "USR-020", branchCode: "CH-CITY-001" }
  },
  {
    id: "sample-po-3",
    purchaseBookingOrderNumber: "PO-2026-0003",
    purchaseDate: "2026-01-08",
    bookingDate: "2026-01-08",
    purchaseAccountName: "FMCG Purchase Account",
    purchaseAccountNumber: "PA-3301",
    salesAccountName: "Dubai Sales Account",
    salesAccountNumber: "SA-3301",
    supplierName: "Dubai FMCG Wholesale",
    buyerName: "Damaan UAE",
    productName: "Biscuits",
    goodsDescription: "FMCG biscuit cartons for retail distribution",
    quantity: 700,
    unit: "Cartons",
    totalWeight: 15000,
    containerCount: 3,
    purchaseRate: 75,
    totalPurchaseAmount: 52500,
    currency: "AED",
    status: "Completed",
    paymentStatus: "Full Payment",
    branchName: "Dubai Main Branch",
    countryName: "UAE",
    createdAt: "2026-01-08T12:15:00.000Z",
    audit: { userName: "Admin User", userId: "USR-001", branchCode: "DXB-001" }
  }
];

const workflowSteps = [
  "Booking Purchase Order",
  "Booking Confirm",
  "Journal Entry",
  "Payment Transfer",
  "Advance Payment",
  "Confirmed Purchase Orders",
  "Container Loading",
  "Remaining Payment",
  "Shipping Documents",
  "Final Confirmation",
  "Inventory Entry",
  "Stock Available"
];

const lifecycleTabs = [
  "Dashboard Overview",
  "Booking Purchase Orders",
  "Booking Confirm",
  "Purchase Payment",
  "Container Loading",
  "Remaining Payment",
  "Finalized Purchase Orders",
  "Stock Management"
] as const;

type LifecycleTab = (typeof lifecycleTabs)[number];

const documentTypes = ["Invoice", "Packing List", "Bill of Lading", "Insurance", "Customs Documents", "Other Attachments"];

function money(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function number(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function date(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes("pending") || s.includes("draft") || s.includes("open")) return "red";
  if (s.includes("advance") || s.includes("confirmed") || s.includes("paid")) return "green";
  if (s.includes("transit")) return "yellow";
  if (s.includes("loading")) return "blue";
  if (s.includes("complete") || s.includes("closed") || s.includes("full")) return "black";
  return "blue";
}

function statusClass(status: string) {
  const tone = statusTone(status);
  if (tone === "red") return "border-red-400/40 bg-red-500/15 text-red-700 dark:text-red-300";
  if (tone === "green") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (tone === "yellow") return "border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (tone === "black") return "border-slate-500/50 bg-slate-900 text-white dark:bg-black";
  return "border-sky-400/40 bg-sky-500/15 text-sky-700 dark:text-sky-300";
}

function shipmentStatus(row: PurchaseReport) {
  const status = row.status.toLowerCase();
  if (status.includes("complete")) return "Completed";
  if (status.includes("transit")) return "In Transit";
  if (status.includes("loading")) return "Container Loading";
  if (status.includes("confirmed") || status.includes("partial")) return "Confirmed";
  return "Pending";
}

function lifecycleStage(row: PurchaseReport): LifecycleTab {
  const status = row.status.toLowerCase();
  const payment = row.paymentStatus.toLowerCase();
  const shipment = shipmentStatus(row);
  if (status.includes("complete") || status.includes("closed")) return "Finalized Purchase Orders";
  if (payment.includes("remaining")) return "Remaining Payment";
  if (shipment === "Container Loading" || shipment === "In Transit") return "Container Loading";
  if (payment.includes("advance") || payment.includes("invoice") || payment.includes("credit")) return "Purchase Payment";
  if (status.includes("confirmed")) return "Booking Confirm";
  return "Booking Purchase Orders";
}

function inventoryStatus(row: PurchaseReport) {
  if (row.status.toLowerCase().includes("complete")) return "Stock Available";
  if (shipmentStatus(row) === "In Transit") return "In Transit";
  if (shipmentStatus(row) === "Container Loading") return "Loading";
  return "Awaiting Inventory";
}

function stockStage(row: PurchaseReport) {
  const stage = lifecycleStage(row);
  if (stage === "Booking Purchase Orders") return "Booking Stock";
  if (stage === "Booking Confirm" || stage === "Purchase Payment") return "Confirmed Stock";
  if (stage === "Container Loading" || shipmentStatus(row) === "In Transit") return "In Transit Stock";
  if (stage === "Finalized Purchase Orders") return "Warehouse Stock";
  if (shipmentStatus(row) === "Completed") return "Delivered Stock";
  return "Booking Stock";
}

function remainingPayment(row: PurchaseReport) {
  const paid = row.paymentStatus.toLowerCase().includes("full")
    ? row.totalPurchaseAmount
    : row.paymentStatus.toLowerCase().includes("advance")
      ? row.totalPurchaseAmount * 0.3
      : 0;
  return Math.max(0, row.totalPurchaseAmount - paid);
}

function advancePayment(row: PurchaseReport) {
  if (row.paymentStatus.toLowerCase().includes("full")) return row.totalPurchaseAmount;
  if (row.paymentStatus.toLowerCase().includes("advance")) return row.totalPurchaseAmount * 0.3;
  return 0;
}

function makeContainers(row: PurchaseReport) {
  const total = Math.max(1, Math.min(12, Number(row.containerCount || 0) || 1));
  const loaded = shipmentStatus(row) === "Completed" ? total : shipmentStatus(row) === "Container Loading" || shipmentStatus(row) === "In Transit" ? Math.max(1, Math.floor(total / 2)) : 0;
  return Array.from({ length: total }).map((_, idx) => ({
    containerNumber: `CONT-${String(idx + 1).padStart(3, "0")}`,
    sealNumber: idx < loaded ? `SEAL-${row.purchaseBookingOrderNumber.slice(-4)}-${idx + 1}` : "-",
    size: idx % 2 ? "20 FT" : "40 FT",
    loadingDate: idx < loaded ? row.purchaseDate : "-",
    departureDate: idx < loaded ? row.purchaseDate : "-",
    arrivalDate: shipmentStatus(row) === "Completed" ? row.purchaseDate : "-",
    location: idx < loaded ? "Port / Transit" : row.branchName,
    status: idx < loaded ? shipmentStatus(row) : "Pending"
  }));
}

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(rows: PurchaseReport[]) {
  const headers = [
    "Serial No",
    "PO Number",
    "Date",
    "Country",
    "Branch",
    "Supplier",
    "Product",
    "Quantity",
    "Amount",
    "Advance Payment",
    "Remaining Payment",
    "Containers",
    "Shipment Status",
    "Inventory Status",
    "Final Status"
  ];
  const body = rows.map((row, index) =>
    [
      String(index + 1),
      row.purchaseBookingOrderNumber,
      date(row.purchaseDate),
      row.countryName,
      row.branchName,
      row.supplierName,
      row.productName,
      `${number(row.quantity)} ${row.unit}`,
      `${money(row.totalPurchaseAmount)} ${row.currency}`,
      `${money(advancePayment(row))} ${row.currency}`,
      `${money(remainingPayment(row))} ${row.currency}`,
      String(row.containerCount),
      shipmentStatus(row),
      inventoryStatus(row),
      row.status
    ].map(csvEscape).join(",")
  );
  const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `purchase-order-master-report-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DashboardCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="truncate text-xl font-bold text-slate-950 dark:text-white">{value}</p>
          {sub ? <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PurchaseOrderManagementDashboard() {
  const [reports, setReports] = useState<PurchaseReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LifecycleTab>("Dashboard Overview");
  const [filters, setFilters] = useState({
    country: "all",
    branch: "all",
    supplier: "all",
    poStatus: "all",
    paymentStatus: "all",
    shipmentStatus: "all",
    containerStatus: "all",
    dateRange: "all"
  });

  async function loadReports() {
    setLoading(true);
    setWarning("");
    try {
      const response = await fetch("/api/erp/purchases/booking-journal-report?limit=200", { cache: "no-store" });
      const body = await response.json();
      const payload = (body?.ok ? body.data : body) as ApiPayload;
      const rows = payload?.reports?.length ? payload.reports : sampleReports;
      setReports(rows);
      setSelectedId((current) => current || rows[0]?.id || "");
      setWarning(payload?.warning || (!payload?.reports?.length ? "No live purchase order records found. Showing ERP preview data until records are saved." : ""));
    } catch (error) {
      setReports(sampleReports);
      setSelectedId((current) => current || sampleReports[0]?.id || "");
      setWarning(error instanceof Error ? error.message : "Live API unavailable. Showing ERP preview data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stage = new URLSearchParams(window.location.search).get("stage");
    if (stage === "booking") setActiveTab("Booking Purchase Orders");
    if (stage === "confirm") setActiveTab("Booking Confirm");
    if (stage === "invoice") setActiveTab("Purchase Payment");
  }, []);

  const options = useMemo(
    () => ({
      countries: unique(reports.map((row) => row.countryName)),
      branches: unique(reports.map((row) => row.branchName)),
      suppliers: unique(reports.map((row) => row.supplierName)),
      poStatuses: unique(reports.map((row) => row.status)),
      paymentStatuses: unique(reports.map((row) => row.paymentStatus)),
      shipmentStatuses: unique(reports.map(shipmentStatus)),
      containerStatuses: ["Pending", "Container Loading", "In Transit", "Completed"],
      dateRanges: ["Today", "This Week", "This Month", "This Quarter", "This Year"]
    }),
    [reports]
  );

  const filtered = useMemo(() => {
    return reports.filter((row) => {
      if (filters.country !== "all" && row.countryName !== filters.country) return false;
      if (filters.branch !== "all" && row.branchName !== filters.branch) return false;
      if (filters.supplier !== "all" && row.supplierName !== filters.supplier) return false;
      if (filters.poStatus !== "all" && row.status !== filters.poStatus) return false;
      if (filters.paymentStatus !== "all" && row.paymentStatus !== filters.paymentStatus) return false;
      if (filters.shipmentStatus !== "all" && shipmentStatus(row) !== filters.shipmentStatus) return false;
      if (filters.containerStatus !== "all" && shipmentStatus(row) !== filters.containerStatus) return false;
      if (activeTab !== "Dashboard Overview" && activeTab !== "Stock Management" && lifecycleStage(row) !== activeTab) return false;
      if (activeTab === "Stock Management" && !stockStage(row)) return false;
      return true;
    });
  }, [activeTab, filters, reports]);

  const selected = filtered.find((row) => row.id === selectedId) || filtered[0] || reports[0] || null;
  const containers = selected ? makeContainers(selected) : [];
  const loadedContainers = containers.filter((row) => row.status !== "Pending").length;
  const totals = useMemo(() => {
    return {
      totalOrders: filtered.length,
      totalAmount: filtered.reduce((sum, row) => sum + Number(row.totalPurchaseAmount || 0), 0),
      totalAdvance: filtered.reduce((sum, row) => sum + advancePayment(row), 0),
      totalRemaining: filtered.reduce((sum, row) => sum + remainingPayment(row), 0),
      totalContainers: filtered.reduce((sum, row) => sum + Number(row.containerCount || 0), 0),
      inTransit: filtered.filter((row) => shipmentStatus(row) === "In Transit").length,
      pendingPayments: filtered.filter((row) => remainingPayment(row) > 0).length
    };
  }, [filtered]);

  const lifecycleTotals = useMemo(() => {
    return {
      bookings: reports.filter((row) => lifecycleStage(row) === "Booking Purchase Orders").length,
      confirmed: reports.filter((row) => lifecycleStage(row) === "Booking Confirm").length,
      payments: reports.reduce((sum, row) => sum + advancePayment(row), 0),
      loading: reports.filter((row) => lifecycleStage(row) === "Container Loading").length,
      finalized: reports.filter((row) => lifecycleStage(row) === "Finalized Purchase Orders").length,
      warehouse: reports.filter((row) => stockStage(row) === "Warehouse Stock").length,
      delivered: reports.filter((row) => stockStage(row) === "Delivered Stock").length
    };
  }, [reports]);

  const branchSummary = useMemo(() => {
    const map = new Map<string, { branch: string; country: string; amount: number; containers: number; orders: number }>();
    for (const row of filtered) {
      const key = `${row.countryName}-${row.branchName}`;
      const current = map.get(key) ?? { branch: row.branchName, country: row.countryName, amount: 0, containers: 0, orders: 0 };
      current.amount += row.totalPurchaseAmount;
      current.containers += row.containerCount;
      current.orders += 1;
      map.set(key, current);
    }
    return [...map.values()].slice(0, 5);
  }, [filtered]);

  function resetFilters() {
    setFilters({
      country: "all",
      branch: "all",
      supplier: "all",
      poStatus: "all",
      paymentStatus: "all",
      shipmentStatus: "all",
      containerStatus: "all",
      dateRange: "all"
    });
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/40">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">Purchase Management</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Purchase Order Management System</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Executive ERP dashboard for purchase orders, payments, containers, documents, and inventory flow.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Search / Filters
                <ChevronDown className={cn("ml-2 h-4 w-4 transition", filtersOpen && "rotate-180")} />
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadCsv(filtered)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {filtersOpen ? (
          <div className="border-t border-slate-200 p-5 dark:border-slate-800">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SelectFilter label="Country" value={filters.country} options={options.countries} onChange={(value) => setFilters((f) => ({ ...f, country: value }))} />
              <SelectFilter label="Branch" value={filters.branch} options={options.branches} onChange={(value) => setFilters((f) => ({ ...f, branch: value }))} />
              <SelectFilter label="Supplier" value={filters.supplier} options={options.suppliers} onChange={(value) => setFilters((f) => ({ ...f, supplier: value }))} />
              <SelectFilter label="Purchase Order Status" value={filters.poStatus} options={options.poStatuses} onChange={(value) => setFilters((f) => ({ ...f, poStatus: value }))} />
              <SelectFilter label="Payment Status" value={filters.paymentStatus} options={options.paymentStatuses} onChange={(value) => setFilters((f) => ({ ...f, paymentStatus: value }))} />
              <SelectFilter label="Shipment Status" value={filters.shipmentStatus} options={options.shipmentStatuses} onChange={(value) => setFilters((f) => ({ ...f, shipmentStatus: value }))} />
              <SelectFilter label="Container Status" value={filters.containerStatus} options={options.containerStatuses} onChange={(value) => setFilters((f) => ({ ...f, containerStatus: value }))} />
              <SelectFilter label="Date Range" value={filters.dateRange} options={options.dateRanges} onChange={(value) => setFilters((f) => ({ ...f, dateRange: value }))} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={resetFilters}>Reset</Button>
              <Button size="sm" onClick={() => void loadReports()}>
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Apply Search
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {warning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {warning}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {lifecycleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold transition",
                activeTab === tab
                  ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-background text-slate-600 hover:border-blue-300 dark:border-slate-800 dark:text-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
        <DashboardCard icon={<ClipboardList className="h-5 w-5" />} label="Total Booking Orders" value={String(lifecycleTotals.bookings)} />
        <DashboardCard icon={<CheckCircle2 className="h-5 w-5" />} label="Confirmed Orders" value={String(lifecycleTotals.confirmed)} />
        <DashboardCard icon={<Container className="h-5 w-5" />} label="Total Containers" value={String(totals.totalContainers)} />
        <DashboardCard icon={<BadgeDollarSign className="h-5 w-5" />} label="Total Payments" value={money(lifecycleTotals.payments)} />
        <DashboardCard icon={<Clock3 className="h-5 w-5" />} label="Pending Payments" value={String(totals.pendingPayments)} />
        <DashboardCard icon={<Ship className="h-5 w-5" />} label="In Transit Shipments" value={String(totals.inTransit)} />
        <DashboardCard icon={<Landmark className="h-5 w-5" />} label="Warehouse Stock" value={String(lifecycleTotals.warehouse)} />
        <DashboardCard icon={<Boxes className="h-5 w-5" />} label="Delivered Stock" value={String(lifecycleTotals.delivered)} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold">
              {activeTab === "Dashboard Overview" ? "Purchase Order Master Report" : activeTab}
            </h2>
            <p className="text-xs text-slate-500">
              Same serial number and purchase order number remains linked from booking to final stock entry.
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-semibold">Rows: {filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wide text-white">
              <tr>
                {[
                  "Serial No",
                  "Booking Number",
                  "PO Number",
                  "Date",
                  "Country",
                  "Branch",
                  "Supplier",
                  "Product",
                  "Quantity",
                  "Amount",
                  "Advance Payment",
                  "Remaining Payment",
                  "Containers",
                  "Shipment Status",
                  "Inventory Status",
                  "Final Status"
                ].map((header) => (
                  <th key={header} className="px-3 py-3 text-left">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={cn("cursor-pointer border-b border-slate-200 transition hover:bg-blue-50/70 dark:border-slate-800 dark:hover:bg-blue-950/20", selected?.id === row.id && "bg-blue-50 dark:bg-blue-950/30")}
                >
                  <td className="px-3 py-3">{index + 1}</td>
                  <td className="px-3 py-3 font-mono text-xs">BK-{row.purchaseBookingOrderNumber.replace(/[^0-9]/g, "").slice(-6) || String(index + 1).padStart(6, "0")}</td>
                  <td className="px-3 py-3 font-semibold text-blue-600 dark:text-blue-300">{row.purchaseBookingOrderNumber}</td>
                  <td className="px-3 py-3">{date(row.purchaseDate)}</td>
                  <td className="px-3 py-3">{row.countryName}</td>
                  <td className="px-3 py-3">{row.branchName}</td>
                  <td className="px-3 py-3">{row.supplierName}</td>
                  <td className="px-3 py-3">{row.productName}</td>
                  <td className="px-3 py-3">{number(row.quantity)} {row.unit}</td>
                  <td className="px-3 py-3">{money(row.totalPurchaseAmount)} {row.currency}</td>
                  <td className="px-3 py-3">{money(advancePayment(row))}</td>
                  <td className="px-3 py-3">{money(remainingPayment(row))}</td>
                  <td className="px-3 py-3">{row.containerCount}</td>
                  <td className="px-3 py-3"><StatusBadge label={shipmentStatus(row)} /></td>
                  <td className="px-3 py-3"><StatusBadge label={inventoryStatus(row)} /></td>
                  <td className="px-3 py-3"><StatusBadge label={row.status} /></td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={16} className="px-3 py-10 text-center text-slate-500">No purchase orders match the selected dropdown filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Purchase Order Workflow</h2>
                <p className="text-xs text-slate-500">{selected.purchaseBookingOrderNumber} · {selected.supplierName}</p>
              </div>
              <StatusBadge label={selected.status} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workflowSteps.map((step, index) => {
                const current = progressIndex(selected);
                const done = index <= current;
                return (
                  <div key={step} className={cn("rounded-xl border p-3", done ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40")}>
                    <div className="flex items-center gap-2">
                      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-slate-400" />}
                      <span className="text-xs font-semibold">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{step}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-base font-semibold">Purchase Order Lifecycle Profile</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <InfoRow label="Serial Number" value={selected.purchaseBookingOrderNumber.replace(/[^0-9]/g, "").slice(-4) || selected.id} />
              <InfoRow label="Purchase Order Number" value={selected.purchaseBookingOrderNumber} />
              <InfoRow label="Booking Stage" value={lifecycleStage(selected)} />
              <InfoRow label="Journal Entry" value={`JE-${selected.purchaseBookingOrderNumber.replace(/[^0-9]/g, "").slice(-6) || "000001"}`} />
              <InfoRow label="Debit Entry" value={`${selected.purchaseAccountName} / ${money(selected.totalPurchaseAmount)} ${selected.currency}`} />
              <InfoRow label="Credit Entry" value={`${selected.salesAccountName} / ${money(selected.totalPurchaseAmount)} ${selected.currency}`} />
              <InfoRow label="Advance Payment" value={`${money(advancePayment(selected))} ${selected.currency}`} />
              <InfoRow label="Remaining Payment" value={`${money(remainingPayment(selected))} ${selected.currency}`} />
              <InfoRow label="Total Containers" value={String(selected.containerCount)} />
              <InfoRow label="Total Amount" value={`${money(selected.totalPurchaseAmount)} ${selected.currency}`} />
              <InfoRow label="Documents Received" value={`${documentTypes.length - 1}/${documentTypes.length}`} />
              <InfoRow label="Final Arrival Confirmation" value={shipmentStatus(selected) === "Completed" ? "Confirmed" : "Pending"} />
              <InfoRow label="Payment Cleared" value={remainingPayment(selected) === 0 ? "Yes" : "No"} />
              <InfoRow label="Stock Status" value={stockStage(selected)} />
            </div>
          </section>
        </div>
      ) : null}

      {selected ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Purchase Order Payment Module</h2>
              <p className="text-xs text-slate-500">Payment records transfer to Journal -&gt; Purchase Order Payment while staying linked to {selected.purchaseBookingOrderNumber}.</p>
            </div>
            <StatusBadge label={remainingPayment(selected) > 0 ? "Payment Processing" : "Payment Completed"} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {[
              ["Advance Payment", money(advancePayment(selected))],
              ["Invoice Payment", selected.paymentStatus.includes("Invoice") ? money(selected.totalPurchaseAmount) : "0.00"],
              ["Credit Payment", selected.paymentStatus.includes("Credit") ? money(remainingPayment(selected)) : "0.00"],
              ["Remaining Payment", money(remainingPayment(selected))],
              ["Charges & Expenses", money(selected.containerCount * 250)],
              ["Payment History", selected.paymentStatus || "Pending"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {selected ? (
        <div className="grid gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-base font-semibold">Document Module</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {documentTypes.map((doc, index) => (
                <div key={doc} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className={cn("h-4 w-4", index < 5 ? "text-emerald-600" : "text-amber-500")} />
                    <span className="text-sm font-medium">{doc}</span>
                  </div>
                  <span className={cn("text-xs font-semibold", index < 5 ? "text-emerald-600" : "text-amber-500")}>{index < 5 ? "Received" : "Pending"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {selected ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Container Tracking Module</h2>
              <p className="text-xs text-slate-500">Loaded {loadedContainers} of {containers.length} containers linked to {selected.purchaseBookingOrderNumber}</p>
            </div>
            <StatusBadge label={loadedContainers === containers.length ? "Completed" : loadedContainers ? "Container Loading" : "Pending"} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-white">
                <tr>
                  {["Container Number", "Seal Number", "Container Size", "Loading Date", "Departure Date", "Arrival Date", "Current Location", "Transit Status"].map((header) => (
                    <th key={header} className="px-3 py-3 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {containers.map((row) => (
                  <tr key={row.containerNumber} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-3 font-semibold">{row.containerNumber}</td>
                    <td className="px-3 py-3">{row.sealNumber}</td>
                    <td className="px-3 py-3">{row.size}</td>
                    <td className="px-3 py-3">{date(row.loadingDate)}</td>
                    <td className="px-3 py-3">{date(row.departureDate)}</td>
                    <td className="px-3 py-3">{date(row.arrivalDate)}</td>
                    <td className="px-3 py-3">{row.location}</td>
                    <td className="px-3 py-3"><StatusBadge label={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-base font-semibold">Inventory Dashboard</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <MiniInventory label="Booking Stock" value={String(filtered.filter((r) => stockStage(r) === "Booking Stock").length)} icon={<ClipboardList className="h-4 w-4" />} />
            <MiniInventory label="Confirmed Stock" value={String(filtered.filter((r) => stockStage(r) === "Confirmed Stock").length)} icon={<CheckCircle2 className="h-4 w-4" />} />
            <MiniInventory label="In Transit" value={String(totals.inTransit)} icon={<Ship className="h-4 w-4" />} />
            <MiniInventory label="Warehouse Stock" value={String(filtered.filter((r) => inventoryStatus(r) === "Stock Available").length)} icon={<Landmark className="h-4 w-4" />} />
            <MiniInventory label="Import Stock" value={String(filtered.length)} icon={<PackageCheck className="h-4 w-4" />} />
            <MiniInventory label="Export Stock" value="0" icon={<Boxes className="h-4 w-4" />} />
            <MiniInventory label="Delivered Stock" value={String(filtered.filter((r) => shipmentStatus(r) === "Completed").length)} icon={<CheckCircle2 className="h-4 w-4" />} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-base font-semibold">Admin Dashboard</h2>
          <div className="mt-3 space-y-2">
            {branchSummary.map((row) => (
              <div key={`${row.country}-${row.branch}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{row.branch}</p>
                    <p className="text-xs text-slate-500">{row.country} · {row.orders} purchase orders</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{money(row.amount)}</p>
                    <p className="text-xs text-slate-500">{row.containers} containers</p>
                  </div>
                </div>
              </div>
            ))}
            {!branchSummary.length ? <p className="text-sm text-slate-500">No branch purchase activity for the selected filters.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", statusClass(label))}>{label || "-"}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed py-2 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function progressIndex(row: PurchaseReport) {
  const shipStatus = shipmentStatus(row);
  if (inventoryStatus(row) === "Stock Available") return 11;
  if (remainingPayment(row) === 0 && shipStatus === "Completed") return 10;
  if (shipStatus === "Completed") return 9;
  if (shipStatus === "In Transit") return 7;
  if (shipStatus === "Container Loading") return 6;
  if (row.status.toLowerCase().includes("confirmed")) return 5;
  if (advancePayment(row) > 0) return 4;
  if (row.paymentStatus && row.paymentStatus !== "-" && !row.paymentStatus.toLowerCase().includes("pending")) return 3;
  if (row.status.toLowerCase().includes("pending")) return 0;
  return 1;
}

function MiniInventory({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300">{icon}<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span></div>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
