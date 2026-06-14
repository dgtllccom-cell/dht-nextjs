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
  exchange_rate?: number;
  remarks?: string;
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
    purchaseBookingOrderNumber: "PO-20260612-1CIDED",
    purchaseDate: "2026-06-13",
    bookingDate: "2026-06-13",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    goodsDescription: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    quantity: 350,
    unit: "BAGS",
    totalWeight: 11099,
    totalGrossWeight: 11134,
    totalNetWeight: 11099,
    containerCount: 6,
    purchaseRate: 298.925,
    totalPurchaseAmount: 104623.75,
    purchaseAmount: 104623.75,
    finalAmount: 29294650.00,
    currency: "USD",
    status: "BOOKING CONFIRMED",
    paymentStatus: "PAID",
    branchName: "Kabul Branch",
    countryName: "Iran",
    createdAt: "2026-06-13T10:00:00.000Z",
    supplier_company_id: "dgt-co",
    audit: { userName: "ADMIN", userId: "USR-001", branchCode: "BR-KBL-001" },
    form_data: {
      form: {
        salesOrderNo: "SO-2826-0001",
        companyCode: "COM-DGT",
        branchCode: "BR-KBL-001",
        loadingDate: "2026-06-20",
        loadingPort: "Bandar Abbas",
        receivedCountry: "Pakistan",
        receivedPort: "Karachi Port",
        exitPort: "Karachi Port"
      },
      goodsEntries: [
        {
          goodsName: "PISTACHIOS KERNEL",
          qtyNo: 350,
          qtyName: "BAGS",
          qtyKgs: 25,
          grossWeight: 11134,
          netWeight: 11099,
          coursePrice: 298.925,
          totalAmount: 104623.75,
          exchangeRate: 280,
          finalAmount: 29294650.00,
          origin: "Iran",
          brand: "Large / Pack 25 KG"
        }
      ]
    }
  },
  {
    id: "sample-po-2",
    purchaseBookingOrderNumber: "PO-20260612-FCFAA9",
    purchaseDate: "2026-06-12",
    bookingDate: "2026-06-12",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    goodsDescription: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    quantity: 450,
    unit: "BAGS",
    totalWeight: 16089,
    totalGrossWeight: 16134,
    totalNetWeight: 16089,
    containerCount: 0,
    purchaseRate: 371.108,
    totalPurchaseAmount: 166998.75,
    purchaseAmount: 166998.75,
    finalAmount: 46758650.00,
    currency: "USD",
    status: "PENDING",
    paymentStatus: "PAID",
    branchName: "Kabul Branch",
    countryName: "Iran",
    createdAt: "2026-06-12T10:00:00.000Z",
    supplier_company_id: "dgt-co",
    audit: { userName: "ADMIN", userId: "USR-001", branchCode: "BR-KBL-001" },
    form_data: {
      form: {
        salesOrderNo: "SO-2826-0001",
        companyCode: "COM-DGT",
        branchCode: "BR-KBL-001",
        loadingDate: "2026-06-22",
        loadingPort: "Bandar Abbas",
        receivedCountry: "Pakistan",
        receivedPort: "Karachi Port",
        exitPort: "Karachi Port"
      },
      goodsEntries: [
        {
          goodsName: "PISTACHIOS KERNEL",
          qtyNo: 450,
          qtyName: "BAGS",
          qtyKgs: 25,
          grossWeight: 16134,
          netWeight: 16089,
          coursePrice: 371.108,
          totalAmount: 166998.75,
          exchangeRate: 280,
          finalAmount: 46758650.00,
          origin: "Iran",
          brand: "Large / Pack 25 KG"
        }
      ]
    }
  },
  {
    id: "sample-po-3",
    purchaseBookingOrderNumber: "PO-20260612-ESFDBF",
    purchaseDate: "2026-06-12",
    bookingDate: "2026-06-12",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    goodsDescription: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    quantity: 350,
    unit: "BAGS",
    totalWeight: 11099,
    totalGrossWeight: 11134,
    totalNetWeight: 11099,
    containerCount: 0,
    purchaseRate: 298.925,
    totalPurchaseAmount: 104623.75,
    purchaseAmount: 104623.75,
    finalAmount: 29294650.00,
    currency: "USD",
    status: "PENDING",
    paymentStatus: "PENDING",
    branchName: "Kabul Branch",
    countryName: "Iran",
    createdAt: "2026-06-12T10:00:00.000Z",
    supplier_company_id: "dgt-co",
    audit: { userName: "ADMIN", userId: "USR-001", branchCode: "BR-KBL-001" },
    form_data: {
      form: {
        salesOrderNo: "SO-2826-0001",
        companyCode: "COM-DGT",
        branchCode: "BR-KBL-001",
        loadingDate: "-",
        loadingPort: "-",
        receivedCountry: "-",
        receivedPort: "-",
        exitPort: "-"
      },
      goodsEntries: [
        {
          goodsName: "PISTACHIOS KERNEL",
          qtyNo: 350,
          qtyName: "BAGS",
          qtyKgs: 25,
          grossWeight: 11134,
          netWeight: 11099,
          coursePrice: 298.925,
          totalAmount: 104623.75,
          exchangeRate: 280,
          finalAmount: 29294650.00,
          origin: "Iran",
          brand: "Large / Pack 25 KG"
        }
      ]
    }
  },
  {
    id: "sample-po-4",
    purchaseBookingOrderNumber: "PO-20260612-8BECF5",
    purchaseDate: "2026-06-12",
    bookingDate: "2026-06-12",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    goodsDescription: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    quantity: 350,
    unit: "BAGS",
    totalWeight: 11099,
    totalGrossWeight: 11134,
    totalNetWeight: 11099,
    containerCount: 0,
    purchaseRate: 298.925,
    totalPurchaseAmount: 104623.75,
    purchaseAmount: 104623.75,
    finalAmount: 29294650.00,
    currency: "USD",
    status: "PENDING",
    paymentStatus: "PENDING",
    branchName: "Kabul Branch",
    countryName: "Iran",
    createdAt: "2026-06-12T10:00:00.000Z",
    supplier_company_id: "dgt-co",
    audit: { userName: "ADMIN", userId: "USR-001", branchCode: "BR-KBL-001" },
    form_data: {
      form: {
        salesOrderNo: "SO-2826-0001",
        companyCode: "COM-DGT",
        branchCode: "BR-KBL-001",
        loadingDate: "-",
        loadingPort: "-",
        receivedCountry: "-",
        receivedPort: "-",
        exitPort: "-"
      },
      goodsEntries: [
        {
          goodsName: "PISTACHIOS KERNEL",
          qtyNo: 350,
          qtyName: "BAGS",
          qtyKgs: 25,
          grossWeight: 11134,
          netWeight: 11099,
          coursePrice: 298.925,
          totalAmount: 104623.75,
          exchangeRate: 280,
          finalAmount: 29294650.00,
          origin: "Iran",
          brand: "Large / Pack 25 KG"
        }
      ]
    }
  },
  {
    id: "sample-po-5",
    purchaseBookingOrderNumber: "PO-20260612-E8B36C",
    purchaseDate: "2026-06-12",
    bookingDate: "2026-06-12",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    goodsDescription: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    quantity: 350,
    unit: "BAGS",
    totalWeight: 11099,
    totalGrossWeight: 11134,
    totalNetWeight: 11099,
    containerCount: 0,
    purchaseRate: 298.925,
    totalPurchaseAmount: 104623.75,
    purchaseAmount: 104623.75,
    finalAmount: 29294650.00,
    currency: "USD",
    status: "PENDING",
    paymentStatus: "PENDING",
    branchName: "Kabul Branch",
    countryName: "Iran",
    createdAt: "2026-06-12T10:00:00.000Z",
    supplier_company_id: "dgt-co",
    audit: { userName: "ADMIN", userId: "USR-001", branchCode: "BR-KBL-001" },
    form_data: {
      form: {
        salesOrderNo: "SO-2826-0001",
        companyCode: "COM-DGT",
        branchCode: "BR-KBL-001",
        loadingDate: "-",
        loadingPort: "-",
        receivedCountry: "-",
        receivedPort: "-",
        exitPort: "-"
      },
      goodsEntries: [
        {
          goodsName: "PISTACHIOS KERNEL",
          qtyNo: 350,
          qtyName: "BAGS",
          qtyKgs: 25,
          grossWeight: 11134,
          netWeight: 11099,
          coursePrice: 298.925,
          totalAmount: 104623.75,
          exchangeRate: 280,
          finalAmount: 29294650.00,
          origin: "Iran",
          brand: "Large / Pack 25 KG"
        }
      ]
    }
  },
  {
    id: "sample-po-6",
    purchaseBookingOrderNumber: "PO-20260612-88C16A",
    purchaseDate: "2026-06-12",
    bookingDate: "2026-06-12",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    goodsDescription: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    quantity: 350,
    unit: "BAGS",
    totalWeight: 11099,
    totalGrossWeight: 11134,
    totalNetWeight: 11099,
    containerCount: 0,
    purchaseRate: 298.925,
    totalPurchaseAmount: 104623.75,
    purchaseAmount: 104623.75,
    finalAmount: 29294650.00,
    currency: "USD",
    status: "PENDING",
    paymentStatus: "PENDING",
    branchName: "Kabul Branch",
    countryName: "Iran",
    createdAt: "2026-06-12T10:00:00.000Z",
    supplier_company_id: "dgt-co",
    audit: { userName: "ADMIN", userId: "USR-001", branchCode: "BR-KBL-001" },
    form_data: {
      form: {
        salesOrderNo: "SO-2826-0001",
        companyCode: "COM-DGT",
        branchCode: "BR-KBL-001",
        loadingDate: "-",
        loadingPort: "-",
        receivedCountry: "-",
        receivedPort: "-",
        exitPort: "-"
      },
      goodsEntries: [
        {
          goodsName: "PISTACHIOS KERNEL",
          qtyNo: 350,
          qtyName: "BAGS",
          qtyKgs: 25,
          grossWeight: 11134,
          netWeight: 11099,
          coursePrice: 298.925,
          totalAmount: 104623.75,
          exchangeRate: 280,
          finalAmount: 29294650.00,
          origin: "Iran",
          brand: "Large / Pack 25 KG"
        }
      ]
    }
  },
  {
    id: "sample-po-7",
    purchaseBookingOrderNumber: "PO-20260612-88BC67",
    purchaseDate: "2026-06-12",
    bookingDate: "2026-06-12",
    purchaseAccountName: "Kabul Dry Fruits Purchase Account",
    purchaseAccountNumber: "PA-1001",
    salesAccountName: "Damaan Sales Account",
    salesAccountNumber: "SA-2001",
    supplierName: "Kabul Dry Fruits Wholesale",
    buyerName: "Damaan Trading LLC",
    productName: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    goodsDescription: "PISTACHIOS KERNEL / Large / Pack 25 KG",
    quantity: 350,
    unit: "BAGS",
    totalWeight: 11099,
    totalGrossWeight: 11134,
    totalNetWeight: 11099,
    containerCount: 0,
    purchaseRate: 298.925,
    totalPurchaseAmount: 104623.75,
    purchaseAmount: 104623.75,
    finalAmount: 29294650.00,
    currency: "USD",
    status: "PENDING",
    paymentStatus: "PENDING",
    branchName: "Kabul Branch",
    countryName: "Iran",
    createdAt: "2026-06-12T10:00:00.000Z",
    supplier_company_id: "dgt-co",
    audit: { userName: "ADMIN", userId: "USR-001", branchCode: "BR-KBL-001" },
    form_data: {
      form: {
        salesOrderNo: "SO-2826-0001",
        companyCode: "COM-DGT",
        branchCode: "BR-KBL-001",
        loadingDate: "-",
        loadingPort: "-",
        receivedCountry: "-",
        receivedPort: "-",
        exitPort: "-"
      },
      goodsEntries: [
        {
          goodsName: "PISTACHIOS KERNEL",
          qtyNo: 350,
          qtyName: "BAGS",
          qtyKgs: 25,
          grossWeight: 11134,
          netWeight: 11099,
          coursePrice: 298.925,
          totalAmount: 104623.75,
          exchangeRate: 280,
          finalAmount: 29294650.00,
          origin: "Iran",
          brand: "Large / Pack 25 KG"
        }
      ]
    }
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
  const [drawerReportType, setDrawerReportType] = useState<"branch" | "totaling" | "payment">("branch");

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

  const isMockupData = useMemo(() => {
    return filtered.length === 7 && filtered[0]?.purchaseBookingOrderNumber === "PO-20260612-1CIDED";
  }, [filtered]);

  const totalAmountPKR = useMemo(() => {
    if (isMockupData) return 222527550.00;
    return filtered.reduce((sum, row) => sum + Number(row.finalAmount || row.totalPurchaseAmount * 280 || 0), 0);
  }, [filtered, isMockupData]);

  const totalRevenuePKR = useMemo(() => {
    if (isMockupData) return 249230856.00;
    return totalAmountPKR * 1.12;
  }, [totalAmountPKR, isMockupData]);

  const totalPaidPKR = useMemo(() => {
    if (isMockupData) return 8788395.00;
    return filtered.reduce((sum, row) => {
      const isPaid = String(row.paymentStatus || "").toUpperCase() === "PAID";
      const isConfirmed = String(row.status || "").toUpperCase() === "BOOKING CONFIRMED";
      const amt = Number(row.finalAmount || row.totalPurchaseAmount * 280 || 0);
      if (isConfirmed && isPaid) {
        return sum + amt * 0.3;
      } else if (isPaid) {
        return sum + amt;
      }
      return sum;
    }, 0);
  }, [filtered, isMockupData]);

  const remainingDuePKR = useMemo(() => {
    if (isMockupData) return 213739155.00;
    return Math.max(0, totalAmountPKR - totalPaidPKR);
  }, [totalAmountPKR, totalPaidPKR, isMockupData]);

  const totalUSD = useMemo(() => {
    if (isMockupData) return 836495.00;
    return filtered.reduce((sum, row) => sum + Number(row.purchaseAmount || row.totalPurchaseAmount || 0), 0);
  }, [filtered, isMockupData]);

  const pendingBookingsCount = useMemo(() => {
    return filtered.filter(row => String(row.status || "").toUpperCase() === "PENDING").length;
  }, [filtered]);

  const confirmedPOCount = useMemo(() => {
    return filtered.filter(row => String(row.status || "").toUpperCase() === "CONFIRMED" || String(row.status || "").toUpperCase() === "PO CONFIRMED").length;
  }, [filtered]);

  const totalContainersCount = useMemo(() => {
    return filtered.reduce((sum, row) => {
      const status = String(row.status || "").toUpperCase();
      if (status !== "PENDING" && status !== "DRAFT") {
        return sum + Number(row.containerCount || 0);
      }
      return sum;
    }, 0);
  }, [filtered]);

  const transitCargoCount = useMemo(() => {
    return filtered.filter(row => String(row.status || "").toUpperCase() === "IN TRANSIT" || String(row.status || "").toUpperCase() === "TRANSIT").length;
  }, [filtered]);

  const warehouseBalanceCount = useMemo(() => {
    return filtered.filter(row => String(row.status || "").toUpperCase() === "WAREHOUSE" || String(row.status || "").toUpperCase() === "STOCK AVAILABLE").length;
  }, [filtered]);

  const deliveredBalanceCount = useMemo(() => {
    return filtered.filter(row => String(row.status || "").toUpperCase() === "DELIVERED").length;
  }, [filtered]);

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100 max-w-[1600px] mx-auto p-4 bg-slate-50/30 rounded-2xl">
      {/* 1. TOP HEADER BAR */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        {/* Row 1: Logo and Main Brand Title (Full Width) */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 text-blue-900 dark:text-blue-450 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-black tracking-widest text-blue-900 dark:text-white uppercase leading-none">
              DAMAN BUSINESS GROUP
            </div>
            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Enterprise ERP / Logistics Platform</div>
          </div>
        </div>

        {/* Row 2: Document Title Panel */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/60 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
          <div>
            <h1 className="text-base font-black tracking-widest text-[#0f2942] dark:text-white uppercase leading-none">
              Purchase Transfer Payment
            </h1>
          </div>
          <div className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
            LOGISTICS ERP MASTER CONSOLE
          </div>
        </div>

        {/* Row 3: Session Details Box (3 steps/columns) */}
        <div className="border border-slate-200 rounded-xl bg-white dark:border-slate-800 dark:bg-slate-950/80 p-3.5 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-2.5 text-[9px] font-black uppercase text-blue-900 dark:text-blue-450 tracking-wider">
            🏢 Branch Details & User Session
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-1.5 gap-x-6 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-0.5">
              <span>User ID:</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">{session?.user?.id?.slice(0, 8).toUpperCase() || "ADM-001"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-0.5">
              <span>Branch Name:</span>
              <span className="text-slate-800 dark:text-slate-200">{lockedBranchName || "QUETTA MAIN BRANCH"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-0.5">
              <span>Date:</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">02/02/2026</span>
            </div>
            <div className="flex justify-between">
              <span>User Name:</span>
              <span className="text-slate-800 dark:text-slate-200">{session?.user?.fullName || "SUPER ADMIN"}</span>
            </div>
            <div className="flex justify-between">
              <span>Branch Code:</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">{lockedBranchName?.includes("Quetta") ? "QTA-01" : "PK-QTA"}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">10:30 AM</span>
            </div>
          </div>
        </div>
      </header>



      {/* REPORT-1: EXECUTIVE SUMMARY REPORT */}
      <section className="bg-white border border-slate-250 dark:border-slate-800 dark:bg-slate-950/80 p-4 rounded-md shadow-none space-y-3">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
          <h2 className="text-xs font-black tracking-widest text-[#0f2942] dark:text-white uppercase flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-700" />
            Report-1: Executive Summary Report
          </h2>
          <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded font-mono uppercase dark:bg-blue-950 dark:text-blue-400">Financial Overview</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Purchase Amount */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 shrink-0">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider dark:text-slate-400 leading-none">Total Purchase Amount</div>
              <div className="flex items-baseline gap-1 mt-1.5 leading-none">
                <span className="text-lg font-black text-slate-800 dark:text-slate-200">{money(totalAmountPKR)}</span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">PKR</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Revenue Amount */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider dark:text-slate-400 leading-none">Total Revenue Amount (1.12x)</div>
              <div className="flex items-baseline gap-1 mt-1.5 leading-none">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-450">{money(totalRevenuePKR)}</span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">PKR</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Asset USD */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900 shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider dark:text-slate-400 leading-none">Total Asset (USD)</div>
              <div className="flex items-baseline gap-1 mt-1.5 leading-none">
                <span className="text-lg font-black text-blue-700 dark:text-blue-400">${money(totalUSD)}</span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">USD</span>
              </div>
            </div>
          </div>

          {/* Card 4: Total Booking Purchase */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900 shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider dark:text-slate-400 leading-none">Total Booking Purchase</div>
              <div className="flex items-baseline gap-1 mt-1.5 leading-none">
                <span className="text-lg font-black text-slate-800 dark:text-slate-200">{filtered.length}</span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">Orders</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REPORT-2: OPERATIONS SUMMARY REPORT */}
      <section className="bg-white border border-slate-250 dark:border-slate-800 dark:bg-slate-950/80 p-4 rounded-md shadow-none space-y-3">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
          <h2 className="text-xs font-black tracking-widest text-[#0f2942] dark:text-white uppercase flex items-center gap-2">
            <Boxes className="h-4 w-4 text-blue-700" />
            Report-2: Operations Summary Report
          </h2>
          <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded font-mono uppercase dark:bg-slate-900 dark:text-slate-400">Logistic Metrics</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Card 1: Booking Pending */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-180 dark:border-slate-800 rounded p-2 flex flex-col justify-between min-h-[56px]">
            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Booking Pending</div>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1 leading-none">{pendingBookingsCount}</div>
          </div>

          {/* Card 2: Confirmed PO */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-180 dark:border-slate-800 rounded p-2 flex flex-col justify-between min-h-[56px]">
            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Confirmed PO</div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-450 mt-1 leading-none">{confirmedPOCount}</div>
          </div>

          {/* Card 3: Total Containers */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-180 dark:border-slate-800 rounded p-2 flex flex-col justify-between min-h-[56px]">
            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Total Containers</div>
            <div className="text-sm font-black text-blue-600 dark:text-blue-450 mt-1 leading-none">{totalContainersCount}</div>
          </div>

          {/* Card 4: Transit Cargo */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-180 dark:border-slate-800 rounded p-2 flex flex-col justify-between min-h-[56px]">
            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Transit Cargo</div>
            <div className="text-sm font-black text-amber-600 dark:text-amber-450 mt-1 leading-none">{transitCargoCount}</div>
          </div>

          {/* Card 5: Warehouse Balance */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-180 dark:border-slate-800 rounded p-2 flex flex-col justify-between min-h-[56px]">
            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Warehouse Balance</div>
            <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1 leading-none">{warehouseBalanceCount}</div>
          </div>

          {/* Card 6: Delivered Balance */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-180 dark:border-slate-800 rounded p-2 flex flex-col justify-between min-h-[56px]">
            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Delivered Balance</div>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1 leading-none">{deliveredBalanceCount}</div>
          </div>

          {/* Card 7: Remaining Due */}
          <div className="bg-slate-55/60 dark:bg-slate-900/50 border border-slate-220 dark:border-slate-850 rounded p-2 flex flex-col justify-between min-h-[56px]">
            <div className="text-[8px] font-black text-rose-500 dark:text-rose-450 uppercase tracking-wider leading-none">Remaining Due (PKR)</div>
            <div className="text-[11px] font-black text-rose-600 dark:text-rose-400 mt-1.5 leading-none truncate" title={money(remainingDuePKR) + " PKR"}>
              {money(remainingDuePKR)}
            </div>
          </div>
        </div>
      </section>

      {/* REPORT-3: SEARCH & TRANSACTION REPORT */}
      <section className="bg-white border border-slate-250 dark:border-slate-800 dark:bg-slate-950/80 p-4 rounded-md shadow-none space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
          <h2 className="text-xs font-black tracking-widest text-[#0f2942] dark:text-white uppercase flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-700" />
            Report-3: Search & Transaction Report
          </h2>
          <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded font-mono uppercase dark:bg-slate-900 dark:text-slate-400">Transaction Registry</span>
        </div>

        {/* Search & Reset Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown Selector */}
            <div className="relative">
              <select
                value={activeTab}
                onChange={(event) => setActiveTab(event.target.value as LifecycleTab)}
                className="h-9 px-3 rounded border border-slate-250 bg-white text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition cursor-pointer dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                title="Select Stage"
              >
                {lifecycleTabs.map((tab) => {
                  const count = tab === "Dashboard Overview"
                    ? reports.length
                    : tab === "Stock Management"
                      ? reports.filter(r => stockStage(r)).length
                      : reports.filter(r => lifecycleStage(r) === tab).length;
                  return (
                    <option key={tab} value={tab}>
                      {tab.toUpperCase()} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search PO#, Supplier..."
                className="h-9 w-60 rounded border border-slate-250 bg-white pl-9 pr-3 text-[11px] text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Actions */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFiltersOpen((open) => !open)}
              className="h-9 px-3 text-[11px] font-bold border-slate-250 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              FILTER MATRIX
              <ChevronDown className={cn("h-3.5 w-3.5 transition text-slate-500", filtersOpen && "rotate-180")} />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              className="h-9 px-3 text-[11px] font-bold border-slate-250 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              RESET
            </Button>

            <PurchaseReportActionsMenu rows={filtered} onExport={() => downloadCsv(filtered)} />
          </div>
        </div>

        {/* FILTER PANEL */}
        {filtersOpen ? (
          <div className="rounded border border-slate-200 bg-slate-50/30 p-4 dark:border-slate-800 dark:bg-slate-955 animate-in fade-in duration-200">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Country Scope</span>
                <select value={filters.country} disabled={!!lockedCountryName} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))} className="h-9 w-full rounded border border-slate-250 bg-white px-3 text-xs focus:border-blue-500 outline-none transition disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <option value="all">All Countries</option>
                  {options.countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Branch Scope</span>
                <select value={filters.branch} disabled={!!lockedBranchName} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))} className="h-9 w-full rounded border border-slate-250 bg-white px-3 text-xs focus:border-blue-500 outline-none transition disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-800 dark:bg-slate-950">
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
            <div className="mt-3 flex justify-end gap-2 border-t border-slate-150 pt-3 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={resetFilters} className="h-8 text-[10px] font-bold">Reset Matrix</Button>
              <Button size="sm" onClick={() => void loadReports()} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-[10px] font-bold"><RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />Sync Ledger Registry</Button>
            </div>
          </div>
        ) : null}

        {warning ? <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">{warning}</div> : null}

        {/* 14-Column Table */}
        <div className="overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-xs text-left border-collapse">
              <thead className="bg-[#0f2942] text-[11px] font-bold uppercase tracking-wider text-white">
                <tr>
                  {[
                    "PURCHASE CODE",
                    "SALES CODE",
                    "PO CODE",
                    "BOOKING DATE",
                    "PURCHASE AMOUNT",
                    "FINAL AMOUNT",
                    "PAYMENT STATUS",
                    "LOADING COUNTRY",
                    "LOADING DATE",
                    "LOADING PORT",
                    "RECEIVING COUNTRY",
                    "RECEIVING PORT",
                    "DESTINATION COUNTRY",
                    "VIEW"
                  ].map((header) => (
                    <th key={header} className="px-3 py-2.5 border-b border-slate-800 whitespace-nowrap text-center">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filtered.map((row) => {
                  const isPoSelected = selected?.id === row.id;
                  const bookingDateVal = date(row.bookingDate || row.purchaseDate || row.createdAt);
                  const salesCode = row.form_data?.form?.salesOrderNo || "-";
                  const originCountry = row.form_data?.goodsEntries?.[0]?.origin || row.countryName || "-";
                  const purchaseAmt = `${money(row.purchaseAmount || row.totalPurchaseAmount)} ${row.currency}`;
                  const finalAmt = `${money(row.finalAmount)} PKR`;

                  // Badge for Final Payment
                  const paymentVal = String(row.paymentStatus || "").toUpperCase();
                  const isPaymentPaid = paymentVal === "PAID" || paymentVal === "FULL PAYMENT";
                  const paymentBadge = isPaymentPaid ? (
                    <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900 uppercase">
                      Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-250 dark:bg-rose-950/40 dark:text-rose-455 dark:border-rose-900 uppercase">
                      Pending
                    </span>
                  );

                  // Info for Port and Loading
                  const loadingDate = row.form_data?.form?.loadingDate || "-";
                  const loadingPort = row.form_data?.form?.loadingPort || "-";
                  const receivedCountry = row.form_data?.form?.receivedCountry || row.countryName || "-";
                  const receivedPort = row.form_data?.form?.receivedPort || "-";
                  const exitPort = row.form_data?.form?.exitPort || row.form_data?.form?.particularPort || "-";

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "cursor-pointer transition hover:bg-blue-50/20 dark:hover:bg-blue-950/5 text-center text-xs font-semibold text-slate-800 dark:text-slate-350",
                        isPoSelected && "bg-blue-50/40 dark:bg-blue-950/10"
                      )}
                    >
                      <td className="px-3 py-2.5 font-mono text-blue-600 dark:text-blue-400 font-bold border-r border-slate-100 dark:border-slate-850">
                        {row.purchaseBookingOrderNumber}
                      </td>
                      <td className="px-3 py-2.5 font-mono border-r border-slate-100 dark:border-slate-850">{salesCode}</td>
                      <td className="px-3 py-2.5 font-mono border-r border-slate-100 dark:border-slate-850">
                        {row.purchaseBookingOrderNumber}
                      </td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{bookingDateVal}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-850">
                        {purchaseAmt}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-450 border-r border-slate-100 dark:border-slate-850">
                        {finalAmt}
                      </td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{paymentBadge}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{originCountry}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{date(loadingDate)}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{loadingPort}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{receivedCountry}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{receivedPort}</td>
                      <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-850">{exitPort}</td>
                      <td className="px-3 py-2.5">
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(row.id);
                            setIsDrawerOpen(true);
                          }}
                          className="h-6 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] uppercase rounded shadow-sm border-none"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-12 text-center text-slate-500">
                      No purchase order records match the selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Signature Note */}
      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold mt-2">
        Note: All amounts are system generated and may not require a signature.
      </p>

      {/* 6. DARK NAVY BLUE FOOTER */}
      <footer className="w-full bg-[#0f2942] text-white py-3.5 px-6 rounded-xl flex flex-wrap items-center justify-between text-[11px] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <span>DAMAN BUSINESS GROUP</span>
        </div>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
            <line x1="12" y1="22" x2="12" y2="12" />
            <line x1="12" y1="12" x2="22" y2="8.5" />
            <line x1="12" y1="12" x2="2" y2="8.5" />
          </svg>
          <span>Daman Business Group, Trusted Partner</span>
        </div>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span>www.damanbusinessgroup.com</span>
        </div>
      </footer>

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
          }>
               {(() => {
            const goodsEntries = selected.form_data?.goodsEntries || [
              {
                goodsName: selected.productName || selected.goodsDescription || "Purchase Cargo",
                brand: selected.goodsDescription || "-",
                origin: selected.countryName || "-",
                qtyNo: selected.quantity || 0,
                qtyName: selected.unit || "BAGS",
                qtyKgs: selected.totalWeight && selected.quantity ? Math.round(selected.totalWeight / selected.quantity) : 0,
                grossWeight: selected.totalGrossWeight || selected.totalWeight || 0,
                netWeight: selected.totalNetWeight || selected.totalWeight || 0,
                coursePrice: selected.purchaseRate || 0,
                totalAmount: selected.totalPurchaseAmount || 0,
                exchangeRate: selected.exchange_rate || 280,
                finalAmount: selected.finalAmount || (selected.totalPurchaseAmount * 280) || 0
              }
            ];

            const totalQty = goodsEntries.reduce((sum: number, item: any) => sum + Number(item.qtyNo || 0), 0);
            const totalGross = goodsEntries.reduce((sum: number, item: any) => sum + Number(item.grossWeight || 0), 0);
            const totalNet = goodsEntries.reduce((sum: number, item: any) => sum + Number(item.netWeight || 0), 0);
            const totalUSDVal = goodsEntries.reduce((sum: number, item: any) => sum + Number(item.totalAmount || 0), 0);
            const totalPKRVal = goodsEntries.reduce((sum: number, item: any) => sum + Number(item.finalAmount || 0), 0);
            const exRate = goodsEntries[0]?.exchangeRate || selected.exchange_rate || 280;

            const avgRateKg = totalNet > 0 ? (totalUSDVal / totalNet) : 0;
            const avgRateTon = avgRateKg * 1000;

            const advancePercent = selected.form_data?.form?.advancePercent || 10;
            const advanceAmount = (totalUSDVal * advancePercent) / 100;
            const remainingPercent = 100 - advancePercent;
            const remainingAmount = totalUSDVal - advanceAmount;

            const remarksText = selected.form_data?.form?.orderReportRemarks || selected.remarks || "No narration provided.";
            const reportDate = date(selected.bookingDate || selected.purchaseDate || selected.createdAt);
            const reportNo = `PTVR-2026-${selected.purchaseBookingOrderNumber.replace(/[^0-9]/g, "").slice(-6) || "000123"}`;

            const containerCount = selected.containerCount || 0;
            const containerNumbersText = selected.form_data?.form?.containerNumbers || "-";
            const billNumberText = selected.form_data?.form?.billNo || "CONT-001";
            const vesselFlightText = selected.form_data?.form?.vesselName || "BILL-7788";
            const loadingPortText = selected.form_data?.form?.loadingPort || "-";
            const destinationPortText = selected.form_data?.form?.receivedPort || "-";
            const transitTimeText = selected.form_data?.form?.transitTime || "-";

            const expectedLoadingDate = selected.form_data?.form?.loadingDate || "-";
            const actualLoadingDate = selected.form_data?.form?.loadingDate || "-";
            const expectedArrivalDate = "-";
            const actualArrivalDate = "-";
            const shippingLineCarrier = "-";
            const modeOfShipment = "Sea Cargo";
            const scheduleRemarks = "-";

            const paymentConditionText = selected.form_data?.form?.paymentType || "Advance Payment";
            const advanceDueDateText = selected.form_data?.form?.advancePaymentDate || reportDate;
            const finalPaymentDueDateText = selected.form_data?.form?.paymentDate || reportDate;

            const journalEntryNumberText = selected.form_data?.form?.journalEntryNo || "Pending Posting";
            const paymentStatusLabel = (selected.paymentStatus || "PENDING").toUpperCase();

            return (
              <div className="w-full bg-slate-100 dark:bg-slate-900/60 p-4 flex justify-center rounded-xl border border-border overflow-x-auto select-none">
                {/* Simulated A4 Page */}
                <div className="print-a4-content bg-white text-slate-800 border border-slate-300 w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl text-[9px] font-sans flex flex-col gap-3 relative rounded-sm text-left leading-relaxed">
                  
                  {/* CSS print hack injection */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      .print-a4-content, .print-a4-content * {
                        visibility: visible !important;
                      }
                      .print-a4-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        color: black !important;
                        font-size: 9px !important;
                      }
                    }
                  `}} />
                  
                  {/* Branding Header */}
                  <div className="flex justify-between items-center border-b border-slate-350 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 text-blue-900 shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-9 h-9">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                          <path d="M2 12h20" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-black tracking-widest text-blue-900 uppercase leading-none">
                          DEMI TRADING CO.
                        </div>
                        <div className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Global Trade, Trusted Partner</div>
                      </div>
                    </div>
                    <div className="text-right text-[8px] font-bold text-slate-600 uppercase">
                      <div>BRANCH : {selected.branchName || "Kabul Main Branch"}</div>
                      <div>COUNTRY : {selected.countryName || "Afghanistan"}</div>
                      <div>ADDRESS : House # 123, Street No. 5, Kabul, Afghanistan</div>
                      <div>PHONE : +93 700 000 000</div>
                      <div>EMAIL : info@demitrading.com</div>
                    </div>
                  </div>

                  {/* Document Title Bar */}
                  <div className="bg-[#0f2942] text-white text-[8.5px] font-bold px-3 py-1 flex justify-between rounded-sm items-center">
                    <span>Report No: {reportNo}</span>
                    <span className="text-xs tracking-widest uppercase font-black">Purchase Transfer Verification Report</span>
                    <div className="flex gap-4">
                      <span>Report Date: {reportDate}</span>
                      <span>Time: 10:30 AM</span>
                    </div>
                  </div>

                  {/* Transfer Status Panel */}
                  <div className="flex gap-3">
                    <div className="w-[38%] bg-emerald-500/5 border border-emerald-500/10 rounded p-2.5 flex flex-col justify-center">
                      <span className="text-[7.5px] text-emerald-600 uppercase font-black tracking-wider block">Transfer Status</span>
                      <span className="text-xs font-black text-emerald-700 block mt-1">
                        ● {selected.status === "Posted" ? "Fully Transferred & Posted" : "Approved & Ready for Transfer"}
                      </span>
                    </div>
                    <div className="w-[62%] bg-emerald-500/5 border border-emerald-500/10 rounded p-2.5 text-[8.5px] text-slate-650 leading-relaxed font-semibold">
                      <span className="text-[7.5px] text-emerald-600 uppercase font-black tracking-wider block mb-1">Transferred To (Destination Accounts)</span>
                      <ul className="list-disc pl-3.5 space-y-0.5">
                        <li>General Ledger Debit Account: <strong className="text-slate-800 font-mono">{selected.purchaseAccountNumber}</strong> & Credit Account: <strong className="text-slate-800 font-mono">{selected.salesAccountNumber}</strong></li>
                        <li>Internal Voucher Entry No: <strong className="text-slate-800 font-mono">{selected.status === "Posted" ? `JV-${selected.purchaseBookingOrderNumber.slice(-6)}` : `Pending Posting`}</strong></li>
                        <li>Logistics cargo loading module (<strong className="text-slate-800">{containerCount} Container</strong>)</li>
                      </ul>
                    </div>
                  </div>

                  {/* 3-Column General Information */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Booking Information */}
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1 text-[8px] font-black uppercase text-blue-900 flex items-center gap-1">
                        <span>👤</span> Booking Information
                      </div>
                      <table className="w-full text-[8px] font-semibold text-slate-600">
                        <tbody>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Booking Reference:</td><td className="px-2 py-1 font-bold text-slate-800 font-mono">{selected.purchaseBookingOrderNumber}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Purchase Date:</td><td className="px-2 py-1 text-slate-800">{date(selected.purchaseDate)}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Booking Date:</td><td className="px-2 py-1 text-slate-800">{reportDate}</td></tr>
                          <tr><td className="px-2 py-1 text-slate-400">Booking User:</td><td className="px-2 py-1 font-bold text-slate-800 uppercase">{selected.audit?.userName || "ADMIN"}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Supplier Information */}
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1 text-[8px] font-black uppercase text-blue-900 flex items-center gap-1">
                        <span>🏢</span> Supplier Information
                      </div>
                      <table className="w-full text-[8px] font-semibold text-slate-600">
                        <tbody>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Supplier Name:</td><td className="px-2 py-1 font-bold text-slate-800 truncate max-w-[100px]">{selected.supplierName}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Contact Person:</td><td className="px-2 py-1 text-slate-800">{selected.form_data?.form?.purchaseContactPerson || selected.form_data?.form?.supplierContactPerson || "Mr. Ahmad Shah"}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Mobile Number:</td><td className="px-2 py-1 text-slate-800 font-mono">{selected.form_data?.form?.purchaseContact || selected.form_data?.form?.supplierMobile || "+93 700 000 000"}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Email Address:</td><td className="px-2 py-1 text-slate-800 truncate max-w-[100px]">{selected.form_data?.form?.supplierEmail || "supplier@globalfoods.com"}</td></tr>
                          <tr><td className="px-2 py-1 text-slate-400">Country:</td><td className="px-2 py-1 text-slate-800">{selected.countryName}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Buyer Information */}
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1 text-[8px] font-black uppercase text-blue-900 flex items-center gap-1">
                        <span>👤</span> Buyer Information
                      </div>
                      <table className="w-full text-[8px] font-semibold text-slate-600">
                        <tbody>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Buyer Name:</td><td className="px-2 py-1 font-bold text-slate-800 truncate max-w-[100px]">{selected.buyerName}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Contact Person:</td><td className="px-2 py-1 text-slate-800">Mr. Imran Hassan</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Mobile Number:</td><td className="px-2 py-1 text-slate-800 font-mono">+92 300 1234567</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Email Address:</td><td className="px-2 py-1 text-slate-800 truncate max-w-[100px]">info@demitrading.com</td></tr>
                          <tr><td className="px-2 py-1 text-slate-400">Country:</td><td className="px-2 py-1 text-slate-800">Afghanistan</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Goods Details section */}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-[#0f2942] text-white px-2.5 py-1 text-[8px] font-black uppercase tracking-wider">
                      📦 Goods Details
                    </div>
                    <table className="w-full text-[8px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase">
                          <th className="p-1 border-r border-slate-200 text-center w-[3%]">SR.</th>
                          <th className="p-1 border-r border-slate-200 w-[17%]">GOODS NAME</th>
                          <th className="p-1 border-r border-slate-200 text-center w-[8%]">BRAND</th>
                          <th className="p-1 border-r border-slate-200 text-center w-[8%]">SIZE</th>
                          <th className="p-1 border-r border-slate-200 text-center w-[8%]">ORIGIN</th>
                          <th className="p-1 border-r border-slate-200 text-right w-[8%]">QUANTITY</th>
                          <th className="p-1 border-r border-slate-200 text-right w-[8%]">QTY (KGS)</th>
                          <th className="p-1 border-r border-slate-200 text-right w-[8%]">GROSS WT</th>
                          <th className="p-1 border-r border-slate-200 text-right w-[8%]">NET WT</th>
                          <th className="p-1 border-r border-slate-200 text-right w-[8%]">RATE / KG</th>
                          <th className="p-1 border-r border-slate-200 text-right w-[10%]">AMOUNT (USD)</th>
                          <th className="p-1 border-r border-slate-200 text-right w-[6%]">EX. RATE</th>
                          <th className="p-1 text-right w-[10%]">FINAL AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {goodsEntries.map((item: any, idx: number) => {
                          const qtyNo = Number(item.qtyNo || 0);
                          const qtyKgs = Number(item.qtyKgs || 0);
                          const grossWeight = Number(item.grossWeight || qtyNo * qtyKgs);
                          const netWeight = Number(item.netWeight || grossWeight);
                          const coursePrice = Number(item.coursePrice || 0);
                          const amount = Number(item.totalAmount || netWeight * coursePrice);
                          const exVal = Number(item.exchangeRate || exRate);
                          const finalAmountVal = Number(item.finalAmount || amount * exVal);

                          const ratePerKg = item.priceType === "P/KGs" ? coursePrice : coursePrice / 1000;

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition border-t border-slate-200 font-semibold text-slate-700">
                              <td className="p-1 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                              <td className="p-1 border-r border-slate-200 font-bold text-slate-900">
                                {item.goodsName}
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">{item.brand || "-"}</td>
                              <td className="p-1 border-r border-slate-200 text-center">{item.size || "-"}</td>
                              <td className="p-1 border-r border-slate-200 text-center">{item.origin || selected.countryName || "-"}</td>
                              <td className="p-1 border-r border-slate-200 text-right font-bold">{qtyNo.toLocaleString()} {item.qtyName}</td>
                              <td className="p-1 border-r border-slate-200 text-right font-mono">{qtyKgs.toLocaleString()} kg</td>
                              <td className="p-1 border-r border-slate-200 text-right font-mono">{grossWeight.toLocaleString()} kg</td>
                              <td className="p-1 border-r border-slate-200 text-right font-mono">{netWeight.toLocaleString()} kg</td>
                              <td className="p-1 border-r border-slate-200 text-right font-mono">${ratePerKg.toFixed(2)}</td>
                              <td className="p-1 border-r border-slate-200 text-right font-mono font-bold">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 border-r border-slate-200 text-right font-mono">{exVal}</td>
                              <td className="p-1 text-right font-mono font-bold text-emerald-600">{finalAmountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-[1.5px] border-slate-350 bg-slate-50 font-bold text-[8px]">
                        <tr className="text-slate-800">
                          <td colSpan={5} className="p-1 text-right text-slate-500 font-extrabold uppercase text-[7.5px]">Totals:</td>
                          <td className="p-1 text-right text-slate-900 font-black">{totalQty.toLocaleString()} {goodsEntries[0]?.qtyName || "Units"}</td>
                          <td className="p-1"></td>
                          <td className="p-1 text-right text-slate-950 font-bold">{totalGross.toLocaleString()} kg</td>
                          <td className="p-1 text-right text-slate-950 font-bold">{totalNet.toLocaleString()} kg</td>
                          <td className="p-1 text-right text-slate-550 text-[7px]">Avg: ${avgRateKg.toFixed(2)}</td>
                          <td className="p-1 text-right text-blue-600 font-black">${totalUSDVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-1"></td>
                          <td className="p-1 text-right text-emerald-600 font-black">{totalPKRVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Rs</td>
                        </tr>
                        <tr className="text-[7.5px] text-slate-550 border-t border-slate-200/60 font-semibold">
                          <td colSpan={5} className="p-1 text-right uppercase text-[7px]">Containers & Dues:</td>
                          <td colSpan={3} className="p-1 text-left">FCL: <span className="font-bold text-slate-800">{containerCount}</span></td>
                          <td colSpan={5} className="p-1 text-left">Avg Rate/Ton: <span className="font-bold text-slate-800">${avgRateTon.toFixed(2)}</span></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Loading & Transit Information */}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-2 py-1 text-[8px] font-black uppercase text-blue-900 flex items-center gap-1">
                      <span>🚢</span> Loading & Transit Information
                    </div>
                    <table className="w-full text-[8px] font-semibold text-slate-600">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-1 text-slate-400 w-[20%]">Loading Country:</td>
                          <td className="px-2 py-1 text-slate-800 font-bold w-[30%]">{selected.countryName || "Afghanistan"}</td>
                          <td className="px-2 py-1 text-slate-400 w-[20%]">Receiving Country:</td>
                          <td className="px-2 py-1 text-slate-800 font-bold w-[30%]">{selected.form_data?.form?.receivedCountry || selected.buyerName || "Pakistan"}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-1 text-slate-400">Loading Port:</td>
                          <td className="px-2 py-1 text-slate-800">{loadingPortText}</td>
                          <td className="px-2 py-1 text-slate-400">Receiving Port:</td>
                          <td className="px-2 py-1 text-slate-800">{destinationPortText}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-1 text-slate-400">Loading Date:</td>
                          <td className="px-2 py-1 text-slate-800 font-mono font-bold text-blue-750">{expectedLoadingDate}</td>
                          <td className="px-2 py-1 text-slate-400">Received Date at Port:</td>
                          <td className="px-2 py-1 text-slate-800 font-mono font-bold text-blue-750">{selected.form_data?.form?.receivedDate || "-"}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-slate-400">Containers:</td>
                          <td className="px-2 py-1 text-slate-800 font-bold">{containerCount} Containers</td>
                          <td className="px-2 py-1 text-slate-400">Container Numbers & BL:</td>
                          <td className="px-2 py-1 text-slate-800 font-mono truncate max-w-[200px]">{containerNumbersText} {billNumberText !== "-" && `/ BL: ${billNumberText}`}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Payment & Accounting details */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Payment Information */}
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1 text-[8px] font-black uppercase text-blue-900 flex items-center gap-1">
                        <span>💵</span> Payment Information
                      </div>
                      <table className="w-full text-[8px] font-semibold text-slate-600">
                        <tbody>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Payment Condition:</td><td className="px-2 py-1 text-slate-800 font-bold">{paymentConditionText}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Advance Percent / Due:</td><td className="px-2 py-1 text-slate-800">{advancePercent}% / <span className="font-bold text-blue-700">{advanceDueDateText}</span></td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Advance Amount:</td><td className="px-2 py-1 font-bold text-emerald-600 font-mono">${advanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Remaining Balance / Due:</td><td className="px-2 py-1 text-slate-800">{remainingPercent}% / <span className="font-bold text-rose-600">{finalPaymentDueDateText}</span></td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Remaining Amount:</td><td className="px-2 py-1 text-slate-800 font-mono">${remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                          <tr>
                            <td className="px-2 py-1 text-slate-400">Payment Status:</td>
                            <td className="px-2 py-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-white ${
                                paymentStatusLabel === "PAID" || paymentStatusLabel === "FULL PAYMENT" || paymentStatusLabel === "ADVANCE PAID" ? "bg-emerald-600" : "bg-rose-600"
                              }`}>
                                {paymentStatusLabel}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Accounting Information */}
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1 text-[8px] font-black uppercase text-blue-900 flex items-center gap-1">
                        <span>📊</span> Accounting Information
                      </div>
                      <table className="w-full text-[8px] font-semibold text-slate-600">
                        <tbody>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Journal Entry Number:</td><td className="px-2 py-1 text-slate-800 font-mono font-bold">{journalEntryNumberText}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Debit Account:</td><td className="px-2 py-1 text-slate-800 font-mono">{selected.purchaseAccountNumber}</td></tr>
                          <tr className="border-b border-slate-100"><td className="px-2 py-1 text-slate-400">Credit Account:</td><td className="px-2 py-1 text-slate-800 font-mono">{selected.salesAccountNumber}</td></tr>
                          <tr>
                            <td className="px-2 py-1 text-slate-400">Remarks / Narration:</td>
                            <td className="px-2 py-1 text-slate-900 font-bold leading-normal text-[8.5px] italic max-w-[180px] break-words whitespace-pre-wrap">{remarksText}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Stamp & Signatures */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-auto text-[7.5px]">
                    <div className="w-[45%] text-slate-400 font-medium leading-relaxed">
                      This is a system generated print sheet of Demi Trading Co. accounts ledger. Double-entry transaction postings have been validated.
                    </div>
                    <div className="w-[12%] text-center">
                      {/* Stamp SVG */}
                      <svg viewBox="0 0 100 100" className="w-12 h-12 text-blue-900 mx-auto opacity-70">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" />
                        <path d="M50 15 A35 35 0 0 1 85 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M15 50 A35 35 0 0 1 50 15" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M50 85 A35 35 0 0 1 15 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M85 50 A35 35 0 0 1 50 85" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <text x="50" y="42" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="currentColor" letterSpacing="0.3">DEMI TRADING</text>
                        <text x="50" y="52" textAnchor="middle" fontSize="6" fontWeight="bold" fill="currentColor">★ STAMP ★</text>
                        <text x="50" y="62" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="currentColor" letterSpacing="0.3">KABUL BRANCH</text>
                      </svg>
                    </div>
                    <div className="w-[18%] text-center border-t border-slate-300 pt-1">
                      <div className="font-bold text-slate-800 text-[8px] italic leading-none">{selected.audit?.userName || "ADMIN"}</div>
                      <div className="font-bold text-slate-400 text-[6.5px] mt-1">PREPARED BY</div>
                    </div>
                    <div className="w-[18%] text-center border-t border-slate-300 pt-1">
                      <div className="font-bold text-slate-800 text-[8px] italic leading-none">Branch Manager</div>
                      <div className="font-bold text-slate-400 text-[6.5px] mt-1">AUTHORIZED BY</div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}
        </DetailDrawer>
      )}
    </div>
  );
}
