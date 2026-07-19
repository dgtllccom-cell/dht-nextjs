"use client";
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CreditCard,
  Download,
  Eye,
  FileText,
  Package,
  Printer,
  Search,
  Ship,
  Trash2,
  Lock,
  Building2,
  CheckCircle2,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Mail,
  MessageCircle,
  CheckSquare,
  FileSignature,
  Receipt,
  PenLine,
  Pin,
  Save,
  X,
  Globe2,
  BarChart3,
  Edit3,
  Settings,
  ListChecks,
  Truck,
  MessageSquare,
  Loader2,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "@/features/customers/components/customer-picker";
import { CompanyPicker } from "@/features/companies/components/company-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { openTradeDocumentWindow } from "@/lib/reports/open-trade-document-window";
import { openSalesA4ReportWindow } from "@/lib/reports/open-purchase-a4-report-window";
import { SalesBookingJournalReportView } from "./sales-booking-journal-report-view";

// Ã¢â€â‚¬Ã¢â€â‚¬ Non-location constants (static values, not from master forms) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const CURRENCY_OPTIONS = ["USD", "AED", "EUR", "GBP", "PKR", "AFN", "INR", "CNY", "SAR"];
const PAYMENT_TYPES = ["Advance Payment", "Invoice", "Final Payment", "Credit"];
const LOADING_TYPES = ["By Sea", "By Road", "By Air"];
const CONTAINER_TYPES = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "Reefer Container", "Non Reefer", "Open Top", "Flat Rack", "LCL / Bulk"];
const QTY_TYPE_OPTIONS = ["BAGS", "CARTONS", "Loose", "KGS", "Ton"];
const SIZE_OPTIONS = ["Large", "Medium", "Standard", "Small"];
const BRAND_OPTIONS = ["Premium", "Choice", "Organic", "Standard"];
const GOODS_OPTIONS = ["PISTACHIOS KERNEL", "CASHEW NUTS (W320)", "WALNUTS INSHELL", "ALMONDS", "HAZELNUTS"];
const GOODS_HS_CODES = {
  "PISTACHIOS KERNEL": "0802.51",
  "CASHEW NUTS (W320)": "0801.32",
  "WALNUTS INSHELL": "0802.31",
  "ALMONDS": "0802.12",
  "HAZELNUTS": "0802.22"
};

const SALE_SOURCE_OPTIONS = [
  { value: "booking", label: "Booking Sale", description: "Create a fresh sales booking from this order.", icon: FileText },
  { value: "in_transit", label: "In-Transit Lot", description: "Sell goods already loaded or on the route.", icon: Truck },
  { value: "local", label: "Local Purchase", description: "Sell goods purchased locally in this branch.", icon: Package },
  { value: "warehouse", label: "Warehouse Stock", description: "Sell stock currently available in warehouse.", icon: Building2 },
  { value: "endorse", label: "Endorse Stock", description: "Sell endorsed stock with traceable stock journal.", icon: ListChecks }
];

const MOCK_SALE_LOTS = [
  { lotNo: "BOOK-LOT-0001", source: "booking", goodsName: "CASHEW NUTS (W320)", brand: "Organic", size: "STANDARD", origin: "Pakistan", hsCode: "0801.32", qtyName: "BAGS", availableQty: 100, qtyKgs: 50, emptyKgs: 0.1, netWeight: 4990, location: "New Booking", stockRef: "SO-DRAFT", currencyType: "USD", exchangeRate: 1, coursePrice: 12.5, status: "Ready for booking" },
  { lotNo: "TRN-LOT-2401", source: "in_transit", goodsName: "PISTACHIOS KERNEL", brand: "Premium", size: "Large", origin: "Iran", hsCode: "0802.51", qtyName: "BAGS", availableQty: 2000, qtyKgs: 50, emptyKgs: 0.1, netWeight: 99800, location: "In Transit - Karachi Port", stockRef: "LOAD-000241", currencyType: "USD", exchangeRate: 278, coursePrice: 8.75, status: "Loaded / On route" },
  { lotNo: "LOC-LOT-1022", source: "local", goodsName: "ALMONDS", brand: "Choice", size: "Medium", origin: "Pakistan", hsCode: "0802.12", qtyName: "BAGS", availableQty: 500, qtyKgs: 25, emptyKgs: 0.05, netWeight: 12475, location: "Local Purchase Stock", stockRef: "LP-001022", currencyType: "PKR", exchangeRate: 1, coursePrice: 950, status: "Local stock" },
  { lotNo: "WH-LOT-7788", source: "warehouse", goodsName: "WALNUTS INSHELL", brand: "Standard", size: "Large", origin: "Afghanistan", hsCode: "0802.31", qtyName: "BAGS", availableQty: 1250, qtyKgs: 40, emptyKgs: 0.08, netWeight: 49900, location: "Main Warehouse", stockRef: "WH-007788", currencyType: "USD", exchangeRate: 278, coursePrice: 6.2, status: "Warehouse available" },
  { lotNo: "END-LOT-4500", source: "endorse", goodsName: "HAZELNUTS", brand: "Choice", size: "Standard", origin: "Turkey", hsCode: "0802.22", qtyName: "BAGS", availableQty: 750, qtyKgs: 30, emptyKgs: 0.05, netWeight: 22462.5, location: "Endorse Stock", stockRef: "END-004500", currencyType: "USD", exchangeRate: 278, coursePrice: 7.4, status: "Endorsed / sellable" }
];
// NOTE: COUNTRY_OPTIONS and ORIGIN_OPTIONS removed Ã¢â‚¬â€ countries now come from Location Master.

const MOCK_ACCOUNTS = [
  { accountCode: "AE-AC-0001", accountName: "Dubai Customer Account", cityBranchName: "Dubai Main Branch", ledgerCurrency: "AED" },
  { accountCode: "SA-2001", accountName: "Damaan Sales Account", cityBranchName: "Dubai Sales Branch", ledgerCurrency: "AED" },
  { accountCode: "US-AC-1002", accountName: "US Vendor Ledger Account", cityBranchName: "New York Branch", ledgerCurrency: "USD" },
  { accountCode: "PK-AC-3001", accountName: "Kharadar Customer Account", cityBranchName: "Karachi Central Branch", ledgerCurrency: "PKR" },
  { accountCode: "AF-AC-4001", accountName: "Kabul Trading Account", cityBranchName: "Kabul Main Branch", ledgerCurrency: "AFN" },
  { accountCode: "AE-AC-0002", accountName: "Sharjah Supply Account", cityBranchName: "Sharjah Branch", ledgerCurrency: "AED" },
  { accountCode: "IN-AC-5001", accountName: "Mumbai Import Account", cityBranchName: "Mumbai Port Branch", ledgerCurrency: "INR" }
];

// API Helpers
async function lookupAccountMaster(query, countryId, countryBranchId, cityBranchId, isSuperAdmin) {
  const needle = String(query || "").trim();
  if (!needle) return null;

  const params = new URLSearchParams();
  params.set("q", needle);
  params.set("limit", "500");
  if (countryId) params.set("countryId", countryId);
  if (countryBranchId) params.set("countryBranchId", countryBranchId);
  if (cityBranchId) params.set("cityBranchId", cityBranchId);

  const response = await fetch(`/api/erp/accounting/accounts/lookup?${params.toString()}`, {
    credentials: "same-origin"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload?.error?.message || payload?.error || "Account lookup failed.");
  }
  return payload.data?.found ? payload.data.account : null;
}

async function lookupSalesBookingReport(query, countryId, countryBranchId, cityBranchId, isSuperAdmin) {
  const needle = String(query || "").trim();
  if (!needle) return null;

  const params = new URLSearchParams();
  params.set("salesOrderNo", needle);
  params.set("limit", "1");
  if (!isSuperAdmin) {
    if (countryId) params.set("countryId", countryId);
    if (countryBranchId) params.set("countryBranchId", countryBranchId);
    if (cityBranchId) params.set("cityBranchId", cityBranchId);
  }

  const response = await fetch(`/api/erp/sales/booking-journal-report?${params.toString()}`, {
    credentials: "same-origin"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload?.error?.message || payload?.error || "Sales Booking lookup failed.");
  }
  return payload.data?.reports?.[0] ?? null;
}

const DEFAULT_FORM = {
  countryId: "",
  countryBranchId: "",
  cityBranchId: "",
  customerAccountNo: "",
  customerAccountName: "",
  customerAccountBranch: "",
  customerAccountCurrency: "",
  customerAccountKind: "",
  customerAccountIsControl: false,
  customerAccountCurrentBalance: 0,
  customerAccountOpeningBalance: 0,
  customerAccountStatus: "active",
  customerAccountSerialNumber: "",
  customerAccountCountrySerialNumber: "",
  customerAccountBranchSerialNumber: "",
  customerAccountManualReferenceNumber: "",
  customerAccountMobile: "",
  customerAccountWhatsapp: "",
  salesAccountNo: "",
  salesAccountName: "",
  salesAccountBranch: "",
  salesAccountCurrency: "",
  salesAccountKind: "",
  salesAccountIsControl: false,
  salesAccountCurrentBalance: 0,
  salesAccountOpeningBalance: 0,
  salesAccountStatus: "active",
  salesAccountSerialNumber: "",
  salesAccountCountrySerialNumber: "",
  salesAccountBranchSerialNumber: "",
  salesAccountManualReferenceNumber: "",
  salesAccountMobile: "",
  salesAccountWhatsapp: "",
  salesOrderNo: "",
  salesContractNo: "",
  salesOrderNo: "",
  billNo: "",
  salesDate: new Date().toISOString().slice(0, 10),
  currencyType: "USD",
  salesCurrency: "USD",
  exchangeRate: 1,
  branchName: "Kabul Main Branch",
  branchCode: "BR-KBL-001",
  branchCity: "Kabul",
  branchCountry: "Afghanistan",
  userName: "ADMIN",
  userId: "USR-1001",
  paymentType: "Advance Payment",
  shipmentType: "By Ship",
  shippingMode: "By Sea",
  customerId: "",
  customerName: "",
  customerId: "",
  customerName: "",
  salesStatus: "Draft",
  remarks: "",
  paymentReport: "",
  loadingReport: "",
  orderReportRemarks: "",
  salesReportRemarks: "",
  salesInvoiceRemarks: "",
  showRemarksOnA4: true,

  // Tab 3 details
  advancePercent: 10,
  advancePaymentDate: new Date().toISOString().slice(0, 10),
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentDaysAndMethodDetails: "",
  loadingCountry: "",
  loadingPort: "",
  loadingDate: "",
  receivedCountry: "",
  receivedPort: "",
  receivedDate: "",
  loadingBorder: "",
  receivedBorder: "",
  airportName: "",
  receivedPortName: "",
  transportAgent: "",
  airlineName: "",
  receivedAgentName: "",
  containerCount: 1,
  containerSize: "40 FT",
  containerNumbers: "",
  vesselName: "",
  sealNumber: "",

  // Step 2 Active Item inputs
  saleSource: "booking",
  stockLotNo: "",
  goodsName: "",
  size: "",
  brand: "",
  origin: "",
  hsCode: "",
  allotName: "",
  qtyName: "BAGS",
  qtyNo: 100,
  qtyKgs: 50.00,
  emptyKgs: 0.10,
  netWeight: 4990.00,
  divideType: "D/KGs",
  divideWeight: 1.0,
  priceType: "P/KGs",
  coursePrice: 12.50,
  secondaryCurrency: "PKR",
  rate2: 280.00,
  operator: "*",
  qualityReport: "Passed"
};

// Seeded rows matching user's mock screenshots
const SEEDED_GOODS = [
  {
    allotName: "ALT-4421",
    goodsName: "PISTACHIOS KERNEL",
    size: "Large",
    brand: "Premium",
    origin: "Iran",
    hsCode: "0802.51",
    qtyName: "BAGS",
    qtyNo: 100,
    qtyKgs: 50.00,
    grossWeight: 5000.00,
    emptyKgs: 0.10,
    netWeight: 4990.00,
    priceType: "P/KGs",
    divideType: "D/KGs",
    divideWeight: 1,
    coursePrice: 12.50,
    currencyType: "USD",
    exchangeRate: 280.00,
    totalAmount: 62375.00,
    op: "*",
    finalAmount: 17465000.00
  },
  {
    allotName: "ALT-4422",
    goodsName: "CASHEW NUTS (W320)",
    size: "Medium",
    brand: "Choice",
    origin: "Vietnam",
    hsCode: "0801.32",
    qtyName: "CARTONS",
    qtyNo: 50,
    qtyKgs: 22.68,
    grossWeight: 1134.00,
    emptyKgs: 0.10,
    netWeight: 1129.00,
    priceType: "P/KGs",
    divideType: "D/KGs",
    divideWeight: 1,
    coursePrice: 8.75,
    currencyType: "USD",
    exchangeRate: 280.00,
    totalAmount: 9878.75,
    op: "*",
    finalAmount: 2766050.00
  },
  {
    allotName: "ALT-4423",
    goodsName: "WALNUTS INSHELL",
    size: "Standard",
    brand: "Organic",
    origin: "USA",
    hsCode: "0802.31",
    qtyName: "BAGS",
    qtyNo: 200,
    qtyKgs: 25.00,
    grossWeight: 5000.00,
    emptyKgs: 0.10,
    netWeight: 4980.00,
    priceType: "P/KGs",
    divideType: "D/KGs",
    divideWeight: 1,
    coursePrice: 6.50,
    currencyType: "USD",
    exchangeRate: 280.00,
    totalAmount: 32370.00,
    op: "*",
    finalAmount: 9063600.00
  }
];

