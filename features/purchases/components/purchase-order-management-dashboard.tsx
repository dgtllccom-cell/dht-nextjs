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
  Edit3,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Landmark,
  MoreVertical,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Ship,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

function PurchaseReportActionsMenu({ rows, onExport }: { rows: PurchaseReport[]; onExport: () => void }) {
  return (
    <details className="relative">
      <summary className="flex h-9 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 [&::-webkit-details-marker]:hidden" aria-label="Report actions" title="Report actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 text-sm text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <ActionItem icon={<Eye />} label="Plate View" onClick={() => undefined} />
        <ActionItem icon={<Download />} label="Download" onClick={onExport} />
        <ActionItem icon={<FileSpreadsheet />} label="Export Excel" onClick={onExport} />
        <ActionItem icon={<Download />} label="Export PDF" onClick={() => window.print()} />
        <ActionItem icon={<Printer />} label="Print" onClick={() => window.print()} />
        <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800">{rows.length} rows</div>
      </div>
    </details>
  );
}

function PurchaseRowActionsMenu({ onSelect, onEdit }: { onSelect: () => void; onEdit: () => void }) {
  return (
    <details className="relative inline-block">
      <summary className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 bg-background hover:bg-muted dark:border-slate-800 [&::-webkit-details-marker]:hidden" aria-label="Row actions" title="Row actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 text-sm text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <ActionItem icon={<Eye />} label="View Details" onClick={onSelect} />
        <ActionItem icon={<Edit3 />} label="Edit" onClick={onEdit} />
        <ActionItem icon={<Landmark />} label="Journal" onClick={onSelect} />
        <ActionItem icon={<WalletCards />} label="Payment History" onClick={onSelect} />
        <ActionItem icon={<Container />} label="Container Details" onClick={onSelect} />
        <ActionItem icon={<FileText />} label="Documents" onClick={onSelect} />
        <ActionItem icon={<ClipboardList />} label="Timeline" onClick={onSelect} />
        <ActionItem icon={<Printer />} label="Print" onClick={() => window.print()} />
        <ActionItem icon={<Download />} label="Export PDF" onClick={() => window.print()} />
      </div>
    </details>
  );
}

function ActionItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900">
      <span className="text-blue-600 dark:text-blue-300 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}

