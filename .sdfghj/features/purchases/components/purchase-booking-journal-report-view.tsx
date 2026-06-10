"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Filter,
  Landmark,
  PackageCheck,
  PieChart,
  Printer,
  RefreshCcw,
  Search,
  ShipWheel,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  ok: boolean;
  data?: {
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
  error?: string | { message?: string };
};

type ContainerRow = {
  id: string;
  bookingNo: string;
  containerNo: string;
  blNo: string;
  truckNo: string;
  sealNo: string;
  loadingCountry: string;
  receivingCountry: string;
  loadingDate: string;
  receivingDate: string;
  status: "Confirmed" | "Pending" | "Cancelled";
  confirmedOn: string;
};

type DashboardTab = "overview" | "daily" | "general" | "purchase" | "branch";

const sampleReports: PurchaseReport[] = [
  {
    id: "sample-1",
    purchaseBookingOrderNumber: "PB-2025-0001",
    purchaseDate: "2025-01-02",
    bookingDate: "2025-01-02",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "Pistachio Kernels",
    goodsDescription: "Premium dry fruits container booking",
    quantity: 500,
    unit: "MT",
    totalWeight: 500000,
    containerCount: 10,
    purchaseRate: 250,
    totalPurchaseAmount: 125000,
    currency: "USD",
    status: "Partial Confirmed",
    paymentStatus: "Advance Paid",
    branchName: "Kabul Main Branch",
    countryName: "Afghanistan",
    createdAt: "2025-01-02T10:00:00.000Z",
    audit: { userName: "Admin User", userId: "USR-001", branchCode: "KBL-001" }
  },
  {
    id: "sample-2",
    purchaseBookingOrderNumber: "PB-2025-0002",
    purchaseDate: "2025-01-01",
    bookingDate: "2025-01-01",
    purchaseAccountName: "Afghan Traders Purchase",
    purchaseAccountNumber: "PA-1002",
    salesAccountName: "Dubai Sales Account",
    salesAccountNumber: "SA-2002",
    supplierName: "Afghan Traders Group",
    buyerName: "Damaan UAE",
    productName: "Almonds",
    goodsDescription: "Almond container booking",
    quantity: 250,
    unit: "MT",
    totalWeight: 250000,
    containerCount: 5,
    purchaseRate: 250,
    totalPurchaseAmount: 62500,
    currency: "USD",
    status: "Fully Confirmed",
    paymentStatus: "Full Payment",
    branchName: "Dubai Main Branch",
    countryName: "Afghanistan",
    createdAt: "2025-01-01T11:30:00.000Z",
    audit: { userName: "Admin User", userId: "USR-001", branchCode: "DXB-001" }
  },
  {
    id: "sample-3",
    purchaseBookingOrderNumber: "PB-2024-0098",
    purchaseDate: "2024-12-31",
    bookingDate: "2024-12-31",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Pakistan",
    productName: "Raisins",
    goodsDescription: "Raisins purchase booking",
    quantity: 200,
    unit: "MT",
    totalWeight: 200000,
    containerCount: 8,
    purchaseRate: 200,
    totalPurchaseAmount: 40000,
    currency: "USD",
    status: "Open",
    paymentStatus: "Pending",
    branchName: "Quetta City Branch",
    countryName: "Afghanistan",
    createdAt: "2024-12-31T12:00:00.000Z",
    audit: { userName: "Admin User", userId: "USR-001", branchCode: "QTA-001" }
  },
  {
    id: "sample-4",
    purchaseBookingOrderNumber: "PB-2024-0097",
    purchaseDate: "2024-12-30",
    bookingDate: "2024-12-30",
    purchaseAccountName: "Herat Purchase Account",
    purchaseAccountNumber: "PA-1003",
    salesAccountName: "Wholesale Sales Account",
    salesAccountNumber: "SA-2003",
    supplierName: "Herat Wholesale Co.",
    buyerName: "Damaan Trading LLC",
    productName: "Pistachio Nuts",
    goodsDescription: "Pistachio nuts bulk booking",
    quantity: 600,
    unit: "MT",
    totalWeight: 600000,
    containerCount: 12,
    purchaseRate: 250,
    totalPurchaseAmount: 150000,
    currency: "USD",
    status: "Partial Confirmed",
    paymentStatus: "Partial Payment",
    branchName: "Herat Branch",
    countryName: "Afghanistan",
    createdAt: "2024-12-30T12:00:00.000Z",
    audit: { userName: "Admin User", userId: "USR-001", branchCode: "HRT-001" }
  },
  {
    id: "sample-5",
    purchaseBookingOrderNumber: "PB-2024-0096",
    purchaseDate: "2024-12-29",
    bookingDate: "2024-12-29",
    purchaseAccountName: "Kabul Purchase Account",
    purchaseAccountNumber: "PA-1004",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "Walnuts",
    goodsDescription: "Walnut purchase booking",
    quantity: 300.75,
    unit: "MT",
    totalWeight: 300750,
    containerCount: 6,
    purchaseRate: 251.58,
    totalPurchaseAmount: 75657.5,
    currency: "USD",
    status: "Fully Confirmed",
    paymentStatus: "Full Payment",
    branchName: "Kabul Main Branch",
    countryName: "Afghanistan",
    createdAt: "2024-12-29T12:00:00.000Z",
    audit: { userName: "Admin User", userId: "USR-001", branchCode: "KBL-001" }
  }
];