function calculateItemTotals(form) {
  const qtyNo = Number(form.qtyNo || 0);
  const qtyKgs = Number(form.qtyKgs || 0);
  const emptyKgs = Number(form.emptyKgs || 0);
  const coursePrice = Number(form.coursePrice || 0);
  const divideWeight = Number(form.divideWeight || 1);
  const exchangeRate = Number(form.exchangeRate || 1);
  const operator = form.operator || "*";

  const grossWeight = qtyNo * qtyKgs;
  const totalEmptyDeduct = qtyNo * emptyKgs;
  const netWeight = form.netWeight !== undefined && form.netWeight !== "" && form.netWeight !== 0
    ? Number(form.netWeight)
    : Math.max(0, grossWeight - totalEmptyDeduct);

  // Amount in Purchase Currency (Original Amount)
  const originalAmount = (netWeight / divideWeight) * coursePrice;

  // Amount in Local Country Currency
  let localAmount = 0;
  if (operator === "/") {
    localAmount = exchangeRate !== 0 ? originalAmount / exchangeRate : 0;
  } else {
    localAmount = originalAmount * exchangeRate;
  }

  return {
    grossWeight,
    netWeight,
    totalAmount: originalAmount, // Total in Purchase Currency
    finalAmount: localAmount,    // Total in Local Currency
    baseAmount: originalAmount,
    localAmount: localAmount
  };
}

function currencySymbol(currency) {
  const c = String(currency || "").toUpperCase();
  if (c.includes("USD")) return "$";
  if (c.includes("AED")) return "DH";
  if (c.includes("PKR")) return "Ã¢â€šÂ¨";
  if (c.includes("AFN")) return "Ã˜â€¹";
  if (c.includes("INR")) return "Ã¢â€šÂ¹";
  return currency || "";
}

function formatShortDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatIsoDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

