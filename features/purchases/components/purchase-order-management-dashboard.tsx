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
  Mail,
  MessageSquare,
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
import { openPurchaseA4ReportWindow } from "@/lib/reports/open-purchase-a4-report-window";
import { DetailDrawer } from "@/components/ui/detail-drawer";

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
  totalGrossWeight?: number;
  totalNetWeight?: number;
  purchaseAmount?: number;
  finalAmount?: number;
  form_data?: any;
  supplier_company_id?: string;
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

function openReportWindow(report: PurchaseReport, autoPrint: boolean) {
  openPurchaseA4ReportWindow({
    title: "Purchase Booking Order",
    subtitle: "DGT Accounts Purchase Registry",
    purchaseData: {
      ...report,
      audit: report.audit || { userName: "Admin User", userId: "USR-001", branchCode: "QTA-001" }
    },
    autoPrint
  });
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

function StatusBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
        statusClass(label)
      )}
    >
      {label}
    </span>
  );
}

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(rows: PurchaseReport[]) {
  const headers = [
    "Global Serial Number",
    "Company Serial Number",
    "Branch Serial Number",
    "Booking Date",
    "Created By (User Name)",
    "Purchase Code",
    "Sales Code",
    "Goods Description",
    "Origin Country",
    "Total Quantity",
    "Total Gross Weight",
    "Total Net Weight",
    "Purchase Amount",
    "Final Amount",
    "Status"
  ];
  const body = rows.map((row, index) =>
    [
      String(index + 1),
      row.form_data?.form?.companyCode || "COM-" + (row.supplier_company_id?.slice(0, 4).toUpperCase() || "DGT"),
      row.audit?.branchCode || "-",
      date(row.bookingDate || row.purchaseDate || row.createdAt),
      row.audit?.userName || "-",
      row.purchaseBookingOrderNumber,
      row.form_data?.form?.salesOrderNo || "-",
      row.goodsDescription || "-",
      row.form_data?.goodsEntries?.[0]?.origin || row.countryName || "-",
      `${number(row.quantity)} ${row.unit}`,
      `${number(row.totalGrossWeight)} kg`,
      `${number(row.totalNetWeight)} kg`,
      `${money(row.purchaseAmount)} ${row.currency}`,
      `${money(row.finalAmount)} ${row.form_data?.form?.secondaryCurrency?.split(" ")[0] || "PKR"}`,
      row.status
    ].map(csvEscape).join(",")
  );
  const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `purchase-transfer-master-report-${new Date().toISOString().slice(0, 10)}.csv`;
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

function PurchaseRowActionsMenu({ onSelect, onEdit, onPrint, onExportPdf }: { onSelect: () => void; onEdit: () => void; onPrint: () => void; onExportPdf: () => void }) {
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
        <ActionItem icon={<Printer />} label="Print" onClick={onPrint} />
        <ActionItem icon={<Download />} label="Export PDF" onClick={onExportPdf} />
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
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
  const [transferDropdownOpen, setTransferDropdownOpen] = useState(false);
  const [moreActionsDropdownOpen, setMoreActionsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) {
      setTransferDropdownOpen(false);
      setMoreActionsDropdownOpen(false);
    }
  }, [isDrawerOpen]);

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

  const handleTransfer = async () => {
    if (!selected) return;
    setTransferring(true);
    try {
      const updatedFormData = {
        ...(selected.form_data || {}),
        workflow: {
          ...(selected.form_data?.workflow || {}),
          lifecycleStatus: "Booking Confirmed",
          paymentStatus: "Advance Paid"
        }
      };

      const response = await fetch(`/api/erp/purchases/orders/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: updatedFormData,
          ledgerPostingStatus: "Posted",
          paymentStatus: "Partial"
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Transfer failed.");
      }

      setIsDrawerOpen(false);
      await loadReports();
      alert("Purchase Booking transferred and posted successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error transferring booking.");
    } finally {
      setTransferring(false);
    }
  };

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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-center">
          
          {/* Left Column: Title & Description */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900">
                Logistics ERP Master Console
              </span>
              {!isSuperAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Scoped Session Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Purchase Transfer Payment
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              SAP S/4HANA style linear tracking of bookings, payment stages, container loads, customs clearance, and ledger integrations.
            </p>
          </div>

          {/* Middle Column: Summary Metrics Strips */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            {/* Strip 1: 4 Metrics */}
            <div className="grid grid-cols-4 gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              {[
                { label: "Booking Pending", value: lifecycleTotals.bookings, color: "text-amber-600 dark:text-amber-400" },
                { label: "Confirmed PO", value: lifecycleTotals.confirmed, color: "text-blue-600 dark:text-blue-400" },
                { label: "Total Containers", value: totals.totalContainers, color: "text-slate-700 dark:text-slate-300" },
                { label: "Total Purchase", value: `${money(totals.totalAmount)}`, color: "text-slate-900 dark:text-white" }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate w-full">
                    {item.label}
                  </span>
                  <span className={cn("text-xs font-black mt-0.5", item.color)}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Strip 2: 4 Metrics */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Remaining Due", value: `${money(totals.totalRemaining)}`, color: "text-rose-600 dark:text-rose-400" },
                { label: "Transit Cargo", value: totals.inTransit, color: "text-sky-600 dark:text-sky-400" },
                { label: "Warehouse Balance", value: lifecycleTotals.warehouse, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Delivered Balance", value: lifecycleTotals.delivered, color: "text-teal-600 dark:text-teal-400" }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate w-full">
                    {item.label}
                  </span>
                  <span className={cn("text-xs font-black mt-0.5", item.color)}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Controls Stacked Vertically */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            {/* Dropdown (Selector on Top) */}
            <div className="relative w-full">
              <select
                value={activeTab}
                onChange={(event) => setActiveTab(event.target.value as LifecycleTab)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                title="Select Stage"
              >
                {lifecycleTabs.map((tab) => {
                  const count = tab === "Dashboard Overview"
                    ? reports.length
                    : tab === "Stock Management"
                      ? reports.filter(r => stockStage(r)).length
                      : reports.filter(r => lifecycleStage(r) === tab).length;
                  return (
                    <option key={tab} value={tab} className="text-slate-900 dark:text-slate-100 dark:bg-slate-950">
                      {tab} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search Input (Below Dropdown) */}
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search PO#, Supplier..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 transition shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-500"
              />
            </div>

            {/* Actions (Filter, Reset, More actions) */}
            <div className="flex items-center gap-1.5 w-full">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="h-9 flex-1 px-2.5 text-[11px] font-bold border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350"
              >
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Filter Matrix
                <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transition text-slate-500", filtersOpen && "rotate-180")} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetFilters}
                className="h-9 px-2.5 text-[11px] font-bold border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Reset
              </Button>
              <PurchaseReportActionsMenu rows={filtered} onExport={() => downloadCsv(filtered)} />
            </div>
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

      {warning ? <div className="rounded-xl border border-amber-350 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">{warning}</div> : null}



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
              <tr>
                {[
                  "GS No.",
                  "CS No.",
                  "BS No.",
                  "Booking Date",
                  "Created By",
                  "Purchase Code",
                  "Sales Code",
                  "Goods Desc.",
                  "Origin",
                  "Total Qty",
                  "Total G. Wt",
                  "Total N. Wt",
                  "Purchase Amt",
                  "Final Amt",
                  "Status",
                  "View"
                ].map((header) => (
                  <th key={header} className="px-3.5 py-3.5 text-left border-b border-slate-800 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {filtered.map((row, index) => {
                const isPoSelected = selected?.id === row.id;
                const companySerial = row.form_data?.form?.companyCode || "COM-" + (row.supplier_company_id?.slice(0, 4).toUpperCase() || "DGT");
                const branchSerial = row.audit?.branchCode || "-";
                const bookingDate = date(row.bookingDate || row.purchaseDate || row.createdAt);
                const userName = row.audit?.userName || "-";
                const salesCode = row.form_data?.form?.salesOrderNo || "-";
                const originCountry = row.form_data?.goodsEntries?.[0]?.origin || row.countryName || "-";
                const displayQty = `${number(row.quantity)} ${row.unit || ""}`;
                const grossWeight = `${number(row.totalGrossWeight)} kg`;
                const netWeight = `${number(row.totalNetWeight)} kg`;
                const purchaseAmt = `${money(row.purchaseAmount)} ${row.currency}`;
                const finalAmt = `${money(row.finalAmount)} ${row.form_data?.form?.secondaryCurrency?.split(" ")[0] || "PKR"}`;

                return (
                  <tr key={row.id} onClick={() => setSelectedId(row.id)} className={cn("cursor-pointer transition hover:bg-blue-50/40 dark:hover:bg-blue-950/10", isPoSelected && "bg-blue-50/60 dark:bg-blue-950/20 font-medium")}>
                    <td className="px-3.5 py-3.5 text-xs font-mono">{index + 1}</td>
                    <td className="px-3.5 py-3.5 text-xs font-mono">{companySerial}</td>
                    <td className="px-3.5 py-3.5 text-xs font-mono">{branchSerial}</td>
                    <td className="px-3.5 py-3.5 text-xs">{bookingDate}</td>
                    <td className="px-3.5 py-3.5 text-xs font-semibold">{userName}</td>
                    <td className="px-3.5 py-3.5 text-xs font-semibold text-blue-600 dark:text-blue-400">{row.purchaseBookingOrderNumber}</td>
                    <td className="px-3.5 py-3.5 text-xs font-mono">{salesCode}</td>
                    <td className="px-3.5 py-3.5 text-xs max-w-[200px] truncate" title={row.goodsDescription}>{row.goodsDescription || row.productName}</td>
                    <td className="px-3.5 py-3.5 text-xs font-semibold">{originCountry}</td>
                    <td className="px-3.5 py-3.5 text-xs font-semibold">{displayQty}</td>
                    <td className="px-3.5 py-3.5 text-xs font-mono">{grossWeight}</td>
                    <td className="px-3.5 py-3.5 text-xs font-mono">{netWeight}</td>
                    <td className="px-3.5 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-100">{purchaseAmt}</td>
                    <td className="px-3.5 py-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{finalAmt}</td>
                    <td className="px-3.5 py-3.5"><StatusBadge label={row.status} /></td>
                    <td className="px-3.5 py-3.5 text-center">
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(row.id);
                          setIsDrawerOpen(true);
                        }}
                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-md shadow-sm border-none"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? <tr><td colSpan={16} className="px-4 py-16 text-center text-slate-500">No purchase order records match the selected dropdown filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <DetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Purchase Transfer Verification Screen"
          subtitle={`Booking Ref: ${selected.purchaseBookingOrderNumber}`}
          className="sm:max-w-none md:max-w-none w-screen h-screen"
          actions={
            <div className="flex flex-wrap items-center gap-1.5 mr-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase px-3 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800/80 mr-2"
              >
                ← Back to Report
              </Button>

              {/* Transfer Dropdown */}
              <div className="relative">
                <Button
                  type="button"
                  onClick={() => {
                    setTransferDropdownOpen(!transferDropdownOpen);
                    setMoreActionsDropdownOpen(false);
                  }}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase px-3 shadow-sm border-none flex items-center gap-1.5"
                >
                  Transfer
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                {transferDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setTransferDropdownOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1.5 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1 text-xs text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setTransferDropdownOpen(false);
                          handleTransfer();
                        }}
                        disabled={transferring || selected.status === "Posted"}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-450" />
                        Transfer & Post
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferDropdownOpen(false);
                          setIsDrawerOpen(false);
                          router.push("/dashboard/purchase/purchase-loading-records");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <Container className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Loading Process
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferDropdownOpen(false);
                          setIsDrawerOpen(false);
                          router.push("/dashboard/purchase/purchase-order-tracking");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <BadgeDollarSign className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        Payment Process
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* More Actions Dropdown */}
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMoreActionsDropdownOpen(!moreActionsDropdownOpen);
                    setTransferDropdownOpen(false);
                  }}
                  className="h-8 w-8 p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center rounded-lg"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {moreActionsDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMoreActionsDropdownOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1.5 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1 text-xs text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setMoreActionsDropdownOpen(false);
                          openReportWindow(selected, false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Generate Contract
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreActionsDropdownOpen(false);
                          window.print();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <Printer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreActionsDropdownOpen(false);
                          openReportWindow(selected, false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <Download className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        Export PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreActionsDropdownOpen(false);
                          alert("Email notification initiated for booking Ref: " + selected.purchaseBookingOrderNumber);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <Mail className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreActionsDropdownOpen(false);
                          alert("WhatsApp notification initiated for booking Ref: " + selected.purchaseBookingOrderNumber);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-450" />
                        WhatsApp
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-6 text-slate-800 dark:text-slate-200">
            {/* Transfer Option & Routing */}
            <div className="rounded-xl border border-emerald-250 bg-emerald-500/10 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 animate-in fade-in duration-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450 mb-3 border-b pb-1.5">Transfer Option & Routing Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Transfer Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {selected.status === "Posted" ? "Fully Transferred & Posted" : "Approved & Ready for Transfer"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Transferred To (Destinations)</span>
                  <div className="mt-1 space-y-1 text-xs text-slate-700 dark:text-slate-350">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-600 dark:text-emerald-450">●</span>
                      <span>General Ledger: Debit Account <strong>{selected.purchaseAccountNumber}</strong> & Credit Account <strong>{selected.salesAccountNumber}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-600 dark:text-emerald-450">●</span>
                      <span>Journal Entries: Voucher Entry No. <strong>{selected.form_data?.form?.journalEntryNo || "JV-" + selected.purchaseBookingOrderNumber.replace(/[^0-9]/g, "").slice(-6)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-600 dark:text-emerald-450">●</span>
                      <span>Logistics cargo loading module (<strong>{selected.containerCount} Containers</strong>)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 border-b pb-1.5">Booking Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Booking Number</span><strong className="font-mono text-sm">{selected.purchaseBookingOrderNumber}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Purchase Date</span><strong>{date(selected.purchaseDate)}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Booking Date</span><strong>{date(selected.bookingDate || selected.createdAt)}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">User Name</span><strong className="text-emerald-600 dark:text-emerald-450 uppercase">{selected.audit?.userName || "-"}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Branch Name</span><strong>{selected.branchName}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Country</span><strong>{selected.countryName}</strong></div>
              </div>
            </div>

            {/* Supplier & Buyer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 border-b pb-1.5">Supplier Information</h3>
                <div className="space-y-2 text-xs">
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Supplier Name</span><strong className="text-sm">{selected.supplierName}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Contact Person</span><strong>{selected.form_data?.form?.purchaseContactPerson || selected.form_data?.form?.supplierContactPerson || "-"}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Mobile Number</span><strong className="font-mono">{selected.form_data?.form?.purchaseContact || selected.form_data?.form?.supplierMobile || selected.form_data?.form?.supplierContact || "-"}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Email Address</span><strong>{selected.form_data?.form?.supplierEmail || "-"}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Country</span><strong>{selected.form_data?.form?.supplierCountry || selected.countryName || "-"}</strong></div>
                </div>
              </div>

              {/* Buyer Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 border-b pb-1.5">Buyer Information</h3>
                <div className="space-y-2 text-xs">
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Buyer Name</span><strong className="text-sm">{selected.buyerName}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Contact Person</span><strong>{selected.form_data?.form?.customerContactPerson || "-"}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Mobile Number</span><strong className="font-mono">{selected.form_data?.form?.customerContact || "-"}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Email Address</span><strong>{selected.form_data?.form?.customerEmail || "-"}</strong></div>
                  <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Country</span><strong>{selected.form_data?.form?.customerCountry || selected.form_data?.form?.branchCountry || "-"}</strong></div>
                </div>
              </div>
            </div>

            {/* Goods Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 border-b pb-1.5">Goods Details</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 font-bold uppercase">
                    <tr>
                      <th className="p-2 border-b">Goods Name</th>
                      <th className="p-2 border-b">Grade</th>
                      <th className="p-2 border-b">Origin</th>
                      <th className="p-2 border-b text-right">Quantity</th>
                      <th className="p-2 border-b text-right">Gross Wt</th>
                      <th className="p-2 border-b text-right">Net Wt</th>
                      <th className="p-2 border-b text-right">Rate/KG</th>
                      <th className="p-2 border-b text-right">Rate/Ton</th>
                      <th className="p-2 border-b text-right">Amount</th>
                      <th className="p-2 border-b text-right">Ex. Rate</th>
                      <th className="p-2 border-b text-right">Final Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(selected.form_data?.goodsEntries || []).map((item: any, idx: number) => {
                      const qtyNo = Number(item.qtyNo || 0);
                      const qtyKgs = Number(item.qtyKgs || 0);
                      const grossWeight = Number(item.grossWeight || qtyNo * qtyKgs);
                      const netWeight = Number(item.netWeight || grossWeight);
                      const coursePrice = Number(item.coursePrice || 0);
                      const amount = Number(item.totalAmount || netWeight * coursePrice);
                      const exRate = Number(item.exchangeRate || selected.exchange_rate || 1);
                      const finalAmount = Number(item.finalAmount || amount * exRate);

                      const ratePerKg = item.priceType === "P/KGs" ? coursePrice : coursePrice / 1000;
                      const ratePerTon = item.priceType === "P/Ton" ? coursePrice : coursePrice * 1000;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-2 font-medium">{item.goodsName || "-"}</td>
                          <td className="p-2">{item.brand || item.size || "-"}</td>
                          <td className="p-2">{item.origin || "-"}</td>
                          <td className="p-2 text-right font-semibold">{number(qtyNo)} {item.qtyName}</td>
                          <td className="p-2 text-right font-mono">{number(grossWeight)} kg</td>
                          <td className="p-2 text-right font-mono">{number(netWeight)} kg</td>
                          <td className="p-2 text-right font-mono">${money(ratePerKg)}</td>
                          <td className="p-2 text-right font-mono">${money(ratePerTon)}</td>
                          <td className="p-2 text-right font-mono font-semibold">${money(amount)}</td>
                          <td className="p-2 text-right font-mono">{number(exRate)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-450">{money(finalAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment & Shipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 border-b pb-1.5">Payment Information</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Payment Condition</span><strong className="text-slate-900 dark:text-white">{selected.form_data?.form?.paymentType || "-"}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Advance Payment %</span><strong className="text-slate-900 dark:text-white">{selected.form_data?.form?.advancePercent || 0}%</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Advance Payment Amount</span><strong className="text-emerald-600 dark:text-emerald-450">${money((Number(selected.purchaseAmount || 0) * Number(selected.form_data?.form?.advancePercent || 0)) / 100)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Advance Due Date</span><strong className="text-slate-900 dark:text-white">{date(selected.form_data?.form?.advancePaymentDate)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Remaining Balance %</span><strong className="text-slate-900 dark:text-white">{100 - Number(selected.form_data?.form?.advancePercent || 0)}%</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Remaining Balance Amount</span><strong className="text-slate-900 dark:text-white">${money(Number(selected.purchaseAmount || 0) - (Number(selected.purchaseAmount || 0) * Number(selected.form_data?.form?.advancePercent || 0)) / 100)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Final Payment Due Date</span><strong className="text-slate-900 dark:text-white">{date(selected.form_data?.form?.paymentDate)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Payment Status</span><strong><StatusBadge label={selected.paymentStatus} /></strong></div>
                </div>
              </div>

              {/* Shipment Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 border-b pb-1.5">Shipment Information</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Container Count</span><strong className="text-slate-900 dark:text-white">{selected.containerCount}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Container Numbers</span><strong className="text-slate-900 dark:text-white max-w-[180px] truncate" title={selected.form_data?.form?.containerNumbers || containers.map(c => c.containerNumber).join(", ") || "-"}>{selected.form_data?.form?.containerNumbers || containers.map(c => c.containerNumber).join(", ") || "-"}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Bill Number</span><strong className="text-slate-900 dark:text-white font-mono">{selected.form_data?.form?.billNo || "-"}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Vessel Name</span><strong className="text-slate-900 dark:text-white">{selected.form_data?.form?.vesselName || "-"}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Loading Port</span><strong className="text-slate-900 dark:text-white">{selected.form_data?.form?.loadingPort || "-"}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Destination Port</span><strong className="text-slate-900 dark:text-white">{selected.form_data?.form?.receivedPort || "-"}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-400">Transit Time</span><strong className="text-slate-900 dark:text-white">{selected.form_data?.form?.transitTime || "-"}</strong></div>
                </div>
              </div>
            </div>

            {/* Accounting Information */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 border-b pb-1.5">Accounting Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Journal Entry Number</span><strong className="font-mono">{selected.form_data?.form?.journalEntryNo || "Pending Posting"}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Debit Account</span><strong className="font-mono">{selected.purchaseAccountNumber || "-"}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Credit Account</span><strong className="font-mono">{selected.salesAccountNumber || "-"}</strong></div>
                <div><span className="text-slate-400 block uppercase text-[9px] font-bold">Ledger Reference</span><strong className="font-mono">{selected.form_data?.form?.ledgerReference || "-"}</strong></div>
              </div>
            </div>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
}