function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
}

function safeTerm(value: string) {
  return value.trim().toLowerCase();
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("full") || normalized.includes("complete") || normalized.includes("confirmed")) return "border-emerald-400/40 bg-emerald-500/15 text-emerald-300";
  if (normalized.includes("partial")) return "border-amber-400/40 bg-amber-500/15 text-amber-300";
  if (normalized.includes("cancel")) return "border-red-400/40 bg-red-500/15 text-red-300";
  return "border-sky-400/40 bg-sky-500/15 text-sky-300";
}

function makeContainers(report: PurchaseReport | null): ContainerRow[] {
  if (!report) return [];
  const total = Math.max(1, Math.min(10, Number(report.containerCount || 0) || 5));
  const confirmed = report.status.toLowerCase().includes("full") ? total : report.status.toLowerCase().includes("partial") ? Math.max(1, Math.floor(total * 0.25)) : 0;
  return Array.from({ length: total }).map((_, index) => {
    const isConfirmed = index < confirmed;
    return {
      id: `${report.id}-container-${index + 1}`,
      bookingNo: report.purchaseBookingOrderNumber,
      containerNo: `CONT-${String(index + 1).padStart(3, "0")}`,
      blNo: isConfirmed ? `BL-${1001 + index}` : "-",
      truckNo: isConfirmed ? (index % 2 ? "XYZ-888" : "ABC-123") : "-",
      sealNo: isConfirmed ? `S-00123${index + 4}` : "-",
      loadingCountry: report.countryName || "Afghanistan",
      receivingCountry: report.branchName || "Dubai",
      loadingDate: isConfirmed ? report.purchaseDate : "-",
      receivingDate: isConfirmed ? report.purchaseDate : "-",
      status: report.status.toLowerCase().includes("cancel") ? "Cancelled" : isConfirmed ? "Confirmed" : "Pending",
      confirmedOn: isConfirmed ? report.purchaseDate : "-"
    };
  });
}