function formatNumber(num) {
  if (num === null || num === undefined) return "-";
  return Number(num).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function LightTable({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-xs text-slate-800">
        <thead className="bg-slate-50 text-[10px] uppercase font-bold tracking-wide text-slate-650 border-b border-slate-200">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="whitespace-nowrap border-r border-slate-200 px-3 py-3 text-left font-black last:border-r-0"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

function LightTd({ children, className = "", center = false, right = false }) {
  return (
    <td
      className={`whitespace-nowrap border-r border-slate-200 px-3 py-2.5 last:border-r-0 ${
        center ? "text-center" : ""
      } ${right ? "text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

function LightStatusBadge({ status }) {
  const s = String(status || "Open").toLowerCase();
  let badgeClass = "bg-slate-100 text-slate-700 border-slate-205";
  if (s.includes("confirm")) {
    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-250";
  } else if (s.includes("cancel")) {
    badgeClass = "bg-rose-50 text-rose-700 border-rose-250";
  } else if (s.includes("open") || s.includes("draft")) {
    badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
  }
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black uppercase ${badgeClass}`}>
      {status || "Open"}
    </span>
  );
}

export function SalesOrderWizard({ session }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("booking"); // "booking" | "goods" | "others" | "reports"
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined" && window.location.pathname.includes("new-")) {
      setIsFormOpen(true);
    }
  }, []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [isTransferred, setIsTransferred] = useState(false);
  const [transferredData, setTransferredData] = useState(null);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [verifyDropdownOpen, setVerifyDropdownOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [transferConfirmModal, setTransferConfirmModal] = useState(false);
  const [showTransferScreen, setShowTransferScreen] = useState(false);
  const [isVerificationSidebarOpen, setIsVerificationSidebarOpen] = useState(false);
  const [previewType, setPreviewType] = useState("booking_report"); // "booking_report" | "contract" | "invoice"
  const [form, setForm] = useState(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return {
      ...DEFAULT_FORM,
      salesOrderNo: `PO-2026-${randomSuffix}`,
      salesOrderNo: `SO-2026-${randomSuffix}`,
      salesContractNo: `PC-2026-${randomSuffix}`,
      billNo: `BILL-${randomSuffix}`,
    };
  });
  const [goodsEntries, setGoodsEntries] = useState([]);
  const [lotPanelOpen, setLotPanelOpen] = useState(false);
  const [lotSearch, setLotSearch] = useState("");

  const selectedSaleSource = useMemo(() => {
    return SALE_SOURCE_OPTIONS.find((option) => option.value === (form.saleSource || "booking")) || SALE_SOURCE_OPTIONS[0];
  }, [form.saleSource]);

  const availableSaleLots = useMemo(() => {
    return MOCK_SALE_LOTS.filter((lot) => lot.source === (form.saleSource || "booking"));
  }, [form.saleSource]);

  const filteredSaleLots = useMemo(() => {
    const needle = lotSearch.trim().toLowerCase();
    if (!needle) return availableSaleLots;
    return availableSaleLots.filter((lot) => [lot.lotNo, lot.goodsName, lot.location, lot.stockRef, lot.status].join(" ").toLowerCase().includes(needle));
  }, [availableSaleLots, lotSearch]);

  const selectedSaleLot = useMemo(() => {
    return MOCK_SALE_LOTS.find((lot) => lot.lotNo === form.stockLotNo) || null;
  }, [form.stockLotNo]);

  const openSaleSource = (sourceValue) => {
    setForm((prev) => ({ ...prev, saleSource: sourceValue, stockLotNo: "" }));
    setLotSearch("");
    setLotPanelOpen(true);
  };

  const applySaleLot = (lot) => {
    setForm((prev) => ({
      ...prev,
      saleSource: lot.source,
      stockLotNo: lot.lotNo,
      goodsName: lot.goodsName,
      brand: lot.brand,
      size: lot.size,
      origin: lot.origin,
      hsCode: lot.hsCode,
      qtyName: lot.qtyName,
      qtyNo: lot.availableQty,
      qtyKgs: lot.qtyKgs,
      emptyKgs: lot.emptyKgs,
      netWeight: lot.netWeight,
      currencyType: lot.currencyType,
      salesCurrency: lot.currencyType,
      exchangeRate: lot.exchangeRate,
      coursePrice: lot.coursePrice,
      manualTotalAmount: "",
      manualFinalAmount: ""
    }));
    setLotPanelOpen(false);
  };
  const [selectedLotId, setSelectedLotId] = useState("");
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [editingRemarksType, setEditingRemarksType] = useState(null);
  const [tempRemarksText, setTempRemarksText] = useState("");
  const [reportType, setReportType] = useState("branch"); // "branch" | "totaling" | "payment"
  const [previewRemarks, setPreviewRemarks] = useState(false);
  const [branchPinOpen, setBranchPinOpen] = useState(false);
  // Dynamic Reports System
  const [reportsList, setReportsList] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [newReportForm, setNewReportForm] = useState({ name: "", description: "", notes: "" });

  const previewItems = useMemo(() => {
    return goodsEntries.map((g, index) => {
      const qtyNo = Number(g.qtyNo || 0);
      const qtyKgs = Number(g.qtyKgs || 0);
      const emptyKgs = Number(g.emptyKgs || 0);
      const grossWt = qtyNo * qtyKgs;
      const netWt = qtyNo * (qtyKgs - emptyKgs);
      const rateKg = Number(g.coursePrice || 0);
      const rateTon = rateKg * 1000;
      const amountUsd = Number(g.totalAmount || 0);
      const finalAmountPkr = Number(g.finalAmount || 0);
      return {
        srNo: index + 1,
        goodsName: g.goodsName || "N/A",
        allotName: g.allotName || "N/A",
        grade: g.size || "N/A",
        origin: g.origin || "N/A",
        quantity: `${qtyNo.toLocaleString()} ${g.qtyName || "BAGS"}`,
        packing: `${qtyKgs} KG / ${emptyKgs} KG`,
        grossWt,
        netWt,
        rateKg,
        rateTon,
        amountUsd,
        exRate: g.exchangeRate || 1.00,
        finalAmountPkr
      };
    });
  }, [goodsEntries]);

  const avgRateKg = useMemo(() => {
    return goodsEntries.length > 0
      ? goodsEntries.reduce((sum, item) => sum + (Number(item.coursePrice) || 0), 0) / goodsEntries.length
      : 0;
  }, [goodsEntries]);

  const avgRateTon = useMemo(() => avgRateKg * 1000, [avgRateKg]);


  const [titlePortal, setTitlePortal] = useState(null);
  const [actionsPortal, setActionsPortal] = useState(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setTitlePortal(document.getElementById("erp-page-title-slot"));
      setActionsPortal(document.getElementById("erp-page-actions-slot"));
    }
  }, []);

  const [savingOrder, setSavingOrder] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedOrderId, setSavedOrderId] = useState("");
  const [savedOrderNo, setSavedOrderNo] = useState("");
  const [registerRefreshKey, setRegisterRefreshKey] = useState(0);
  const [accountLookupMessage, setAccountLookupMessage] = useState("");
  const [accountLookupLoading, setAccountLookupLoading] = useState(null);

  const dropdownRef = React.useRef(null);
  const customerDropdownRef = React.useRef(null);
  const salesDropdownRef = React.useRef(null);
  const verifyDropdownRef = React.useRef(null);
  const companyDropdownRef = React.useRef(null);
  const salesCompanyDropdownRef = React.useRef(null);

  const [customerDropdownOpen, setPurchaseDropdownOpen] = useState(false);
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [customerSearch, setPurchaseSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setViewDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setPurchaseDropdownOpen(false);
        setPurchasePinDropdownOpen(false);
      }
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(event.target)) {
        setSalesDropdownOpen(false);
        setSalesPinDropdownOpen(false);
      }
      if (verifyDropdownRef.current && !verifyDropdownRef.current.contains(event.target)) {
        setVerifyDropdownOpen(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setPurchaseCompanySelectOpen(false);
      }
      if (salesCompanyDropdownRef.current && !salesCompanyDropdownRef.current.contains(event.target)) {
        setSalesCompanySelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scoping States
  const [localSession, setLocalSession] = useState(session || null);
  const activeSession = session || localSession;
  const isSuperAdmin = activeSession?.isSuperAdmin || activeSession?.scopes?.isSuperAdmin || false;
  const isCountryAdmin = activeSession?.roles?.includes("country_admin") || activeSession?.scopes?.isCountryAdmin || (activeSession?.countryIds?.length > 0) || (activeSession?.scopes?.countryIds?.length > 0) || false;
  const [countries, setCountries] = useState([]);
  const [allCountries, setAllCountries] = useState([]); // unscoped Ã¢â‚¬â€ for transit pickers
  const [dbGoods, setDbGoods] = useState([]); // goods from master DB
  const [dbLoadingPorts, setDbLoadingPorts] = useState([]);
  const [dbReceivedPorts, setDbReceivedPorts] = useState([]);
  const [mainBranches, setMainBranches] = useState([]);
  const [cityBranches, setCityBranches] = useState([]);
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [dbAccounts, setDbAccounts] = useState([]);
  const [customQtyNames, setCustomQtyNames] = useState([]);

  const mapEnterpriseAccount = (acc) => ({
    accountCode: acc.code || acc.account_number || "",
    accountName: acc.name || "",
    cityBranchName: acc.branch_code || acc.branch_name || "",
    ledgerCurrency: acc.currency || "USD",
    customerId: acc.customer_id || acc.customerId || acc.id || null,
    companyId: acc.company_id || acc.companyId || null,
    companyName: acc.company_name || acc.companyName || acc.company?.name || "",
    mobile: acc.customers?.mobile || acc.mobile || "",
    whatsapp: acc.customers?.whatsapp || acc.whatsapp || "",
    kind: acc.kind || "",
    isControlAccount: acc.is_control_account || false,
    currentBalance: acc.current_balance || 0,
    openingBalance: acc.opening_balance || 0,
    status: acc.status || "active",
    accountSerialNumber: acc.account_serial_number || "",
    countrySerialNumber: acc.country_serial_number || "",
    branchSerialNumber: acc.branch_serial_number || "",
    manualReferenceNumber: acc.manual_reference_number || "",
    customerNumber: acc.customer_number || "",
    countryId: acc.country_id || null,
    countryBranchId: acc.country_branch_id || null,
    cityBranchId: acc.city_branch_id || null
  });

  const [sellerDetail, setSellerDetail] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [customerPinDropdownOpen, setPurchasePinDropdownOpen] = useState(false);
  const [salesPinDropdownOpen, setSalesPinDropdownOpen] = useState(false);
  const [companySelectOpen, setPurchaseCompanySelectOpen] = useState(false);
  const [salesCompanySelectOpen, setSalesCompanySelectOpen] = useState(false);
  const [dbCompanies, setDbCompanies] = useState([]);

  // Account Creation Modal States
  const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
  const [createAccountType, setCreateAccountType] = useState("purchase"); // "purchase" | "sales"
  const [createAccountForm, setCreateAccountForm] = useState({
    code: "AUTO",
    name: "",
    kind: "liability",
    currency: "USD",
    parentId: "",
    isControlAccount: false
  });
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState("");

  // Inline Company Creation Modal States
  const [createCompanyModalOpen, setCreateCompanyModalOpen] = useState(false);
  const [createCompanyType, setCreateCompanyType] = useState("purchase"); // "purchase" | "sales"
  const [createCompanyForm, setCreateCompanyForm] = useState({
    name: "",
    legalName: "",
    baseCurrency: "USD"
  });
  const [createCompanyLoading, setCreateCompanyLoading] = useState(false);
  const [createCompanyError, setCreateCompanyError] = useState("");

  // Inline Master-Creation Modal States
  const [newCountryModal, setNewCountryModal] = useState(false);
  const [newCountryForm, setNewCountryForm] = useState({ name: "" });
  const [newCountryLoading, setNewCountryLoading] = useState(false);
  const [newCountryError, setNewCountryError] = useState("");

  const [newPortModal, setNewPortModal] = useState(false);
  const [newPortForm, setNewPortForm] = useState({ portName: "", countryName: "", transportType: "sea", side: "loading" });
  const [newPortError, setNewPortError] = useState("");
  const [newPortLoading, setNewPortLoading] = useState(false);

  const [customVariationModal, setCustomVariationModal] = useState(false);
  const [customVariationForm, setCustomVariationForm] = useState({ goodsName: "", brand: "", size: "", originCountryId: "" });

  const [newGoodModal, setNewGoodModal] = useState(false);
  const [newGoodForm, setNewGoodForm] = useState({ goodsName: "", chsCode: "", size: "", brand: "", originCountryId: "" });
  const [newGoodLoading, setNewGoodLoading] = useState(false);
  const [newGoodError, setNewGoodError] = useState("");

  const renderGlobalInfoCards = () => {
    // Determine logged-in user's branch details
    let loginBranchName = "N/A";
    let loginBranchCode = "N/A";
    let loginCityName = "N/A";
    let loginCountryName = "N/A";

    if (isSuperAdmin) {
      loginBranchName = "Global System";
      loginBranchCode = "GLOBAL-00";
      loginCountryName = "All";
      loginCityName = "Global HQ";
    } else {
      const uCid = activeSession?.countryIds?.[0] || activeSession?.scopes?.countryIds?.[0];
      const uBid = activeSession?.countryBranchIds?.[0] || activeSession?.scopes?.countryBranchIds?.[0];
      const uCbid = activeSession?.cityBranchIds?.[0] || activeSession?.scopes?.cityBranchIds?.[0];

      const c = countries.find(x => x.id === uCid) || allCountries.find(x => x.id === uCid);
      const mb = mainBranches.find(x => x.id === uBid);
      const cb = cityBranches.find(x => x.id === uCbid);

      if (uCbid && cb) {
        loginBranchName = cb.name || cb.city_name;
        loginBranchCode = cb.code || cb.branch_code;
        loginCityName = cb.city_name || cb.name;
        loginCountryName = c?.name || "N/A";
      } else if (uBid && mb) {
        loginBranchName = mb.name;
        loginBranchCode = mb.code;
        loginCityName = "Main Branch";
        loginCountryName = c?.name || "N/A";
      } else if (uCid && c) {
        loginBranchName = `${c.name} Region`;
        loginBranchCode = c.iso2 || "N/A";
        loginCityName = "All Cities";
        loginCountryName = c.name;
      } else {
        // Fallback to what's in the form if lists haven't loaded yet
        loginBranchName = form.branchName;
        loginBranchCode = form.branchCode;
        loginCityName = form.branchCity;
        loginCountryName = form.branchCountry;
      }
    }

    const primaryRole = (activeSession?.roles?.[0] || activeSession?.scopes?.roles?.[0] || "User").replace(/_/g, " ");

    return (
      <div className="w-full mb-4 animate-in fade-in duration-300">
        <div className="bg-card border border-border shadow-md rounded-lg p-3 relative">
          {/* Horizontal Cards row */}
          <div className="z-10 bg-card pb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">

              {/* Card 1: Branch Login Details */}
              <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                  <span className="p-1 rounded-md bg-primary/10 text-primary dark:bg-primary/20">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Branch Login Details</h4>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="space-y-0.5 border-b border-border/40 pb-1.5 mb-1.5">
                    <span className="text-muted-foreground block text-[8px] uppercase font-bold">Branch Name</span>
                    <span className="font-black text-primary block truncate text-xs" title={loginBranchName}>{loginBranchName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Branch Code:</span> <span className="font-semibold text-foreground font-mono">{loginBranchCode || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">User Admin:</span> <span className="font-black text-emerald-600 dark:text-emerald-450 uppercase">{form.userName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">User ID:</span> <span className="font-semibold text-foreground font-mono text-[9px]">{form.userId || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Role:</span> <span className="font-semibold text-foreground capitalize text-[9px]">{primaryRole}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location:</span> <span className="font-semibold text-foreground truncate" title={`${loginCityName || "N/A"}, ${loginCountryName || "N/A"}`}>{loginCityName || "N/A"}, {loginCountryName || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Country:</span> <span className="font-semibold text-foreground truncate" title={loginCountryName}>{loginCountryName || "N/A"}</span></div>
                </div>
              </div>

              {/* Card 2: Bill Details */}
              <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                  <span className="p-1 rounded-md bg-primary/10 text-primary dark:bg-primary/20">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bill Details</h4>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Booking Date:</span> <span className="font-semibold text-foreground">{form.salesDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fiscal Year:</span> <span className="font-semibold">2025-26</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground font-bold">Booking Branch:</span> <span className="font-bold text-emerald-600 dark:text-emerald-450 truncate" title={loginBranchName}>{loginBranchName || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status:</span> <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-1.5 py-0.2 text-[8px] font-bold text-yellow-600 dark:text-yellow-450 uppercase">{form.salesStatus}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">System Serial:</span> <span className="font-bold text-foreground truncate font-mono" title={form.salesOrderNo}>{form.salesOrderNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground font-bold text-primary">Branch Serial:</span> <span className="font-bold text-primary truncate font-mono" title={form.billNo}>{form.billNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contract No:</span> <span className="font-semibold text-foreground truncate font-mono" title={form.salesContractNo}>{form.salesContractNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Loading Mode:</span> <span className="font-semibold text-foreground truncate" title={form.shippingMode}>{form.shippingMode || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Origin Country:</span> <span className="font-semibold text-foreground truncate" title={form.origin || form.branchCountry}>{form.origin || form.branchCountry || "N/A"}</span></div>
                </div>
              </div>

              {/* Card 3: Sales Account Details */}
              <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                  <span className="p-1 rounded-md bg-primary/10 text-primary dark:bg-primary/20">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Sales Account (CR)</h4>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Code:</span> <span className="font-bold text-foreground truncate block w-full text-right font-mono" title={form.salesAccountNo}>{form.salesAccountNo}</span></div>
                  <div className="space-y-0.5 pt-1">
                    <span className="text-muted-foreground block text-[9px]">Account Name:</span>
                    <span className="font-semibold text-foreground block truncate text-xs text-primary" title={form.salesAccountName}>{form.salesAccountName}</span>
                  </div>
                  <div className="flex justify-between pt-1"><span className="text-muted-foreground">Branch:</span> <span className="font-semibold text-foreground truncate" title={form.salesAccountBranch}>{form.salesAccountBranch}</span></div>
                  <div className="flex justify-between pt-0.5"><span className="text-muted-foreground">Currency:</span> <span className="font-bold text-foreground">{form.salesAccountCurrency || form.salesCurrency || form.secondaryCurrency || "-"}</span></div>
                  <div className="flex justify-between items-center pt-0.5 border-t border-border/20 mt-1 relative" ref={salesCompanyDropdownRef}>
                    <span className="text-muted-foreground font-semibold">Company:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground truncate max-w-[100px] text-[8.5px] text-right font-mono" title={form.salesCompanyName ? `${form.salesCompanyName} (${form.salesCompanyCode || "COM-N/A"})` : "None"}>
                        {form.salesCompanyName ? `${form.salesCompanyName} (${form.salesCompanyCode || "COM-N/A"})` : "None"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSalesCompanySelectOpen(prev => !prev)}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="Select Company"
                      >
                        <Pin className={`h-2.5 w-2.5 ${salesCompanySelectOpen ? "text-primary fill-primary/25" : ""}`} />
                      </button>
                    </div>

                    {salesCompanySelectOpen && (
                      <div className="absolute right-0 top-6 w-48 rounded-xl bg-card border border-border shadow-2xl z-[60] p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                        <div className="px-2 py-0.5 text-[8px] font-black uppercase text-primary tracking-wider border-b border-border/40 mb-1">
                          Select Company
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin">
                          {dbCompanies.length === 0 ? (
                            <div className="px-2 py-2 text-center text-muted-foreground text-[8px] italic">
                              No companies found.
                            </div>
                          ) : (
                            dbCompanies.map((c) => {
                              const cCode = "COM-" + c.name.slice(0, 3).toUpperCase();
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setValue("salesCompanyId", c.id);
                                    setValue("salesCompanyName", c.name);
                                    setValue("salesCompanyCode", cCode);
                                    setSalesCompanySelectOpen(false);
                                  }}
                                  className="w-full text-left px-2 py-0.5 rounded hover:bg-muted text-[8.5px] text-foreground font-semibold truncate block"
                                  title={c.name}
                                 >
                                   {c.name} ({cCode})
                                 </button>
                               );
                             })
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-2 text-foreground bg-background mt-[-10px] max-w-[1500px] mx-auto">
      {isSuperAdmin && (!form.countryId || !form.countryBranchId || !scopeConfirmed) ? (
        <SimpleModal
          isOpen={true}
          onClose={() => {}} // Cannot close without selecting
          title="Super Admin: Select Working Scope"
          width="md"
        >
          <div className="space-y-4 p-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Please select the Country, Branch, and City Branch you want to work in for Sales Orders.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black">Country</label>
                <select
                  value={form.countryId || ""}
                  onChange={(e) => {
                    const country = countries.find(c => c.id === e.target.value);
                    setForm(p => ({
                      ...p,
                      countryId: e.target.value,
                      countryBranchId: "",
                      cityBranchId: "",
                      currencyType: "USD",
                      salesCurrency: country ? country.currency_code : p.salesCurrency,
                      secondaryCurrency: country ? country.currency_code : p.secondaryCurrency,
                      paymentCurrency: country ? country.currency_code : p.paymentCurrency
                    }));
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                >
                  <option value="">Select Country...</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.currency_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black">Branch</label>
                <select
                  value={form.countryBranchId || ""}
                  onChange={(e) => setForm(p => ({ ...p, countryBranchId: e.target.value, cityBranchId: "" }))}
                  disabled={!form.countryId}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                >
                  <option value="">Select Branch...</option>
                  {mainBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black">City Branch</label>
                <select
                  value={form.cityBranchId || ""}
                  onChange={(e) => setForm(p => ({ ...p, cityBranchId: e.target.value }))}
                  disabled={!form.countryBranchId}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                >
                  <option value="">Select City Branch...</option>
                  {cityBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.city_name || b.name} ({b.code || b.branch_code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                onClick={() => setScopeConfirmed(true)}
                disabled={!form.countryId || !form.countryBranchId}
                className="bg-primary text-primary-foreground font-bold h-8 text-xs px-6"
              >
                Confirm Scope
              </Button>
            </div>
          </div>
        </SimpleModal>
      ) : (
        <>
          {titlePortal && actionsPortal ? (
            <>
              {createPortal(
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h2 className="text-[11px] sm:text-xs font-black tracking-tight uppercase text-foreground">
                      Sales Booking Order
                    </h2>
                  </div>
                  <div className="h-4 w-px bg-border/60"></div>
                  <h2 className="text-[11px] sm:text-xs font-black tracking-tight uppercase text-primary/80">
                    Sales Booking Report
                  </h2>
                </div>,
                titlePortal
              )}
              {createPortal(
                <div className="flex items-center gap-1.5 shrink-0 relative" ref={dropdownRef}>
                  <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded border border-border/50 mr-2">
                    <button type="button" onClick={() => setActiveTab("booking")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "booking" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>1 Booking</button>
                    <button type="button" onClick={() => setActiveTab("goods")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "goods" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>2 Goods</button>
                    <button type="button" onClick={() => setActiveTab("others")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "others" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>3 Others</button>
                    <button type="button" onClick={() => setActiveTab("reports_tab")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "reports_tab" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>4 Reports</button>
                    <button type="button" onClick={() => setActiveTab("report")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "report" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>5 Verify</button>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1 border border-border/50 mr-1">
                    <span className="relative flex h-2 w-2 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider pr-1">Live</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1 h-7.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md font-bold text-[10px]"
                  >
                    + New
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setReportSaved(!!form.orderReportRemarks);
                      setIsTransferred(false);
                      setActiveTab("report");
                    }}
                    className="flex items-center gap-1 h-7.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md font-bold text-[10px]"
                  >
                    <FileText className="h-3.5 w-3.5" /> Report
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                    className="flex items-center gap-1 h-7.5 px-2 bg-slate-800 text-white hover:bg-slate-700 transition"
                  >
                    Actions <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>,
                actionsPortal
              )}
            </>
          ) : (
            <div className="pb-2 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h2 className="text-[11px] sm:text-xs font-black tracking-tight uppercase text-foreground">
                    Sales Booking Order
                  </h2>
                </div>
                <div className="h-4 w-px bg-border/60"></div>
                <h2 className="text-[11px] sm:text-xs font-black tracking-tight uppercase text-primary/80">
                  Sales Booking Report
                </h2>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 relative" ref={dropdownRef}>
                <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded border border-border/50 mr-2">
                  <button type="button" onClick={() => setActiveTab("booking")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "booking" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>1 Booking</button>
                  <button type="button" onClick={() => setActiveTab("goods")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "goods" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>2 Goods</button>
                  <button type="button" onClick={() => setActiveTab("others")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "others" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>3 Others</button>
                  <button type="button" onClick={() => setActiveTab("reports_tab")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "reports_tab" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>4 Reports</button>
                  <button type="button" onClick={() => setActiveTab("report")} className={`py-1 px-1.5 rounded-sm text-[9px] font-bold transition flex items-center gap-1 ${activeTab === "report" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>5 Verify</button>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1 border border-border/50 mr-1">
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider pr-1">Live</span>
                </div>
                <Button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1 h-7.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md font-bold text-[10px]"
                >
                  + New
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setReportSaved(!!form.orderReportRemarks);
                    setIsTransferred(false);
                    setActiveTab("report");
                  }}
                  className="flex items-center gap-1 h-7.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md font-bold text-[10px]"
                >
                  <FileText className="h-3.5 w-3.5" /> Report
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                  className="flex items-center gap-1 h-7.5 px-2 bg-slate-800 text-white hover:bg-slate-700 transition"
                >
                  Actions <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === "report" && isMounted && document.getElementById("erp-page-actions-slot") && createPortal(
            <>
              {!isTransferred && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleTransfer}
                    disabled={savingOrder || isTransferred}
                    className="h-10 text-[11px] font-black tracking-wider uppercase px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <CheckCircle2 className="h-4 w-4"/> CONFIRM & TRANSFER
                  </Button>
                </div>
              )}
            </>,
            document.getElementById("erp-page-actions-slot")
          )}

          {activeTab !== "report" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-0 items-start">
              <div className="lg:col-span-1 space-y-4">
                {renderGlobalInfoCards()}
              </div>

              <main className="space-y-3 flex flex-col order-1 lg:order-1 mt-0">

              {activeTab === "booking" && (
                <fieldset disabled={isTransferred && !session?.scopes?.isSuperAdmin} className="space-y-3 order-2 w-full mt-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="border-b border-border pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Sales Booking / Bill Info</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative" ref={customerDropdownRef}>
                      <label className="block text-[10px] font-bold text-foreground mb-1">Customer Account (DR)*</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder={form.customerAccountName ? formatAccountDisplayLabel(form.customerAccountName, form.customerAccountNo, form.customerAccountManualReferenceNumber) : "Search Code, Name, Branch, Manual A/C..."}
                          value={customerDropdownOpen ? customerSearch : (form.customerAccountName ? formatAccountDisplayLabel(form.customerAccountName, form.customerAccountNo, form.customerAccountManualReferenceNumber) : form.customerAccountNo || "")}
                          onChange={(e) => handleTextChange("purchase", e.target.value)}
                          onFocus={() => {
                            setPurchaseDropdownOpen(true);
                            setPurchasePinDropdownOpen(false);
                            setPurchaseSearch("");
                          }}
                          className="w-full bg-background border border-input rounded pl-2.5 pr-8 py-1.5 text-foreground font-semibold outline-none focus:border-primary text-xs h-9"
                        />
                        <button
                          type="button"
                          disabled={!form.customerId}
                          onClick={() => {
                            setPurchasePinDropdownOpen(prev => !prev);
                            setPurchaseDropdownOpen(false);
                          }}
                          className="absolute right-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
                        >
                          <Pin className={`h-3.5 w-3.5 ${customerPinDropdownOpen ? "text-primary rotate-45" : ""}`} />
                        </button>
                      </div>

                      {customerDropdownOpen && (
                        <div className="absolute left-0 mt-1.5 w-full min-w-[290px] sm:min-w-[440px] md:min-w-[520px] rounded-2xl bg-card border-2 border-primary/40 shadow-2xl z-[80] p-2 overflow-hidden backdrop-blur-md">
                          <div className="flex justify-between items-center px-2.5 py-1.5 bg-primary/5 rounded-lg mb-1.5 border border-primary/10">
                            <span className="text-[10px] font-black uppercase text-primary tracking-wider">Select Customer Account (DR)</span>
                            <span className="text-[9px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {dbAccounts.filter(acc => accountMatchesScope(acc) && accountMatchesSearch(acc, customerSearch)).length} found
                            </span>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                            {dbAccounts.filter(acc => accountMatchesScope(acc) && accountMatchesSearch(acc, customerSearch)).map((acc) => {
                              const compName = acc.companyName || acc.company_name || (acc.companyId && dbCompanies.find(c => c.id === acc.companyId)?.name) || dbCompanies[0]?.name || "None";
                              return (
                                <button
                                  key={acc.accountCode}
                                  type="button"
                                  onClick={() => {
                                    applyAccountMaster("purchase", acc);
                                    setPurchaseDropdownOpen(false);
                                    setPurchaseSearch("");
                                  }}
                                  className="w-full text-left p-2.5 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition duration-150 group bg-background/60"
                                >
                                  <div className="flex justify-between items-start gap-2 mb-1">
                                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{formatAccountDisplayLabel(acc.accountName, acc.accountCode, acc.manualReferenceNumber)}</span>
                                    <span className="font-mono text-[9.5px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">System: {acc.accountCode}</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[9px] text-muted-foreground">
                                    <div><span className="font-semibold text-foreground/80">Branch:</span> {acc.cityBranchName || "Main Branch"}</div>
                                    <div>
                                      {acc.manualReferenceNumber && (
                                        <div className="mb-0.5"><span className="font-semibold text-foreground/80">Manual A/C:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{acc.manualReferenceNumber}</span></div>
                                      )}
                                      <div><span className="font-semibold text-foreground/80">Curr:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">{acc.ledgerCurrency || "PKR"}</span></div>
                                    </div>
                                    <div><span className="font-semibold text-foreground/80">Company:</span> <span className="truncate inline-block max-w-[120px] align-bottom">{compName}</span></div>
                                  </div>
                                </button>
                              );
                            })}
                            {dbAccounts.filter(acc => accountMatchesScope(acc) && accountMatchesSearch(acc, customerSearch)).length === 0 && (
                              <div className="p-4 text-center text-muted-foreground text-xs italic">
                                No matching accounts found. Try searching by Code, Name, Currency, or Phone.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={salesDropdownRef}>
                      <label className="block text-[10px] font-bold text-foreground mb-1">Sales Account (CR)*</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder={form.salesAccountName ? formatAccountDisplayLabel(form.salesAccountName, form.salesAccountNo, form.salesAccountManualReferenceNumber) : "Search Code, Name, Branch, Manual A/C..."}
                          value={salesDropdownOpen ? salesSearch : (form.salesAccountName ? formatAccountDisplayLabel(form.salesAccountName, form.salesAccountNo, form.salesAccountManualReferenceNumber) : form.salesAccountNo || "")}
                          onChange={(e) => handleTextChange("sales", e.target.value)}
                          onFocus={() => {
                            setSalesDropdownOpen(true);
                            setSalesPinDropdownOpen(false);
                            setSalesSearch("");
                          }}
                          className="w-full bg-background border border-input rounded pl-2.5 pr-8 py-1.5 text-foreground font-semibold outline-none focus:border-primary text-xs h-9"
                        />
                        <button
                          type="button"
                          disabled={!form.customerId}
                          onClick={() => {
                            setSalesPinDropdownOpen(prev => !prev);
                            setSalesDropdownOpen(false);
                          }}
                          className="absolute right-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
                        >
                          <Pin className={`h-3.5 w-3.5 ${salesPinDropdownOpen ? "text-primary rotate-45" : ""}`} />
                        </button>
                      </div>
                      {salesDropdownOpen && (
                        <div className="absolute left-0 mt-1.5 w-full min-w-[290px] sm:min-w-[440px] md:min-w-[520px] rounded-2xl bg-card border-2 border-primary/40 shadow-2xl z-[80] p-2 overflow-hidden backdrop-blur-md">
                          <div className="flex justify-between items-center px-2.5 py-1.5 bg-primary/5 rounded-lg mb-1.5 border border-primary/10">
                            <span className="text-[10px] font-black uppercase text-primary tracking-wider">Select Sales Account (CR)</span>
                            <span className="text-[9px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {dbAccounts.filter(acc => accountMatchesScope(acc) && accountMatchesSearch(acc, salesSearch)).length} found
                            </span>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                            {dbAccounts.filter(acc => accountMatchesScope(acc) && accountMatchesSearch(acc, salesSearch)).map((acc) => {
                              const compName = acc.companyName || acc.company_name || (acc.companyId && dbCompanies.find(c => c.id === acc.companyId)?.name) || dbCompanies[0]?.name || "None";
                              return (
                                <button
                                  key={acc.accountCode}
                                  type="button"
                                  onClick={() => {
                                    applyAccountMaster("sales", acc);
                                    setSalesDropdownOpen(false);
                                    setSalesSearch("");
                                  }}
                                  className="w-full text-left p-2.5 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition duration-150 group bg-background/60"
                                >
                                  <div className="flex justify-between items-start gap-2 mb-1">
                                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{formatAccountDisplayLabel(acc.accountName, acc.accountCode, acc.manualReferenceNumber)}</span>
                                    <span className="font-mono text-[9.5px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">System: {acc.accountCode}</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[9px] text-muted-foreground">
                                    <div><span className="font-semibold text-foreground/80">Branch:</span> {acc.cityBranchName || "Main Branch"}</div>
                                    <div>
                                      {acc.manualReferenceNumber && (
                                        <div className="mb-0.5"><span className="font-semibold text-foreground/80">Manual A/C:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{acc.manualReferenceNumber}</span></div>
                                      )}
                                      <div><span className="font-semibold text-foreground/80">Curr:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">{acc.ledgerCurrency || "PKR"}</span></div>
                                    </div>
                                    <div><span className="font-semibold text-foreground/80">Company:</span> <span className="truncate inline-block max-w-[120px] align-bottom">{compName}</span></div>
                                  </div>
                                </button>
                              );
                            })}
                            {dbAccounts.filter(acc => accountMatchesScope(acc) && accountMatchesSearch(acc, salesSearch)).length === 0 && (
                              <div className="p-4 text-center text-muted-foreground text-xs italic">
                                No matching accounts found. Try searching by Code, Name, Currency, or Phone.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Contract No</label>
                        <input
                          type="text"
                          value={form.salesContractNo}
                          onChange={(e) => setValue("salesContractNo", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-8 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Contract / Booking Date</label>
                        <input
                          type="date"
                          value={form.salesDate}
                          onChange={(e) => setValue("salesDate", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-8 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Invoice / Payment Select</label>
                        <select
                          value={form.paymentType}
                          onChange={(e) => setValue("paymentType", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-8"
                        >
                          {PAYMENT_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Ship Option</label>
                        <select
                          value={form.shippingMode}
                          onChange={(e) => {
                            const mode = e.target.value;
                            setValue("shippingMode", mode);
                            setValue("shipmentType", mode === "By Sea" ? "By Ship" : mode);
                          }}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-8"
                        >
                          {LOADING_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Status</label>
                        <select
                          value={form.salesStatus}
                          onChange={(e) => setValue("salesStatus", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-8"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Transferred">Transferred</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-[10px] text-muted-foreground mb-1">Booking Remarks / Terms</label>
                      <textarea
                        rows={2}
                        value={form.remarks}
                        onChange={(e) => setValue("remarks", e.target.value)}
                        placeholder="Write booking terms, payment notes, invoice note, or shipping instruction..."
                        className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <Button
                      type="button"
                      onClick={() => setActiveTab("goods")}
                      className="w-full font-bold h-10 rounded-lg text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow"
                    >
                      Next: Goods Entry
                    </Button>
                  </div>
                </fieldset>
              )}

              {activeTab === "goods" && (
                <fieldset disabled={isTransferred && !session?.scopes?.isSuperAdmin} className="space-y-3 order-2 w-full mt-0 rounded-2xl border border-border bg-card p-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="border-b border-border pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      GOODS ENTRY
                    </h3>
                  </div>
                  
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">Sale Source / Lot Selection</p>
                        <h4 className="text-sm font-black text-foreground">Choose where this sale will be supplied from</h4>
                        <p className="text-[10px] text-muted-foreground">Booking, in-transit loading, local purchase, warehouse stock, or endorse stock can be selected before goods entry.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLotPanelOpen((open) => !open)}
                        className="h-8 rounded-lg border border-sky-300 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-sky-700 shadow-sm hover:bg-sky-100"
                      >
                        {lotPanelOpen ? "Close Lots" : "Open Lots"}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {SALE_SOURCE_OPTIONS.map((option) => {
                        const SourceIcon = option.icon;
                        const isActive = (form.saleSource || "booking") === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => openSaleSource(option.value)}
                            className={`min-h-[76px] rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${isActive ? "border-sky-400 bg-white shadow-sm ring-2 ring-sky-100" : "border-border bg-white/70 hover:border-sky-200"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isActive ? "bg-sky-600 text-white" : "bg-sky-100 text-sky-700"}`}>
                                <SourceIcon className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-[10px] font-black text-foreground">{option.label}</span>
                            </div>
                            <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Cargo / Lot Dropdown Selection */}
                    {(form.saleSource && form.saleSource !== "booking") && (
                      <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          Select {form.saleSource === "in_transit" ? "Transit Cargo (Lot)" : "Stock Lot"}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={selectedLotId}
                            onChange={(e) => setSelectedLotId(e.target.value)}
                            className="flex-1 bg-background border border-input rounded px-2.5 py-1 text-foreground outline-none focus:border-primary text-[10px] h-8"
                          >
                            <option value="">-- Choose {form.saleSource === "in_transit" ? "Cargo" : "Lot"} --</option>
                            {MOCK_SALE_LOTS.filter(l => l.source === form.saleSource).map((lot) => (
                              <option key={lot.lotNo} value={lot.lotNo}>
                                {lot.lotNo} - {lot.goodsName} ({lot.availableQty} {lot.qtyName} available) - Ref: {lot.stockRef}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!selectedLotId}
                            onClick={() => setIsLotModalOpen(true)}
                            className="h-8 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 rounded text-[10px] disabled:opacity-50 transition shadow-sm"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedSaleLot ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[10px] lg:grid-cols-5">
                        <div>
                          <p className="text-[9px] font-black uppercase text-emerald-700">Selected Lot</p>
                          <p className="font-black text-foreground">{selectedSaleLot.lotNo}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-emerald-700">Goods</p>
                          <p className="font-bold text-foreground">{selectedSaleLot.goodsName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-emerald-700">Available Qty</p>
                          <p className="font-black text-foreground">{Number(selectedSaleLot.availableQty || 0).toLocaleString()} {selectedSaleLot.qtyName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-emerald-700">Net Weight</p>
                          <p className="font-black text-foreground">{Number(selectedSaleLot.netWeight || 0).toLocaleString()} KG</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-emerald-700">Stock Ref</p>
                          <p className="font-bold text-foreground">{selectedSaleLot.stockRef}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-sky-300 bg-white/60 px-3 py-2 text-[10px] font-semibold text-sky-700">
                        Current source: {selectedSaleSource.label}. Open lots and select a lot number to auto-fill goods, quantity, weight, currency and rate.
                      </div>
                    )}

                    {lotPanelOpen && (
                      <div className="mt-3 rounded-2xl border border-border bg-white p-3 shadow-lg">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Lot Stock Panel</p>
                            <h4 className="text-sm font-black text-foreground">{selectedSaleSource.label}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={lotSearch}
                              onChange={(e) => setLotSearch(e.target.value)}
                              placeholder="Search lot no, goods, stock ref..."
                              className="h-8 w-56 rounded-lg border border-input bg-background px-3 text-[10px] outline-none focus:border-primary"
                            />
                            <button type="button" onClick={() => setLotPanelOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                          <table className="min-w-[760px] w-full text-[10px]">
                            <thead className="bg-slate-950 text-white">
                              <tr>
                                <th className="px-3 py-2 text-left">Lot No</th>
                                <th className="px-3 py-2 text-left">Goods / Brand</th>
                                <th className="px-3 py-2 text-right">Available</th>
                                <th className="px-3 py-2 text-right">Net KG</th>
                                <th className="px-3 py-2 text-left">Location</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSaleLots.map((lot) => (
                                <tr key={lot.lotNo} className="border-t border-border hover:bg-sky-50">
                                  <td className="px-3 py-2 font-black text-primary">{lot.lotNo}<div className="text-[9px] font-semibold text-muted-foreground">{lot.stockRef}</div></td>
                                  <td className="px-3 py-2 font-bold text-foreground">{lot.goodsName}<div className="text-[9px] font-semibold text-muted-foreground">{lot.brand} / {lot.size} / {lot.origin}</div></td>
                                  <td className="px-3 py-2 text-right font-black">{Number(lot.availableQty || 0).toLocaleString()} {lot.qtyName}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold">{Number(lot.netWeight || 0).toLocaleString()}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{lot.location}</td>
                                  <td className="px-3 py-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">{lot.status}</span></td>
                                  <td className="px-3 py-2 text-center">
                                    <button type="button" onClick={() => applySaleLot(lot)} className="rounded-lg bg-primary px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary-foreground shadow-sm hover:bg-primary/90">
                                      Use Lot
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {filteredSaleLots.length === 0 && (
                                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No lots found for this source.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Manual Net KGs Input */}
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Net KGs (Weight)</label>
                      <input
                        type="number"
                        value={form.netWeight !== undefined && form.netWeight !== "" ? form.netWeight : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setValue("netWeight", val === "" ? "" : Number(val));
                          setValue("manualTotalAmount", "");
                          setValue("manualFinalAmount", "");
                        }}
                        className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono font-bold"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Origin Country</label>
                      <select
                        value={form.origin || ""}
                        onChange={(e) => setValue("origin", e.target.value)}
                        className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                      >
                        <option value="">Select Origin</option>
                        {Array.from(new Set([
                          "United Arab Emirates", "Iran", "USA", "Vietnam", "Pakistan", "India", "Afghanistan", "China", "Turkey",
                          ...allCountries.map(c => c.name).filter(Boolean),
                          ...transitCountryOptions.map(c => c.name).filter(Boolean),
                          form.origin
                        ].filter(Boolean))).sort().map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] text-muted-foreground mb-1">Goods Name*</label>
                      <SearchableSelect
                        value={form.goodsName || ""}
                        onChange={(val) => {
                          if (val === "__ADD_NEW__") {
                            setNewGoodForm({ goodsName: "", chsCode: "", size: "", brand: "", originCountryId: "" });
                            setNewGoodError("");
                            setNewGoodModal(true);
                          } else {
                            setValue("goodsName", val);
                            const foundGood = dbGoods.find(g => (g.goods_name || g.goodsName) === val);
                            if (foundGood) {
                              const hs = foundGood.chs_code || foundGood.chsCode || "";
                              const firstVar = foundGood.variations?.[0] || {};
                              const br = firstVar.brand || foundGood.brand || "";
                              const sz = firstVar.size || foundGood.size || "";
                              const originId = foundGood.origin_country_id || foundGood.originCountryId;
                              const originCountryObj = originId ? (allCountries.find(c => c.id === originId) || countries.find(c => c.id === originId) || transitCountryOptions.find(c => c.id === originId)) : null;
                              const cName = originCountryObj?.name || foundGood.origin || "";

                              setForm(prev => ({
                                ...prev,
                                goodsName: val,
                                hsCode: hs || prev.hsCode,
                                brand: br || prev.brand,
                                size: sz || prev.size,
                                origin: cName || prev.origin
                              }));
                            }
                          }
                        }}
                        options={[
                          ...dbGoods.map(g => ({ label: g.goods_name || g.goodsName, value: g.goods_name || g.goodsName })),
                          ...GOODS_OPTIONS.filter(go => !dbGoods.some(g => (g.goods_name || g.goodsName) === go)).map(g => ({ label: g, value: g }))
                        ]}
                        placeholder="Select Goods"
                        addOptionLabel="Add New Good"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] text-muted-foreground">HS Code</label>
                          {form.goodsName && (() => {
                            const selectedGood = dbGoods.find(g => (g.goods_name || g.goodsName || "").trim().toUpperCase() === form.goodsName.trim().toUpperCase());
                            if (selectedGood && (selectedGood.chs_code || selectedGood.chsCode || "") !== (form.hsCode || "")) {
                              return (
                                <button
                                  type="button"
                                  onClick={handleUpdateHsCode}
                                  className="text-[9px] bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-1.5 py-0.5 rounded transition-colors"
                                >
                                  Save to Master
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <input
                          type="text"
                          value={form.hsCode || ""}
                          onChange={(e) => setValue("hsCode", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Allot Name / ID</label>
                        <input
                          type="text"
                          value={form.allotName || ""}
                          onChange={(e) => setValue("allotName", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Brand</label>
                        <SearchableSelect
                          value={form.brand || ""}
                          onChange={(val) => {
                            if (val === "__ADD_NEW__") {
                              const selGood = dbGoods.find(g => (g.goods_name || g.goodsName || "").trim().toUpperCase() === (form.goodsName || "").trim().toUpperCase());
                              if (!selGood) {
                                alert(`Please select a Good first before adding a new Brand. (Current goodsName: "${form.goodsName || ""}", dbGoods count: ${dbGoods.length})`);
                                return;
                              }
                              setCustomVariationForm({
                                goodsName: selGood.goods_name || selGood.goodsName,
                                brand: "",
                                size: form.size || "",
                                originCountryId: ""
                              });
                              setCustomVariationModal(true);
                            } else {
                              setValue("brand", val);
                            }
                          }}
                          options={(() => {
                            const selGood = dbGoods.find(g => (g.goods_name || g.goodsName) === form.goodsName);
                            const brands = Array.from(new Set([
                              ...BRAND_OPTIONS,
                              ...(selGood?.variations || []).map(v => v.brand).filter(Boolean),
                              ...dbGoods.flatMap(g => (g.variations || []).map(v => v.brand)).filter(Boolean),
                              form.brand
                            ].filter(Boolean))).sort();
                            return brands.map(b => ({ label: b, value: b }));
                          })()}
                          placeholder="Select Brand"
                          addOptionLabel="Add New Brand"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Size Specification</label>
                        <SearchableSelect
                          value={form.size || ""}
                          onChange={(val) => {
                            if (val === "__ADD_NEW__") {
                              const selGood = dbGoods.find(g => (g.goods_name || g.goodsName || "").trim().toUpperCase() === (form.goodsName || "").trim().toUpperCase());
                              if (!selGood) {
                                alert(`Please select a Good first before adding a new Size. (Current goodsName: "${form.goodsName || ""}", dbGoods count: ${dbGoods.length})`);
                                return;
                              }
                              setCustomVariationForm({
                                goodsName: selGood.goods_name || selGood.goodsName,
                                brand: form.brand || "",
                                size: "",
                                originCountryId: ""
                              });
                              setCustomVariationModal(true);
                            } else {
                              setValue("size", val);
                            }
                          }}
                          options={(() => {
                            const selGood = dbGoods.find(g => (g.goods_name || g.goodsName) === form.goodsName);
                            const sizes = Array.from(new Set([
                              ...SIZE_OPTIONS,
                              ...(selGood?.variations || []).map(v => v.size).filter(Boolean),
                              ...dbGoods.flatMap(g => (g.variations || []).map(v => v.size)).filter(Boolean),
                              form.size
                            ].filter(Boolean))).sort();
                            return sizes.map(s => ({ label: s, value: s }));
                          })()}
                          placeholder="Select Size"
                          addOptionLabel="Add New Size"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Qty Name</label>
                        <SearchableSelect
                          value={form.qtyName || "BAGS"}
                          onChange={(val) => {
                            if (val === "__ADD_NEW__") {
                              const newQty = window.prompt("Enter New Qty Name:");
                              if (newQty && newQty.trim()) {
                                setValue("qtyName", newQty.trim());
                                setCustomQtyNames(prev => [...prev, newQty.trim()]);
                              }
                            } else {
                              setValue("qtyName", val);
                            }
                          }}
                          options={Array.from(new Set([...QTY_TYPE_OPTIONS, ...customQtyNames, form.qtyName])).filter(Boolean).map(q => ({ label: q, value: q }))}
                          placeholder="Select Qty Name"
                          addOptionLabel="Add New Qty Name"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Quantity No</label>
                        <input
                          type="number"
                          value={form.qtyNo || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setValue("qtyNo", val);
                            setValue("manualTotalAmount", "");
                            setValue("manualFinalAmount", "");
                            const qtyKgs = Number(form.qtyKgs || 0);
                            const emptyKgs = Number(form.emptyKgs || 0);
                            setValue("netWeight", val * qtyKgs - val * emptyKgs);
                          }}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">1 Qty KGS</label>
                        <input
                          type="number"
                          value={form.qtyKgs || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setValue("qtyKgs", val);
                            setValue("manualTotalAmount", "");
                            setValue("manualFinalAmount", "");
                            const qtyNo = Number(form.qtyNo || 0);
                            const emptyKgs = Number(form.emptyKgs || 0);
                            setValue("netWeight", qtyNo * val - qtyNo * emptyKgs);
                          }}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">1 Empty KGS</label>
                        <input
                          type="number"
                          value={form.emptyKgs || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setValue("emptyKgs", val);
                            setValue("manualTotalAmount", "");
                            setValue("manualFinalAmount", "");
                            const qtyNo = Number(form.qtyNo || 0);
                            const qtyKgs = Number(form.qtyKgs || 0);
                            setValue("netWeight", qtyNo * qtyKgs - qtyNo * val);
                          }}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Divide Type</label>
                        <select
                          value={form.divideType || "D/KGs"}
                          onChange={(e) => setValue("divideType", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="D/KGs">D/KGs</option>
                          <option value="D/LBs">D/LBs</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Divide Weight / Value</label>
                        <input
                          type="number"
                          value={form.divideWeight || 1}
                          onChange={(e) => {
                            setValue("divideWeight", Number(e.target.value));
                            setValue("manualTotalAmount", "");
                            setValue("manualFinalAmount", "");
                          }}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Price Type</label>
                        <select
                          value={form.priceType || "P/KGs"}
                          onChange={(e) => setValue("priceType", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="P/KGs">P/KGs</option>
                          <option value="P/LBs">P/LBs</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Price Rate (C1)</label>
                        <input
                          type="number"
                          value={form.coursePrice || ""}
                          onChange={(e) => {
                            setValue("coursePrice", Number(e.target.value));
                            setValue("manualTotalAmount", "");
                            setValue("manualFinalAmount", "");
                          }}
                          className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono"
                        />
                      </div>
                    </div>
 
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900 mt-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-2">Sales Currency & Conversion</h4>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <label className="block text-[9px] text-emerald-700 dark:text-emerald-500 mb-1 font-bold">Pricing Currency</label>
                          <select
                            value={form.currencyType || "USD"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm(prev => ({ ...prev, currencyType: val, salesCurrency: val }));
                            }}
                            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                          >
                            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-emerald-700 dark:text-emerald-500 mb-1 font-bold">Exchange Rate to {form.secondaryCurrency || "PKR"}</label>
                          <div className="flex gap-1.5">
                            <input
                               type="number"
                               value={form.exchangeRate || 1}
                               onChange={(e) => {
                                 setValue("exchangeRate", Number(e.target.value));
                                 setValue("manualFinalAmount", "");
                               }}
                               className="flex-1 min-w-0 bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] font-mono h-8"
                            />
                            <select
                              value={form.operator || "*"}
                              onChange={(e) => {
                                setValue("operator", e.target.value);
                                setValue("manualFinalAmount", "");
                              }}
                              className="w-12 bg-background border border-input rounded text-center text-xs font-bold text-foreground outline-none focus:border-primary h-8"
                            >
                              <option value="*">*</option>
                              <option value="/">/</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="block text-[9px] text-emerald-700 dark:text-emerald-500 mb-1 font-bold">Amount ({form.currencyType || "USD"})</label>
                          <input
                            type="number"
                            value={form.manualTotalAmount !== undefined && form.manualTotalAmount !== "" ? form.manualTotalAmount : currentItemTotals.totalAmount}
                            onChange={(e) => setValue("manualTotalAmount", e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder={currentItemTotals.totalAmount.toFixed(2)}
                            className="w-full bg-background border border-emerald-200 dark:border-emerald-800 rounded px-2.5 py-1.5 text-foreground outline-none focus:border-emerald-500 text-[10px] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-emerald-700 dark:text-emerald-500 mb-1 font-bold">Final ({form.secondaryCurrency || "PKR"})</label>
                          <input
                            type="number"
                            value={form.manualFinalAmount !== undefined && form.manualFinalAmount !== "" ? form.manualFinalAmount : currentItemTotals.finalAmount}
                            onChange={(e) => setValue("manualFinalAmount", e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder={currentItemTotals.finalAmount.toFixed(2)}
                            className="w-full bg-background border border-emerald-200 dark:border-emerald-800 rounded px-2.5 py-1.5 text-foreground outline-none focus:border-emerald-500 text-[10px] font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
 
                  <div className="flex flex-col gap-2.5 pt-4 border-t border-border mt-4">
                    <Button
                      type="button"
                      onClick={handleAddGoodsEntry}
                      className="w-full font-bold h-10 rounded-lg text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all"
                    >
                      + Add Item to List
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("booking")}
                        className="flex-1 font-bold h-10 rounded-lg text-xs text-slate-600 hover:bg-slate-50 border border-input"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab("others")}
                        className="flex-1 font-bold h-10 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </fieldset>
              )}

              {activeTab === "others" && (
                <fieldset disabled={isTransferred && !session?.scopes?.isSuperAdmin} className="space-y-3 order-2 w-full mt-0 rounded-2xl border border-border bg-card p-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="border-b border-border pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      STEP 3: OTHER DETAILS
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* SECTION 1: SHIPPING & LOCATION */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Globe2 className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 dark:text-slate-100">Shipping & Location</h4>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Essential route information only: country, port, mode and dates.</p>
                          </div>
                        </div>
                        <label className="min-w-[150px] space-y-1">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Shipping Mode</span>
                          <select
                            value={form.shippingMode || "By Sea"}
                            onChange={(e) => {
                              const mode = e.target.value;
                              setValue("shippingMode", mode);
                              setValue("shipmentType", mode === "By Sea" ? "By Ship" : mode);
                            }}
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                          >
                            {LOADING_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </label>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/50 dark:bg-amber-950/10">
                          <div className="mb-3 flex items-center gap-2 border-b border-amber-100 pb-2 dark:border-amber-900/40">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Loading / Departure</h5>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <label className="space-y-1">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Loading Country</span>
                              <SearchableSelect
                                value={form.loadingCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    handleAddNewLocationItem("country", "loadingCountry");
                                  } else {
                                    setValue("loadingCountry", val);
                                    setValue("originCountry", val);
                                    setValue("origin", val);
                                    setValue("loadingPort", "");
                                    setValue("loadingLocation", "");
                                  }
                                }}
                                options={masterCountryOptions.map((c) => ({ label: `${c.name} ${c.iso2 ? `(${c.iso2})` : ""}`, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Loading Port</span>
                              <SearchableSelect
                                value={form.loadingPort || form.airportName || form.loadingBorder || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    handleAddNewLocationItem("port", "loadingPort");
                                  } else {
                                    setValue("loadingPort", val);
                                    setValue("loadingLocation", val);
                                    if (form.shippingMode === "By Air") setValue("airportName", val);
                                    if (form.shippingMode === "By Road") setValue("loadingBorder", val);
                                  }
                                }}
                                options={currentLoadingPorts.map((p, idx) => ({ label: `${p.port_name} ${p.port_code ? `[${p.port_code}]` : ""}`, value: p.port_name }))}
                                placeholder="Select Port"
                                addOptionLabel="Add New Port"
                                disabled={!form.loadingCountry && currentLoadingPorts.length === 0}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Loading Date</span>
                              <input
                                type="date"
                                value={form.loadingDate || ""}
                                onChange={(e) => setValue("loadingDate", e.target.value)}
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/10">
                          <div className="mb-3 flex items-center gap-2 border-b border-emerald-100 pb-2 dark:border-emerald-900/40">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Receiving / Arrival</h5>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <label className="space-y-1">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Receiving Country</span>
                              <SearchableSelect
                                value={form.receivingCountry || form.destinationCountry || form.receivedCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    handleAddNewLocationItem("country", "receivingCountry");
                                  } else {
                                    setValue("receivingCountry", val);
                                    setValue("receivedCountry", val);
                                    setValue("destinationCountry", val);
                                    setValue("receivingPort", "");
                                    setValue("destinationPort", "");
                                    setValue("receivedPort", "");
                                  }
                                }}
                                options={masterCountryOptions.map((c) => ({ label: `${c.name} ${c.iso2 ? `(${c.iso2})` : ""}`, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Receiving Port</span>
                              <SearchableSelect
                                value={form.receivingPort || form.destinationPort || form.receivedPort || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    handleAddNewLocationItem("port", "receivingPort");
                                  } else {
                                    setValue("receivingPort", val);
                                    setValue("destinationPort", val);
                                    setValue("receivedPort", val);
                                    if (form.shippingMode === "By Air") setValue("destinationAirportName", val);
                                    if (form.shippingMode === "By Road") setValue("receivingBorder", val);
                                  }
                                }}
                                options={currentReceivedPorts.map((p, idx) => ({ label: `${p.port_name} ${p.port_code ? `[${p.port_code}]` : ""}`, value: p.port_name }))}
                                placeholder="Select Port"
                                addOptionLabel="Add New Port"
                                disabled={!(form.receivingCountry || form.destinationCountry || form.receivedCountry) && currentReceivedPorts.length === 0}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Receiving Date</span>
                              <input
                                type="date"
                                value={form.receivedDate || ""}
                                onChange={(e) => setValue("receivedDate", e.target.value)}
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Ã¢â€â‚¬Ã¢â€â‚¬ SECTION 2: ADVANCE & PAYMENT TERMS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1">Advance & Payment Terms</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Payment Type</label>
                          <select
                            value={form.paymentType || "Advance Payment"}
                            onChange={(e) => setValue("paymentType", e.target.value)}
                            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                          >
                            {PAYMENT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Advance Percentage (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={form.advancePercent ?? ""}
                            onChange={(e) => setValue("advancePercent", e.target.value ? Number(e.target.value) : null)}
                            placeholder="e.g. 20"
                            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Advance Payment Date</label>
                          <input
                            type="date"
                            value={form.advancePaymentDate || ""}
                            onChange={(e) => setValue("advancePaymentDate", e.target.value)}
                            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Final Payment Date</label>
                          <input
                            type="date"
                            value={form.paymentDate || ""}
                            onChange={(e) => setValue("paymentDate", e.target.value)}
                            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ã¢â€â‚¬Ã¢â€â‚¬ SECTION 3: TRANSPORT & CONTAINER DETAILS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1">Transport & Container Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Container Numbers</label>
                          <input
                            type="text"
                            value={form.containerNumbers || ""}
                            onChange={(e) => setValue("containerNumbers", e.target.value)}
                            placeholder="e.g. ABCU1234567"
                            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Container Size / Type</label>
                          <select
                            value={form.containerSize || ""}
                            onChange={(e) => setValue("containerSize", e.target.value)}
                            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                          >
                            <option value="">Select Type...</option>
                            {CONTAINER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Ã¢â€â‚¬Ã¢â€â‚¬ SECTION 4: REMARKS & NARRATION Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Remarks & Narration</label>
                      <textarea
                        value={form.remarks || ""}
                        onChange={(e) => setValue("remarks", e.target.value)}
                        className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-16 resize-none"
                        placeholder="Add any remarks or narration here..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("goods")}
                      className="flex-1 font-bold h-10 rounded-lg text-xs text-slate-600 hover:bg-slate-50 border border-input"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setActiveTab("reports_tab")}
                      className="flex-1 font-bold h-10 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </fieldset>
              )}
              {activeTab === "reports_tab" && (
                <div className="space-y-3 order-2 w-full mt-0 rounded-2xl border border-border bg-card p-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-3">
                    <h3 className="text-[11px] font-black uppercase text-slate-800">
                      Step 4: Review Reports
                    </h3>
                    <p className="text-[9px] text-slate-500 font-semibold">
                      Review all generated reports and notes before final verification.
                    </p>
                    <div className="flex gap-3 pt-3 border-t border-slate-200 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("others")}
                        className="flex-1 font-bold h-10 rounded-lg text-xs text-slate-600 hover:bg-slate-50 border border-input"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab("report")}
                        className="flex-1 font-bold h-10 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

      {activeTab === "report" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">

                  {/* Transfer / Journal Status Block */}
                  {isTransferred ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 border-b border-emerald-100 pb-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Transfer Completed</h4>
                        </div>
                        <p className="text-[9px] text-emerald-700 font-semibold mb-3 leading-relaxed">
                          This bill has been automatically transferred and posted to the business journal (Roznamcha). All associated ledger accounts have been updated.
                        </p>

                        <div className="space-y-1.5 text-[9px] font-mono bg-white/60 p-2 rounded border border-emerald-100/50">
                          <div className="flex justify-between"><span className="text-emerald-700/80 uppercase font-sans font-bold text-[8px]">General Serial No:</span> <span className="font-bold text-emerald-900">{form.generalSerialNumber || `GSN-${new Date().getFullYear()}-0001`}</span></div>
                          <div className="flex justify-between"><span className="text-emerald-700/80 uppercase font-sans font-bold text-[8px]">Roznamcha (Journal) No:</span> <span className="font-bold text-emerald-900">{form.journalNumber || `JRN-${new Date().getFullYear()}-8821`}</span></div>
                          <div className="flex justify-between"><span className="text-emerald-700/80 uppercase font-sans font-bold text-[8px]">Branch Roznamcha No:</span> <span className="font-bold text-emerald-900">{form.branchJournalNumber || `BR-JRN-402`}</span></div>
                          <div className="flex justify-between"><span className="text-emerald-700/80 uppercase font-sans font-bold text-[8px]">Cash Entry Serial:</span> <span className="font-bold text-emerald-900">{form.cashEntrySerial || `CE-9921`}</span></div>
                          <div className="flex justify-between border-t border-emerald-100/50 pt-1 mt-1"><span className="text-emerald-700/80 uppercase font-sans font-bold text-[8px]">Business Entry Ref:</span> <span className="font-bold text-emerald-900 uppercase">{form.businessEntryRef || `BUS-ENT-PURCHASE`}</span></div>
                        </div>
                      </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-amber-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-800">Pending Transfer</h4>
                      </div>
                      <p className="text-[9px] text-amber-700 font-semibold mt-1">
                        This booking is pending verification. Once transferred, the journal (Roznamcha) and serial details will automatically appear here.
                      </p>
                    </div>
                  )}

                  {/* Inline Bill View */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-4 shadow-sm overflow-x-auto">
                    <div className="mx-auto w-full max-w-5xl bg-white border border-slate-200 p-5 md:p-6 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
                          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200">
                            <div className="flex flex-col gap-4 bg-slate-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Damaan Business Group</p>
                                <h1 className="mt-1 text-xl font-black uppercase tracking-[0.22em]">Sales Booking Order</h1>
                                <p className="mt-1 text-[10px] font-semibold text-slate-300">Professional verification, account routing, goods, payment and audit template</p>
                              </div>
                              <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right text-[10px] font-bold md:min-w-[360px]">
                                <span className="text-slate-400">PO No</span><span>{form.salesOrderNo || "N/A"}</span>
                                <span className="text-slate-400">Bill No</span><span>{form.billNo || "N/A"}</span>
                                <span className="text-slate-400">Date</span><span>{form.salesDate || "N/A"}</span>
                                <span className="text-slate-400">Status</span><span className={isTransferred ? "text-emerald-300" : "text-amber-300"}>{isTransferred ? "Transferred" : "Pending Transfer"}</span>
                              </div>
                            </div>
                            <div className="grid gap-4 mb-6 text-[10px] md:grid-cols-2">
                              <div className="border border-slate-300 p-3 rounded">
                                <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800 text-[10px]">Sales Account (CR)</h3>
                                <div className="grid grid-cols-[80px_1fr] gap-1">
                                  <span className="text-slate-500 font-semibold">Account Code:</span><span className="font-bold">{form.salesAccountNo || "N/A"}</span>
                                  <span className="text-slate-500 font-semibold">Account Name:</span><span className="font-bold">{form.salesAccountName || "N/A"}</span>
                                  <span className="text-slate-500 font-semibold">Company:</span><span className="font-bold">{form.salesCompanyName || "N/A"}</span>
                                </div>
                              </div>
                              <div className="border border-slate-300 p-3 rounded">
                                <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800 text-[10px]">Customer Account (DR)</h3>
                                <div className="grid grid-cols-[80px_1fr] gap-1">
                                  <span className="text-slate-500 font-semibold">Account Code:</span><span className="font-bold">{form.customerAccountNo || "N/A"}</span>
                                  <span className="text-slate-500 font-semibold">Account Name:</span><span className="font-bold">{form.customerAccountName || "N/A"}</span>
                                  <span className="text-slate-500 font-semibold">Company:</span><span className="font-bold">{form.salesCompanyName || "N/A"}</span>
                                </div>
                              </div>
                            </div>
                            <div className="grid gap-0 border-t border-slate-200 bg-white text-[10px] font-semibold text-slate-700 md:grid-cols-4">
                              <div className="border-b border-slate-200 p-3 md:border-b-0 md:border-r"><span className="block text-[8px] uppercase tracking-wider text-slate-400">Country</span>{form.branchCountry || form.origin || "N/A"}</div>
                              <div className="border-b border-slate-200 p-3 md:border-b-0 md:border-r"><span className="block text-[8px] uppercase tracking-wider text-slate-400">Branch</span>{form.branchName || "N/A"}</div>
                              <div className="border-b border-slate-200 p-3 md:border-b-0 md:border-r"><span className="block text-[8px] uppercase tracking-wider text-slate-400">Branch Code</span>{form.branchCode || "N/A"}</div>
                              <div className="p-3"><span className="block text-[8px] uppercase tracking-wider text-slate-400">Currency</span>{form.salesCurrency || form.currencyType || "N/A"}</div>
                            </div>
                          
                          <div className="mb-6">
                            <h3 className="font-black text-[10px] border-b border-slate-800 pb-1 mb-2 uppercase text-slate-800 flex items-center gap-2">
                              <Package className="h-3.5 w-3.5" /> Goods Details
                            </h3>
                            <table className="w-full text-[10px] text-left border border-slate-300">
                              <thead className="bg-slate-100 border-b border-slate-300">
                                <tr>
                                  <th className="p-1.5 font-bold uppercase border-r border-slate-300">Goods</th>
                                  <th className="p-1.5 font-bold uppercase border-r border-slate-300">Brand</th>
                                  <th className="p-1.5 font-bold uppercase border-r border-slate-300">Origin</th>
                                  <th className="p-1.5 text-right font-bold uppercase border-r border-slate-300">Qty</th>
                                  <th className="p-1.5 text-right font-bold uppercase border-r border-slate-300">G.Wt</th>
                                  <th className="p-1.5 text-right font-bold uppercase border-r border-slate-300">N.Wt</th>
                                  <th className="p-1.5 text-right font-bold uppercase border-r border-slate-300">Rate</th>
                                  <th className="p-1.5 text-right font-bold uppercase border-r border-slate-300">Amount ({form.currencyType || "USD"})</th>
                                  <th className="p-1.5 text-right font-bold uppercase text-emerald-800">Final ({form.secondaryCurrency || "PKR"})</th>
                                </tr>
                              </thead>
                              <tbody>
                                {goodsEntries.map((row, idx) => (
                                  <tr key={idx} className="border-b border-slate-200">
                                    <td className="p-1.5 font-bold border-r border-slate-300">{row.goodsName}</td>
                                    <td className="p-1.5 border-r border-slate-300">{row.brand}</td>
                                    <td className="p-1.5 border-r border-slate-300">{row.origin}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300 font-mono font-bold">{row.qtyNo.toLocaleString()} {row.qtyName}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300 font-mono">{row.grossWeight.toFixed(2)}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300 font-mono font-bold">{row.netWeight.toFixed(2)}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300 font-mono">{row.coursePrice.toFixed(2)}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300 font-mono font-bold text-slate-700">{row.totalAmount.toLocaleString()}</td>
                                    <td className="p-1.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50">
                                      {row.finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                                {goodsEntries.length > 0 && (
                                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                                    <td colSpan={3} className="p-1.5 text-right border-r border-slate-300">TOTALS:</td>
                                    <td className="p-1.5 text-right border-r border-slate-300">{reportTotals.totalQty.toLocaleString()} {goodsEntries[0]?.qtyName || ""}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300">{reportTotals.totalGross.toFixed(2)}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300">{reportTotals.totalNet.toFixed(2)}</td>
                                    <td className="p-1.5 text-right border-r border-slate-300 bg-slate-200">-</td>
                                    <td className="p-1.5 text-right border-r border-slate-300 text-slate-800">{reportTotals.grandPrimaryFinal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-1.5 text-right text-emerald-800 bg-emerald-100">{reportTotals.grandFinal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Account Verification & Transfer Info */}
                  <div className="mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Ledger Routing Details</h4>
                    <div className="space-y-3 text-[9px]">
                      <div className="bg-slate-50 border border-slate-200 rounded p-3">
                        <div className="flex justify-between items-center mb-1"><span className="font-bold text-rose-700 uppercase text-[8px] bg-rose-100 px-1.5 py-0.5 rounded">Customer Account (DR)</span> <span className="text-slate-600 font-mono text-[8px]">{form.customerAccountNo || "N/A"}</span></div>
                        <div className="font-bold text-slate-900 mb-1 truncate text-[10px]" title={form.customerAccountName}>{form.customerAccountName || "N/A"}</div>
                        <div className="flex justify-between items-center text-[8px] text-slate-500 mb-0.5">
                          <span>Branch: <strong className="text-slate-700">{form.customerAccountBranch || "-"}</strong></span>
                          <span>Country: <strong className="text-slate-700">{form.origin || "-"}</strong></span>
                        </div>
                        <div className="flex justify-between items-center text-[8px] text-slate-500 mb-3">
                          <span>Currency: <strong className="text-slate-700">{form.salesCurrency || form.customerAccountCurrency || "-"}</strong></span>
                          <span>Contact: <strong className="text-slate-700">{form.customerAccountMobile || form.customerAccountWhatsapp || "-"}</strong></span>
                        </div>

                        <div className="flex justify-between items-center mb-1 border-t border-slate-200 pt-3"><span className="font-bold text-emerald-700 uppercase text-[8px] bg-emerald-100 px-1.5 py-0.5 rounded">Sales Account (CR)</span> <span className="text-slate-600 font-mono text-[8px]">{form.salesAccountNo || "N/A"}</span></div>
                        <div className="font-bold text-slate-900 mb-1 truncate text-[10px]" title={form.salesAccountName}>{form.salesAccountName || "N/A"}</div>
                        <div className="flex justify-between items-center text-[8px] text-slate-500 mb-0.5">
                          <span>Branch: <strong className="text-slate-700">{form.salesAccountBranch || "-"}</strong></span>
                          <span>Country: <strong className="text-slate-700">{form.branchCountry || "-"}</strong></span>
                        </div>
                        <div className="flex justify-between items-center text-[8px] text-slate-500 mb-2">
                          <span>Currency: <strong className="text-slate-700">{form.salesAccountCurrency || "-"}</strong></span>
                          <span>Contact: <strong className="text-slate-700">{form.salesAccountMobile || form.salesAccountWhatsapp || "-"}</strong></span>
                        </div>

                        <div className="border-t border-slate-200 pt-3 mt-3 space-y-1.5">
                          <div className="flex justify-between items-center"><span className="text-slate-500 font-bold uppercase text-[8px]">Transfer Date:</span> <span className="font-bold text-slate-900 font-mono">{form.salesDate}</span></div>
                          <div className="flex justify-between items-center"><span className="text-slate-500 font-bold uppercase text-[8px]">Transferred To:</span> <span className="font-black text-blue-600 uppercase">Customer Accounts</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">User & Session Information</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2 text-[9px]">
                      <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[8px]">User ID:</span> <span className="font-semibold text-slate-900 font-mono">{form.userId || "USR-1001"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[8px]">User Name:</span> <span className="font-bold text-slate-900 uppercase">{form.userName || "ADMIN"}</span></div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-0.5"><span className="text-slate-500 font-bold uppercase text-[8px]">Team Name:</span> <span className="font-semibold text-slate-900">Logistics & Operations</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[8px]">Team Code:</span> <span className="font-semibold text-slate-900 font-mono">TR-LOG</span></div>
                    </div>
                  </div>

                  {/* Remarks Input */}
                  <div className="mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 block border-b border-slate-100 pb-1">Remarks (Report)</span>
                    <textarea
                      value={form.orderReportRemarks}
                      onChange={(e) => handleTextChange("orderReportRemarks", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 outline-none focus:border-blue-500 resize-none h-20 text-[9px] font-semibold"
                      placeholder="Type verification or audit remarks here..."
                    />
                  </div>

                  {/* Saved Reports */}
                  {reportsList.length > 0 && (
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Saved Reports</h4>
                      <div className="space-y-2 mb-4">
                        {reportsList.map((report) => (
                          <div key={report.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-[9px]">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-800">{report.name}</span>
                              <button type="button" onClick={() => handleDeleteReport(report.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            {report.description && <p className="text-slate-600 mb-1 font-semibold">{report.description}</p>}
                            <p className="text-slate-500 font-mono text-[8px]">{formatShortDate(report.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
        </div>
      )}

      {previewModalOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Printer className="h-4 w-4 text-blue-600" /> Print Preview
              </h2>
              <div className="flex items-center gap-3">
                <Button type="button" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-xs font-bold rounded shadow transition-all">Print Document</Button>
                <Button type="button" variant="outline" onClick={() => setPreviewModalOpen(false)} className="h-8 px-4 text-xs font-bold hover:bg-slate-100">Close</Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 flex justify-center custom-scrollbar">
              <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl border border-slate-200 p-8 transform scale-[0.9] origin-top print:scale-100 print:shadow-none print:m-0 print:border-none print:p-0">

                {/* Header */}
                <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                  <h1 className="text-2xl font-black uppercase text-slate-900 tracking-widest">Sales Booking Order</h1>
                  <div className="flex justify-between items-end mt-4 text-xs font-bold text-slate-700">
                    <div className="text-left">
                      <p>Booking Date: {form.salesDate}</p>
                      <p>Branch: {form.branchName} ({form.branchCode})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">PO No: {form.salesOrderNo}</p>
                      <p>Contract No: {form.salesContractNo || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-[10px]">
                  <div className="border border-slate-300 p-3 rounded">
                    <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800">Customer Account (DR)</h3>
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                      <span className="text-slate-500 font-semibold">Account Code:</span><span className="font-bold">{form.customerAccountNo || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Account Name:</span><span className="font-bold">{form.customerAccountName || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Company:</span><span className="font-bold">{form.salesCompanyName || "N/A"}</span>
                    </div>
                  </div>
                  <div className="border border-slate-300 p-3 rounded">
                    <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800">Sales Account (CR)</h3>
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                      <span className="text-slate-500 font-semibold">Account Code:</span><span className="font-bold">{form.salesAccountNo || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Account Name:</span><span className="font-bold">{form.salesAccountName || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Company:</span><span className="font-bold">{form.salesCompanyName || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Goods Table */}
                <div className="mb-6">
                  <h3 className="font-black text-xs border-b-2 border-slate-400 pb-1 mb-2 uppercase text-slate-800">Goods Details</h3>
                  <table className="w-full text-[9px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="border-r border-slate-300 p-1.5 text-left">#</th>
                        <th className="border-r border-slate-300 p-1.5 text-left">Goods Name</th>
                        <th className="border-r border-slate-300 p-1.5 text-center">HS Code</th>
                        <th className="border-r border-slate-300 p-1.5 text-center">Origin</th>
                        <th className="border-r border-slate-300 p-1.5 text-right">Qty</th>
                        <th className="border-r border-slate-300 p-1.5 text-center">Unit</th>
                        <th className="border-r border-slate-300 p-1.5 text-right">Price ({form.currencyType || "USD"})</th>
                        <th className="border-r border-slate-300 p-1.5 text-center">Ex. Rate</th>
                        <th className="p-1.5 text-right">Final ({form.secondaryCurrency || "PKR"})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goodsEntries.length === 0 ? (
                        <tr><td colSpan={9} className="p-3 text-center italic text-slate-500">No goods entries.</td></tr>
                      ) : (
                        goodsEntries.map((g, i) => (
                          <tr key={i} className="border-b border-slate-200">
                            <td className="border-r border-slate-200 p-1.5 text-center">{i + 1}</td>
                            <td className="border-r border-slate-200 p-1.5 font-bold">{g.goodsName} {g.brand ? `(${g.brand})` : ""}</td>
                            <td className="border-r border-slate-200 p-1.5 text-center">{g.hsCode}</td>
                            <td className="border-r border-slate-200 p-1.5 text-center">{g.origin}</td>
                            <td className="border-r border-slate-200 p-1.5 text-right font-bold">{g.qtyNo.toLocaleString()}</td>
                            <td className="border-r border-slate-200 p-1.5 text-center">{g.qtyName}</td>
                            <td className="border-r border-slate-200 p-1.5 text-right">{g.coursePrice}</td>
                            <td className="border-r border-slate-200 p-1.5 text-center">{g.exchangeRate}</td>
                            <td className="p-1.5 text-right font-bold">{g.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                        <td colSpan={4} className="p-1.5 text-right">Total:</td>
                        <td className="border-r border-slate-200 p-1.5 text-right">{reportTotals.totalQty.toLocaleString()}</td>
                        <td colSpan={3} className="border-r border-slate-200 p-1.5 text-right text-[8px] text-slate-500 uppercase">Grand Total:</td>
                        <td className="p-1.5 text-right">{form.secondaryCurrency || "PKR"} {reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Loading Details */}
                <div className="mb-4 border border-slate-300 rounded p-3 text-[10px]">
                  <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800">Loading & Transit Report</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-slate-500 font-semibold">Shipping Mode:</span><span className="font-bold">{form.shippingMode || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Origin Country:</span><span className="font-bold">{form.origin || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Loading Port/Border:</span><span className="font-bold">{form.loadingPort || form.loadingBorder || form.airportName || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Loading Date:</span><span className="font-bold">{form.loadingDate || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <span className="text-slate-500 font-semibold">Transit Country:</span><span className="font-bold">{form.transitCountry || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Destination Country:</span><span className="font-bold">{form.receivedCountry || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Received Port/Border:</span><span className="font-bold">{form.receivedPort || form.receivedBorder || form.receivedPortName || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Received Date:</span><span className="font-bold">{form.receivedDate || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Condition */}
                <div className="mb-4 border border-slate-300 rounded p-3 text-[10px]">
                  <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800">Payment Conditions Report</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-[120px_1fr] gap-1">
                      <span className="text-slate-500 font-semibold">Payment Term:</span><span className="font-bold">{form.paymentType || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Advance (%):</span><span className="font-bold">{form.advancePercent || 0}%</span>
                      <span className="text-slate-500 font-semibold">Advance Payment Date:</span><span className="font-bold">{form.advancePaymentDate || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-1">
                      <span className="text-slate-500 font-semibold">Invoice Terms:</span><span className="font-bold">{form.invoicePayment || "N/A"}</span>
                      <span className="text-slate-500 font-semibold">Remaining (%):</span><span className="font-bold">{100 - (form.advancePercent || 0)}%</span>
                      <span className="text-slate-500 font-semibold">Final Payment Date:</span><span className="font-bold">{form.paymentDate || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Remarks & Narration */}
                {form.remarks && (
                  <div className="mb-4 border border-slate-300 rounded p-3 text-[10px]">
                    <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800">Remarks & Narration</h3>
                    <p className="whitespace-pre-wrap font-medium text-slate-800">{form.remarks}</p>
                  </div>
                )}

                {/* User Remarks (Report) */}
                {form.orderReportRemarks && (
                  <div className="mb-4 border border-slate-300 rounded p-3 text-[10px]">
                    <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800">User Remarks (Report)</h3>
                    <p className="whitespace-pre-wrap font-medium text-slate-800">{form.orderReportRemarks}</p>
                  </div>
                )}

                {/* Dynamic Reports */}
                {reportsList.length > 0 && (
                  <div className="mb-4 border border-slate-300 rounded p-3 text-[10px]">
                    <h3 className="font-black border-b border-slate-200 pb-1 mb-2 uppercase text-slate-800">Dynamic Reports & Notes</h3>
                    <div className="space-y-3">
                      {reportsList.map((r, i) => (
                        <div key={r.id}>
                          <h4 className="font-bold text-slate-900 underline underline-offset-2 mb-1">{r.name}</h4>
                          <p className="whitespace-pre-wrap text-slate-800">{r.notes || r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div className="mt-16 grid grid-cols-3 gap-8 text-center text-[10px] font-bold">
                  <div>
                    <div className="border-t border-slate-400 pt-1">Prepared By</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-1">Checked By</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-1">Authorized Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ NEW COUNTRY MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {newCountryModal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">Add New Country</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">ISO codes and emails are auto-generated</p>
              </div>
              <button
                type="button"
                onClick={() => { setNewCountryModal(false); setNewCountryError(""); setNewCountryForm({ name: "" }); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none font-bold"
              >Ã¢Å“â€¢</button>
            </div>
            <div className="p-5 space-y-3">
              {newCountryError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-[10px] rounded px-3 py-2">{newCountryError}</div>
              )}
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Country Name *</label>
                <input
                  type="text"
                  value={newCountryForm.name}
                  onChange={(e) => setNewCountryForm({ name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddNewCountry(); }}
                  placeholder="e.g. Iran"
                  autoFocus
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                />
              </div>
              <p className="text-[9px] text-muted-foreground/60">ISO-2, ISO-3, currency code and system emails will be auto-generated. You can update them later in Location Setup.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button
                type="button"
                onClick={() => { setNewCountryModal(false); setNewCountryError(""); setNewCountryForm({ name: "" }); }}
                className="px-4 py-1.5 text-[11px] rounded border border-input text-muted-foreground hover:text-foreground transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={handleAddNewCountry}
                disabled={newCountryLoading}
                className="px-4 py-1.5 text-[11px] rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >{newCountryLoading ? "SavingÃ¢â‚¬Â¦" : "Save Country"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ NEW GOOD MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {newGoodModal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">Add New Good</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Creates a new item in the Goods Master</p>
              </div>
              <button
                type="button"
                onClick={() => { setNewGoodModal(false); setNewGoodError(""); setNewGoodForm({ goodsName: "", chsCode: "" }); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none font-bold"
              >Ã¢Å“â€¢</button>
            </div>
            <div className="p-5 space-y-3">
              {newGoodError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-[10px] rounded px-3 py-2">{newGoodError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-muted-foreground mb-1">Goods Name *</label>
                  <input
                    type="text"
                    value={newGoodForm.goodsName}
                    onChange={(e) => setNewGoodForm(p => ({ ...p, goodsName: e.target.value.toUpperCase() }))}
                    placeholder="e.g. PINE NUTS INSHELL"
                    className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">HS Code *</label>
                  <input
                    type="text"
                    value={newGoodForm.chsCode}
                    onChange={(e) => setNewGoodForm(p => ({ ...p, chsCode: e.target.value }))}
                    placeholder="0802.90"
                    className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground/60">After saving, this good will be auto-selected with HS Code pre-filled.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button
                type="button"
                onClick={() => { setNewGoodModal(false); setNewGoodError(""); setNewGoodForm({ goodsName: "", chsCode: "" }); }}
                className="px-4 py-1.5 text-[11px] rounded border border-input text-muted-foreground hover:text-foreground transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={handleAddNewGood}
                disabled={newGoodLoading}
                className="px-4 py-1.5 text-[11px] rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >{newGoodLoading ? "SavingÃ¢â‚¬Â¦" : "Save Good"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ NEW PORT / BORDER / AIRPORT MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {newPortModal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
                  Add New {newPortForm.transportType === "sea" ? "Port" : newPortForm.transportType === "road" ? "Border" : "Airport"}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Adding to {newPortForm.side === "loading" ? "Loading" : "Received"} registry
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setNewPortModal(false); setNewPortError(""); setNewPortForm(p => ({ ...p, portName: "" })); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none font-bold"
              >Ã¢Å“â€¢</button>
            </div>
            <div className="p-5 space-y-3">
              {newPortError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-[10px] rounded px-3 py-2">{newPortError}</div>
              )}
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Country Name *</label>
                <select
                  value={newPortForm.countryName || ""}
                  onChange={(e) => setNewPortForm(p => ({ ...p, countryName: e.target.value }))}
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                >
                  <option value="">Select Country...</option>
                  {transitCountryOptions.map(c => <option key={c.name || c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">
                  {newPortForm.transportType === "sea" ? "Port" : newPortForm.transportType === "road" ? "Border" : "Airport"} Name *
                </label>
                <input
                  type="text"
                  value={newPortForm.portName}
                  onChange={(e) => setNewPortForm(p => ({ ...p, portName: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPortForm.portName.trim()) {
                      handleCreatePort(newPortForm.portName.trim(), newPortForm.countryName, newPortForm.transportType, newPortForm.side);
                      setNewPortModal(false);
                    }
                  }}
                  placeholder={`e.g. ${newPortForm.transportType === "sea" ? "Karachi Port" : newPortForm.transportType === "road" ? "Torkham" : "Kabul Airport"}`}
                  autoFocus
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button
                type="button"
                onClick={() => { setNewPortModal(false); setNewPortError(""); setNewPortForm(p => ({ ...p, portName: "" })); }}
                className="px-4 py-1.5 text-[11px] rounded border border-input text-muted-foreground hover:text-foreground transition-colors"
              >Cancel</button>
              <button
                type="button"
                disabled={!newPortForm.portName.trim()}
                onClick={() => {
                  if (newPortForm.portName.trim()) {
                    handleCreatePort(newPortForm.portName.trim(), newPortForm.countryName, newPortForm.transportType, newPortForm.side);
                    setNewPortModal(false);
                  }
                }}
                className="px-4 py-1.5 text-[11px] rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ NEW GOOD VARIATION MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {customVariationModal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
                  Add Good Variation
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Specify size/brand under selected good
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomVariationModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none font-bold"
              >Ã¢Å“â€¢</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Goods Name</label>
                <input
                  type="text"
                  value={customVariationForm.goodsName}
                  disabled
                  className="w-full bg-muted border border-input rounded px-3 py-1.5 text-muted-foreground text-[11px] outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Brand Name *</label>
                <input
                  type="text"
                  value={customVariationForm.brand}
                  onChange={(e) => setCustomVariationForm(p => ({ ...p, brand: e.target.value.toUpperCase() }))}
                  placeholder="e.g. PREMIUM"
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Size Specification *</label>
                <input
                  type="text"
                  value={customVariationForm.size}
                  onChange={(e) => setCustomVariationForm(p => ({ ...p, size: e.target.value.toUpperCase() }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveCustomVariation();
                    }
                  }}
                  placeholder="e.g. 20/22"
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary uppercase"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button
                type="button"
                onClick={() => setCustomVariationModal(false)}
                className="px-4 py-1.5 text-[11px] rounded border border-input text-muted-foreground hover:text-foreground transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={handleSaveCustomVariation}
                className="px-4 py-1.5 text-[11px] rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ CREATE NEW ACCOUNT MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {createAccountModalOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Create New {createAccountType === "purchase" ? "Supplier Account" : "Customer Account"}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Scope: {form.cityBranchId ? "City Branch" : form.countryBranchId ? "Main Branch" : form.countryId ? "Country Scope" : "Super Admin"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateAccountModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none font-bold"
              >Ã¢Å“â€¢</button>
            </div>
            <div className="p-5 space-y-3">
              {createAccountError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-[10px] rounded px-3 py-2">
                  {createAccountError}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Account Name *</label>
                <input
                  type="text"
                  value={createAccountForm.name}
                  onChange={(e) => setCreateAccountForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Haji Ahmad Dry Fruits"
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Account Code *</label>
                  <input
                    type="text"
                    value={createAccountForm.code}
                    onChange={(e) => setCreateAccountForm(p => ({ ...p, code: e.target.value }))}
                    placeholder="AUTO"
                    className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Currency *</label>
                  <select
                    value={createAccountForm.currency}
                    onChange={(e) => setCreateAccountForm(p => ({ ...p, currency: e.target.value }))}
                    className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Account Category *</label>
                  <select
                    value={createAccountForm.kind}
                    onChange={(e) => setCreateAccountForm(p => ({ ...p, kind: e.target.value }))}
                    className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                  >
                    <option value="liability">Liability</option>
                    <option value="asset">Asset</option>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="equity">Equity</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createAccountForm.isControlAccount}
                      onChange={(e) => setCreateAccountForm(p => ({ ...p, isControlAccount: e.target.checked }))}
                      className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    Control Account
                  </label>
                </div>
              </div>

              <p className="text-[9px] text-muted-foreground/60">
                This account will be created under the selected country and branch scoping, and auto-selected.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button
                type="button"
                onClick={() => setCreateAccountModalOpen(false)}
                className="px-4 py-1.5 text-[11px] rounded border border-input text-muted-foreground hover:text-foreground transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={handleAddNewAccount}
                disabled={createAccountLoading}
                className="px-4 py-1.5 text-[11px] rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {createAccountLoading ? "SavingÃ¢â‚¬Â¦" : "Save Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Report Modal */}
      {isNewReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/30">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Create New Report
              </h3>
              <button
                type="button"
                onClick={() => setIsNewReportModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleNewReportSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Report Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newReportForm.name}
                  onChange={(e) => setNewReportForm({ ...newReportForm, name: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="e.g. Loading Report, Shipping Report"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Description</label>
                <input
                  type="text"
                  value={newReportForm.description}
                  onChange={(e) => setNewReportForm({ ...newReportForm, description: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Notes</label>
                <textarea
                  rows={3}
                  value={newReportForm.notes}
                  onChange={(e) => setNewReportForm({ ...newReportForm, notes: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Additional notes for this report"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewReportModalOpen(false)}
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 bg-primary hover:bg-primary/90 font-bold"
                >
                  Create & Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ CREATE NEW COMPANY MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {createCompanyModalOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Create New Company
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Adding to Company Master Settings registry
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateCompanyModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none font-bold"
              >Ã¢Å“â€¢</button>
            </div>
            <div className="p-5 space-y-3">
              {createCompanyError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-[10px] rounded px-3 py-2">
                  {createCompanyError}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Company Name *</label>
                <input
                  type="text"
                  value={createCompanyForm.name}
                  onChange={(e) => setCreateCompanyForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Apex Trading LLC"
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Legal Name</label>
                <input
                  type="text"
                  value={createCompanyForm.legalName}
                  onChange={(e) => setCreateCompanyForm(p => ({ ...p, legalName: e.target.value }))}
                  placeholder="e.g. Apex Imports (Optional)"
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Base Currency *</label>
                <select
                  value={createCompanyForm.baseCurrency}
                  onChange={(e) => setCreateCompanyForm(p => ({ ...p, baseCurrency: e.target.value }))}
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <p className="text-[9px] text-muted-foreground/60">
                This company will be saved to the master company registry and auto-selected for the current account.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button
                type="button"
                onClick={() => setCreateCompanyModalOpen(false)}
                className="px-4 py-1.5 text-[11px] rounded border border-input text-muted-foreground hover:text-foreground transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={handleAddNewCompany}
                disabled={createCompanyLoading}
                className="px-4 py-1.5 text-[11px] rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {createCompanyLoading ? "SavingÃ¢â‚¬Â¦" : "Save Company"}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ TRANSFER CONFIRMATION MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {transferConfirmModal && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="bg-blue-900 text-white p-4 flex items-center justify-between border-b border-blue-800">
              <h2 className="font-black tracking-wider uppercase text-sm flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-blue-300" /> Transfer to Payment Module
              </h2>
              <button type="button" onClick={() => setTransferConfirmModal(false)} className="text-blue-300 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-800 bg-slate-50/50">
              <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                <CheckSquare className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
                <p className="font-semibold leading-relaxed">
                  You are about to transfer this Sales Booking to the <strong>Purchase Transfer Payment</strong> module.
                  <br/><br/>
                  <em>Note: No accounting entries (Roznamcha, Ledger) will be posted at this stage. Entries will only be posted when the payment is officially processed.</em>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded p-2.5 bg-white shadow-sm flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Invoice No</span>
                  <div className="font-black font-mono text-slate-900">{form.salesOrderNo}</div>
                </div>
                <div className="border border-slate-200 rounded p-2.5 bg-white shadow-sm flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Base Entry No</span>
                  <div className="font-black font-mono text-slate-900">{savedOrderNo || "Pending..."}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 border-t border-slate-200 p-4 flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" className="font-bold border-slate-300 text-slate-600" onClick={() => setTransferConfirmModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 shadow-md transition-all uppercase tracking-wider"
                disabled={savingOrder}
                onClick={() => {
                  setTransferConfirmModal(false);
                  handleTransfer();
                }}
              >
                {savingOrder ? "Processing..." : "Confirm & Transfer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LOT DETAILS MODAL ("Parda") */}
      {isLotModalOpen && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-border overflow-hidden w-full max-w-md animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-sky-400" />
                {form.saleSource === "in_transit" ? "Transit Cargo Details" : "Lot Details"}
              </h3>
              <button
                type="button"
                onClick={() => setIsLotModalOpen(false)}
                className="text-white/60 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs">
              {(() => {
                const lot = MOCK_SALE_LOTS.find((l) => l.lotNo === selectedLotId);
                if (!lot) return <p className="text-muted-foreground italic">No lot selected.</p>;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Lot Number</span>
                        <span className="font-mono font-black text-primary text-sm">{lot.lotNo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Reference Number</span>
                        <span className="font-mono font-bold text-slate-700">{lot.stockRef}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Goods Name:</span>
                        <span className="font-bold text-slate-900">{lot.goodsName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Brand:</span>
                        <span className="font-semibold text-slate-900">{lot.brand}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Size:</span>
                        <span className="font-semibold text-slate-900">{lot.size}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Origin:</span>
                        <span className="font-semibold text-slate-900">{lot.origin}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Available Quantity:</span>
                        <span className="font-black text-emerald-600">{Number(lot.availableQty).toLocaleString()} {lot.qtyName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">Net Weight:</span>
                        <span className="font-bold text-slate-900">{Number(lot.netWeight).toLocaleString()} KG</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-medium">Price:</span>
                        <span className="font-bold text-slate-950">{lot.currencyType} {lot.coursePrice}</span>
                      </div>
                    </div>

                    <div className="bg-sky-50 text-sky-900 p-3 rounded-lg border border-sky-100 flex items-start gap-2.5 mt-2">
                      <input
                        type="checkbox"
                        id="confirm-lot-chk"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                        defaultChecked
                      />
                      <label htmlFor="confirm-lot-chk" className="font-bold text-[10px] leading-tight cursor-pointer">
                        Confirm selection of this cargo lot to apply details to the goods entry form.
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 font-bold"
                        onClick={() => setIsLotModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 shadow-md"
                        onClick={() => {
                          applySaleLot(lot);
                          setIsLotModalOpen(false);
                        }}
                      >
                        Save & Apply
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}