export function PurchaseOrderManagementDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState<PurchaseReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<LifecycleTab>("Dashboard Overview");
  const [session, setSession] = useState<any>(null);
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

  useEffect(() => {
    let cancelled = false;
    async function fetchSession() {
      try {
        const response = await fetch("/api/erp/auth/session");
        const body = await response.json();
        if (body?.ok && !cancelled) setSession(body.data);
      } catch (err) { console.error("Session load error:", err); }
    }
    fetchSession();
    return () => { cancelled = true; };
  }, []);

  const isSuperAdmin = useMemo(() => session ? (session.scopes?.isSuperAdmin || session.roles?.includes("super_admin")) : true, [session]);
  const isCountryAdmin = useMemo(() => session ? session.roles?.includes("country_admin") : false, [session]);
  const isBranchAdmin = useMemo(() => session ? session.roles?.some((r: string) => r === "main_branch_admin" || r === "city_branch_admin" || r === "branch_admin") : false, [session]);
  const allowedCountryId = session?.scopes?.countryIds?.[0] || null;
  const allowedBranchId = session?.scopes?.cityBranchIds?.[0] || session?.scopes?.countryBranchIds?.[0] || null;

  const lockedCountryName = useMemo(() => {
    if (isSuperAdmin || !allowedCountryId) return null;
    const match = reports.find((r: any) => r.workflow?.countryId === allowedCountryId);
    return match?.countryName || null;
  }, [reports, allowedCountryId, isSuperAdmin]);

  const lockedBranchName = useMemo(() => {
    if (isSuperAdmin || isCountryAdmin || !allowedBranchId) return null;
    const match = reports.find((r: any) => r.workflow?.cityBranchId === allowedBranchId || r.workflow?.countryBranchId === allowedBranchId);
    return match?.branchName || null;
  }, [reports, allowedBranchId, isSuperAdmin, isCountryAdmin]);

  useEffect(() => { if (lockedCountryName) setFilters((f) => ({ ...f, country: lockedCountryName })); }, [lockedCountryName]);
  useEffect(() => { if (lockedBranchName) setFilters((f) => ({ ...f, branch: lockedBranchName })); }, [lockedBranchName]);

  async function loadReports() {
    setLoading(true);
    setWarning("");
    try {
      const response = await fetch("/api/erp/purchases/booking-journal-report?limit=200", { cache: "no-store" });
      const body = await response.json();
      const payload = (body?.ok ? body.data : body) as ApiPayload;
      const rows = payload?.reports?.length ? payload.reports : sampleReports;
      
      // Sort reports descending so that the newest created PO appears at the top
      const sortedRows = [...rows].sort((a, b) => {
        const dateA = new Date(a.bookingDate || a.purchaseDate || a.createdAt).getTime();
        const dateB = new Date(b.bookingDate || b.purchaseDate || b.createdAt).getTime();
        return dateB - dateA;
      });

      setReports(sortedRows);
      setSelectedId((current) => current || sortedRows[0]?.id || "");
    } catch (error) {
      const sortedSample = [...sampleReports].sort((a, b) => {
        const dateA = new Date(a.bookingDate || a.purchaseDate || a.createdAt).getTime();
        const dateB = new Date(b.bookingDate || b.purchaseDate || b.createdAt).getTime();
        return dateB - dateA;
      });
      setReports(sortedSample);
      setSelectedId((current) => current || sortedSample[0]?.id || "");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadReports(); }, []);

  const options = useMemo(() => ({
    countries: unique(reports.map((row) => row.countryName)),
    branches: unique(
      reports
        .filter((row) => !lockedCountryName || row.countryName === lockedCountryName)
        .map((row) => row.branchName)
    ),
    suppliers: unique(reports.map((row) => row.supplierName)),
    poStatuses: unique(reports.map((row) => row.status)),
    paymentStatuses: unique(reports.map((row) => row.paymentStatus)),
    shipmentStatuses: unique(reports.map(shipmentStatus)),
    containerStatuses: ["Pending", "Container Loading", "In Transit", "Completed"],
    dateRanges: ["Today", "This Week", "This Month", "This Quarter", "This Year"]
  }), [reports, lockedCountryName]);

  const filtered = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return reports.filter((row) => {
      if (needle && ![row.purchaseBookingOrderNumber, row.purchaseAccountName, row.purchaseAccountNumber, row.salesAccountName, row.salesAccountNumber, row.supplierName, row.buyerName, row.productName, row.branchName, row.countryName, row.status, row.paymentStatus, shipmentStatus(row), inventoryStatus(row)].some((value) => String(value ?? "").toLowerCase().includes(needle))) return false;
      if (lockedCountryName && row.countryName !== lockedCountryName) return false;
      if (lockedBranchName && row.branchName !== lockedBranchName) return false;
      if (!lockedCountryName && filters.country !== "all" && row.countryName !== filters.country) return false;
      if (!lockedBranchName && filters.branch !== "all" && row.branchName !== filters.branch) return false;
      if (filters.supplier !== "all" && row.supplierName !== filters.supplier) return false;
      if (filters.poStatus !== "all" && row.status !== filters.poStatus) return false;
      if (filters.paymentStatus !== "all" && row.paymentStatus !== filters.paymentStatus) return false;
      if (filters.shipmentStatus !== "all" && shipmentStatus(row) !== filters.shipmentStatus) return false;
      if (filters.containerStatus !== "all" && shipmentStatus(row) !== filters.containerStatus) return false;
      if (activeTab !== "Dashboard Overview" && activeTab !== "Stock Management" && lifecycleStage(row) !== activeTab) return false;
      if (activeTab === "Stock Management" && !stockStage(row)) return false;
      return true;
    });
  }, [activeTab, filters, reports, searchText, lockedCountryName, lockedBranchName]);

  const selected = filtered.find((row) => row.id === selectedId) || filtered[0] || reports[0] || null;
  const containers = selected ? makeContainers(selected) : [];
  const loadedContainers = containers.filter((row) => row.status !== "Pending").length;
  const totals = useMemo(() => ({
    totalOrders: filtered.length,
    totalAmount: filtered.reduce((sum, row) => sum + Number(row.totalPurchaseAmount || 0), 0),
    totalAdvance: filtered.reduce((sum, row) => sum + advancePayment(row), 0),
    totalRemaining: filtered.reduce((sum, row) => sum + remainingPayment(row), 0),
    totalContainers: filtered.reduce((sum, row) => sum + Number(row.containerCount || 0), 0),
    inTransit: filtered.filter((row) => shipmentStatus(row) === "In Transit").length,
    pendingPayments: filtered.filter((row) => remainingPayment(row) > 0).length
  }), [filtered]);

  const lifecycleTotals = useMemo(() => ({
    bookings: reports.filter((row) => lifecycleStage(row) === "Booking Purchase Orders").length,
    confirmed: reports.filter((row) => lifecycleStage(row) === "Booking Confirm").length,
    payments: reports.reduce((sum, row) => sum + advancePayment(row), 0),
    loading: reports.filter((row) => lifecycleStage(row) === "Container Loading").length,
    finalized: reports.filter((row) => lifecycleStage(row) === "Finalized Purchase Orders").length,
    warehouse: reports.filter((row) => stockStage(row) === "Warehouse Stock").length,
    delivered: reports.filter((row) => stockStage(row) === "Delivered Stock").length
  }), [reports]);

  const branchSummary = useMemo(() => {
    const map = new Map<string, { branch: string; country: string; amount: number; containers: number; orders: number }>();
    for (const row of filtered) {
      if (lockedBranchName && row.branchName !== lockedBranchName) continue;
      if (lockedCountryName && row.countryName !== lockedCountryName) continue;
      const key = `${row.countryName}-${row.branchName}`;
      const current = map.get(key) ?? { branch: row.branchName, country: row.countryName, amount: 0, containers: 0, orders: 0 };
      current.amount += row.totalPurchaseAmount;
      current.containers += row.containerCount;
      current.orders += 1;
      map.set(key, current);
    }
    return [...map.values()].slice(0, 5);
  }, [filtered, lockedBranchName, lockedCountryName]);

  function resetFilters() {
    setSearchText("");
    setFilters({ country: lockedCountryName || "all", branch: lockedBranchName || "all", supplier: "all", poStatus: "all", paymentStatus: "all", shipmentStatus: "all", containerStatus: "all", dateRange: "all" });
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 text-white shadow-xl dark:border-slate-800">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-blue-400 border border-blue-500/20">Logistics ERP Master Console</span>
              {!isSuperAdmin && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Scoped Session Mode</span>}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Purchase Transfer Payment</h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">SAP S/4HANA style linear tracking of bookings, payment stages, container loads, customs clearance, and ledger integrations.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
            <div className="relative min-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search PO#, Supplier, Brand..." className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all shadow-inner" />
            </div>
            <Button size="sm" variant="outline" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="h-10 px-4 border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-200"><SlidersHorizontal className="mr-2 h-4 w-4" />Filter Matrix<ChevronDown className={cn("ml-1.5 h-4 w-4 transition", filtersOpen && "rotate-180")} /></Button>
            <Button size="sm" variant="outline" onClick={resetFilters} className="h-10 px-4 border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-200"><RefreshCw className="mr-2 h-4 w-4" />Reset</Button>
            <PurchaseReportActionsMenu rows={filtered} onExport={() => downloadCsv(filtered)} />
          </div>
        </div>
      </section>

      {filtersOpen ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-850 dark:bg-slate-900/60 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Country Scope</span>
              <select value={filters.country} disabled={!!lockedCountryName} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 outline-none transition disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <option value="all">All Countries</option>
                {options.countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Branch Scope</span>
              <select value={filters.branch} disabled={!!lockedBranchName} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 outline-none transition disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <option value="all">All Branches</option>
                {options.branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <SelectFilter label="Supplier Vendor" value={filters.supplier} options={options.suppliers} onChange={(v) => setFilters((f) => ({ ...f, supplier: v }))} />
            <SelectFilter label="Purchase Status" value={filters.poStatus} options={options.poStatuses} onChange={(v) => setFilters((f) => ({ ...f, poStatus: v }))} />
            <SelectFilter label="Payment Stages" value={filters.paymentStatus} options={options.paymentStatuses} onChange={(v) => setFilters((f) => ({ ...f, paymentStatus: v }))} />
            <SelectFilter label="Shipment Status" value={filters.shipmentStatus} options={options.shipmentStatuses} onChange={(v) => setFilters((f) => ({ ...f, shipmentStatus: v }))} />
            <SelectFilter label="Cargo Containers" value={filters.containerStatus} options={options.containerStatuses} onChange={(v) => setFilters((f) => ({ ...f, containerStatus: v }))} />
            <SelectFilter label="Date Period" value={filters.dateRange} options={options.dateRanges} onChange={(v) => setFilters((f) => ({ ...f, dateRange: v }))} />
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button size="sm" variant="outline" onClick={resetFilters}>Reset Matrix</Button>
            <Button size="sm" onClick={() => void loadReports()} className="bg-blue-600 hover:bg-blue-750 text-white"><RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />Sync Ledger Registry</Button>
          </div>
        </section>
      ) : null}

      {warning ? <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">{warning}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {lifecycleTabs.map((tab) => {
            const count = tab === "Dashboard Overview" ? reports.length : tab === "Stock Management" ? reports.filter(r => stockStage(r)).length : reports.filter(r => lifecycleStage(r) === tab).length;
            return (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn("whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-extrabold transition-all flex items-center gap-2", activeTab === tab ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25" : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300")}>
                {tab}
                <span className={cn("inline-flex h-5 items-center justify-center rounded-md px-1.5 text-[10px] font-black leading-none", activeTab === tab ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-350")}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        <DashboardCard icon={<ClipboardList className="h-5 w-5" />} label="Booking Pend" value={String(lifecycleTotals.bookings)} />
        <DashboardCard icon={<CheckCircle2 className="h-5 w-5" />} label="Confirmed PO" value={String(lifecycleTotals.confirmed)} />
        <DashboardCard icon={<Container className="h-5 w-5" />} label="Total Containers" value={String(totals.totalContainers)} />
        <DashboardCard icon={<BadgeDollarSign className="h-5 w-5" />} label="Total Purchase" value={`${money(totals.totalAmount)}`} />
        <DashboardCard icon={<WalletCards className="h-5 w-5" />} label="Remaining Due" value={`${money(totals.totalRemaining)}`} />
        <DashboardCard icon={<Ship className="h-5 w-5" />} label="Transit Cargo" value={String(totals.inTransit)} />
        <DashboardCard icon={<Landmark className="h-5 w-5" />} label="Warehouse Bal" value={String(lifecycleTotals.warehouse)} />
        <DashboardCard icon={<Boxes className="h-5 w-5" />} label="Delivered Bal" value={String(lifecycleTotals.delivered)} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeTab === "Dashboard Overview" ? "Purchase Order Master Report" : activeTab}</h2>
            <p className="text-xs text-slate-500">Connected Purchase Order Numbers map records from Booking registry down to finalized stock inventory.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black dark:border-slate-800 dark:bg-slate-900">Selected Rows: {filtered.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1550px] text-sm">
            <thead className="bg-black text-xs font-bold uppercase tracking-wider text-white">
              <tr>{["SR#", "Booking Order Number", "PO Number", "Date", "Country", "Branch Scope", "Supplier", "Goods Spec", "Qty Ordered", "Total Amount", "Total Payment", "Remaining Pay", "Containers", "Cargo Status", "Inventory Status", "Final Status", "Workflow Link"].map((header) => <th key={header} className="px-3.5 py-3.5 text-left border-b border-slate-800">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {filtered.map((row, index) => {
                const isPoSelected = selected?.id === row.id;
                const containerCount = Number(row.containerCount || 0);
                return (
                  <tr key={row.id} onClick={() => setSelectedId(row.id)} className={cn("cursor-pointer transition hover:bg-blue-50/40 dark:hover:bg-blue-950/10", isPoSelected && "bg-blue-50/60 dark:bg-blue-950/20 font-medium")}>
                    <td className="px-3.5 py-3.5 text-xs text-slate-400 font-mono">{index + 1}</td>
                    <td className="px-3.5 py-3.5 font-mono text-xs">BK-{row.purchaseBookingOrderNumber.replace(/[^0-9]/g, "").slice(-6) || String(index + 1).padStart(6, "0")}</td>
                    <td className="px-3.5 py-3.5 font-semibold text-blue-600 dark:text-blue-400">{row.purchaseBookingOrderNumber}</td>
                    <td className="px-3.5 py-3.5 text-xs">{date(row.purchaseDate)}</td>
                    <td className="px-3.5 py-3.5 font-semibold">{row.countryName}</td>
                    <td className="px-3.5 py-3.5 text-xs"><div className="font-semibold">{row.branchName}</div><div className="text-[10px] text-slate-400">{row.audit?.branchCode}</div></td>
                    <td className="px-3.5 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{row.supplierName}</td>
                    <td className="px-3.5 py-3.5 text-xs max-w-[150px] truncate" title={row.goodsDescription}>{row.productName}</td>
                    <td className="px-3.5 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{number(row.quantity)} {row.unit}</td>
                    <td className="px-3.5 py-3.5 font-bold text-slate-800 dark:text-slate-100">{money(row.totalPurchaseAmount)} {row.currency}</td>
                    <td className="px-3.5 py-3.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{money(advancePayment(row))}</td>
                    <td className="px-3.5 py-3.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">{money(remainingPayment(row))}</td>
                    <td className="px-3.5 py-3.5"><div className="flex items-center gap-1.5"><span className="font-bold text-slate-700 dark:text-slate-300">{containerCount}</span>{activeTab === "Container Loading" && <span className="text-[10px] text-slate-400">({loadedContainers} loaded)</span>}</div></td>
                    <td className="px-3.5 py-3.5"><StatusBadge label={shipmentStatus(row)} /></td>
                    <td className="px-3.5 py-3.5"><StatusBadge label={inventoryStatus(row)} /></td>
                    <td className="px-3.5 py-3.5"><StatusBadge label={row.status} /></td>
                    <td className="px-3.5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/purchase/new-purchase-booking-order?purchaseOrderNo=${row.purchaseBookingOrderNumber}`);
                          }}
                          className="p-1 rounded hover:bg-muted text-primary transition"
                          title="Edit Booking Order"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <PurchaseRowActionsMenu
                          onSelect={() => setSelectedId(row.id)}
                          onEdit={() => router.push(`/dashboard/purchase/new-purchase-booking-order?purchaseOrderNo=${row.purchaseBookingOrderNumber}`)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? <tr><td colSpan={17} className="px-4 py-16 text-center text-slate-500">No purchase order records match the selected dropdown filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


