"use client";
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
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
  Save
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "@/features/customers/components/customer-picker";
import { CompanyPicker } from "@/features/companies/components/company-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { openTradeDocumentWindow } from "@/lib/reports/open-trade-document-window";
import { openPurchaseA4ReportWindow } from "@/lib/reports/open-purchase-a4-report-window";
import { PurchaseBookingJournalReportView } from "./purchase-booking-journal-report-view";

// ── Non-location constants (static values, not from master forms) ─────────────
const CURRENCY_OPTIONS = ["USD", "AED", "PKR", "AFN", "INR"];
const PAYMENT_TYPES = ["Advance Payment", "Invoice", "Final Payment", "Credit"];
const LOADING_TYPES = ["By Sea", "By Road", "By Air"];
const CONTAINER_TYPES = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "Non Reefer"];
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
// NOTE: COUNTRY_OPTIONS and ORIGIN_OPTIONS removed — countries now come from Location Master.

const MOCK_ACCOUNTS = [
  { accountCode: "AE-AC-0001", accountName: "Dubai Purchase Account", cityBranchName: "Dubai Main Branch", ledgerCurrency: "AED" },
  { accountCode: "SA-2001", accountName: "Damaan Sales Account", cityBranchName: "Dubai Sales Branch", ledgerCurrency: "AED" },
  { accountCode: "US-AC-1002", accountName: "US Vendor Ledger Account", cityBranchName: "New York Branch", ledgerCurrency: "USD" },
  { accountCode: "PK-AC-3001", accountName: "Kharadar Purchase Account", cityBranchName: "Karachi Central Branch", ledgerCurrency: "PKR" },
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

async function lookupPurchaseBookingReport(query, countryId, countryBranchId, cityBranchId, isSuperAdmin) {
  const needle = String(query || "").trim();
  if (!needle) return null;

  const params = new URLSearchParams();
  params.set("purchaseOrderNo", needle);
  params.set("limit", "1");
  if (!isSuperAdmin) {
    if (countryId) params.set("countryId", countryId);
    if (countryBranchId) params.set("countryBranchId", countryBranchId);
    if (cityBranchId) params.set("cityBranchId", cityBranchId);
  }

  const response = await fetch(`/api/erp/purchases/booking-journal-report?${params.toString()}`, {
    credentials: "same-origin"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload?.error?.message || payload?.error || "Purchase booking lookup failed.");
  }
  return payload.data?.reports?.[0] ?? null;
}

const DEFAULT_FORM = {
  countryId: "",
  countryBranchId: "",
  cityBranchId: "",
  purchaseAccountNo: "",
  purchaseAccountName: "",
  purchaseAccountBranch: "",
  purchaseAccountCurrency: "",
  purchaseAccountKind: "",
  purchaseAccountIsControl: false,
  purchaseAccountCurrentBalance: 0,
  purchaseAccountOpeningBalance: 0,
  purchaseAccountStatus: "active",
  purchaseAccountSerialNumber: "",
  purchaseAccountCountrySerialNumber: "",
  purchaseAccountBranchSerialNumber: "",
  purchaseAccountManualReferenceNumber: "",
  purchaseAccountMobile: "",
  purchaseAccountWhatsapp: "",
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
  purchaseContractNo: "",
  purchaseOrderNo: "",
  billNo: "",
  purchaseContact: "+93 700 000 000",
  purchaseDate: new Date().toISOString().slice(0, 10),
  currencyType: "USD",
  purchaseCurrency: "USD",
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
  supplierId: "",
  supplierName: "",
  customerId: "",
  customerName: "",
  salesStatus: "Draft",
  remarks: "",
  orderReportRemarks: "",
  purchaseReportRemarks: "",
  purchaseInvoiceRemarks: "",
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

  const grossWeight = qtyNo * qtyKgs;
  const totalEmptyDeduct = qtyNo * emptyKgs;
  const netWeight = Math.max(0, grossWeight - totalEmptyDeduct);
  
  // Amount in Purchase Currency (Original Amount)
  const originalAmount = (netWeight / divideWeight) * coursePrice;
  
  // Amount in Local Country Currency
  const localAmount = originalAmount * exchangeRate;

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
  if (c.includes("PKR")) return "₨";
  if (c.includes("AFN")) return "؋";
  if (c.includes("INR")) return "₹";
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

export function PurchaseOrderWizard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("booking"); // "booking" | "goods" | "others"
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [isTransferred, setIsTransferred] = useState(false);
  const [transferredData, setTransferredData] = useState(null);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [verifyDropdownOpen, setVerifyDropdownOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [showTransferScreen, setShowTransferScreen] = useState(false);
  const [previewType, setPreviewType] = useState("booking_report"); // "booking_report" | "contract" | "invoice"
  const [form, setForm] = useState(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return {
      ...DEFAULT_FORM,
      purchaseOrderNo: `PO-2026-${randomSuffix}`,
      salesOrderNo: `SO-2026-${randomSuffix}`,
      purchaseContractNo: `PC-2026-${randomSuffix}`,
      billNo: `BILL-${randomSuffix}`,
    };
  });
  const [goodsEntries, setGoodsEntries] = useState([]);
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
  

  const [portalElement, setPortalElement] = useState(null);
  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalElement(document.getElementById("navbar-portal-target"));
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
  const purchaseDropdownRef = React.useRef(null);
  const salesDropdownRef = React.useRef(null);
  const verifyDropdownRef = React.useRef(null);
  const purchaseCompanyDropdownRef = React.useRef(null);
  const salesCompanyDropdownRef = React.useRef(null);

  const [purchaseDropdownOpen, setPurchaseDropdownOpen] = useState(false);
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setViewDropdownOpen(false);
      }
      if (purchaseDropdownRef.current && !purchaseDropdownRef.current.contains(event.target)) {
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
      if (purchaseCompanyDropdownRef.current && !purchaseCompanyDropdownRef.current.contains(event.target)) {
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
  const [session, setSession] = useState(null);
  const [countries, setCountries] = useState([]);
  const [allCountries, setAllCountries] = useState([]); // unscoped — for transit pickers
  const [dbGoods, setDbGoods] = useState([]); // goods from master DB
  const [dbLoadingPorts, setDbLoadingPorts] = useState([]);
  const [dbReceivedPorts, setDbReceivedPorts] = useState([]);
  const [mainBranches, setMainBranches] = useState([]);
  const [cityBranches, setCityBranches] = useState([]);
  const [dbAccounts, setDbAccounts] = useState(MOCK_ACCOUNTS);

  const [supplierDetail, setSupplierDetail] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [purchasePinDropdownOpen, setPurchasePinDropdownOpen] = useState(false);
  const [salesPinDropdownOpen, setSalesPinDropdownOpen] = useState(false);
  const [purchaseCompanySelectOpen, setPurchaseCompanySelectOpen] = useState(false);
  const [salesCompanySelectOpen, setSalesCompanySelectOpen] = useState(false);
  const [dbCompanies, setDbCompanies] = useState([]);

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

      {/* Account Creation Modal */}States
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

  // Fetch session & countries on load
  useEffect(() => {
    let cancelled = false;
    async function initSession() {
      try {
        const response = await fetch("/api/erp/auth/session");
        const payload = await response.json();
        const sessionRes = payload?.data || payload;
        if (!cancelled && sessionRes) {
          setSession(sessionRes);
          setForm((prev) => ({
            ...prev,
            userName: sessionRes.user?.fullName || prev.userName,
            userId: sessionRes.user?.id || prev.userId
          }));
        }
      } catch (err) {
        console.error("Failed to load session:", err);
      }
    }
    async function initCountries() {
      try {
        const response = await fetch("/api/erp/locations/countries");
        const res = await response.json();
        const countriesData = res?.data?.countries || res?.countries;
        if (!cancelled && countriesData) {
          setCountries(countriesData);
          if (countriesData.length === 1) {
            setForm(prev => ({ ...prev, countryId: prev.countryId || countriesData[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load countries:", err);
      }
    }
    async function initAllCountries() {
      try {
        const response = await fetch("/api/erp/locations/countries?all=true&limit=500");
        const res = await response.json();
        const countriesData = res?.data?.countries || res?.countries;
        if (!cancelled && countriesData) {
          setAllCountries(countriesData);
        }
      } catch (err) {
        console.error("Failed to load all countries:", err);
      }
    }
    async function initGoods() {
      try {
        const response = await fetch("/api/erp/goods?limit=500");
        const res = await response.json();
        const goodsData = res?.data?.goods || res?.goods;
        if (!cancelled && goodsData) {
          setDbGoods(goodsData);
        }
      } catch (err) {
        console.error("Failed to load goods master:", err);
      }
    }
    async function initCompanies() {
      try {
        const response = await fetch("/api/erp/companies?limit=100");
        const res = await response.json();
        const companiesData = res?.data?.companies || res?.companies;
        if (!cancelled && companiesData) {
          setDbCompanies(companiesData);
        }
      } catch (err) {
        console.error("Failed to load companies:", err);
      }
    }
    async function initAccounts() {
      try {
        const response = await fetch("/api/erp/accounting/accounts?limit=500");
        const res = await response.json();
        if (!cancelled && res?.data?.accounts) {
          const mapped = res.data.accounts.map(acc => ({
            accountCode: acc.code || acc.account_number,
            accountName: acc.name,
            cityBranchName: acc.branch_code || "",
            ledgerCurrency: acc.currency || "USD",
            customerId: acc.customer_id || acc.customerId || null,
            companyId: acc.company_id || null,
            mobile: acc.customers?.mobile || "",
            whatsapp: acc.customers?.whatsapp || "",
            kind: acc.kind || "",
            isControlAccount: acc.is_control_account || false,
            currentBalance: acc.current_balance || 0,
            openingBalance: acc.opening_balance || 0,
            status: acc.status || "active",
            accountSerialNumber: acc.account_serial_number || "",
            countrySerialNumber: acc.country_serial_number || "",
            branchSerialNumber: acc.branch_serial_number || "",
            manualReferenceNumber: acc.manual_reference_number || "",
            countryId: acc.country_id || null
          }));
          setDbAccounts(mapped);
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      }
    }
    async function initPorts() {
      try {
        const [loadRes, recRes] = await Promise.all([
          fetch("/api/erp/ports/loading?all=true&limit=500"),
          fetch("/api/erp/ports/received?all=true&limit=500")
        ]);
        const loadJson = await loadRes.json();
        const recJson = await recRes.json();
        const loadPorts = loadJson?.data?.ports || loadJson?.ports;
        const recPorts = recJson?.data?.ports || recJson?.ports;
        if (!cancelled && loadPorts) {
          setDbLoadingPorts(loadPorts);
        }
        if (!cancelled && recPorts) {
          setDbReceivedPorts(recPorts);
        }
      } catch (err) {
        console.error("Failed to load ports master data:", err);
      }
    }
    initSession();
    initCountries();
    initAllCountries();
    initGoods();
    initAccounts();
    initPorts();
    initCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch full details when supplierId changes
  useEffect(() => {
    if (!form.supplierId) {
      setSupplierDetail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/erp/customers/${form.supplierId}`)
      .then((r) => r.json())
      .then((json) => {
        const cust = json?.customer || json?.data;
        if (!cancelled && cust) {
          setSupplierDetail(cust);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [form.supplierId]);

  // Fetch full details when customerId changes
  useEffect(() => {
    if (!form.customerId) {
      setCustomerDetail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/erp/customers/${form.customerId}`)
      .then((r) => r.json())
      .then((json) => {
        const cust = json?.customer || json?.data;
        if (!cancelled && cust) {
          setCustomerDetail(cust);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [form.customerId]);

  const isSuperAdmin = session?.scopes?.isSuperAdmin ?? false;
  const isCountryAdmin = session?.scopes?.isCountryAdmin || session?.roles?.includes("country_admin") || (session?.scopes?.countryIds?.length > 0) || false;

  // Derived country options from master data (replaces old COUNTRY_OPTIONS hardcode)
  const masterCountryOptions = useMemo(() => countries, [countries]);

  // Transit pickers use all countries (unscoped)
  const transitCountryOptions = useMemo(() => allCountries.length > 0 ? allCountries : countries, [allCountries, countries]);

  // Port filtering by transport type and country
  const seaLoadingPorts = useMemo(() => {
    return dbLoadingPorts.filter(p => p.transport_type === "sea" && (!form.loadingCountry || !p.country?.name || p.country?.name === form.loadingCountry));
  }, [dbLoadingPorts, form.loadingCountry]);

  const seaReceivedPorts = useMemo(() => {
    return dbReceivedPorts.filter(p => p.transport_type === "sea" && (!form.receivedCountry || !p.country?.name || p.country?.name === form.receivedCountry));
  }, [dbReceivedPorts, form.receivedCountry]);

  const roadLoadingPorts = useMemo(() => {
    return dbLoadingPorts.filter(p => p.transport_type === "road" && (!form.loadingCountry || !p.country?.name || p.country?.name === form.loadingCountry));
  }, [dbLoadingPorts, form.loadingCountry]);

  const roadReceivedPorts = useMemo(() => {
    return dbReceivedPorts.filter(p => p.transport_type === "road" && (!form.receivedCountry || !p.country?.name || p.country?.name === form.receivedCountry));
  }, [dbReceivedPorts, form.receivedCountry]);

  const airLoadingPorts = useMemo(() => {
    return dbLoadingPorts.filter(p => p.transport_type === "air" && (!form.loadingCountry || !p.country?.name || p.country?.name === form.loadingCountry));
  }, [dbLoadingPorts, form.loadingCountry]);

  const airReceivedPorts = useMemo(() => {
    return dbReceivedPorts.filter(p => p.transport_type === "air" && (!form.receivedCountry || !p.country?.name || p.country?.name === form.receivedCountry));
  }, [dbReceivedPorts, form.receivedCountry]);

  const selectedDbGood = useMemo(() => dbGoods.find(g => g.goods_name === form.goodsName || g.goodsName === form.goodsName), [dbGoods, form.goodsName]);
  const availableSizes = useMemo(() => {
    const variations = selectedDbGood?.variations || selectedDbGood?.goods_variations || [];
    let filtered = variations;
    if (form.origin) {
      const originCountry = transitCountryOptions.find(c => c.name === form.origin);
      const originCountryId = originCountry?.id || null;
      filtered = variations.filter(v => v.origin_country_id === originCountryId);
    }
    const sizes = [...new Set(filtered.map(v => (v.size || "").trim().toUpperCase()).filter(Boolean))];
    return sizes.length > 0 ? sizes : SIZE_OPTIONS;
  }, [selectedDbGood, form.origin, transitCountryOptions]);
  const availableBrands = useMemo(() => {
    const variations = selectedDbGood?.variations || selectedDbGood?.goods_variations || [];
    let filtered = variations;
    if (form.origin) {
      const originCountry = transitCountryOptions.find(c => c.name === form.origin);
      const originCountryId = originCountry?.id || null;
      filtered = filtered.filter(v => v.origin_country_id === originCountryId);
    }
    if (form.size) {
      filtered = filtered.filter(v => (v.size || "").trim().toLowerCase() === (form.size || "").trim().toLowerCase());
    }
    const brands = [...new Set(filtered.map(v => (v.brand || "").trim().toUpperCase()).filter(Boolean))];
    return brands.length > 0 ? brands : BRAND_OPTIONS;
  }, [selectedDbGood, form.origin, form.size, transitCountryOptions]);

  // Load existing purchase order if purchaseOrderNo or id is in URL query parameters
  useEffect(() => {
    if (!session) return;
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const poNo = urlParams.get("purchaseOrderNo");
    const orderId = urlParams.get("id") || urlParams.get("purchaseOrderId");
    if (!poNo && !orderId) return;
    setIsFormOpen(true);

    let cancelled = false;

    async function loadPO() {
      setSavingOrder(true);
      setSaveMessage("Loading purchase order details...");
      try {
        let poData = null;
        if (orderId) {
          const res = await fetch(`/api/erp/purchases/orders/${encodeURIComponent(orderId)}`, {
            credentials: "same-origin"
          });
          const payload = await res.json().catch(() => ({}));
          if (res.ok && payload.ok) {
            poData = payload.data?.order ?? payload.order ?? null;
          } else {
            throw new Error(payload?.error?.message || payload?.error || "Failed to load purchase order by ID.");
          }
        } else if (poNo) {
          poData = await lookupPurchaseBookingReport(
            poNo,
            session.scopes?.countryIds?.[0] || null,
            session.scopes?.countryBranchIds?.[0] || null,
            session.scopes?.cityBranchIds?.[0] || null,
            isSuperAdmin
          );
        }

        if (cancelled) return;

        if (poData?.form_data?.totals) {
          // You might set reportTotals here if there's a state for it, but usually it's derived.
        }
        if (poData?.form_data?.reports) {
          setReportsList(Array.isArray(poData.form_data.reports) ? poData.form_data.reports : []);
        }

        if (poData) {
          const rawFormData = poData.form_data || {};
          const loadedForm = rawFormData.form || {};
          const loadedGoods = rawFormData.goodsEntries || [];

          const poNumber = poData.purchase_order_no || poData.purchaseBookingOrderNumber || loadedForm.purchaseOrderNo || poNo || "";
          const contractNumber = poData.purchase_contract_no || poData.purchaseContractNo || loadedForm.purchaseContractNo || "";

          setForm((prev) => ({
            ...prev,
            ...loadedForm,
            // Retain PO/Contract identification numbers
            purchaseOrderNo: poNumber,
            purchaseContractNo: contractNumber,
          }));

          // Sync search display labels from the loaded account names
          if (loadedForm.purchaseAccountName || loadedForm.purchaseAccountNo) {
            setPurchaseSearch(loadedForm.purchaseAccountName || loadedForm.purchaseAccountNo || "");
          }
          if (loadedForm.salesAccountName || loadedForm.salesAccountNo) {
            setSalesSearch(loadedForm.salesAccountName || loadedForm.salesAccountNo || "");
          }

          if (Array.isArray(loadedGoods) && loadedGoods.length) {
            setGoodsEntries(loadedGoods);
          }

          // Check and set transferred/posted status
          const orderIsTransferred = orderData.ledger_posting_status === "posted";
          setIsTransferred(orderIsTransferred);
          setTransferredData(orderIsTransferred ? {
            transferDate: orderData.created_at,
            audit: (orderData.form_data && orderData.form_data.transferAudit) ? orderData.form_data.transferAudit : null
          } : null);

          // Render the editing wizard directly at Step 1 (booking) for editing
          setActiveTab("booking");
          setSaveMessage("Purchase order loaded successfully.");
        } else {
          setSaveMessage(`Purchase order not found.`);
        }
      } catch (err) {
        if (cancelled) return;
        setSaveMessage(err instanceof Error ? err.message : "Error loading purchase order.");
      } finally {
        if (!cancelled) setSavingOrder(false);
      }
    }

    loadPO();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Set initial scope fields for scoped users
  useEffect(() => {
    if (!session) return;
    if (session.scopes?.isSuperAdmin) return;

    if (session.scopes?.countryIds?.length) {
      const cid = session.scopes.countryIds[0];
      setForm(prev => ({ ...prev, countryId: cid }));
    }
    if (session.scopes?.countryBranchIds?.length) {
      const bid = session.scopes.countryBranchIds[0];
      setForm(prev => ({ ...prev, countryBranchId: bid }));
    }
    if (session.scopes?.cityBranchIds?.length) {
      const cbid = session.scopes.cityBranchIds[0];
      setForm(prev => ({ ...prev, cityBranchId: cbid }));
    }
  }, [session]);

  // Load Main Branches (Country Branches) when countryId changes
  useEffect(() => {
    let cancelled = false;
    const countryId = form.countryId;
    if (!countryId) {
      setMainBranches([]);
      return;
    }
    async function loadCountryBranches() {
      try {
        const res = await fetch(`/api/branch-management/country-branches?countryId=${encodeURIComponent(countryId)}`).then(r => r.json());
        const list = Array.isArray(res?.countryBranches) ? res.countryBranches : [];
        if (!cancelled) {
          setMainBranches(list);
          if (list.length === 1 && !form.countryBranchId) {
            setForm(prev => ({ ...prev, countryBranchId: list[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load country branches:", err);
      }
    }
    loadCountryBranches();
    return () => {
      cancelled = true;
    };
  }, [form.countryId]);

  // Load City Branches when countryId or countryBranchId changes
  useEffect(() => {
    let cancelled = false;
    const countryId = form.countryId;
    const countryBranchId = form.countryBranchId;
    if (!countryId || !countryBranchId) {
      setCityBranches([]);
      return;
    }
    async function loadCityBranches() {
      try {
        const res = await fetch(`/api/branch-management/city-branches?countryId=${encodeURIComponent(countryId)}&countryBranchId=${encodeURIComponent(countryBranchId)}`).then(r => r.json());
        const list = Array.isArray(res?.cityBranches) ? res.cityBranches : [];
        if (!cancelled) {
          setCityBranches(list);
          if (list.length === 1 && !form.cityBranchId) {
            setForm(prev => ({ ...prev, cityBranchId: list[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load city branches:", err);
      }
    }
    loadCityBranches();
    return () => {
      cancelled = true;
    };
  }, [form.countryId, form.countryBranchId]);

  // Sync Branch Code and Name for Branch Serial display and generate formatted Bill No
  useEffect(() => {
    let selectedBranch = null;
    if (form.cityBranchId && cityBranches.length > 0) {
      selectedBranch = cityBranches.find(cb => cb.id === form.cityBranchId);
    } else if (form.countryBranchId && mainBranches.length > 0) {
      selectedBranch = mainBranches.find(b => b.id === form.countryBranchId);
    }
    
    if (selectedBranch) {
      const codeBase = selectedBranch.code || "BR";
      const suffix = form.purchaseOrderNo ? form.purchaseOrderNo.split("-").pop() : "0000";
      
      const parts = codeBase.split("-");
      let serialPrefix = codeBase;
      let cityCode = "CITY";
      if (parts.length >= 3) {
        serialPrefix = parts.slice(0, 2).join("-");
        cityCode = parts[1];
      } else if (parts.length === 2) {
        cityCode = parts[1];
      }
      
      const country = transitCountryOptions.find(c => String(c.id) === String(form.countryId));
      const countryPrefix = country ? (country.iso2 || country.name.substring(0, 2).toUpperCase()) : "CT";
      
      setForm(prev => {
        const newCode = `${serialPrefix}-${suffix}`;
        const newName = selectedBranch.name || selectedBranch.city_name || prev.branchName;
        const newBillNo = `${countryPrefix}-${cityCode}-${suffix}`;
        
        if (prev.branchCode === newCode && prev.branchName === newName && prev.billNo === newBillNo && prev.branchCountry === (country?.name || "")) return prev;
        return {
          ...prev,
          branchName: newName,
          branchCode: newCode,
          billNo: newBillNo,
          branchCountry: country ? country.name : ""
        };
      });
    } else {
      setForm(prev => {
        if (!prev.branchCode || prev.branchCode === "BR-KBL-001") {
          return {
            ...prev,
            branchName: "Branch Not Selected",
            branchCode: "BR-XXXX-000",
            branchCity: "",
            branchCountry: ""
          };
        }
        return prev;
      });
    }
  }, [form.countryId, form.countryBranchId, form.cityBranchId, mainBranches, cityBranches, form.purchaseOrderNo, transitCountryOptions]);

  // Load latest exchange rate and set currency when country or branch changes
  useEffect(() => {
    const countryId = form.countryId;
    let localCurrency = "PKR";
    const activeCountry = transitCountryOptions.find(c => String(c.id) === String(countryId));
    if (activeCountry) {
      const iso = (activeCountry.iso2 || "").toUpperCase();
      const name = (activeCountry.name || "").toUpperCase();
      if (iso === "AE" || name.includes("UNITED ARAB EMIRATES") || name.includes("DUBAI")) localCurrency = "AED";
      else if (iso === "PK" || name.includes("PAKISTAN")) localCurrency = "PKR";
      else if (iso === "AF" || name.includes("AFGHANISTAN")) localCurrency = "AFN";
      else if (iso === "IN" || name.includes("INDIA")) localCurrency = "INR";
      else if (iso === "IR" || name.includes("IRAN")) localCurrency = "IRR";
      else if (iso === "US" || name.includes("UNITED STATES")) localCurrency = "USD";
    }

    setForm((prev) => ({
      ...prev,
      // We no longer blindly overwrite currencyType so product pricing can remain independent.
      purchaseCurrency: prev.purchaseCurrency || localCurrency,
      purchaseAccountCurrency: prev.purchaseAccountCurrency || localCurrency,
      salesAccountCurrency: prev.salesAccountCurrency || localCurrency,
    }));
  }, [form.countryId, form.countryBranchId, transitCountryOptions]);

  // Keep display labels in sync with UUID scopes
  useEffect(() => {
    const activeCountry = countries.find(c => c.id === form.countryId);
    const activeMainBranch = mainBranches.find(b => b.id === form.countryBranchId);
    const activeCityBranch = cityBranches.find(cb => cb.id === form.cityBranchId);

    setForm(prev => ({
      ...prev,
      branchCountry: activeCountry?.name || prev.branchCountry,
      branchName: activeMainBranch?.name || prev.branchName,
      branchCode: activeMainBranch?.code || prev.branchCode,
      branchCity: activeCityBranch?.city_name || prev.branchCity,
    }));
  }, [form.countryId, form.countryBranchId, form.cityBranchId, countries, mainBranches, cityBranches]);

  // Dynamic live item totals (used for display in Step 2)
  const currentItemTotals = useMemo(() => calculateItemTotals(form), [form]);

  // Aggregated totals over all goods entries
  const reportTotals = useMemo(() => {
    const totalGross = goodsEntries.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
    const totalNet = goodsEntries.reduce((sum, item) => sum + Number(item.netWeight || 0), 0);
    const grandFinal = goodsEntries.reduce((sum, item) => sum + Number(item.finalAmount || 0), 0);
    const grandPrimaryFinal = goodsEntries.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    const totalQty = goodsEntries.reduce((sum, item) => sum + Number(item.qtyNo || 0), 0);
    const totalDeductions = goodsEntries.reduce((sum, item) => sum + Number((item.qtyNo * item.emptyKgs) || 0), 0);
    return {
      totalGross,
      totalNet,
      grandFinal,
      grandPrimaryFinal,
      totalQty,
      totalDeductions
    };
  }, [goodsEntries]);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleDivideTypeChange = (e) => {
    const type = e.target.value;
    let weight = form.divideWeight;
    if (type === "D/KGs") weight = 1.0;
    else if (type === "D/Ton") weight = 1000.0;
    else if (type === "D/Bag") weight = form.qtyKgs || 1.0;
    setForm(prev => ({ ...prev, divideType: type, divideWeight: weight }));
  };

  const applyAccountMaster = (type, account) => {
    if (!account) return;
    const accountNo = account.accountCode || account.rawAccountCode || account.ledgerCode || account.code || "";
    
    // Find the rich account from dbAccounts if available to get extra attributes
    const richAccount = dbAccounts.find(
      (a) => (a.accountCode || "").trim().toLowerCase() === accountNo.trim().toLowerCase()
    ) || account;

    const accountName = richAccount.accountName || richAccount.ledgerName || richAccount.name || "";
    const branchName = richAccount.cityBranchName || richAccount.countryBranchName || richAccount.branch_code || "";
    const currency = (richAccount.ledgerCurrency || richAccount.currency || "").toUpperCase();
    const companyId = richAccount.companyId || richAccount.company_id || null;

    let matchedComp = null;
    if (companyId && dbCompanies.length > 0) {
      matchedComp = dbCompanies.find(c => c.id === companyId);
    }
    const cName = matchedComp?.name || "";
    const cCode = matchedComp?.name ? "COM-" + matchedComp.name.slice(0, 3).toUpperCase() : "";

    setForm((prev) => ({
      ...prev,
      ...(type === "purchase"
        ? {
            purchaseAccountNo: accountNo,
            purchaseAccountName: accountName,
            purchaseAccountBranch: branchName,
            purchaseAccountCurrency: currency || prev.purchaseAccountCurrency,
            purchaseCurrency: currency || prev.purchaseCurrency,
            salesAccountCurrency: currency || prev.salesAccountCurrency,
            supplierName: accountName || prev.supplierName,
            purchaseCompanyId: companyId,
            purchaseCompanyName: cName,
            purchaseCompanyCode: cCode,
            purchaseAccountKind: richAccount.kind || richAccount.accountKind || "",
            purchaseAccountIsControl: richAccount.isControlAccount ?? richAccount.is_control_account ?? false,
            purchaseAccountCurrentBalance: richAccount.currentBalance ?? richAccount.current_balance ?? 0,
            purchaseAccountOpeningBalance: richAccount.openingBalance ?? richAccount.opening_balance ?? 0,
            purchaseAccountStatus: richAccount.status || "active",
            purchaseAccountSerialNumber: richAccount.accountSerialNumber ?? richAccount.account_serial_number ?? "",
            purchaseAccountCountrySerialNumber: richAccount.countrySerialNumber ?? richAccount.country_serial_number ?? "",
            purchaseAccountBranchSerialNumber: richAccount.branchSerialNumber ?? richAccount.branch_serial_number ?? "",
            purchaseAccountManualReferenceNumber: richAccount.manualReferenceNumber ?? richAccount.manual_reference_number ?? "",
            purchaseAccountMobile: richAccount.mobile ?? richAccount.customers?.mobile ?? "",
            purchaseAccountWhatsapp: richAccount.whatsapp ?? richAccount.customers?.whatsapp ?? "",
          }
        : {
            salesAccountNo: accountNo,
            salesAccountName: accountName,
            salesAccountBranch: branchName,
            salesAccountCurrency: currency || prev.salesAccountCurrency,
            customerName: accountName || prev.customerName,
            salesCompanyId: companyId,
            salesCompanyName: cName,
            salesCompanyCode: cCode,
            salesAccountKind: richAccount.kind || richAccount.accountKind || "",
            salesAccountIsControl: richAccount.isControlAccount ?? richAccount.is_control_account ?? false,
            salesAccountCurrentBalance: richAccount.currentBalance ?? richAccount.current_balance ?? 0,
            salesAccountOpeningBalance: richAccount.openingBalance ?? richAccount.opening_balance ?? 0,
            salesAccountStatus: richAccount.status || "active",
            salesAccountSerialNumber: richAccount.accountSerialNumber ?? richAccount.account_serial_number ?? "",
            salesAccountCountrySerialNumber: richAccount.countrySerialNumber ?? richAccount.country_serial_number ?? "",
            salesAccountBranchSerialNumber: richAccount.branchSerialNumber ?? richAccount.branch_serial_number ?? "",
            salesAccountManualReferenceNumber: richAccount.manualReferenceNumber ?? richAccount.manual_reference_number ?? "",
            salesAccountMobile: richAccount.mobile ?? richAccount.customers?.mobile ?? "",
            salesAccountWhatsapp: richAccount.whatsapp ?? richAccount.customers?.whatsapp ?? "",
          })
      // Do NOT force currencyType here so pricing currency remains unchanged
    }));

    // Sync search display text to the confirmed account name (not the raw code)
    // so the input always shows a readable label after selection.
    if (type === "purchase") {
      setPurchaseSearch(accountName || accountNo);
    } else {
      setSalesSearch(accountName || accountNo);
    }
  };

  const lookupTimers = React.useRef({ purchase: null, sales: null });

  const triggerBackgroundLookup = async (type, query) => {
    if (!query || query.trim().length < 2) return;
    try {
      const account = await lookupAccountMaster(query, form.countryId, form.countryBranchId, form.cityBranchId, isSuperAdmin);
      if (account) {
        applyAccountMaster(type, account);
      }
    } catch (err) {
      console.error("Background lookup failed:", err);
    }
  };

  const handleTextChange = (type, val) => {
    // Update only the local search display state — do NOT overwrite the
    // form account code field with raw text. The account code will only be
    // set once a valid account is confirmed via selection or background lookup.
    if (type === "purchase") {
      setPurchaseSearch(val);
      setPurchaseDropdownOpen(true);
      // Clear the stored account if text is cleared
      if (!val.trim()) {
        setForm((prev) => ({
          ...prev,
          purchaseAccountNo: "",
          purchaseAccountName: "",
          purchaseAccountBranch: "",
          purchaseAccountCurrency: "",
          purchaseAccountKind: "",
          purchaseAccountIsControl: false,
          purchaseAccountCurrentBalance: 0,
          purchaseAccountOpeningBalance: 0,
          purchaseAccountStatus: "active",
          purchaseAccountSerialNumber: "",
          purchaseAccountCountrySerialNumber: "",
          purchaseAccountBranchSerialNumber: "",
          purchaseAccountManualReferenceNumber: "",
          purchaseAccountMobile: "",
          purchaseAccountWhatsapp: "",
        }));
      }
    } else {
      setSalesSearch(val);
      setSalesDropdownOpen(true);
      // Clear the stored account if text is cleared
      if (!val.trim()) {
        setForm((prev) => ({
          ...prev,
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
        }));
      }
    }

    const matched = dbAccounts.find(acc =>
      (acc.accountCode || "").trim().toLowerCase() === val.trim().toLowerCase() ||
      (acc.accountName || "").trim().toLowerCase() === val.trim().toLowerCase()
    );

    if (matched) {
      applyAccountMaster(type, matched);
    } else {
      // Debounced background lookup
      if (lookupTimers.current[type]) {
        clearTimeout(lookupTimers.current[type]);
      }
      lookupTimers.current[type] = setTimeout(() => {
        triggerBackgroundLookup(type, val);
      }, 500);
    }
  };

  const handleAccountLookup = async (type) => {
    const query = type === "purchase" ? form.purchaseAccountNo : form.salesAccountNo;
    setAccountLookupLoading(type);
    setAccountLookupMessage("");
    try {
      const account = await lookupAccountMaster(query, form.countryId, form.countryBranchId, form.cityBranchId, isSuperAdmin);
      if (!account) {
        setAccountLookupMessage(`Account not found: ${query}.`);
        return;
      }
      applyAccountMaster(type, account);
      setAccountLookupMessage(
        `${type === "purchase" ? "Purchase" : "Sales"} account loaded: ${account.accountName}`
      );
    } catch (error) {
      setAccountLookupMessage(error instanceof Error ? error.message : "Account lookup failed.");
    } finally {
      setAccountLookupLoading(null);
    }
  };
  const handleAddGoodsEntry = async () => {
    // Check if the variation exists in dbGoods and auto-register if missing
    const selectedGood = dbGoods.find(g => (g.goods_name || g.goodsName) === form.goodsName);
    if (selectedGood) {
      const originCountry = transitCountryOptions.find(c => c.name === form.origin);
      const originCountryId = originCountry?.id || null;
      const variations = selectedGood.variations || selectedGood.goods_variations || [];
      
      const exists = variations.some(v => 
        (v.size || "").trim().toLowerCase() === (form.size || "").trim().toLowerCase() && 
        (v.brand || "").trim().toLowerCase() === (form.brand || "").trim().toLowerCase() && 
        (v.origin_country_id === originCountryId)
      );

      if (!exists && form.size.trim() && form.brand.trim()) {
        try {
          setSavingOrder(true);
          setSaveMessage("Registering brand & size combination under Goods Master...");
          const res = await fetch("/api/erp/goods/variations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              goodsId: selectedGood.id,
              originCountryId,
              size: form.size.trim().toUpperCase(),
              brand: form.brand.trim().toUpperCase()
            })
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok || !payload.ok) {
            throw new Error(payload?.error?.message || payload?.error || "Failed to auto-register variation.");
          }
          
          // Reload goods list to update local state
          const reloadRes = await fetch("/api/erp/goods?limit=500").then(r => r.json()).catch(() => ({}));
          const goodsData = reloadRes?.data?.goods || reloadRes?.goods;
          if (goodsData) {
            setDbGoods(goodsData);
          }
          setSaveMessage("Variation registered successfully.");
        } catch (err) {
          console.error("Auto-registering variation failed:", err);
          alert(err instanceof Error ? err.message : "Failed to auto-register variation. Please try again.");
          setSavingOrder(false);
          return;
        } finally {
          setSavingOrder(false);
        }
      }
    }

    const calculated = calculateItemTotals(form);
    setGoodsEntries((prev) => [
      ...prev,
      {
        allotName: form.allotName || `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        goodsName: form.goodsName,
        size: form.size,
        brand: form.brand,
        origin: form.origin,
        hsCode: form.hsCode,
        qtyName: form.qtyName,
        qtyNo: Number(form.qtyNo || 0),
        qtyKgs: Number(form.qtyKgs || 0),
        grossWeight: calculated.grossWeight,
        emptyKgs: Number(form.emptyKgs || 0),
        netWeight: calculated.netWeight,
        priceType: form.priceType,
        divideType: form.divideType,
        divideWeight: Number(form.divideWeight || 1),
        coursePrice: Number(form.coursePrice || 0),
        currencyType: form.currencyType,
        purchaseCurrency: form.purchaseCurrency,
        exchangeRate: Number(form.exchangeRate || 1),
        totalAmount: calculated.totalAmount,
        op: form.operator || "*",
        finalAmount: calculated.finalAmount
      }
    ]);
    setSaveMessage("Item added to live report draft list.");
    // Clear/reset item fields
    setForm((prev) => ({
      ...prev,
      goodsName: "",
      size: "",
      brand: "",
      origin: "",
      hsCode: "",
      qtyNo: 0,
      qtyKgs: 0,
      emptyKgs: 0,
      coursePrice: 0,
      allotName: `ALT-${Math.floor(4424 + Math.random() * 1000)}`
    }));

  };

  const handleCreatePort = async (portName, countryName, transportType, side) => {
    const country = transitCountryOptions.find(c => c.name === countryName);
    const countryId = country?.id || null;

    setSavingOrder(true);
    setSaveMessage(`Creating ${transportType} port "${portName}"...`);
    try {
      const endpoint = side === "loading" ? "/api/erp/ports/loading" : "/api/erp/ports/received";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portName,
          countryId,
          portCode: null,
          transportType,
          isActive: true
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to create port.");
      }

      // Re-fetch port list
      const [loadRes, recRes] = await Promise.all([
        fetch("/api/erp/ports/loading?all=true&limit=500").then(r => r.json()).catch(() => ({})),
        fetch("/api/erp/ports/received?all=true&limit=500").then(r => r.json()).catch(() => ({}))
      ]);

      const loadPorts = loadRes?.data?.ports || loadRes?.ports;
      const recPorts = recRes?.data?.ports || recRes?.ports;
      if (loadPorts) setDbLoadingPorts(loadPorts);
      if (recPorts) setDbReceivedPorts(recPorts);

      // Set the newly created port value in form
      if (side === "loading") {
        if (transportType === "sea") setValue("loadingPort", portName);
        else if (transportType === "road") setValue("loadingBorder", portName);
        else if (transportType === "air") setValue("airportName", portName);
      } else {
        if (transportType === "sea") setValue("receivedPort", portName);
        else if (transportType === "road") setValue("receivedBorder", portName);
        else if (transportType === "air") setValue("receivedPortName", portName);
      }

      setSaveMessage(`Port "${portName}" created successfully.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating port.");
    } finally {
      setSavingOrder(false);
    }
  };

  const buildPurchaseOrderPayload = (ledgerPostingStatus = "Pending") => {
    const usdRate = Number(form.exchangeRate || 1);

    return {
      countryId: form.countryId || null,
      countryBranchId: form.countryBranchId || null,
      cityBranchId: form.cityBranchId || null,
      supplierCompanyId: form.purchaseCompanyId || null,
      purchaseContractNo: form.purchaseContractNo || form.purchaseOrderNo,
      currencyCode: form.currencyType || "USD",
      exchangeRate: usdRate,
      orderTotal: reportTotals.grandFinal, // Local currency total
      totalGoodsOriginal: reportTotals.grandFinal,
      totalGoodsLocal: reportTotals.grandFinal,
      totalGoodsUsd: reportTotals.grandFinal / usdRate,
      items: goodsEntries.map(g => ({
        goodsName: g.goodsName,
        hsCode: g.hsCode,
        size: g.size,
        brand: g.brand,
        origin: g.origin,
        quantity: g.qtyNo,
        unitName: g.qtyName,
        unitWeight: g.divideWeight,
        grossWeight: g.grossWeight,
        netWeight: g.netWeight,
        rateOriginal: g.coursePrice,
        rateLocal: g.coursePrice,
        rateUsd: g.coursePrice / usdRate,
        totalOriginal: g.finalAmount,
        totalLocal: g.finalAmount,
        totalUsd: g.finalAmount / usdRate
      })),
      paymentStatus: ledgerPostingStatus === "Posted" ? "partial" : "pending",
      ledgerPostingStatus,
      formData: {
        form,
        totals: reportTotals,
        goodsEntries: goodsEntries,
        reports: reportsList,
        workflow: {
          currentStep: ledgerPostingStatus === "Posted" ? "Journal Entry & Payment" : "Booking Purchase Order",
          nextStep: ledgerPostingStatus === "Posted" ? "Payment & Documents" : "Booking Confirm",
          bookingStatus: "Saved",
          confirmationStatus: ledgerPostingStatus === "Posted" ? "Confirmed" : "Pending",
          journalStatus: ledgerPostingStatus === "Posted" ? "Posted" : "Pending",
          paymentStatus: ledgerPostingStatus === "Posted" ? "Advance Posted" : "Pending",
          containerStatus: "Pending",
          inventoryStatus: "Pending",
          deliveryStatus: "Pending",
          savedAt: new Date().toISOString(),
        },
        savedAt: new Date().toISOString()
      }
    };
  };

  const handleSavePurchaseOrder = async (shouldClose = false) => {
    setSavingOrder(true);
    setSaveMessage("");
    try {
      const response = await fetch(savedOrderId ? `/api/erp/purchases/orders/${savedOrderId}` : "/api/erp/purchases/orders", {
        method: savedOrderId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPurchaseOrderPayload("Pending"))
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Purchase order failed to save.");
      }
      const nextOrderId = payload.data?.purchaseOrderId || savedOrderId || payload.data?.id;
      const nextOrderNo = payload.data?.purchaseOrderNo || savedOrderNo || form.purchaseOrderNo;
      setSavedOrderId(nextOrderId || "");
      setSavedOrderNo(nextOrderNo);
      setSaveMessage(`Successfully saved Purchase Order: ${nextOrderNo}.`);
      setRegisterRefreshKey((key) => key + 1);
      
      if (shouldClose) {
        setIsFormOpen(false);
        handleReset();
      } else {
        setActiveTab("report");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Error saving order.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleTransfer = async () => {
    setSavingOrder(true);
    setSaveMessage("");
    try {
      const transferPayload = buildPurchaseOrderPayload("Posted");
      const response = await fetch(savedOrderId ? `/api/erp/purchases/orders/${savedOrderId}` : "/api/erp/purchases/orders", {
        method: savedOrderId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferPayload)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Purchase order failed to save.");
      }
      const nextOrderId = payload.data?.purchaseOrderId || savedOrderId;
      const nextOrderNo = payload.data?.purchaseOrderNo || savedOrderNo || form.purchaseOrderNo;
      setSavedOrderId(nextOrderId || "");
      setSavedOrderNo(nextOrderNo);
      setSaveMessage(`Transferred Purchase Order ${nextOrderNo} to Journal / Payment and ledger posting.`);
      setTransferredData(payload.data || { purchaseOrderNo: nextOrderNo });
      setIsTransferred(true);
      setRegisterRefreshKey((key) => key + 1);
      // Navigate to the Purchase Transfer Payment / Journal Report page, pre-selecting this order
      router.push(`/dashboard/purchase/purchase-booking-journal-report?purchaseOrderNo=${encodeURIComponent(nextOrderNo)}`);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Error saving order.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDelete = async () => {
    if (!savedOrderId) return;
    if (!window.confirm("Are you sure you want to permanently delete this booking? All associated ledger transfers will be reverted.")) {
      return;
    }
    
    setSavingOrder(true);
    setSaveMessage("Deleting booking and reverting transfers...");
    try {
      const response = await fetch(`/api/erp/purchases/orders/${savedOrderId}`, {
        method: "DELETE"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to delete booking.");
      }
      
      alert("Booking successfully deleted and transfers reverted.");
      setRegisterRefreshKey(k => k + 1);
      setIsFormOpen(false);
      handleReset();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting order.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleOpenA4Report = (autoPrint = false) => {
    const firstGoodName = goodsEntries[0]?.goodsName || "Cargo";
    const firstQtyUnit = goodsEntries[0]?.qtyName || "BAGS";
    const rawRemarks = form.remarks || form.orderReportRemarks || "";
    
    const reportData = {
      id: savedOrderId || "new-temp",
      purchaseBookingOrderNumber: form.purchaseOrderNo,
      purchaseDate: form.purchaseDate,
      bookingDate: form.purchaseDate,
      purchaseAccountName: form.purchaseAccountName,
      purchaseAccountNumber: form.purchaseAccountNo,
      salesAccountName: form.salesAccountName,
      salesAccountNumber: form.salesAccountNo,
      supplierName: form.supplierName || "N/A",
      buyerName: form.customerName || "N/A",
      productName: firstGoodName,
      goodsDescription: rawRemarks,
      quantity: reportTotals.totalQty,
      unit: firstQtyUnit,
      totalWeight: reportTotals.totalNet,
      containerCount: form.containerCount || 0,
      purchaseRate: avgRateKg,
      totalPurchaseAmount: reportTotals.grandPrimaryFinal,
      currency: form.currencyType,
      status: isTransferred ? "Posted" : "Pending",
      paymentStatus: isTransferred ? "partial" : "pending",
      branchName: form.branchName || "Main Branch",
      countryName: form.branchCountry || "Country",
      createdAt: new Date().toISOString(),
      totalGrossWeight: reportTotals.totalGross,
      totalNetWeight: reportTotals.totalNet,
      purchaseAmount: reportTotals.grandPrimaryFinal,
      finalAmount: reportTotals.grandFinal,
      form_data: { form, goodsEntries },
      audit: {
        userName: form.userName || "Admin User",
        userId: form.userId || "USR-1001",
        branchCode: form.branchCode || "BR-KBL-001"
      }
    };

    openPurchaseA4ReportWindow({
      title: "Purchase Booking Order",
      subtitle: "DGT Accounts Purchase Registry",
      purchaseData: reportData,
      autoPrint
    });
  };

  const handleReset = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setForm({
      ...DEFAULT_FORM,
      purchaseOrderNo: `PO-2026-${randomSuffix}`,
      salesOrderNo: `SO-2026-${randomSuffix}`,
      purchaseContractNo: `PC-2026-${randomSuffix}`,
      billNo: `BILL-2026-${randomSuffix}`,
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseAccountNo: "",
      purchaseAccountName: "",
      purchaseAccountBranch: "",
      purchaseAccountCurrency: "",
      salesAccountNo: "",
      salesAccountName: "",
      salesAccountBranch: "",
      salesAccountCurrency: "",
      remarks: "",
      orderReportRemarks: "",
      purchaseReportRemarks: "",
      purchaseInvoiceRemarks: "",
      showRemarksOnA4: true,
    });
    setGoodsEntries([]);
    setSavedOrderId("");
    setSavedOrderNo("");
    setTransferredData(null);
    setIsTransferred(false);
    setPreviewType("booking_report");
    setPreviewModalOpen(false);
    setReportsList([]);
    setSelectedReportId("");
    setReportSaved(false);
    setPurchaseSearch("");
    setSalesSearch("");
    setSaveMessage("All inputs and goods listings cleared.");
  };


  // ── Inline Master Creation Handlers ─────────────────────────────────────────
  const handleAddNewCountry = async () => {
    const { name } = newCountryForm;
    if (!name.trim()) {
      setNewCountryError("Country name is required.");
      return;
    }
    setNewCountryLoading(true);
    setNewCountryError("");
    try {
      const trimmed = name.trim();
      const iso2 = trimmed.slice(0, 2).toUpperCase();
      const iso3 = trimmed.slice(0, 3).toUpperCase();
      const code = iso2.toLowerCase();
      const response = await fetch("/api/erp/locations/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          iso2,
          iso3,
          currencyCode: "USD",
          officialEmail: `official.${code}@dgtllc.com`,
          adminEmail: `admin.${code}@dgtllc.com`,
          whatsappNumber: null
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to create country.");
      }
      const created = payload.data?.country;
      if (created) {
        setAllCountries(prev => [...prev, created]);
        if (newGoodModal) {
          setNewGoodForm(p => ({ ...p, originCountryId: created.id }));
        } else if (customVariationModal) {
          setCustomVariationForm(p => ({ ...p, originCountryId: created.id }));
        } else {
          setValue("origin", created.name);
        }
      }
      const reloadRes = await fetch("/api/erp/locations/countries?all=true&limit=500").then(r => r.json()).catch(() => ({}));
      const countriesData = reloadRes?.data?.countries || reloadRes?.countries;
      if (countriesData) setAllCountries(countriesData);
      setNewCountryModal(false);
      setNewCountryForm({ name: "" });
      setSaveMessage(`Country "${trimmed}" saved to master.`);
    } catch (err) {
      setNewCountryError(err instanceof Error ? err.message : "Failed to create country.");
    } finally {
      setNewCountryLoading(false);
    }
  };

  const handleAddNewGood = async () => {
    const { goodsName, chsCode } = newGoodForm;
    if (!goodsName.trim() || !chsCode.trim()) {
      setNewGoodError("Goods name and HS code are required.");
      return;
    }
    setNewGoodLoading(true);
    setNewGoodError("");
    try {
      const response = await fetch("/api/erp/goods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goodsName: goodsName.trim().toUpperCase(),
          chsCode: chsCode.trim(),
          originalLanguage: "en"
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to create good.");
      }
      // Refresh goods list and auto-select the new good
      const reloadRes = await fetch("/api/erp/goods?limit=500").then(r => r.json()).catch(() => ({}));
      const goodsData = reloadRes?.data?.goods || reloadRes?.goods;
      if (goodsData) setDbGoods(goodsData);
      setValue("goodsName", goodsName.trim().toUpperCase());
      setValue("hsCode", chsCode.trim());
      setNewGoodModal(false);
      setNewGoodForm({ goodsName: "", chsCode: "" });
      setSaveMessage(`Good "${goodsName.trim().toUpperCase()}" saved to master.`);
    } catch (err) {
      setNewGoodError(err instanceof Error ? err.message : "Failed to create good.");
    } finally {
      setNewGoodLoading(false);
    }
  };

  const openCreateAccountModal = (type) => {
    const defaultName = type === "purchase"
      ? (supplierDetail ? (supplierDetail.company_name ? `${supplierDetail.customer_name} (${supplierDetail.company_name})` : supplierDetail.customer_name) : (form.supplierName || ""))
      : (customerDetail ? (customerDetail.customer_name ? `${customerDetail.customer_name} (${customerDetail.company_name})` : customerDetail.customer_name) : (form.customerName || ""));

    setCreateAccountType(type);
    setCreateAccountForm({
      code: "AUTO",
      name: defaultName,
      kind: type === "purchase" ? "liability" : "asset",
      currency: form.currencyType || "USD",
      parentId: "",
      isControlAccount: false
    });
    setCreateAccountError("");
    setCreateAccountModalOpen(true);
  };

  const handleAddNewAccount = async () => {
    const { code, name, kind, currency, parentId, isControlAccount } = createAccountForm;
    if (!name.trim() || !code.trim()) {
      setCreateAccountError("Account name and code are required.");
      return;
    }
    setCreateAccountLoading(true);
    setCreateAccountError("");

    try {
      const scope = form.cityBranchId ? "city_branch" : form.countryBranchId ? "main_branch" : form.countryId ? "country" : "super_admin";
      const payload = {
        scope,
        countryId: form.countryId || null,
        countryBranchId: form.countryBranchId || null,
        cityBranchId: form.cityBranchId || null,
        parentId: parentId || null,
        customerId: createAccountType === "purchase" ? form.supplierId : form.customerId,
        code: code.trim(),
        manualReferenceNumber: null,
        name: name.trim(),
        kind,
        currency: currency.toUpperCase(),
        openingBalance: 0,
        isControlAccount
      };

      const response = await fetch("/api/erp/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const payloadData = await response.json().catch(() => ({}));
      if (!response.ok || !payloadData.ok) {
        throw new Error(payloadData?.error?.message || payloadData?.error || "Failed to create account.");
      }

      // Refresh accounts list
      const reloadRes = await fetch("/api/erp/accounting/accounts?limit=500").then(r => r.json()).catch(() => ({}));
      if (reloadRes?.data?.accounts) {
        const mapped = reloadRes.data.accounts.map(acc => ({
          accountCode: acc.code || acc.account_number,
          accountName: acc.name,
          cityBranchName: acc.branch_code || "",
          ledgerCurrency: acc.currency || "USD",
          customerId: acc.customer_id || acc.customerId || null
        }));
        setDbAccounts(mapped);

        // Find the created account
        const createdAcc = mapped.find(acc => acc.accountCode === payloadData.accountCode);
        if (createdAcc) {
          applyAccountMaster(createAccountType, createdAcc);
        } else {
          // Fallback if not found in reload (e.g. scoping lag)
          applyAccountMaster(createAccountType, {
            accountCode: payloadData.accountCode,
            accountName: name.trim(),
            cityBranchName: "",
            ledgerCurrency: currency.toUpperCase(),
            customerId: payload.customerId
          });
        }
      }

      setCreateAccountModalOpen(false);
    } catch (err) {
      setCreateAccountError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setCreateAccountLoading(false);
    }
  };

  const handleAddNewCompany = async () => {
    const { name, legalName, baseCurrency } = createCompanyForm;
    if (!name.trim()) {
      setCreateCompanyError("Company name is required.");
      return;
    }
    setCreateCompanyLoading(true);
    setCreateCompanyError("");

    try {
      const lang = (typeof document !== "undefined" ? document.documentElement.lang : "en") || "en";
      const originalLanguage = ["ar", "ur", "fa", "ps"].includes(lang) ? lang : "en";

      const response = await fetch("/api/erp/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          legalName: legalName.trim() || name.trim(),
          baseCurrency: baseCurrency || "USD",
          originalLanguage
        })
      });

      const payloadData = await response.json().catch(() => ({}));
      if (!response.ok || !payloadData.ok) {
        throw new Error(payloadData?.error?.message || payloadData?.error || "Failed to create company.");
      }

      const createdId = payloadData.companyId || payloadData.data?.companyId;
      const finalName = name.trim();
      const finalCode = "COM-" + finalName.slice(0, 3).toUpperCase();

      // Refresh companies list from database
      const reloadRes = await fetch("/api/erp/companies?limit=100").then(r => r.json()).catch(() => ({}));
      const companiesData = reloadRes?.data?.companies || reloadRes?.companies;
      if (companiesData) {
        setDbCompanies(companiesData);
      } else {
        // Fallback: append locally
        setDbCompanies(prev => [...prev, { id: createdId, name: finalName, legal_name: legalName.trim() || finalName }]);
      }

      // Automatically select the newly created company for the active card
      if (createCompanyType === "purchase") {
        setValue("purchaseCompanyId", createdId);
        setValue("purchaseCompanyName", finalName);
        setValue("purchaseCompanyCode", finalCode);
      } else {
        setValue("salesCompanyId", createdId);
        setValue("salesCompanyName", finalName);
        setValue("salesCompanyCode", finalCode);
      }

      setCreateCompanyModalOpen(false);
      setCreateCompanyForm({ name: "", legalName: "", baseCurrency: "USD" });
      setSaveMessage(`Company "${finalName}" created successfully.`);
    } catch (err) {
      setCreateCompanyError(err instanceof Error ? err.message : "Failed to create company.");
    } finally {
      setCreateCompanyLoading(false);
    }
  };

  const handleSaveCustomVariation = async () => {
    const { goodsName, brand, size, originCountryId } = customVariationForm;
    if (!brand.trim() || !size.trim()) {
      alert("Please fill both Brand and Size.");
      return;
    }

    const searchName = goodsName?.trim().toUpperCase() || "";
    const selectedGood = dbGoods.find(g => {
      const gName = (g.goods_name || g.goodsName || "").trim().toUpperCase();
      return gName === searchName;
    });
    
    let targetGoodsId = null;

    if (!selectedGood) {
      // Auto-create the Good if it doesn't exist yet
      setSavingOrder(true);
      setSaveMessage(`Creating new Good "${searchName}" in master...`);
      try {
        const createRes = await fetch("/api/erp/goods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            goodsName: searchName,
            chsCode: searchName.substring(0, 10), // Required fallback
            initialVariation: {
              originCountryId: originCountryId || null,
              size: size.trim().toUpperCase(),
              brand: brand.trim().toUpperCase()
            }
          })
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok || !createData.ok) {
          throw new Error(createData?.error?.message || createData?.error || "Failed to create Good in master.");
        }
        targetGoodsId = createData.goodsId || createData.data?.goodsId;
        
        // Skip variation POST since initialVariation was passed, just reload
      } catch (err) {
        setSavingOrder(false);
        alert(err instanceof Error ? err.message : "Error creating Good.");
        return;
      }
    } else {
      targetGoodsId = selectedGood.id;
      setSavingOrder(true);
      setSaveMessage(`Registering variation ${brand.trim().toUpperCase()} - ${size.trim().toUpperCase()}...`);
      try {
        const response = await fetch("/api/erp/goods/variations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goodsId: targetGoodsId,
            originCountryId: originCountryId || null,
            size: size.trim().toUpperCase(),
            brand: brand.trim().toUpperCase()
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload?.error?.message || payload?.error || "Failed to save variation.");
        }
      } catch (err) {
        setSavingOrder(false);
        alert(err instanceof Error ? err.message : "Error saving variation.");
        return;
      }
    }

    try {

      const reloadRes = await fetch("/api/erp/goods?limit=500").then(r => r.json()).catch(() => ({}));
      const goodsData = reloadRes?.data?.goods || reloadRes?.goods;
      if (goodsData) {
        setDbGoods(goodsData);
      }

      setValue("brand", brand.trim().toUpperCase());
      setValue("size", size.trim().toUpperCase());
      if (originCountryId) {
        const matching = transitCountryOptions.find(c => c.id === originCountryId);
        if (matching) {
          setValue("origin", matching.name);
        }
      }
      setCustomVariationModal(false);
      setSaveMessage(`Variation "${brand.trim().toUpperCase()} - ${size.trim().toUpperCase()}" saved successfully.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving variation.");
    } finally {
      setSavingOrder(false);
    }
  };

  const headerContent = (
    <div className="flex flex-1 items-center justify-between gap-4 w-full h-full">
      {/* Title */}
      <div className="flex items-center gap-2 shrink-0">
        <Building2 className="h-4 w-4 text-primary" />
        <h2 className="text-[11px] sm:text-xs font-black tracking-tight uppercase text-foreground">
          Purchase Booking Order
        </h2>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 bg-muted/65 p-0.5 rounded-full border border-border/80 text-[9px] font-bold shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("booking")}
          className={`px-2.5 py-0.5 rounded-full transition flex items-center gap-1 ${
            activeTab === "booking"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[7px] font-bold">1</span>
          Booking
        </button>
        <span className="text-muted-foreground/30 font-normal">/</span>
        <button
          type="button"
          onClick={() => setActiveTab("goods")}
          className={`px-2.5 py-0.5 rounded-full transition flex items-center gap-1 ${
            activeTab === "goods"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[7px] font-bold">2</span>
          Goods
        </button>
        <span className="text-muted-foreground/30 font-normal">/</span>
        <button
          type="button"
          onClick={() => setActiveTab("others")}
          className={`px-2.5 py-0.5 rounded-full transition flex items-center gap-1 ${
            activeTab === "others"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[7px] font-bold">3</span>
          Payment & Shipping
        </button>
        <span className="text-muted-foreground/30 font-normal">/</span>
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`px-2.5 py-0.5 rounded-full transition flex items-center gap-1 ${
            activeTab === "report"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[7px] font-bold">4</span>
          Report
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 relative" ref={dropdownRef}>
        <Button
          type="button"
          onClick={() => {
            setIsFormOpen(false);
            handleReset();
          }}
          variant="outline"
          className="flex items-center gap-1.5 h-7.5 px-2 text-xs font-bold text-foreground border-border hover:bg-muted"
        >
          Close Form
        </Button>
        <Button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 h-7.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md font-bold text-[10px]"
        >
          + New
        </Button>
        <Button
          type="button"
          onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
          className="flex items-center gap-1 h-7.5 px-2 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md font-bold text-[10px]"
        >
          <MoreVertical className="h-3.5 w-3.5" /> View
        </Button>

        {viewDropdownOpen && (
          <div className="absolute right-0 top-8.5 w-48 rounded-xl bg-card border border-border shadow-2xl z-50 p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                handleReset();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <span className="h-3.5 w-3.5 flex items-center justify-center font-bold text-sm text-primary">+</span>
              <span>New Booking</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                setGoodsEntries([]);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-left transition"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              <span>Clear Goods</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                window.print();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition border-b border-border/40 pb-2 mb-1"
            >
              <Printer className="h-3.5 w-3.5 text-blue-500" />
              <span>Print Screen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                setReportSaved(!!form.orderReportRemarks);
                setIsTransferred(false);
                setActiveTab("report");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition border-b border-border/40 pb-2 mb-1"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="font-bold text-emerald-600 dark:text-emerald-400">View / Check Entry</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                openTradeDocumentWindow("contract", { form_data: { form, goodsEntries }, containerCount: form.containerCount });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <FileSignature className="h-3.5 w-3.5 text-purple-500" />
              <span>Print Contract</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                openTradeDocumentWindow("proforma", { form_data: { form, goodsEntries }, containerCount: form.containerCount });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              <span>Print Proforma Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                openTradeDocumentWindow("commercial", { form_data: { form, goodsEntries }, containerCount: form.containerCount });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <Receipt className="h-3.5 w-3.5 text-rose-500" />
              <span>Print Commercial Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                openTradeDocumentWindow("packing", { form_data: { form, goodsEntries }, containerCount: form.containerCount });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <Package className="h-3.5 w-3.5 text-emerald-500" />
              <span>Print Packing List</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                alert("Email action triggered!");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition border-t border-border/40 pt-2 mt-1"
            >
              <Mail className="h-3.5 w-3.5 text-indigo-500" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                alert("WhatsApp action triggered!");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                alert("Checkup action triggered!");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <CheckSquare className="h-3.5 w-3.5 text-yellow-500" />
              <span>Checkup</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!isFormOpen) {
    return (
      <div className="space-y-6 text-foreground bg-background">
        <PurchaseBookingJournalReportView
          refreshKey={registerRefreshKey}
          highlightPurchaseOrderNo={savedOrderNo}
          onNewBooking={() => {
            handleReset();
            setSavedOrderId("");
            setSavedOrderNo("");
            setIsFormOpen(true);
            setActiveTab("booking");
          }}
        />
      </div>
    );
  }

  const handleNewReportSubmit = (e) => {
    e.preventDefault();
    if (!newReportForm.name.trim()) {
      alert("Report name is required.");
      return;
    }
    const newReport = {
      id: crypto.randomUUID(),
      name: newReportForm.name,
      description: newReportForm.description,
      notes: newReportForm.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedReports = [...reportsList, newReport];
    setReportsList(updatedReports);
    setSelectedReportId(newReport.id);
    setNewReportForm({ name: "", description: "", notes: "" });
    setIsNewReportModalOpen(false);
    
    // Auto-save the purchase order to persist the new report in form_data
    if (savedOrderId) {
      setTimeout(() => {
        handleSavePurchaseOrder(false);
      }, 100);
    }
  };

  const handleUpdateCurrentReport = () => {
    if (!selectedReportId) return;
    const currentReportIndex = reportsList.findIndex(r => r.id === selectedReportId);
    if (currentReportIndex === -1) return;
    
    const updatedReports = [...reportsList];
    updatedReports[currentReportIndex] = {
      ...updatedReports[currentReportIndex],
      updatedAt: new Date().toISOString()
    };
    setReportsList(updatedReports);
    handleSavePurchaseOrder(false);
  };

  const handleDeleteReport = (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const updatedReports = reportsList.filter(r => r.id !== id);
    setReportsList(updatedReports);
    if (selectedReportId === id) setSelectedReportId("");
    if (savedOrderId) {
      setTimeout(() => {
        handleSavePurchaseOrder(false);
      }, 100);
    }
  };

  return (
    <div className="space-y-2 text-foreground bg-background mt-[-10px]">
      {isTransferred ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <span className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20">
              POSTED VOUCHER REGISTRATION
            </span>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              Voucher JV-{(transferredData?.purchaseOrderNo || form.purchaseOrderNo).slice(-6)} Successfully Registered
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              The purchase booking has been successfully transferred to payment records and logged into the accounts ledger database.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleReset}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase px-5 py-2.5 rounded-xl shadow-md transition-all border-none font-bold"
            >
              + New Booking
            </Button>
          </div>
        </div>
      ) : (
        <>
          {portalElement ? (
            createPortal(headerContent, portalElement)
          ) : (
            <div className="pb-2 border-b border-border/60">
               {headerContent}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <section className="lg:col-span-3 space-y-4 lg:order-1 order-1">
              <div className="sticky top-[10px] z-20 bg-background pb-3">
                <div className="bg-card border border-border shadow-sm rounded-lg p-3.5 space-y-2.5 text-[10px]">
                  <div className="text-[10px] font-black uppercase text-primary/80 tracking-wider border-b border-border/60 pb-1.5 flex items-center justify-between">
                    <span>Transaction Identifiers</span>
                    <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">Live</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 font-medium">
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Journal Serial</span>
                      <span className="text-foreground font-semibold truncate block font-mono" title={form.purchaseOrderNo}>{form.purchaseOrderNo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Bill Serial</span>
                      <span className="text-foreground font-semibold truncate block font-mono" title={form.billNo}>{form.billNo || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">General Serial</span>
                      <span className="text-foreground font-semibold truncate block font-mono" title={form.purchaseAccountSerialNumber}>{form.purchaseAccountSerialNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Country Serial</span>
                      <span className="text-foreground font-semibold truncate block font-mono" title={form.purchaseAccountCountrySerialNumber}>{form.purchaseAccountCountrySerialNumber || "-"}</span>
                    </div>
                    <div className="relative col-span-2">
                      <span className="text-muted-foreground flex items-center justify-between text-[9px] uppercase">
                        Branch Serial
                        {(isSuperAdmin || isCountryAdmin) && (
                          <button type="button" onClick={() => setBranchPinOpen(!branchPinOpen)} className="text-muted-foreground hover:text-primary z-30 relative" title="Change Location/Branch">
                            <Pin className={`h-2.5 w-2.5 transition-transform ${branchPinOpen ? "text-primary fill-primary/20 rotate-45" : ""}`} />
                          </button>
                        )}
                      </span>
                      <span className="text-foreground font-semibold truncate block font-mono" title={form.purchaseAccountBranchSerialNumber}>{form.purchaseAccountBranchSerialNumber || "-"}</span>
                      {branchPinOpen && (
                        <div className="absolute top-6 left-0 w-[220px] rounded-xl bg-card border border-border shadow-2xl z-[60] p-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="text-[10px] font-black uppercase text-primary tracking-wider border-b border-border/40 pb-1 mb-2 flex items-center justify-between">
                            <span>{isSuperAdmin ? "Super Admin" : "Country Admin"}: Select</span>
                            <button type="button" onClick={() => setBranchPinOpen(false)} className="text-muted-foreground hover:text-foreground"><span className="text-xs">×</span></button>
                          </div>
                          <div className="grid grid-cols-1 gap-2.5">
                            <label className="grid gap-1 text-[10px] font-bold">
                              Country
                              <select
                                value={form.countryId}
                                onChange={(e) => {
                                  const cid = e.target.value;
                                  setForm(prev => ({
                                    ...prev,
                                    countryId: cid,
                                    countryBranchId: "",
                                    cityBranchId: ""
                                  }));
                                }}
                                disabled={!isSuperAdmin}
                                className="h-8 rounded border bg-background px-2 text-[10px] font-semibold text-foreground outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Select Country</option>
                                {countries.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-1 text-[10px] font-bold">
                              Country Branch
                              <select
                                value={form.countryBranchId}
                                onChange={(e) => {
                                  const bid = e.target.value;
                                  setForm(prev => ({
                                    ...prev,
                                    countryBranchId: bid,
                                    cityBranchId: ""
                                  }));
                                }}
                                className="h-8 rounded border bg-background px-2 text-[10px] font-semibold text-foreground outline-none focus:border-primary"
                                disabled={!form.countryId}
                              >
                                <option value="">Select Country Branch</option>
                                {mainBranches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name} ({b.code})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-1 text-[10px] font-bold">
                              City Branch
                              <select
                                value={form.cityBranchId}
                                onChange={(e) => {
                                  setForm(prev => ({ ...prev, cityBranchId: e.target.value }));
                                  setBranchPinOpen(false);
                                }}
                                className="h-8 rounded border bg-background px-2 text-[10px] font-semibold text-foreground outline-none focus:border-primary"
                                disabled={!form.countryBranchId}
                              >
                                <option value="">Select City Branch</option>
                                {cityBranches.map((cb) => (
                                  <option key={cb.id} value={cb.id}>
                                    {cb.city_name} - {cb.name} ({cb.code})
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 border-t border-border/40 pt-2 grid grid-cols-3 gap-2 items-end">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Total Units</span>
                        <span className="text-foreground font-semibold truncate block font-mono">{reportTotals.totalQty.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Gross Weight</span>
                        <span className="text-foreground font-semibold truncate block font-mono">{reportTotals.totalGross.toLocaleString()} kg</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Net Weight</span>
                        <span className="text-foreground font-semibold truncate block font-mono">{reportTotals.totalNet.toLocaleString()} kg</span>
                      </div>
                    </div>
                    <div className="col-span-2 border-t border-border/40 pt-2 grid grid-cols-2 gap-2 items-end">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Total Purchase</span>
                        <span className="text-foreground font-black font-mono block text-xs truncate">
                          {currencySymbol(form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                        <span className="text-emerald-600 block text-[8px] uppercase font-bold">Grand Final</span>
                        <span className="text-emerald-600 font-extrabold font-mono block text-xs truncate">
                          {currencySymbol(form.purchaseCurrency)}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <main className="lg:col-span-9 space-y-0 flex flex-col lg:order-2 order-2">
              {activeTab === "booking" && (
                <fieldset disabled={isTransferred && !session?.scopes?.isSuperAdmin} className="space-y-4 order-2 w-full mt-4">
                  <div className="border-b border-border pb-2 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Purchase Booking / Bill Info</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative" ref={purchaseDropdownRef}>
                      <label className="block text-[10px] text-muted-foreground mb-1">Purchase Account (DR)*</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={purchaseSearch}
                          onChange={(e) => handleTextChange("purchase", e.target.value)}
                          onFocus={() => {
                            setPurchaseDropdownOpen(true);
                            setPurchasePinDropdownOpen(false);
                            setPurchaseSearch(form.purchaseAccountName || form.purchaseAccountNo || "");
                          }}
                          className="w-full bg-background border border-input rounded pl-2.5 pr-8 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-8 font-mono"
                        />
                        <button
                          type="button"
                          disabled={!form.supplierId}
                          onClick={() => {
                            setPurchasePinDropdownOpen(prev => !prev);
                            setPurchaseDropdownOpen(false);
                          }}
                          className="absolute right-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
                        >
                          <Pin className={`h-3 w-3 ${purchasePinDropdownOpen ? "text-primary rotate-45" : ""}`} />
                        </button>
                      </div>

                      {purchaseDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-full max-w-[340px] rounded-xl bg-card border border-border shadow-2xl z-50 p-1.5 overflow-hidden">
                          <div className="max-h-56 overflow-y-auto space-y-0.5">
                            {dbAccounts.filter(acc => acc.accountCode?.toLowerCase().includes(purchaseSearch.toLowerCase()) || acc.accountName?.toLowerCase().includes(purchaseSearch.toLowerCase())).map((acc) => (
                              <button
                                key={acc.accountCode}
                                type="button"
                                onClick={() => {
                                  applyAccountMaster("purchase", acc);
                                  setPurchaseDropdownOpen(false);
                                  setPurchaseSearch("");
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-muted font-mono text-[9px]"
                              >
                                {acc.accountName} ({acc.accountCode})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={salesDropdownRef}>
                      <label className="block text-[10px] text-muted-foreground mb-1">Sales Account (CR)*</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={salesSearch}
                          onChange={(e) => handleTextChange("sales", e.target.value)}
                          onFocus={() => {
                            setSalesDropdownOpen(true);
                            setSalesPinDropdownOpen(false);
                            setSalesSearch(form.salesAccountName || form.salesAccountNo || "");
                          }}
                          className="w-full bg-background border border-input rounded pl-2.5 pr-8 py-1.5 text-foreground outline-none focus:border-primary text-[10px] h-8 font-mono"
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
                          <Pin className={`h-3 w-3 ${salesPinDropdownOpen ? "text-primary rotate-45" : ""}`} />
                        </button>
                      </div>
                      {salesDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-full max-w-[340px] rounded-xl bg-card border border-border shadow-2xl z-50 p-1.5 overflow-hidden">
                          <div className="max-h-56 overflow-y-auto space-y-0.5">
                            {dbAccounts.filter(acc => acc.accountCode?.toLowerCase().includes(salesSearch.toLowerCase()) || acc.accountName?.toLowerCase().includes(salesSearch.toLowerCase())).map((acc) => (
                              <button
                                key={acc.accountCode}
                                type="button"
                                onClick={() => {
                                  applyAccountMaster("sales", acc);
                                  setSalesDropdownOpen(false);
                                  setSalesSearch("");
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-muted font-mono text-[9px]"
                              >
                                {acc.accountName} ({acc.accountCode})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
                    <Button type="button" onClick={() => setActiveTab("goods")} className="font-bold text-[10px] h-8 px-10 bg-primary text-primary-foreground">Next</Button>
                  </div>
                </fieldset>
              )}

              {activeTab === "goods" && (
                <fieldset disabled={isTransferred && !session?.scopes?.isSuperAdmin} className="space-y-4 order-2 w-full mt-4">
                  <div className="border-b border-border pb-2 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Goods Entry</h3>
                  </div>

                  <div className="bg-muted/60 border border-border rounded p-3 grid grid-cols-1 md:grid-cols-4 gap-4 text-[9px]">
                    
                    {/* Left Side: Inputs */}
                    <div className="md:col-span-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-muted-foreground">NET KGS:</span>
                      <strong className="text-foreground font-bold">{currentItemTotals.netWeight.toFixed(2)}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Goods Name*</label>
                        <select
                          value={form.goodsName}
                          onChange={(e) => {
                            if (e.target.value === "__ADD_NEW_GOOD__") {
                              e.target.value = form.goodsName || "";
                              setNewGoodModal(true);
                              return;
                            }
                            const chosen = dbGoods.find(g => (g.goods_name || g.goodsName) === e.target.value);
                            setValue("goodsName", e.target.value);
                            if (chosen) {
                              const variations = chosen.variations || chosen.goods_variations || [];
                              if (variations.length > 0) {
                                const v = variations[0];
                                setValue("size", v.size || "");
                                setValue("brand", v.brand || "");
                                if (v.origin_country_id) {
                                  const c = transitCountryOptions.find(tc => tc.id === v.origin_country_id);
                                  if (c) setValue("origin", c.name);
                                } else {
                                  setValue("origin", "");
                                }
                              } else {
                                setValue("origin", "");
                                setValue("brand", "");
                                setValue("size", "");
                              }
                            } else {
                              setValue("origin", "");
                              setValue("brand", "");
                              setValue("size", "");
                            }
                            if (chosen?.chs_code || chosen?.chsCode) {
                              setValue("hsCode", chosen.chs_code || chosen.chsCode);
                            } else if (GOODS_HS_CODES[e.target.value]) {
                              setValue("hsCode", GOODS_HS_CODES[e.target.value]);
                            } else {
                              setValue("hsCode", "");
                            }
                          }}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="">Select Good...</option>
                          {dbGoods.length > 0
                            ? dbGoods.map((g) => {
                                const name = g.goods_name || g.goodsName || "";
                                return <option key={g.id || name} value={name}>{name}</option>;
                              })
                            : GOODS_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)
                          }
                          {form.goodsName && !dbGoods.some(g => (g.goods_name || g.goodsName) === form.goodsName) && (
                            <option value={form.goodsName}>{form.goodsName}</option>
                          )}
                          <option value="__ADD_NEW_GOOD__" className="text-primary font-semibold">+ Add New Good...</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Size Specification</label>
                        <select
                          value={form.size}
                          onChange={(e) => {
                            if (e.target.value === "__ADD_CUSTOM_SIZE__") {
                              e.target.value = form.size || "";
                              if (!form.goodsName) {
                                alert("Please select a Good first.");
                                return;
                              }
                              const curOrigin = transitCountryOptions.find(c => c.name === form.origin);
                              setCustomVariationForm({
                                goodsName: form.goodsName,
                                brand: form.brand || "",
                                size: form.size || "",
                                originCountryId: curOrigin?.id || ""
                              });
                              setCustomVariationModal(true);
                              return;
                            }
                            setValue("size", e.target.value);
                            setValue("brand", "");
                          }}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="">Select Size</option>
                          {availableSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                          {form.size && !availableSizes.some(s => s.trim().toUpperCase() === form.size.trim().toUpperCase()) && (
                            <option value={form.size.trim().toUpperCase()}>{form.size.trim().toUpperCase()}</option>
                          )}
                          <option value="__ADD_CUSTOM_SIZE__" className="text-primary font-semibold">+ Add Custom Size...</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Brand</label>
                        <select
                          value={form.brand}
                          onChange={(e) => {
                            if (e.target.value === "__ADD_CUSTOM_BRAND__") {
                              e.target.value = form.brand || "";
                              if (!form.goodsName) {
                                alert("Please select a Good first.");
                                return;
                              }
                              const curOrigin = transitCountryOptions.find(c => c.name === form.origin);
                              setCustomVariationForm({
                                goodsName: form.goodsName,
                                brand: form.brand || "",
                                size: form.size || "",
                                originCountryId: curOrigin?.id || ""
                              });
                              setCustomVariationModal(true);
                              return;
                            }
                            setValue("brand", e.target.value);
                            setValue("size", "");
                          }}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="">Select Brand</option>
                          {availableBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                          {form.brand && !availableBrands.some(b => b.trim().toUpperCase() === form.brand.trim().toUpperCase()) && (
                            <option value={form.brand.trim().toUpperCase()}>{form.brand.trim().toUpperCase()}</option>
                          )}
                          <option value="__ADD_CUSTOM_BRAND__" className="text-primary font-semibold">+ Add Custom Brand...</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Origin Country</label>
                        <select
                          value={form.origin}
                          onChange={(e) => {
                            if (e.target.value === "__ADD_NEW_COUNTRY__") {
                              e.target.value = form.origin || "";
                              setNewCountryModal(true);
                              return;
                            }
                            setValue("origin", e.target.value);
                            setValue("size", "");
                            setValue("brand", "");
                          }}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="">Select Origin</option>
                          {transitCountryOptions.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {form.origin && !transitCountryOptions.some(c => c.name === form.origin) && (
                            <option value={form.origin}>{form.origin}</option>
                          )}
                          <option value="__ADD_NEW_COUNTRY__" className="text-primary font-semibold">+ Add New Country...</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">HS Code</label>
                        <input
                          type="text"
                          value={form.hsCode}
                          onChange={(e) => setValue("hsCode", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Allot Name / ID</label>
                        <input
                          type="text"
                          value={form.allotName}
                          onChange={(e) => setValue("allotName", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        />
                      </div>
                    </div>

                    {/* Numeric Setup Flow */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Qty Name</label>
                        <select
                          value={form.qtyName}
                          onChange={(e) => setValue("qtyName", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          {QTY_TYPE_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Quantity No</label>
                        <input
                          type="number"
                          value={form.qtyNo}
                          onChange={(e) => setValue("qtyNo", Number(e.target.value))}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">1 Qty KGS</label>
                        <input
                          type="number"
                          value={form.qtyKgs}
                          onChange={(e) => setValue("qtyKgs", Number(e.target.value))}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">1 Empty KGS</label>
                        <input
                          type="number"
                          value={form.emptyKgs}
                          onChange={(e) => setValue("emptyKgs", Number(e.target.value))}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Divide Type</label>
                        <select
                          value={form.divideType}
                          onChange={handleDivideTypeChange}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="D/KGs">D/KGs</option>
                          <option value="D/Ton">D/Ton</option>
                          <option value="D/Bag">D/Bag</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Divide Weight / Value</label>
                        <input
                          type="number"
                          value={form.divideWeight}
                          onChange={(e) => setValue("divideWeight", Number(e.target.value))}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Price Type</label>
                        <select
                          value={form.priceType}
                          onChange={(e) => setValue("priceType", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="P/KGs">P/KGs</option>
                          <option value="P/Ton">P/Ton</option>
                          <option value="P/Bag">P/Bag</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Price Rate (C1)</label>
                        <input
                          type="number"
                          value={form.coursePrice}
                          onChange={(e) => setValue("coursePrice", Number(e.target.value))}
                          className="w-full bg-background border border-input rounded px-2 py-1.5 text-foreground outline-none focus:border-primary text-[10px]"
                        />
                      </div>
                    </div>

                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Quality Report Reference</label>
                        <input
                          type="text"
                          value={form.qualityReport}
                          onChange={(e) => setValue("qualityReport", e.target.value)}
                          className="w-full bg-background border border-input rounded px-3 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                          placeholder="Passed"
                        />
                      </div>
                    </div>

                    {/* Right Side: Currency Box */}
                    <div className="md:col-span-1">
                      <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20 space-y-2 h-full">
                      <span className="block text-[10px] font-black uppercase text-primary tracking-wider mb-2">Purchase Currency & Conversion</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1">Pricing Currency</label>
                          <select
                            value={form.currencyType || ""}
                            onChange={(e) => setValue("currencyType", e.target.value)}
                            className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px] font-bold"
                          >
                            <option value="">Select</option>
                            {["USD", "AED", "PKR", "INR", "AFN"].map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1">Ledger Currency (Branch)*</label>
                          <input
                            value={form.purchaseCurrency || ""}
                            disabled
                            className="w-full bg-muted/40 border border-input rounded px-2 py-1 text-emerald-700 dark:text-emerald-400 font-bold outline-none text-[10px]"
                          />
                        </div>
                      </div>

                      <div className="pt-1">
                        <label className="block text-[10px] text-muted-foreground mb-1">Exchange Rate*</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={form.exchangeRate}
                          onChange={(e) => setValue("exchangeRate", parseFloat(e.target.value) || 1)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px] font-bold"
                        />
                      </div>
                    </div>

                      </div>
                    </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleAddGoodsEntry}
                        disabled={isTransferred && !session?.scopes?.isSuperAdmin}
                        className="font-black text-[10px] px-6 h-8 shadow bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        + Add to List
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const keysToClear = ["goodsName", "size", "brand", "origin", "hsCode", "qtyNo", "qtyKgs", "emptyKgs", "divideWeight", "coursePrice", "qualityReport", "allotName"];
                          keysToClear.forEach(k => setValue(k, ""));
                        }}
                        className="font-bold text-[10px] px-4 h-8"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("booking")}
                        className="font-bold text-[10px] px-6 h-8"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab("others")}
                        className="font-bold text-[10px] px-6 h-8 bg-primary text-primary-foreground"
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                  {/* GOODS LIST TABLE */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3 border-b border-border/60 pb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-primary">Goods List</h4>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border bg-background shadow-sm">
                      <table className="w-full text-[9px] text-foreground border-collapse text-left whitespace-nowrap">
                        <thead>
                          <tr className="bg-muted/80 text-muted-foreground border-b border-border font-bold uppercase tracking-wider">
                            <th className="px-3 py-2.5 text-center w-8">#</th>
                            <th className="px-3 py-2.5">Goods Name</th>
                            <th className="px-3 py-2.5 text-center">HS Code</th>
                            <th className="px-3 py-2.5 text-center">Origin</th>
                            <th className="px-3 py-2.5 text-center">Brand</th>
                            <th className="px-3 py-2.5 text-center">Size</th>
                            <th className="px-3 py-2.5 text-right">Qty</th>
                            <th className="px-3 py-2.5 text-center">Unit</th>
                            <th className="px-3 py-2.5 text-right">Price ({form.purchaseCurrency || form.currencyType})</th>
                            <th className="px-3 py-2.5 text-right">Amount ({form.purchaseCurrency || form.currencyType})</th>
                            <th className="px-3 py-2.5 text-center">Ex. Rate</th>
                            <th className="px-3 py-2.5 text-right bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Amount ({form.currencyType})</th>
                            <th className="px-3 py-2.5 text-center w-10">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {goodsEntries.length === 0 ? (
                            <tr>
                              <td colSpan={13} className="px-3 py-6 text-center text-muted-foreground italic font-semibold text-[10px]">
                                No goods added yet. Add an item above to see it here.
                              </td>
                            </tr>
                          ) : (
                            goodsEntries.map((row, index) => (
                              <tr key={index} className="border-t border-border hover:bg-muted/50 transition">
                                <td className="px-3 py-2 text-center font-mono text-muted-foreground">{index + 1}</td>
                                <td className="px-3 py-2 font-black text-primary">{row.goodsName}</td>
                                <td className="px-3 py-2 text-center font-mono text-muted-foreground">{row.hsCode}</td>
                                <td className="px-3 py-2 text-center font-semibold">{row.origin}</td>
                                <td className="px-3 py-2 text-center font-semibold">{row.brand}</td>
                                <td className="px-3 py-2 text-center font-semibold">{row.size}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold">{row.qtyNo.toLocaleString()}</td>
                                <td className="px-3 py-2 text-center font-semibold">{row.qtyName}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-muted-foreground">{row.coursePrice.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right font-mono font-black text-yellow-600 dark:text-yellow-450">{row.totalAmount.toLocaleString()}</td>
                                <td className="px-3 py-2 text-center font-mono text-muted-foreground">{row.exchangeRate}</td>
                                <td className="px-3 py-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                                  {row.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setGoodsEntries(prev => prev.filter((_, idx) => idx !== index))}
                                    className="text-red-500 hover:text-red-400 font-bold p-1 rounded transition bg-red-500/10 hover:bg-red-500/20"
                                    title="Delete Item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </fieldset>
              )}

              {/* TAB 3: DETAILS (OTHERS) */}
              {activeTab === "others" && (
                <fieldset disabled={isTransferred && !session?.scopes?.isSuperAdmin} className="space-y-4 order-2 w-full mt-4">
                  <div className="border-b border-border pb-2 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Details & Reports</h3>
                    <p className="text-[10px] text-muted-foreground">Secondary details and database submission</p>
                  </div>

                  <div className="space-y-3">
                    {/* Payment Details & reactive calculations */}
                    <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-3 mb-3">
                      <div className="flex justify-between items-center border-b border-border/60 pb-1.5">
                        <span className="text-[10px] font-black uppercase text-primary tracking-wider">Payment Terms Info</span>
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{form.paymentType}</span>
                      </div>

                      {form.paymentType === "Advance Payment" ? (
                        <div className="space-y-3">
                          {/* Single Advance Percentage Selector */}
                          <div className="bg-background/80 border border-border/60 rounded-lg p-2.5 space-y-2">
                            <label className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                              Advance Payment Percentage (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={form.advancePercent || 0}
                                onChange={(e) => setValue("advancePercent", Number(e.target.value))}
                                className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={form.advancePercent || 0}
                                onChange={(e) => setValue("advancePercent", Math.min(100, Math.max(0, Number(e.target.value))))}
                                className="w-10 bg-background border border-input rounded px-1 py-0.5 text-center text-[10px] font-bold font-mono"
                              />
                            </div>
                          </div>

                          {/* Mandatory Advance Date Input & Payment Date Input */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[9px] text-primary font-black uppercase tracking-wider mb-0.5">
                                Advance Date*
                              </label>
                              <input
                                type="date"
                                value={form.advancePaymentDate || ""}
                                onChange={(e) => setValue("advancePaymentDate", e.target.value)}
                                className="w-full bg-background border border-primary/40 focus:border-primary rounded px-2 py-1 text-foreground text-[10px] outline-none font-mono"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                                Payment Date
                              </label>
                              <input
                                type="date"
                                value={form.paymentDate || ""}
                                onChange={(e) => setValue("paymentDate", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none font-mono"
                              />
                            </div>
                          </div>

                          {/* Days / Mode / Method Report Details */}
                          <div>
                            <label className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                              Days & Method Details (Schedule Report)
                            </label>
                            <textarea
                              rows={2}
                              value={form.paymentDaysAndMethodDetails || ""}
                              onChange={(e) => setValue("paymentDaysAndMethodDetails", e.target.value)}
                              className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none resize-none"
                              placeholder="e.g. Pay within 7 days via wire transfer..."
                            />
                          </div>

                          {/* Calculations under the single percentage */}
                          <div className="grid grid-cols-1 gap-2.5 pt-1.5 border-t border-border/40">
                            {/* Purchase Side */}
                            <div className="border border-border/60 rounded-lg p-2.5 bg-background/50 space-y-1.5">
                              <span className="block text-[8px] font-black uppercase text-primary/85 tracking-wider">
                                Purchase Account ({form.purchaseAccountNo})
                              </span>
                              <div className="grid grid-cols-3 gap-1 text-[9px] leading-tight text-center font-medium">
                                <div>
                                  <span className="text-muted-foreground block text-[7px] uppercase">Total</span>
                                  <strong className="text-foreground block font-mono">
                                    {currencySymbol(form.purchaseAccountCurrency || form.currencyType)}
                                    {reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-primary block text-[7px] uppercase font-bold">Advance Paid</span>
                                  <strong className="text-primary block font-mono font-bold">
                                    {currencySymbol(form.purchaseAccountCurrency || form.currencyType)}
                                    {((reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[7px] uppercase">Remaining</span>
                                  <strong className="text-foreground block font-mono">
                                    {currencySymbol(form.purchaseAccountCurrency || form.currencyType)}
                                    {(reportTotals.grandPrimaryFinal - (reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* Sales Side */}
                            <div className="border border-border/60 rounded-lg p-2.5 bg-background/50 space-y-1.5">
                              <span className="block text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-wider">
                                Sales Account ({form.salesAccountNo})
                              </span>
                              <div className="grid grid-cols-3 gap-1 text-[9px] leading-tight text-center font-medium">
                                <div>
                                  <span className="text-muted-foreground block text-[7px] uppercase">Total</span>
                                  <strong className="text-foreground block font-mono">
                                    {currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}
                                    {reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-emerald-600 dark:text-emerald-500 block text-[7px] uppercase font-bold">Advance Recd</span>
                                  <strong className="text-emerald-600 dark:text-emerald-400 block font-mono font-bold">
                                    {currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}
                                    {((reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[7px] uppercase">Remaining</span>
                                  <strong className="text-foreground block font-mono">
                                    {currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}
                                    {(reportTotals.grandFinal - (reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-border/40">
                            <Button
                              type="button"
                              onClick={() => setShowTransferScreen(true)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-8 uppercase tracking-wider"
                            >
                              Open Purchase Transfer Payment Screen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground italic py-1">
                          No advance calculations configured for this payment condition ({form.paymentType}).
                        </div>
                      )}
                    </div>

                    {/* Dynamic Loading Details */}
                    <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-3 mb-3">
                      <div className="flex justify-between items-center border-b border-border/60 pb-1.5">
                        <span className="text-[10px] font-black uppercase text-primary tracking-wider">Loading & Transit Rules</span>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded font-bold font-mono">{form.shippingMode}</span>
                      </div>

                      {form.shippingMode === "By Sea" && (
                        <div className="space-y-2 text-[10px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Country</label>
                              <SearchableSelect
                                value={form.loadingCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    setNewCountryModal(true);
                                    return;
                                  }
                                  setValue("loadingCountry", val);
                                }}
                                options={transitCountryOptions.map((c) => ({ label: c.name, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country..."
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Port</label>
                              <SearchableSelect
                                value={form.loadingPort || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    if (!form.loadingCountry) {
                                      alert("Please select Loading Country first.");
                                      return;
                                    }
                                    setNewPortForm({
                                      portName: "",
                                      countryName: form.loadingCountry,
                                      transportType: "sea",
                                      side: "loading"
                                    });
                                    setNewPortModal(true);
                                    return;
                                  }
                                  setValue("loadingPort", val);
                                }}
                                options={seaLoadingPorts.map((p) => ({ label: p.port_name, value: p.port_name }))}
                                placeholder="Select Port"
                                addOptionLabel={form.loadingCountry ? "Add New Port..." : undefined}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Date</label>
                              <input
                                type="date"
                                value={form.loadingDate || ""}
                                onChange={(e) => setValue("loadingDate", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Country</label>
                              <SearchableSelect
                                value={form.receivedCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    setNewCountryModal(true);
                                    return;
                                  }
                                  setValue("receivedCountry", val);
                                }}
                                options={transitCountryOptions.map((c) => ({ label: c.name, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country..."
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Port</label>
                              <SearchableSelect
                                value={form.receivedPort || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    if (!form.receivedCountry) {
                                      alert("Please select Received Country first.");
                                      return;
                                    }
                                    setNewPortForm({
                                      portName: "",
                                      countryName: form.receivedCountry,
                                      transportType: "sea",
                                      side: "received"
                                    });
                                    setNewPortModal(true);
                                    return;
                                  }
                                  setValue("receivedPort", val);
                                }}
                                options={seaReceivedPorts.map((p) => ({ label: p.port_name, value: p.port_name }))}
                                placeholder="Select Port"
                                addOptionLabel={form.receivedCountry ? "Add New Port..." : undefined}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Date</label>
                              <input
                                type="date"
                                value={form.receivedDate || ""}
                                onChange={(e) => setValue("receivedDate", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2 mt-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Container Size</label>
                              <select
                                value={form.containerSize || "40 FT"}
                                onChange={(e) => setValue("containerSize", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              >
                                {CONTAINER_TYPES.map(ct => (
                                  <option key={ct} value={ct}>{ct}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Container Name / Number(s)</label>
                              <input
                                type="text"
                                value={form.containerNumbers || ""}
                                onChange={(e) => setValue("containerNumbers", e.target.value)}
                                placeholder="e.g. CONT-001"
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {form.shippingMode === "By Road" && (
                        <div className="space-y-2 text-[10px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Country</label>
                              <SearchableSelect
                                value={form.loadingCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    setNewCountryModal(true);
                                    return;
                                  }
                                  setValue("loadingCountry", val);
                                }}
                                options={transitCountryOptions.map((c) => ({ label: c.name, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country..."
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Border</label>
                              <SearchableSelect
                                value={form.loadingBorder || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    if (!form.loadingCountry) {
                                      alert("Please select Loading Country first.");
                                      return;
                                    }
                                    setNewPortForm({
                                      portName: "",
                                      countryName: form.loadingCountry,
                                      transportType: "road",
                                      side: "loading"
                                    });
                                    setNewPortModal(true);
                                    return;
                                  }
                                  setValue("loadingBorder", val);
                                }}
                                options={roadLoadingPorts.map((p) => ({ label: p.port_name, value: p.port_name }))}
                                placeholder="Select Border"
                                addOptionLabel={form.loadingCountry ? "Add New Border..." : undefined}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Date</label>
                              <input
                                type="date"
                                value={form.loadingDate || ""}
                                onChange={(e) => setValue("loadingDate", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Country</label>
                              <SearchableSelect
                                value={form.receivedCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    setNewCountryModal(true);
                                    return;
                                  }
                                  setValue("receivedCountry", val);
                                }}
                                options={transitCountryOptions.map((c) => ({ label: c.name, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country..."
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Border</label>
                              <SearchableSelect
                                value={form.receivedBorder || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    if (!form.receivedCountry) {
                                      alert("Please select Received Country first.");
                                      return;
                                    }
                                    setNewPortForm({
                                      portName: "",
                                      countryName: form.receivedCountry,
                                      transportType: "road",
                                      side: "received"
                                    });
                                    setNewPortModal(true);
                                    return;
                                  }
                                  setValue("receivedBorder", val);
                                }}
                                options={roadReceivedPorts.map((p) => ({ label: p.port_name, value: p.port_name }))}
                                placeholder="Select Border"
                                addOptionLabel={form.receivedCountry ? "Add New Border..." : undefined}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Date</label>
                              <input
                                type="date"
                                value={form.receivedDate || ""}
                                onChange={(e) => setValue("receivedDate", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {form.shippingMode === "By Air" && (
                        <div className="space-y-2 text-[10px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Country</label>
                              <SearchableSelect
                                value={form.loadingCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    setNewCountryModal(true);
                                    return;
                                  }
                                  setValue("loadingCountry", val);
                                }}
                                options={transitCountryOptions.map((c) => ({ label: c.name, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country..."
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Airport Name</label>
                              <SearchableSelect
                                value={form.airportName || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    if (!form.loadingCountry) {
                                      alert("Please select Loading Country first.");
                                      return;
                                    }
                                    setNewPortForm({
                                      portName: "",
                                      countryName: form.loadingCountry,
                                      transportType: "air",
                                      side: "loading"
                                    });
                                    setNewPortModal(true);
                                    return;
                                  }
                                  setValue("airportName", val);
                                }}
                                options={airLoadingPorts.map((p) => ({ label: p.port_name, value: p.port_name }))}
                                placeholder="Select Airport"
                                addOptionLabel={form.loadingCountry ? "Add New Airport..." : undefined}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Airline Name</label>
                              <input
                                type="text"
                                value={form.airlineName || ""}
                                onChange={(e) => setValue("airlineName", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. Emirates"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Date</label>
                              <input
                                type="date"
                                value={form.loadingDate || ""}
                                onChange={(e) => setValue("loadingDate", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Country</label>
                              <SearchableSelect
                                value={form.receivedCountry || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    setNewCountryModal(true);
                                    return;
                                  }
                                  setValue("receivedCountry", val);
                                }}
                                options={transitCountryOptions.map((c) => ({ label: c.name, value: c.name }))}
                                placeholder="Select Country"
                                addOptionLabel="Add New Country..."
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Airport Name</label>
                              <SearchableSelect
                                value={form.receivedPortName || ""}
                                onChange={(val) => {
                                  if (val === "__ADD_NEW__") {
                                    if (!form.receivedCountry) {
                                      alert("Please select Received Country first.");
                                      return;
                                    }
                                    setNewPortForm({
                                      portName: "",
                                      countryName: form.receivedCountry,
                                      transportType: "air",
                                      side: "received"
                                    });
                                    setNewPortModal(true);
                                    return;
                                  }
                                  setValue("receivedPortName", val);
                                }}
                                options={airReceivedPorts.map((p) => ({ label: p.port_name, value: p.port_name }))}
                                placeholder="Select Airport"
                                addOptionLabel={form.receivedCountry ? "Add New Airport..." : undefined}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Agent / Transporter Name</label>
                              <input
                                type="text"
                                value={form.receivedAgentName || ""}
                                onChange={(e) => setValue("receivedAgentName", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. DHL Air Express"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Carrier / Agent Name</label>
                              <input
                                type="text"
                                value={form.transportAgent || ""}
                                onChange={(e) => setValue("transportAgent", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. DHL Air Express"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Remarks Narration</label>
                      <textarea
                        rows={3}
                        value={form.remarks || ""}
                        onChange={(e) => setValue("remarks", e.target.value)}
                        className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground outline-none focus:border-primary resize-none text-[10px]"
                        placeholder="Add transaction remarks..."
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex flex-col gap-1.5">
                    <Button
                      type="button"
                      onClick={() => setActiveTab("report")}
                      className="w-full font-bold h-7.5 text-[10px] py-1 shadow uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Next Step (Report)
                    </Button>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("goods")}
                        className="flex-1 font-bold h-7.5 text-[10px] py-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 font-bold h-7.5 text-[10px] py-1 uppercase"
                      >
                        + Add New
                      </Button>
                    </div>
                  </div>
                </fieldset>
              )}
          {/* Feedback messages */}
          {saveMessage && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 font-bold flex gap-2 items-center text-[10px]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {accountLookupMessage && (
            <div className="rounded-lg border border-border bg-muted/40 text-muted-foreground p-3 text-[10px] leading-relaxed">
              {accountLookupMessage}
            </div>
          )}

          {/* GLOBAL INFO CARDS (Always visible at top) */}
          <div className="order-1 w-full">
            <div className="bg-card border border-border shadow-md rounded-lg p-3 relative">
            {/* Horizontal Cards row */}
            <div className="z-10 bg-card pb-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                
                {/* Card 1: Branch Login Details */}
                <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                  <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                    <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <Building2 className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Branch Login Details</h4>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="space-y-0.5 border-b border-border/40 pb-1.5 mb-1.5">
                      <span className="text-muted-foreground block text-[8px] uppercase font-bold">Branch Name</span>
                      <span className="font-black text-primary block truncate text-xs" title={form.branchName}>{form.branchName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Branch Code:</span> <span className="font-semibold text-foreground font-mono">{form.branchCode || "N/A"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">User Admin:</span> <span className="font-black text-emerald-600 dark:text-emerald-450 uppercase">{form.userName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">User ID:</span> <span className="font-semibold text-foreground font-mono text-[9px]">{form.userId || "N/A"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Login Time:</span> <span className="font-semibold text-foreground">14:35:02</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IP Address:</span> <span className="font-semibold text-foreground font-mono text-[9px]">192.168.1.1</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Location:</span> <span className="font-semibold text-foreground truncate" title="Sargodha, PK">Sargodha, PK</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Country:</span> <span className="font-semibold text-foreground truncate" title={form.branchCountry}>{form.branchCountry || "N/A"}</span></div>
                  </div>
                </div>

                {/* Card 2: Bill Details */}
                <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                  <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                    <span className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bill Details</h4>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between"><span className="text-muted-foreground">Booking Date:</span> <span className="font-semibold text-foreground">{form.purchaseDate}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fiscal Year:</span> <span className="font-semibold text-foreground">2025-26</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status:</span> <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-1.5 py-0.2 text-[8px] font-bold text-yellow-600 dark:text-yellow-450 uppercase">{form.salesStatus}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">GPBO Serial:</span> <span className="font-bold text-foreground truncate font-mono" title={form.purchaseOrderNo}>{form.purchaseOrderNo}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">BPBO Serial:</span> <span className="font-bold text-foreground truncate font-mono" title={form.billNo}>{form.billNo}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Contract No:</span> <span className="font-semibold text-foreground truncate font-mono" title={form.purchaseContractNo}>{form.purchaseContractNo}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Loading Mode:</span> <span className="font-semibold text-foreground truncate" title={form.shippingMode}>{form.shippingMode || "N/A"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Origin Country:</span> <span className="font-semibold text-foreground truncate" title={form.origin || form.branchCountry}>{form.origin || form.branchCountry || "N/A"}</span></div>
                  </div>
                </div>

                {/* Card 3: Purchase Account Details */}
                <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                  <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                    <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Purchase Account Details</h4>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between"><span className="text-muted-foreground">Account Code:</span> <span className="font-bold text-foreground truncate block w-full text-right font-mono" title={form.purchaseAccountNo}>{form.purchaseAccountNo}</span></div>
                    <div className="space-y-0.5 pt-1">
                      <span className="text-muted-foreground block text-[9px]">Account Name:</span>
                      <span className="font-semibold text-foreground block truncate text-xs text-primary" title={form.purchaseAccountName}>{form.purchaseAccountName}</span>
                    </div>
                    <div className="flex justify-between pt-1"><span className="text-muted-foreground">Branch:</span> <span className="font-semibold text-foreground truncate" title={form.purchaseAccountBranch}>{form.purchaseAccountBranch}</span></div>
                    <div className="flex justify-between pt-0.5"><span className="text-muted-foreground">Currency:</span> <span className="font-bold text-foreground">{form.purchaseAccountCurrency}</span></div>
                    <div className="flex justify-between items-center pt-0.5 border-t border-border/20 mt-1 relative" ref={purchaseCompanyDropdownRef}>
                      <span className="text-muted-foreground font-semibold">Company:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-foreground truncate max-w-[100px] text-[8.5px] text-right font-mono" title={form.purchaseCompanyName ? `${form.purchaseCompanyName} (${form.purchaseCompanyCode || "COM-N/A"})` : "None"}>
                          {form.purchaseCompanyName ? `${form.purchaseCompanyName} (${form.purchaseCompanyCode || "COM-N/A"})` : "None"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPurchaseCompanySelectOpen(prev => !prev)}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0"
                          title="Select Company"
                        >
                          <Pin className={`h-2.5 w-2.5 ${purchaseCompanySelectOpen ? "text-primary fill-primary/25" : ""}`} />
                        </button>
                      </div>

                      {purchaseCompanySelectOpen && (
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
                                      setValue("purchaseCompanyId", c.id);
                                      setValue("purchaseCompanyName", c.name);
                                      setValue("purchaseCompanyCode", cCode);
                                      setPurchaseCompanySelectOpen(false);
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
                          <div className="border-t border-border/40 pt-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPurchaseCompanySelectOpen(false);
                                setCreateCompanyType("purchase");
                                setCreateCompanyForm({ name: "", legalName: "", baseCurrency: "USD" });
                                setCreateCompanyError("");
                                setCreateCompanyModalOpen(true);
                              }}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold text-primary hover:bg-primary/5 transition text-left"
                            >
                              <span className="text-xs">+</span>
                              <span>New Company</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {form.purchaseAccountName && (
                      <div className="mt-2 pt-2 border-t border-border/40 space-y-2 text-[9px] font-mono text-muted-foreground">
                        {/* Category & Control Type */}
                        <div className="grid grid-cols-2 gap-1 pb-1.5 border-b border-border/20">
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Kind</span>
                            <span className="font-bold text-foreground uppercase">{form.purchaseAccountKind || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Type</span>
                            <span className="font-bold text-foreground truncate block">
                              {form.purchaseAccountIsControl ? "Control" : "Sub-Acct"}
                            </span>
                          </div>
                        </div>

                        {/* Serials Sub-Grid */}
                        <div className="bg-muted/30 p-1.5 rounded-lg border border-border/30 space-y-1">
                          <span className="text-[7.5px] font-black text-primary block uppercase tracking-wider">Serials & Ref</span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Acct S/N</span>
                              <span className="font-semibold text-foreground/90">{form.purchaseAccountSerialNumber || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Country S/N</span>
                              <span className="font-semibold text-foreground/90">{form.purchaseAccountCountrySerialNumber || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Branch S/N</span>
                              <span className="font-semibold text-foreground/90">{form.purchaseAccountBranchSerialNumber || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Manual Ref</span>
                              <span className="font-semibold text-foreground/90">{form.purchaseAccountManualReferenceNumber || "-"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Balances */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Opening Bal</span>
                            <span className="font-bold text-foreground">
                              {currencySymbol(form.purchaseAccountCurrency)} {formatNumber(form.purchaseAccountOpeningBalance)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Current Bal</span>
                            <span className={`font-bold ${form.purchaseAccountCurrentBalance >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600 dark:text-rose-450"}`}>
                              {currencySymbol(form.purchaseAccountCurrency)} {formatNumber(form.purchaseAccountCurrentBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Contact Info */}
                        {(form.purchaseAccountMobile || form.purchaseAccountWhatsapp) && (
                          <div className="border-t border-border/20 pt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                            {form.purchaseAccountMobile && (
                              <div>
                                <span className="text-[7.5px] text-muted-foreground mr-0.5 font-bold">MOB:</span>
                                <span className="text-foreground font-semibold">{form.purchaseAccountMobile}</span>
                              </div>
                            )}
                            {form.purchaseAccountWhatsapp && (
                              <div>
                                <span className="text-[7.5px] text-emerald-600 dark:text-emerald-450 mr-0.5 font-bold">WA:</span>
                                <span className="text-foreground font-semibold">{form.purchaseAccountWhatsapp}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 4: Sales Account Details */}
                <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                  <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                    <span className="p-1 rounded-md bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
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
                    <div className="flex justify-between pt-0.5"><span className="text-muted-foreground">Currency:</span> <span className="font-bold text-foreground">{form.salesAccountCurrency}</span></div>
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
                          <div className="border-t border-border/40 pt-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSalesCompanySelectOpen(false);
                                setCreateCompanyType("sales");
                                setCreateCompanyForm({ name: "", legalName: "", baseCurrency: "USD" });
                                setCreateCompanyError("");
                                setCreateCompanyModalOpen(true);
                              }}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold text-primary hover:bg-primary/5 transition text-left"
                            >
                              <span className="text-xs">+</span>
                              <span>New Company</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {form.salesAccountName && (
                      <div className="mt-2 pt-2 border-t border-border/40 space-y-2 text-[9px] font-mono text-muted-foreground">
                        {/* Category & Control Type */}
                        <div className="grid grid-cols-2 gap-1 pb-1.5 border-b border-border/20">
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Kind</span>
                            <span className="font-bold text-foreground uppercase">{form.salesAccountKind || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Type</span>
                            <span className="font-bold text-foreground truncate block">
                              {form.salesAccountIsControl ? "Control" : "Sub-Acct"}
                            </span>
                          </div>
                        </div>

                        {/* Serials Sub-Grid */}
                        <div className="bg-muted/30 p-1.5 rounded-lg border border-border/30 space-y-1">
                          <span className="text-[7.5px] font-black text-primary block uppercase tracking-wider">Serials & Ref</span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Acct S/N</span>
                              <span className="font-semibold text-foreground/90">{form.salesAccountSerialNumber || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Country S/N</span>
                              <span className="font-semibold text-foreground/90">{form.salesAccountCountrySerialNumber || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Branch S/N</span>
                              <span className="font-semibold text-foreground/90">{form.salesAccountBranchSerialNumber || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[7px] text-muted-foreground block">Manual Ref</span>
                              <span className="font-semibold text-foreground/90">{form.salesAccountManualReferenceNumber || "-"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Balances */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Opening Bal</span>
                            <span className="font-bold text-foreground">
                              {currencySymbol(form.salesAccountCurrency)} {formatNumber(form.salesAccountOpeningBalance)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[7.5px] text-muted-foreground block uppercase">Current Bal</span>
                            <span className={`font-bold ${form.salesAccountCurrentBalance >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600 dark:text-rose-450"}`}>
                              {currencySymbol(form.salesAccountCurrency)} {formatNumber(form.salesAccountCurrentBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Contact Info */}
                        {(form.salesAccountMobile || form.salesAccountWhatsapp) && (
                          <div className="border-t border-border/20 pt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                            {form.salesAccountMobile && (
                              <div>
                                <span className="text-[7.5px] text-muted-foreground mr-0.5 font-bold">MOB:</span>
                                <span className="text-foreground font-semibold">{form.salesAccountMobile}</span>
                              </div>
                            )}
                            {form.salesAccountWhatsapp && (
                              <div>
                                <span className="text-[7.5px] text-emerald-600 dark:text-emerald-450 mr-0.5 font-bold">WA:</span>
                                <span className="text-foreground font-semibold">{form.salesAccountWhatsapp}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
          </div>

        {activeTab === "report" && (
          <div className="order-3 w-full mt-4 animate-in fade-in duration-500 space-y-4">
            
            {/* Dynamic Report Section */}
            <div className="bg-card border border-border shadow-md rounded-lg p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                  <div className="w-full md:w-80">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block tracking-wider">
                      Select Saved Report
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedReportId}
                      onChange={(e) => setSelectedReportId(e.target.value)}
                    >
                      <option value="">-- Choose a Report --</option>
                      {reportsList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.description ? ` - ${r.description}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-5">
                    <Button
                      type="button"
                      onClick={() => setIsNewReportModalOpen(true)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 font-semibold text-xs"
                    >
                      + New Report
                    </Button>
                  </div>
                </div>

                {selectedReportId && (
                  <div className="flex items-center gap-2 pt-5 flex-wrap">
                    <Button type="button" onClick={handleUpdateCurrentReport} className="h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700">Save</Button>
                    <Button type="button" onClick={handleOpenA4Report} className="h-8 text-[11px] font-bold bg-slate-600 hover:bg-slate-700">View/Print</Button>
                    <Button type="button" onClick={handleOpenA4Report} className="h-8 text-[11px] font-bold bg-rose-600 hover:bg-rose-700">PDF Export</Button>
                    <Button type="button" onClick={() => handleDeleteReport(selectedReportId)} className="h-8 text-[11px] font-bold" variant="destructive">Delete</Button>
                  </div>
                )}
              </div>

              {selectedReportId && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm">
                  {reportsList.find(r => r.id === selectedReportId) && (
                    <>
                      <div className="font-bold text-foreground mb-1">
                        Report Name: <span className="font-normal">{reportsList.find(r => r.id === selectedReportId).name}</span>
                      </div>
                      <div className="font-bold text-foreground mb-1">
                        Description: <span className="font-normal">{reportsList.find(r => r.id === selectedReportId).description || "N/A"}</span>
                      </div>
                      <div className="font-bold text-foreground">
                        Notes: <span className="font-normal">{reportsList.find(r => r.id === selectedReportId).notes || "N/A"}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Goods and Container Report Section */}
            <div className="bg-card border border-border shadow-md rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="w-12 h-[1px] bg-border"></span>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] whitespace-nowrap">
                  Goods and Container Report
                </span>
                <span className="w-12 h-[1px] bg-border"></span>
              </div>

              {/* Dense table wrapper */}
              <div className="overflow-x-auto rounded border border-border bg-background">
                <table className="w-full text-[10px] text-foreground border-collapse min-w-[1600px] text-left">
                  <thead>
                    <tr className="bg-muted text-muted-foreground border-b border-border font-bold uppercase tracking-wider">
                      <th className="px-2 py-3 text-center w-10">SR#</th>
                      <th className="px-2 py-3">Allot Name</th>
                      <th className="px-2 py-3">Good Name</th>
                      <th className="px-2 py-3 text-center">Size</th>
                      <th className="px-2 py-3 text-center">Brand</th>
                      <th className="px-2 py-3 text-center">Origin</th>
                      <th className="px-2 py-3 text-center">HS Code</th>
                      <th className="px-2 py-3">Qty Name</th>
                      <th className="px-2 py-3 text-right">Qty No</th>
                      <th className="px-2 py-3 text-right">1 Qty KGS</th>
                      <th className="px-2 py-3 text-right">Gross Weight</th>
                      <th className="px-2 py-3 text-right text-red-500 font-bold">Empty KGS</th>
                      <th className="px-2 py-3 text-right font-black bg-muted">Net Weight</th>
                      <th className="px-2 py-3 text-center">Price Type</th>
                      <th className="px-2 py-3 text-center">Divide Type</th>
                      <th className="px-2 py-3 text-center">Divide Value</th>
                      <th colSpan={3} className="px-2 py-3 text-center bg-primary/10 text-yellow-600 dark:text-yellow-450 font-bold">Purchase Currency</th>
                      <th className="px-2 py-3 text-center w-8">Rate</th>
                      <th className="px-2 py-3 text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black">Local Amount</th>
                      <th className="px-2 py-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goodsEntries.length === 0 ? (
                      <tr>
                        <td colSpan={23} className="px-2 py-8 text-center text-muted-foreground font-bold italic">
                          No items loaded in the report list. Add goods via the Goods Entry tab.
                        </td>
                      </tr>
                    ) : (
                      goodsEntries.map((row, index) => (
                        <tr key={index} className="border-t border-border hover:bg-muted/50 transition">
                          <td className="px-2 py-2.5 text-center font-mono text-muted-foreground">{String(index + 1).padStart(2, "0")}</td>
                          <td className="px-2 py-2.5 font-semibold text-foreground">{row.allotName}</td>
                          <td className="px-2 py-2.5 text-primary font-extrabold">{row.goodsName}</td>
                          <td className="px-2 py-2.5 text-center text-foreground">{row.size}</td>
                          <td className="px-2 py-2.5 text-center">
                            <span className="bg-muted text-foreground font-semibold px-2 py-0.5 rounded text-[9px] border border-border">
                              {row.brand}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center text-foreground">{row.origin}</td>
                          <td className="px-2 py-2.5 text-center font-mono text-muted-foreground">{row.hsCode}</td>
                          <td className="px-2 py-2.5 text-foreground font-semibold">{row.qtyName}</td>
                          <td className="px-2 py-2.5 text-right font-mono">{row.qtyNo.toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-right font-mono">{row.qtyKgs.toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right font-mono">{row.grossWeight.toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-right font-mono text-rose-500 font-bold">{(row.qtyNo * row.emptyKgs).toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right font-black bg-muted text-foreground font-mono">{row.netWeight.toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-center text-muted-foreground">{row.priceType}</td>
                          <td className="px-2 py-2.5 text-center text-muted-foreground">{row.divideType}</td>
                          <td className="px-2 py-2.5 text-center font-mono text-muted-foreground">{row.divideWeight || 1}</td>
                          
                          {/* Purchase Currency colSpan */}
                          <td className="px-2 py-2.5 text-center font-bold text-yellow-600 dark:text-yellow-450 bg-primary/5">{row.purchaseCurrency || form.purchaseCurrency || form.currencyType}</td>
                          <td className="px-2 py-2.5 text-right font-mono bg-primary/5">{row.coursePrice.toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right font-mono bg-primary/5">{row.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          
                          {/* Exchange Rate */}
                          <td className="px-2 py-2.5 text-center font-bold text-muted-foreground font-mono">{row.exchangeRate || form.exchangeRate || 1}</td>
                          
                          {/* Local Amount */}
                          <td className="px-2 py-2.5 text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black font-mono">
                            {currencySymbol(form.currencyType)}{row.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Action Column */}
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setGoodsEntries(prev => prev.filter((_, idx) => idx !== index))}
                              className="text-red-500 hover:text-red-400 font-bold py-0.5 px-1.5 rounded transition"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/80 font-bold border-t-2 border-border text-[9px]">
                      <td colSpan={8} className="px-2 py-3 text-right">Totals:</td>
                      <td className="px-2 py-3 text-right font-mono">{reportTotals.totalQty.toLocaleString()}</td>
                      <td className="px-2 py-3"></td>
                      <td className="px-2 py-3 text-right font-mono">{reportTotals.totalGross.toLocaleString()}</td>
                      <td className="px-2 py-3 text-right font-mono text-rose-500 font-bold">{reportTotals.totalDeductions.toLocaleString()}</td>
                      <td className="px-2 py-3 text-right font-black bg-muted text-foreground font-mono">{reportTotals.totalNet.toLocaleString()}</td>
                      <td colSpan={3} className="px-2 py-3"></td>
                      <td colSpan={3} className="px-2 py-3 text-right font-mono bg-primary/5 text-yellow-600 dark:text-yellow-450">{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-2 py-3"></td>
                      <td className="px-2 py-3 text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black font-mono">
                        {currencySymbol(form.currencyType)}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Aggregations */}
              <div className="mt-4 flex flex-wrap justify-end items-center gap-6 border-t border-border pt-4 text-right">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Total Quantity</span>
                  <strong className="text-sm font-black text-foreground">{reportTotals.totalQty.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Total Gross Weight</span>
                  <strong className="text-sm font-black text-foreground">{reportTotals.totalGross.toLocaleString("en-US", { maximumFractionDigits: 2 })} KGS</strong>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Total Net Weight</span>
                  <strong className="text-sm font-black text-foreground">{reportTotals.totalNet.toLocaleString("en-US", { maximumFractionDigits: 2 })} KGS</strong>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Total Purchase ({currencySymbol(form.currencyType)})</span>
                  <strong className="text-sm font-black text-foreground font-mono">{currencySymbol(form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-lg">
                  <span className="block text-[8px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500 font-bold">Grand Final ({currencySymbol(form.currencyType)})</span>
                  <strong className="text-sm font-black text-emerald-600 font-mono">{currencySymbol(form.currencyType)}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Action Buttons for Report Tab */}
              <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("others")}
                  className="font-bold h-9 px-6 text-xs"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSavePurchaseOrder(true)}
                  disabled={savingOrder}
                  className="font-bold h-9 px-8 text-xs shadow tracking-wider uppercase bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingOrder ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>




      {/* High-fidelity Print & Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
          {/* Inject print-specific css hack */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-modal-content, .print-modal-content * {
                visibility: visible !important;
              }
              .print-modal-content {
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
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          <div className="relative bg-card border border-border shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header Controls (hidden on print) */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border/80 bg-muted/20 no-print">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-black text-sm uppercase tracking-wider text-foreground">
                  {previewType === "contract" ? "Contract Preview" : previewType === "invoice" ? "Invoice Preview" : "Booking Report Preview"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Document
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewModalOpen(false)}
                  className="h-8 text-xs font-bold"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Printable Content Container */}
            <div className="print-modal-content flex-1 overflow-y-auto p-8 space-y-6 bg-card text-foreground">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-border/80 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-primary uppercase">Damaan Business Group</h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Enterprise ERP / Logistics Platform</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-muted text-foreground font-black text-xs uppercase tracking-wider border border-border">
                    {previewType === "contract" ? "PURCHASE CONTRACT" : previewType === "invoice" ? "PURCHASE INVOICE" : "BOOKING ORDER"}
                  </span>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">Serial: {form.purchaseOrderNo}</p>
                </div>
              </div>

              {/* Grid: Booking and Login metadata side-by-side */}
              <div className="grid grid-cols-2 gap-6 bg-muted/20 border border-border/60 rounded-xl p-4 text-xs">
                <div className="space-y-1.5">
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Booking Detail</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">Booking Date:</span> <span className="font-semibold">{form.purchaseDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fiscal Year:</span> <span className="font-semibold">2025-26</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status:</span> <span className="font-bold text-yellow-600 uppercase">{form.salesStatus}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">GPBO Order No:</span> <span className="font-bold font-mono">{form.purchaseOrderNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">BPBO Bill No:</span> <span className="font-semibold font-mono">{form.billNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contract Number:</span> <span className="font-semibold font-mono">{form.purchaseContractNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Loading Mode:</span> <span className="font-semibold">{form.shippingMode || "N/A"}</span></div>
                </div>

                <div className="space-y-1.5 border-l border-border/80 pl-6">
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Login Detail</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">User Admin:</span> <span className="font-black text-emerald-600 uppercase">{form.userName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-[10px]">{form.userId || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Login Time:</span> <span className="font-semibold">14:35:02</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IP Address:</span> <span className="font-mono text-[10px]">192.168.1.1</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location:</span> <span className="font-semibold">Sargodha, PK</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Branch Country:</span> <span className="font-semibold">{form.branchCountry || "N/A"}</span></div>
                </div>
              </div>

              {/* Grid: Purchase and Sales accounts side-by-side */}
              <div className="grid grid-cols-2 gap-6 bg-muted/20 border border-border/60 rounded-xl p-4 text-xs">
                <div className="space-y-1.5">
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Purchase Account (DR)</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Code:</span> <span className="font-semibold">{form.purchaseAccountNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Name:</span> <span className="font-semibold truncate max-w-[180px]">{form.purchaseAccountName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Currency:</span> <span className="font-bold">{form.purchaseAccountCurrency}</span></div>
                </div>

                <div className="space-y-1.5 border-l border-border/80 pl-6">
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Sales Account (CR)</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Code:</span> <span className="font-semibold">{form.salesAccountNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Name:</span> <span className="font-semibold truncate max-w-[180px]">{form.salesAccountName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Currency:</span> <span className="font-bold">{form.salesAccountCurrency}</span></div>
                </div>
              </div>

              {/* Goods Table */}
              <div className="space-y-2">
                <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Goods Spec List</h3>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-muted text-muted-foreground border-b border-border font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2 text-center w-10">SR#</th>
                        <th className="px-3 py-2">Allot ID</th>
                        <th className="px-3 py-2">Goods Name</th>
                        <th className="px-3 py-2 text-center">Spec Size</th>
                        <th className="px-3 py-2 text-center">Brand</th>
                        <th className="px-3 py-2 text-center">Origin</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Net KGS</th>
                        <th className="px-3 py-2 text-right">Foreign</th>
                        <th className="px-3 py-2 text-right">Local</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {goodsEntries.map((row, index) => (
                        <tr key={index} className="hover:bg-muted/30 transition">
                          <td className="px-3 py-2 text-center font-mono text-muted-foreground">{String(index + 1).padStart(2, "0")}</td>
                          <td className="px-3 py-2 font-semibold font-mono">{row.allotName}</td>
                          <td className="px-3 py-2 font-bold text-primary">{row.goodsName}</td>
                          <td className="px-3 py-2 text-center">{row.size}</td>
                          <td className="px-3 py-2 text-center">{row.brand}</td>
                          <td className="px-3 py-2 text-center">{row.origin}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.qtyNo} {row.qtyName}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{row.netWeight.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {currencySymbol(row.purchaseCurrency || form.purchaseCurrency)}{row.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {currencySymbol(form.currencyType)}{row.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment and Loading details report block */}
              <div className="grid grid-cols-2 gap-6 bg-muted/20 border border-border/60 rounded-xl p-4">
                {/* Payment Details */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black uppercase tracking-wider text-[10px] text-primary">Payment Schedule & Advance Terms</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("others")}
                      className="text-primary hover:underline text-[9px] font-bold flex items-center gap-0.5 border border-primary/20 rounded px-1.5 py-0.5 bg-background/60 shadow-sm"
                    >
                      <PenLine className="h-3 w-3" /> Edit Payment
                    </button>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1"><span className="text-muted-foreground">Payment Condition:</span> <span className="font-bold text-foreground">{form.paymentType}</span></div>
                  {form.paymentType === "Advance Payment" && (
                    <div className="space-y-3 pt-1">
                      {/* Purchase Side */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[8px] uppercase font-bold text-primary">Purchase Side ({form.purchaseAccountNo}):</span>
                        <div className="grid grid-cols-6 gap-1 font-mono text-[9px] pl-2 border-l border-primary/20 leading-tight">
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Total</span>
                            <strong className="text-foreground block">{currencySymbol(form.purchaseCurrency)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Pct</span>
                            <strong className="text-foreground block">{form.advancePercent}%</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-primary block uppercase font-bold">Adv Paid</span>
                            <strong className="text-primary block">{currencySymbol(form.purchaseCurrency)}{((reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Adv Date</span>
                            <span className="text-foreground block font-semibold">{form.advancePaymentDate}</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Remaining</span>
                            <strong className="text-foreground block">{currencySymbol(form.purchaseCurrency)}{(reportTotals.grandPrimaryFinal - (reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Pay Date</span>
                            <span className="text-foreground block font-semibold">{form.paymentDate}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sales Side */}
                      <div className="space-y-1 border-t border-border/40 pt-2">
                        <span className="text-emerald-600 dark:text-emerald-500 block text-[8px] font-bold uppercase">Sales Side ({form.salesAccountNo}):</span>
                        <div className="grid grid-cols-6 gap-1 font-mono text-[9px] pl-2 border-l border-emerald-500/20 text-emerald-600 leading-tight">
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Total</span>
                            <strong className="text-foreground block">{currencySymbol(form.currencyType)}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Pct</span>
                            <strong className="text-foreground block">{form.advancePercent}%</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-emerald-600 dark:text-emerald-500 block uppercase font-bold">Adv Recd</span>
                            <strong className="text-emerald-600 block">{currencySymbol(form.currencyType)}{((reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Adv Date</span>
                            <span className="text-foreground block font-semibold">{form.advancePaymentDate}</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Remaining</span>
                            <strong className="text-foreground block">{currencySymbol(form.currencyType)}{(reportTotals.grandFinal - (reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Pay Date</span>
                            <span className="text-foreground block font-semibold">{form.paymentDate}</span>
                          </div>
                        </div>
                      </div>

                      {form.paymentDaysAndMethodDetails && (
                        <div className="border-t border-border/40 pt-2 text-[10px]">
                          <span className="text-muted-foreground block text-[8px] uppercase">Schedule & Method:</span>
                          <p className="italic text-foreground">{form.paymentDaysAndMethodDetails}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Loading & Transit details */}
                <div className="space-y-1.5 border-l border-border/85 pl-6">
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Loading & Transit Rules</h3>
                  <div className="flex justify-between border-b border-border/40 pb-1"><span className="text-muted-foreground">Shipping Mode:</span> <span className="font-bold text-foreground">{form.shippingMode}</span></div>
                  
                  {/* Loading Details - Grouped Country, Port/Border/Airport, Date */}
                  <div className="flex justify-between"><span className="text-muted-foreground">Loading Country:</span> <span className="font-semibold text-foreground">{form.loadingCountry || "N/A"}</span></div>
                  {form.shippingMode === "By Sea" && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Loading Port:</span> <span className="font-semibold text-foreground">{form.loadingPort || "N/A"}</span></div>
                  )}
                  {form.shippingMode === "By Road" && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Loading Border:</span> <span className="font-semibold text-foreground">{form.loadingBorder || "N/A"}</span></div>
                  )}
                  {form.shippingMode === "By Air" && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Airport Name:</span> <span className="font-semibold text-foreground">{form.airportName || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Airline Name:</span> <span className="font-semibold text-foreground">{form.airlineName || "N/A"}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Loading Date:</span> <span className="font-semibold text-foreground">{form.loadingDate || "N/A"}</span></div>
                  
                  {/* Received Details - Grouped Country, Port/Border/Airport, Date */}
                  <div className="flex justify-between border-t border-border/30 pt-1 mt-1"><span className="text-muted-foreground font-semibold">Received Country:</span> <span className="font-semibold text-foreground">{form.receivedCountry || "N/A"}</span></div>
                  {form.shippingMode === "By Sea" && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Received Port:</span> <span className="font-semibold text-foreground">{form.receivedPort || "N/A"}</span></div>
                  )}
                  {form.shippingMode === "By Road" && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Received Border:</span> <span className="font-semibold text-foreground">{form.receivedBorder || "N/A"}</span></div>
                  )}
                  {form.shippingMode === "By Air" && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Received Airport:</span> <span className="font-semibold text-foreground">{form.receivedPortName || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Received Agent Name:</span> <span className="font-semibold text-foreground">{form.receivedAgentName || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Carrier / Agent:</span> <span className="font-semibold text-foreground">{form.transportAgent || "N/A"}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Received Date:</span> <span className="font-semibold text-foreground">{form.receivedDate || "N/A"}</span></div>
                </div>
              </div>

              {/* Document Remarks / Narration */}
              {(previewType === "booking_report" ? (form.orderReportRemarks || form.remarks) :
                previewType === "contract" ? (form.purchaseReportRemarks || form.remarks) :
                (form.purchaseInvoiceRemarks || form.remarks)) && (
                <div className="bg-muted/10 border border-border/60 rounded-xl p-4 text-xs space-y-1.5">
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary">
                    {previewType === "booking_report" ? "Purchase Order Narration & Terms" :
                     previewType === "contract" ? "Contract Remarks & Narration" :
                     "Purchase Invoice Narration & Remarks"}
                  </h3>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                    {previewType === "booking_report" ? (form.orderReportRemarks || form.remarks) :
                     previewType === "contract" ? (form.purchaseReportRemarks || form.remarks) :
                     (form.purchaseInvoiceRemarks || form.remarks)}
                  </p>
                </div>
              )}

              {/* Bottom Totals */}
              <div className="flex justify-between items-start border-t border-border/80 pt-4 mt-4 text-xs font-semibold">
                <div className="text-muted-foreground leading-relaxed">
                  <p>✓ System verified invoice transaction details.</p>
                  <p>✓ All payments are tracked under role scoping rules.</p>
                </div>
                <div className="text-right space-y-1.5 w-60">
                  <div className="flex justify-between text-muted-foreground"><span>Total Gross weight:</span> <span className="font-bold text-foreground font-mono">{reportTotals.totalGross.toLocaleString()} KGS</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Total Deductions:</span> <span className="font-bold text-destructive font-mono">{reportTotals.totalDeductions.toLocaleString()} KGS</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Total Net weight:</span> <span className="font-bold text-foreground font-mono">{reportTotals.totalNet.toLocaleString()} KGS</span></div>
                  <div className="border-t border-border/85 pt-2 flex justify-between text-sm font-black text-primary">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {currencySymbol(form.currencyType)}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW COUNTRY MODAL ───────────────────────────────────────────────── */}
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
              >✕</button>
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
              >{newCountryLoading ? "Saving…" : "Save Country"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW GOOD MODAL ──────────────────────────────────────────────────── */}
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
              >✕</button>
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
              >{newGoodLoading ? "Saving…" : "Save Good"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW PORT / BORDER / AIRPORT MODAL ───────────────────────────────── */}
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
              >✕</button>
            </div>
            <div className="p-5 space-y-3">
              {newPortError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-[10px] rounded px-3 py-2">{newPortError}</div>
              )}
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Country Name</label>
                <input
                  type="text"
                  value={newPortForm.countryName}
                  disabled
                  className="w-full bg-muted border border-input rounded px-3 py-1.5 text-muted-foreground text-[11px] outline-none"
                />
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

      {/* ── NEW GOOD VARIATION MODAL ───────────────────────────────────────── */}
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
              >✕</button>
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
                <label className="block text-[10px] text-muted-foreground mb-1">Origin Country</label>
                <select
                  value={customVariationForm.originCountryId || ""}
                  onChange={(e) => {
                    if (e.target.value === "__ADD_NEW_COUNTRY__") {
                      setNewCountryModal(true);
                      return;
                    }
                    setCustomVariationForm(p => ({ ...p, originCountryId: e.target.value }));
                  }}
                  className="w-full bg-background border border-input rounded px-3 py-1.5 text-foreground text-[11px] outline-none focus:border-primary"
                >
                  <option value="">Select Origin...</option>
                  {transitCountryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="__ADD_NEW_COUNTRY__" className="text-primary font-semibold">+ Add New Country...</option>
                </select>
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

      {/* ── CREATE NEW ACCOUNT MODAL ────────────────────────────────────────── */}
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
              >✕</button>
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
                {createAccountLoading ? "Saving…" : "Save Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE NEW COMPANY MODAL ────────────────────────────────────────── */}
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
              >✕</button>
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
                {createCompanyLoading ? "Saving…" : "Save Company"}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