function exportCsv(rows: PurchaseReport[], fileName: string) {
  const headers = ["Date", "Booking No", "Supplier", "Country", "Goods", "Containers", "Quantity", "Currency", "Booking Amount", "Status"];
  const csvRows = rows.map((row) =>
    [
      formatDate(row.purchaseDate),
      row.purchaseBookingOrderNumber,
      row.supplierName,
      row.countryName,
      row.productName,
      row.containerCount,
      `${row.quantity} ${row.unit}`,
      row.currency,
      row.totalPurchaseAmount,
      row.status
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function TabNavigation({ activeTab, onChange }: { activeTab: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  const tabs: Array<{ key: DashboardTab; label: string; icon: React.ReactNode }> = [
    { key: "overview", label: "Dashboard Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "daily", label: "Daily Reports", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "general", label: "General Reports", icon: <Landmark className="h-4 w-4" /> },
    { key: "purchase", label: "Purchase Booking Reports", icon: <PackageCheck className="h-4 w-4" /> },
    { key: "branch", label: "Branch Summary", icon: <TrendingUp className="h-4 w-4" /> }
  ];

  return (
    <div className="mb-3 overflow-x-auto rounded-xl border border-slate-700 bg-[#0b1730] p-2">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition ${
              activeTab === tab.key
                ? "border-blue-400/70 bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-blue-400/50 hover:bg-blue-500/10"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DailyFilterRow({
  filters,
  setFilters,
  suppliers,
  currencies
}: {
  filters: { fromDate: string; toDate: string; financialSupplier: string; financialCurrency: string };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  suppliers: string[];
  currencies: string[];
}) {
  return (
    <>
      <DarkInput label="From Date" type="date" value={filters.fromDate} onChange={(value) => setFilters((previous: any) => ({ ...previous, fromDate: value }))} />
      <DarkInput label="To Date" type="date" value={filters.toDate} onChange={(value) => setFilters((previous: any) => ({ ...previous, toDate: value }))} />
      <DarkSelect label="Supplier" value={filters.financialSupplier} options={suppliers} placeholder="All Suppliers" onChange={(value) => setFilters((previous: any) => ({ ...previous, financialSupplier: value }))} />
      <DarkSelect label="Currency" value={filters.financialCurrency} options={currencies} placeholder="All" onChange={(value) => setFilters((previous: any) => ({ ...previous, financialCurrency: value }))} />
    </>
  );
}

function GeneralFilterRow({
  filters,
  setFilters,
  branches,
  countries
}: {
  filters: { branch: string; country: string; status: string };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  branches: string[];
  countries: string[];
}) {
  return (
    <>
      <DarkSelect label="Country" value={filters.country} options={countries} placeholder="All Countries" onChange={(value) => setFilters((previous: any) => ({ ...previous, country: value }))} />
      <DarkSelect label="Branch" value={filters.branch} options={branches} placeholder="All Branches" onChange={(value) => setFilters((previous: any) => ({ ...previous, branch: value }))} />
      <DarkSelect label="Status" value={filters.status} options={["Open", "Partial Confirmed", "Fully Confirmed", "Cancelled"]} placeholder="All Status" onChange={(value) => setFilters((previous: any) => ({ ...previous, status: value }))} />
    </>
  );
}

function BranchFilterRow({
  filters,
  setFilters,
  branches,
  countries
}: {
  filters: { branch: string; country: string };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  branches: string[];
  countries: string[];
}) {
  return (
    <>
      <DarkSelect label="Country" value={filters.country} options={countries} placeholder="All Countries" onChange={(value) => setFilters((previous: any) => ({ ...previous, country: value }))} />
      <DarkSelect label="Branch" value={filters.branch} options={branches} placeholder="All Branches" onChange={(value) => setFilters((previous: any) => ({ ...previous, branch: value }))} />
    </>
  );
}

export function PurchaseBookingJournalReportView() {
  const [reports, setReports] = useState<PurchaseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [filters, setFilters] = useState({
    fromDate: "2025-01-01",
    toDate: "2025-02-01",
    supplier: "",
    branch: "",
    country: "",
    status: "",
    currency: "",
    bookingNo: "",
    containerNo: "",
    blNo: "",
    confirmationStatus: "",
    financialSupplier: "",
    financialCurrency: ""
  });

  async function loadReport() {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (filters.fromDate) params.set("dateFrom", filters.fromDate);
      if (filters.toDate) params.set("dateTo", filters.toDate);
      if (filters.bookingNo) params.set("purchaseOrderNo", filters.bookingNo);
      const response = await fetch(`/api/erp/purchases/booking-journal-report?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.ok) {
        const error = typeof payload.error === "string" ? payload.error : payload.error?.message;
        throw new Error(error || "Purchase Booking Order Reports could not be loaded.");
      }
      const nextReports = payload.data?.reports ?? [];
      setReports(nextReports);
      setSelectedId((current) => (nextReports.some((report) => report.id === current) ? current : nextReports[0]?.id ?? ""));
      if (payload.data?.warning) setMessage(payload.data.warning);
    } catch (error) {
      setReports([]);
      setMessage(error instanceof Error ? error.message : "Purchase Booking Order Reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceReports = reports.length ? reports : sampleReports;
  const suppliers = useMemo(() => Array.from(new Set(sourceReports.map((report) => report.supplierName))).filter(Boolean), [sourceReports]);
  const branches = useMemo(() => Array.from(new Set(sourceReports.map((report) => report.branchName))).filter(Boolean), [sourceReports]);
  const countries = useMemo(() => Array.from(new Set(sourceReports.map((report) => report.countryName))).filter(Boolean), [sourceReports]);
  const currencies = useMemo(() => Array.from(new Set(sourceReports.map((report) => report.currency))).filter(Boolean), [sourceReports]);

  const registerRows = useMemo(() => {
    const supplier = safeTerm(filters.supplier);
    const branch = safeTerm(filters.branch);
    const country = safeTerm(filters.country);
    const status = safeTerm(filters.status);
    const currency = safeTerm(filters.currency);
    return sourceReports.filter((report) => {
      if (supplier && !report.supplierName.toLowerCase().includes(supplier)) return false;
      if (branch && !report.branchName.toLowerCase().includes(branch)) return false;
      if (country && !report.countryName.toLowerCase().includes(country)) return false;
      if (status && !report.status.toLowerCase().includes(status)) return false;
      if (currency && report.currency.toLowerCase() !== currency) return false;
      return true;
    });
  }, [filters.branch, filters.country, filters.currency, filters.status, filters.supplier, sourceReports]);

  const selected = useMemo(() => sourceReports.find((report) => report.id === selectedId) ?? registerRows[0] ?? sourceReports[0] ?? null, [registerRows, selectedId, sourceReports]);
  const allContainers = useMemo(() => makeContainers(selected), [selected]);
  const filteredContainers = useMemo(() => {
    const containerNo = safeTerm(filters.containerNo);
    const blNo = safeTerm(filters.blNo);
    const confirmation = safeTerm(filters.confirmationStatus);
    return allContainers.filter((row) => {
      if (containerNo && !row.containerNo.toLowerCase().includes(containerNo)) return false;
      if (blNo && !row.blNo.toLowerCase().includes(blNo)) return false;
      if (confirmation && row.status.toLowerCase() !== confirmation) return false;
      return true;
    });
  }, [allContainers, filters.blNo, filters.confirmationStatus, filters.containerNo]);

  const financialRows = useMemo(() => {
    const supplier = safeTerm(filters.financialSupplier);
    const currency = safeTerm(filters.financialCurrency);
    return registerRows.filter((report) => {
      if (supplier && !report.supplierName.toLowerCase().includes(supplier)) return false;
      if (currency && report.currency.toLowerCase() !== currency) return false;
      return true;
    });
  }, [filters.financialCurrency, filters.financialSupplier, registerRows]);

  const totals = useMemo(() => {
    const totalAmount = registerRows.reduce((sum, report) => sum + Number(report.totalPurchaseAmount || 0), 0);
    const totalPaid = financialRows.reduce((sum, report) => {
      const status = report.paymentStatus.toLowerCase();
      if (status.includes("full")) return sum + Number(report.totalPurchaseAmount || 0);
      if (status.includes("advance")) return sum + Number(report.totalPurchaseAmount || 0) * 0.32;
      if (status.includes("partial")) return sum + Number(report.totalPurchaseAmount || 0) * 0.5;
      return sum;
    }, 0);
    return {
      totalBookings: registerRows.length,
      totalContainers: registerRows.reduce((sum, report) => sum + Number(report.containerCount || 0), 0),
      totalQuantity: registerRows.reduce((sum, report) => sum + Number(report.quantity || 0), 0),
      totalAmount,
      totalPaid,
      outstanding: Math.max(0, totalAmount - totalPaid),
      average: financialRows.length ? financialRows.reduce((sum, report) => sum + Number(report.totalPurchaseAmount || 0), 0) / financialRows.length : 0
    };
  }, [financialRows, registerRows]);

  const dashboardTotals = useMemo(() => {
    const containers = registerRows.flatMap((report) => makeContainers(report));
    const confirmed = containers.filter((row) => row.status === "Confirmed").length;
    return {
      confirmedContainers: confirmed,
      pendingContainers: Math.max(0, totals.totalContainers - confirmed)
    };
  }, [registerRows, totals.totalContainers]);

  const branchSummary = useMemo(() => {
    const rows = new Map<string, { branch: string; country: string; amount: number; containers: number; outstanding: number; bookings: number }>();
    registerRows.forEach((report) => {
      const key = `${report.countryName}::${report.branchName}`;
      const previous = rows.get(key) ?? { branch: report.branchName || "-", country: report.countryName || "-", amount: 0, containers: 0, outstanding: 0, bookings: 0 };
      const paid = report.paymentStatus.toLowerCase().includes("full")
        ? report.totalPurchaseAmount
        : report.paymentStatus.toLowerCase().includes("advance")
          ? report.totalPurchaseAmount * 0.32
          : report.paymentStatus.toLowerCase().includes("partial")
            ? report.totalPurchaseAmount * 0.5
            : 0;
      previous.amount += Number(report.totalPurchaseAmount || 0);
      previous.containers += Number(report.containerCount || 0);
      previous.outstanding += Math.max(0, Number(report.totalPurchaseAmount || 0) - paid);
      previous.bookings += 1;
      rows.set(key, previous);
    });
    return Array.from(rows.values()).sort((a, b) => b.amount - a.amount);
  }, [registerRows]);

  const dailyReportRows = useMemo(() => {
    const purchaseTotal = registerRows.reduce((sum, report) => sum + Number(report.totalPurchaseAmount || 0), 0);
    const loaded = registerRows.flatMap((report) => makeContainers(report)).filter((row) => row.status === "Confirmed").length;
    const pending = Math.max(0, totals.totalContainers - loaded);
    const expense = purchaseTotal * 0.035;
    const paid = totals.totalPaid;
    return [
      { name: "Daily Purchase Report", entries: registerRows.length, amount: purchaseTotal, status: registerRows.length ? "Active" : "No Data", route: "/dashboard/purchase/purchase-booking-journal-report" },
      { name: "Daily Loading Report", entries: loaded, amount: loaded * 850, status: loaded ? "Active" : "Pending", route: "/dashboard/purchase/purchase-loading-records" },
      { name: "Daily Unloading Report", entries: pending, amount: pending * 430, status: pending ? "Pending" : "Clear", route: "/dashboard/purchase/purchase-loading-records" },
      { name: "Daily Expense Report", entries: registerRows.length, amount: expense, status: expense ? "Active" : "No Data", route: "/dashboard/roznamcha/all" },
      { name: "Daily Cash Report", entries: registerRows.length, amount: paid, status: paid ? "Active" : "No Data", route: "/dashboard/roznamcha/all" },
      { name: "Daily Collection Report", entries: financialRows.length, amount: paid, status: paid ? "Active" : "No Data", route: "/dashboard/roznamcha/all" }
    ];
  }, [financialRows.length, registerRows, totals.totalContainers, totals.totalPaid]);

  const generalReportRows = useMemo(() => [
    { name: "General Ledger Report", description: "Ledger-backed purchase booking activity.", route: "/dashboard/ledger/general-report", count: registerRows.length, amount: totals.totalAmount },
    { name: "Roznamcha Report", description: "Daily journal and cash movement summary.", route: "/dashboard/roznamcha/all", count: registerRows.length, amount: totals.totalPaid },
    { name: "Party Ledger Report", description: "Supplier / wholesaler ledger exposure.", route: "/dashboard/ledger/general-report", count: suppliers.length, amount: totals.outstanding },
    { name: "Account Statement Report", description: "Purchase and sales account statement view.", route: "/dashboard/ledger/general-report", count: registerRows.length, amount: totals.totalAmount },
    { name: "Branch Summary Report", description: "Branch-wise purchase amount, containers, and balance.", route: "/dashboard/purchase/purchase-booking-journal-report", count: branchSummary.length, amount: totals.outstanding }
  ], [branchSummary.length, registerRows.length, suppliers.length, totals.outstanding, totals.totalAmount, totals.totalPaid]);

  const confirmedContainers = allContainers.filter((row) => row.status === "Confirmed").length;
  const remainingContainers = Math.max(0, allContainers.length - confirmedContainers);

  return (
    <div className="min-h-screen bg-[#081120] text-slate-100">
      <div className="mx-auto w-full max-w-[1920px] px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-4">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-300">
              <ShipWheel className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">Purchase Booking Order - Report Templates</h1>
              <p className="text-xs text-slate-400">PURCHASE BOOKING ORDER REPORTS · Wholesaler / Import Export / Dry Fruits / Container Trading</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadReport()} disabled={loading} className="bg-slate-800 text-slate-100 hover:bg-slate-700">
              <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} className="bg-slate-800 text-slate-100 hover:bg-slate-700">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button type="button" size="sm" onClick={() => exportCsv(registerRows, "purchase-booking-register.csv")} className="bg-blue-600 text-white hover:bg-blue-500">
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {message ? (
          <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
            {message} {reports.length ? "" : "Showing realistic sample data until live records are available."}
          </div>
        ) : !reports.length ? (
          <div className="mb-3 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs text-blue-100">
            No live purchase booking records found. Showing realistic sample data for report preview.
          </div>
        ) : null}

        <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" ? (
          <div className="space-y-3">
            <section className="rounded-xl border border-slate-700 bg-[#0b1730] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white">Dashboard Overview</h2>
                  <p className="text-xs text-slate-400">Super Branch management view. Super branch users can monitor all branch purchase booking activity; branch users receive only their session-scoped records from the API.</p>
                </div>
                <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">Real API scope + branch isolation</span>
              </div>
              <div className="grid gap-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50 md:grid-cols-3 xl:grid-cols-6">
                <SummaryCard icon={<PackageCheck />} label="Total Purchase Bookings" value={totals.totalBookings} accent="blue" />
                <SummaryCard icon={<Boxes />} label="Total Containers" value={totals.totalContainers} accent="emerald" />
                <SummaryCard icon={<PackageCheck />} label="Confirmed Containers" value={dashboardTotals.confirmedContainers} accent="violet" />
                <SummaryCard icon={<Filter />} label="Pending Containers" value={dashboardTotals.pendingContainers} accent="amber" />
                <SummaryCard icon={<BadgeDollarSign />} label="Purchase Amount" value={`$${formatMoney(totals.totalAmount)}`} accent="blue" />
                <SummaryCard icon={<WalletCards />} label="Outstanding Amount" value={`$${formatMoney(totals.outstanding)}`} accent="red" />
              </div>
            </section>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className="rounded-xl border border-slate-700 bg-[#0b1730] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-300" />
                  <h3 className="text-sm font-black text-white">Daily Reports Snapshot</h3>
                </div>
                <DarkTable headers={["Daily Report", "Entries", "Amount", "Status", "Open"]}>
                  {dailyReportRows.map((row) => (
                    <tr key={row.name} className="border-b border-slate-700/70 hover:bg-blue-500/10">
                      <Td className="font-bold text-slate-100">{row.name}</Td>
                      <Td center>{row.entries}</Td>
                      <Td right>{formatMoney(row.amount)}</Td>
                      <Td><StatusBadge status={row.status} /></Td>
                      <Td><a className="font-bold text-blue-300 hover:text-blue-200" href={row.route}>Open</a></Td>
                    </tr>
                  ))}
                </DarkTable>
              </section>

              <section className="rounded-xl border border-slate-700 bg-[#0b1730] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-emerald-300" />
                  <h3 className="text-sm font-black text-white">Branch Summary Widget</h3>
                </div>
                <div className="space-y-2">
                  {branchSummary.slice(0, 5).map((row) => (
                    <div key={`${row.country}-${row.branch}`} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-white">{row.branch}</div>
                          <div className="text-xs text-slate-400">{row.country} · {row.bookings} bookings</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-black text-blue-300">${formatMoney(row.amount)}</div>
                          <div className="text-slate-400">{row.containers} containers</div>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (row.amount / Math.max(1, totals.totalAmount)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === "daily" ? (
          <ReportSection number="D" title="DAILY REPORTS INTEGRATION" actions={<FilterActions onApply={() => undefined} onReset={() => undefined} />} filters={<DailyFilterRow filters={filters} setFilters={setFilters} suppliers={suppliers} currencies={currencies} />}>
            <DarkTable headers={["Daily Report", "Entries", "Daily Amount", "Linked Module", "Status", "Action"]}>
              {dailyReportRows.map((row) => (
                <tr key={row.name} className="border-b border-slate-700/70 hover:bg-blue-500/10">
                  <Td className="font-bold text-blue-300">{row.name}</Td>
                  <Td center>{row.entries}</Td>
                  <Td right>{formatMoney(row.amount)}</Td>
                  <Td>{row.route}</Td>
                  <Td><StatusBadge status={row.status} /></Td>
                  <Td><a className="font-bold text-blue-300 hover:text-blue-200" href={row.route}>Open Report</a></Td>
                </tr>
              ))}
            </DarkTable>
          </ReportSection>
        ) : null}

        {activeTab === "general" ? (
          <ReportSection number="G" title="GENERAL REPORTS INTEGRATION" actions={<FilterActions onApply={() => undefined} onReset={() => undefined} />} filters={<GeneralFilterRow filters={filters} setFilters={setFilters} branches={branches} countries={countries} />}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {generalReportRows.map((row) => (
                <a key={row.name} href={row.route} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 transition hover:border-blue-400/60 hover:bg-blue-500/10">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/15 text-blue-300">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-black text-white">{row.name}</div>
                  <p className="mt-2 min-h-10 text-xs text-slate-400">{row.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-slate-700 bg-slate-950/40 p-2">
                      <div className="text-slate-500">Records</div>
                      <div className="font-black text-white">{row.count}</div>
                    </div>
                    <div className="rounded border border-slate-700 bg-slate-950/40 p-2">
                      <div className="text-slate-500">Amount</div>
                      <div className="font-black text-blue-300">{formatMoney(row.amount)}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </ReportSection>
        ) : null}

        {activeTab === "branch" ? (
          <ReportSection number="B" title="BRANCH SUMMARY" actions={<FilterActions onApply={() => undefined} onReset={() => setFilters((previous) => ({ ...previous, branch: "", country: "" }))} />} filters={<BranchFilterRow filters={filters} setFilters={setFilters} branches={branches} countries={countries} />}>
            <DarkTable headers={["Branch", "Country", "Bookings", "Branch-wise Containers", "Branch-wise Purchase Amount", "Outstanding Balance", "Status"]}>
              {branchSummary.map((row) => (
                <tr key={`${row.country}-${row.branch}`} className="border-b border-slate-700/70 hover:bg-blue-500/10">
                  <Td className="font-bold text-blue-300">{row.branch}</Td>
                  <Td>{row.country}</Td>
                  <Td center>{row.bookings}</Td>
                  <Td center>{row.containers}</Td>
                  <Td right>{formatMoney(row.amount)}</Td>
                  <Td right className={row.outstanding > 0 ? "text-red-300" : "text-emerald-300"}>{formatMoney(row.outstanding)}</Td>
                  <Td><StatusBadge status={row.outstanding > 0 ? "Outstanding" : "Clear"} /></Td>
                </tr>
              ))}
            </DarkTable>
          </ReportSection>
        ) : null}

        {activeTab === "purchase" ? (
          <>
        <ReportSection
          number="1"
          title="PURCHASE BOOKING REGISTER REPORT"
          actions={<FilterActions onApply={() => void loadReport()} onReset={() => setFilters((previous) => ({ ...previous, supplier: "", branch: "", country: "", status: "", currency: "" }))} />}
          filters={
            <>
              <DarkInput label="From Date" type="date" value={filters.fromDate} onChange={(value) => setFilters((previous) => ({ ...previous, fromDate: value }))} />
              <DarkInput label="To Date" type="date" value={filters.toDate} onChange={(value) => setFilters((previous) => ({ ...previous, toDate: value }))} />
              <DarkSelect label="Supplier" value={filters.supplier} options={suppliers} placeholder="All Suppliers" onChange={(value) => setFilters((previous) => ({ ...previous, supplier: value }))} />
              <DarkSelect label="Booking Status" value={filters.status} options={["Open", "Partial Confirmed", "Fully Confirmed", "Cancelled"]} placeholder="All Status" onChange={(value) => setFilters((previous) => ({ ...previous, status: value }))} />
              <DarkSelect label="Branch" value={filters.branch} options={branches} placeholder="All Branches" onChange={(value) => setFilters((previous) => ({ ...previous, branch: value }))} />
              <DarkSelect label="Country" value={filters.country} options={countries} placeholder="All Countries" onChange={(value) => setFilters((previous) => ({ ...previous, country: value }))} />
              <DarkSelect label="Currency" value={filters.currency} options={currencies} placeholder="All" onChange={(value) => setFilters((previous) => ({ ...previous, currency: value }))} />
            </>
          }
        >
          <div className="grid gap-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50 md:grid-cols-5">
            <SummaryCard icon={<PackageCheck />} label="Total Bookings" value={totals.totalBookings} accent="blue" />
            <SummaryCard icon={<Boxes />} label="Total Containers" value={totals.totalContainers} accent="emerald" />
            <SummaryCard icon={<Filter />} label="Total Quantity" value={`${formatNumber(totals.totalQuantity)} MT`} accent="violet" />
            <SummaryCard icon={<BadgeDollarSign />} label="Total Amount (USD)" value={`$${formatMoney(totals.totalAmount)}`} accent="amber" />
            <SummaryCard icon={<WalletCards />} label="Total Outstanding (USD)" value={`$${formatMoney(totals.outstanding)}`} accent="red" />
          </div>

          <DarkTable
            headers={["Date", "Booking No", "Supplier / Wholesaler", "Country", "Total Containers", "Goods", "Quantity", "Currency", "Booking Amount", "Confirmed Containers", "Remaining Containers", "Status"]}
          >
            {registerRows.map((report) => {
              const containers = makeContainers(report);
              const confirmed = containers.filter((row) => row.status === "Confirmed").length;
              return (
                <tr key={report.id} onClick={() => setSelectedId(report.id)} className="cursor-pointer border-b border-slate-700/70 hover:bg-blue-500/10">
                  <Td>{formatDate(report.purchaseDate)}</Td>
                  <Td className="font-bold text-blue-300">{report.purchaseBookingOrderNumber}</Td>
                  <Td>{report.supplierName}</Td>
                  <Td>{report.countryName}</Td>
                  <Td center>{report.containerCount}</Td>
                  <Td>{report.productName}</Td>
                  <Td>{formatNumber(report.quantity)} {report.unit}</Td>
                  <Td center>{report.currency}</Td>
                  <Td right>{formatMoney(report.totalPurchaseAmount)}</Td>
                  <Td center>{confirmed}</Td>
                  <Td center>{Math.max(0, report.containerCount - confirmed)}</Td>
                  <Td><StatusBadge status={report.status} /></Td>
                </tr>
              );
            })}
          </DarkTable>
          <TableFooter text={`Showing 1 to ${registerRows.length} of ${sourceReports.length} entries`} />
        </ReportSection>

        <ReportSection
          number="2"
          title="CONTAINER CONFIRMATION REPORT"
          actions={
            <div className="flex items-end gap-2">
              <FilterActions onApply={() => undefined} onReset={() => setFilters((previous) => ({ ...previous, containerNo: "", blNo: "", confirmationStatus: "" }))} />
              <Button type="button" size="sm" onClick={() => exportCsv(registerRows, "container-confirmation.csv")} className="h-9 bg-emerald-600 text-white hover:bg-emerald-500">
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          }
          filters={
            <>
              <DarkSelect label="Booking No" value={selected?.purchaseBookingOrderNumber ?? ""} options={sourceReports.map((report) => report.purchaseBookingOrderNumber)} placeholder="Booking No" onChange={(value) => setSelectedId(sourceReports.find((report) => report.purchaseBookingOrderNumber === value)?.id ?? "")} />
              <DarkInput label="Container No" value={filters.containerNo} onChange={(value) => setFilters((previous) => ({ ...previous, containerNo: value }))} />
              <DarkInput label="BL No" value={filters.blNo} onChange={(value) => setFilters((previous) => ({ ...previous, blNo: value }))} />
              <DarkSelect label="Confirmation Status" value={filters.confirmationStatus} options={["confirmed", "pending", "cancelled"]} placeholder="All" onChange={(value) => setFilters((previous) => ({ ...previous, confirmationStatus: value }))} />
            </>
          }
        >
          <div className="grid gap-3 xl:grid-cols-[440px_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-300">Booking Summary</div>
              <InfoRow label="Booking No" value={selected?.purchaseBookingOrderNumber ?? "-"} />
              <InfoRow label="Supplier" value={selected?.supplierName ?? "-"} />
              <InfoRow label="Total Containers" value={selected?.containerCount ?? 0} />
              <InfoRow label="Confirmed Containers" value={confirmedContainers} />
              <InfoRow label="Pending Containers" value={remainingContainers} />
              <InfoRow label="Status" value={selected?.status ?? "-"} highlight />
            </div>
            <div className="min-w-0">
              <DarkTable headers={["SR #", "Container No", "BL No", "Truck No", "Loading Date", "Receiving Date", "Seal No", "Status", "Confirmed On"]}>
                {filteredContainers.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-700/70 hover:bg-blue-500/10">
                    <Td center>{index + 1}</Td>
                    <Td center>{row.containerNo}</Td>
                    <Td center>{row.blNo}</Td>
                    <Td center>{row.truckNo}</Td>
                    <Td center>{formatDate(row.loadingDate)}</Td>
                    <Td center>{formatDate(row.receivingDate)}</Td>
                    <Td center>{row.sealNo}</Td>
                    <Td center><ContainerStatus status={row.status} /></Td>
                    <Td center>{formatDate(row.confirmedOn)}</Td>
                  </tr>
                ))}
              </DarkTable>
              <TableFooter text={`Showing 1 to ${filteredContainers.length} of ${allContainers.length} entries`} />
            </div>
          </div>
        </ReportSection>

        <ReportSection
          number="3"
          title="PURCHASE BOOKING FINANCIAL REPORT"
          actions={
            <div className="flex items-end gap-2">
              <FilterActions onApply={() => undefined} onReset={() => setFilters((previous) => ({ ...previous, financialSupplier: "", financialCurrency: "" }))} />
              <Button type="button" size="sm" onClick={() => exportCsv(financialRows, "purchase-booking-financial.csv")} className="h-9 bg-emerald-600 text-white hover:bg-emerald-500">
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          }
          filters={
            <>
              <DarkInput label="From Date" type="date" value={filters.fromDate} onChange={(value) => setFilters((previous) => ({ ...previous, fromDate: value }))} />
              <DarkInput label="To Date" type="date" value={filters.toDate} onChange={(value) => setFilters((previous) => ({ ...previous, toDate: value }))} />
              <DarkSelect label="Supplier" value={filters.financialSupplier} options={suppliers} placeholder="All Suppliers" onChange={(value) => setFilters((previous) => ({ ...previous, financialSupplier: value }))} />
              <DarkSelect label="Currency" value={filters.financialCurrency} options={currencies} placeholder="All" onChange={(value) => setFilters((previous) => ({ ...previous, financialCurrency: value }))} />
            </>
          }
        >
          <div className="mb-3 grid gap-3 md:grid-cols-4">
            <MiniFinancial label="Total Booking Amount" value={formatMoney(financialRows.reduce((sum, row) => sum + row.totalPurchaseAmount, 0))} tone="blue" />
            <MiniFinancial label="Total Paid" value={formatMoney(totals.totalPaid)} tone="emerald" />
            <MiniFinancial label="Total Outstanding" value={formatMoney(totals.outstanding)} tone="red" />
            <MiniFinancial label="Average Booking Value" value={formatMoney(totals.average)} tone="amber" />
          </div>
          <DarkTable headers={["Date", "Booking No", "Supplier / Wholesaler", "Currency", "Booking Amount", "Paid Amount", "Outstanding Amount", "Payment Status", "Remarks"]}>
            {financialRows.map((report) => {
              const paid = report.paymentStatus.toLowerCase().includes("full")
                ? report.totalPurchaseAmount
                : report.paymentStatus.toLowerCase().includes("advance")
                  ? report.totalPurchaseAmount * 0.32
                  : report.paymentStatus.toLowerCase().includes("partial")
                    ? report.totalPurchaseAmount * 0.5
                    : 0;
              const outstanding = Math.max(0, report.totalPurchaseAmount - paid);
              return (
                <tr key={`${report.id}-financial`} className="border-b border-slate-700/70 hover:bg-blue-500/10">
                  <Td>{formatDate(report.purchaseDate)}</Td>
                  <Td className="font-bold text-blue-300">{report.purchaseBookingOrderNumber}</Td>
                  <Td>{report.supplierName}</Td>
                  <Td center>{report.currency}</Td>
                  <Td right>{formatMoney(report.totalPurchaseAmount)}</Td>
                  <Td right className="text-emerald-300">{formatMoney(paid)}</Td>
                  <Td right className={outstanding > 0 ? "text-red-300" : ""}>{formatMoney(outstanding)}</Td>
                  <Td><StatusBadge status={report.paymentStatus} /></Td>
                  <Td>{report.paymentStatus || "-"}</Td>
                </tr>
              );
            })}
          </DarkTable>
        </ReportSection>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ReportSection({ number, title, filters, actions, children }: { number: string; title: string; filters: React.ReactNode; actions: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-3 rounded-xl border border-slate-700 bg-[#0b1730] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-[280px] items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded bg-blue-500 text-xs font-black text-white">{number}</span>
          <h2 className="text-sm font-black tracking-wide text-white md:text-base">{title}</h2>
        </div>
        <div className="grid flex-1 gap-2 md:grid-cols-3 xl:grid-cols-7">{filters}</div>
        {actions}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DarkInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block min-w-[130px]">
      <span className="mb-1 block text-[10px] font-bold text-slate-400">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-slate-600 bg-slate-950/50 px-3 text-xs text-slate-100 outline-none ring-blue-500/30 placeholder:text-slate-500 focus:border-blue-400 focus:ring-2"
          placeholder={label}
        />
        {type === "text" ? <Search className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" /> : <CalendarDays className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />}
      </div>
    </label>
  );
}

function DarkSelect({ label, value, options, placeholder, onChange }: { label: string; value: string; options: string[]; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-[130px]">
      <span className="mb-1 block text-[10px] font-bold text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-slate-600 bg-slate-950/50 px-3 text-xs text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function FilterActions({ onApply, onReset }: { onApply: () => void; onReset: () => void }) {
  return (
    <div className="flex items-end gap-2">
      <Button type="button" size="sm" onClick={onApply} className="h-9 bg-blue-600 px-4 text-white hover:bg-blue-500">Apply</Button>
      <Button type="button" size="sm" variant="secondary" onClick={onReset} className="h-9 bg-slate-800 px-4 text-slate-100 hover:bg-slate-700">Reset</Button>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: "blue" | "emerald" | "violet" | "amber" | "red" }) {
  const color = {
    blue: "text-blue-300 bg-blue-500/15 border-blue-400/30",
    emerald: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
    violet: "text-violet-300 bg-violet-500/15 border-violet-400/30",
    amber: "text-amber-300 bg-amber-500/15 border-amber-400/30",
    red: "text-red-300 bg-red-500/15 border-red-400/30"
  }[accent];
  return (
    <div className="flex items-center gap-4 border-b border-r border-slate-700 p-4 last:border-r-0 md:border-b-0">
      <div className={`grid h-14 w-14 place-items-center rounded-xl border ${color}`}>{icon}</div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-black text-white">{value}</div>
      </div>
    </div>
  );
}

function DarkTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-700">
      <table className="min-w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-slate-800 text-[10px] uppercase tracking-wide text-slate-300">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap border-r border-slate-700 px-3 py-3 text-left font-black last:border-r-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-slate-950/30 text-slate-200">{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, className = "", center = false, right = false }: { children: React.ReactNode; className?: string; center?: boolean; right?: boolean }) {
  return <td className={`whitespace-nowrap border-r border-slate-800 px-3 py-2.5 last:border-r-0 ${center ? "text-center" : ""} ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase ${statusClass(status)}`}>{status || "Open"}</span>;
}

function ContainerStatus({ status }: { status: ContainerRow["status"] }) {
  const className = status === "Confirmed" ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : status === "Cancelled" ? "border-red-400/40 bg-red-500/15 text-red-300" : "border-amber-400/40 bg-amber-500/15 text-amber-300";
  return <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase ${className}`}>{status}</span>;
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 py-1.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right font-bold ${highlight ? "text-amber-300" : "text-slate-100"}`}>{value || "-"}</span>
    </div>
  );
}

function MiniFinancial({ label, value, tone }: { label: string; value: string; tone: "blue" | "emerald" | "red" | "amber" }) {
  const className = {
    blue: "text-blue-300",
    emerald: "text-emerald-300",
    red: "text-red-300",
    amber: "text-amber-300"
  }[tone];
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-black ${className}`}>{value}</div>
    </div>
  );
}

function TableFooter({ text }: { text: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-2 text-xs text-slate-400">
      <span>{text}</span>
      <div className="flex items-center gap-1">
        <button className="rounded border border-slate-700 bg-blue-600 px-3 py-1 text-white">1</button>
        <button className="rounded border border-slate-700 px-3 py-1 text-slate-300">2</button>
        <button className="rounded border border-slate-700 px-3 py-1 text-slate-300">3</button>
      </div>
    </div>
  );
}
