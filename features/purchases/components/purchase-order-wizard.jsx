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
  Globe,
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
  PenLine
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "@/features/customers/components/customer-picker";
import { CompanyPicker } from "@/features/companies/components/company-picker";

// ── Non-location constants (static values, not from master forms) ─────────────
const CURRENCY_OPTIONS = ["USD", "AED", "PKR", "AFN", "INR"];
const PAYMENT_TYPES = ["Advance Payment", "Invoice", "Final Payment", "Credit"];
const LOADING_TYPES = ["By Sea", "By Road", "By Air"];
const CONTAINER_TYPES = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "Non Reefer"];
const QTY_TYPE_OPTIONS = ["BAGS", "CARTONS", "Loose", "KGS", "Ton"];
const SIZE_OPTIONS = ["Large", "Medium", "Standard", "Small"];
const BRAND_OPTIONS = ["Premium", "Choice", "Organic", "Standard"];
const GOODS_OPTIONS = ["PISTACHIOS KERNEL", "CASHEW NUTS (W320)", "WALNUTS INSHELL", "ALMONDS", "HAZELNUTS"];
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
  if (!isSuperAdmin) {
    if (countryId) params.set("countryId", countryId);
    if (countryBranchId) params.set("countryBranchId", countryBranchId);
    if (cityBranchId) params.set("cityBranchId", cityBranchId);
  }

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
  purchaseAccountNo: "AE-AC-0001",
  purchaseAccountName: "Dubai Purchase Account",
  purchaseAccountBranch: "Dubai Main Branch",
  purchaseAccountCurrency: "AED",
  salesAccountNo: "SA-2001",
  salesAccountName: "Damaan Sales Account",
  salesAccountBranch: "Dubai Sales Branch",
  salesAccountCurrency: "AED",
  salesOrderNo: "SO-2026-0001",
  purchaseContractNo: "PC-2026-001",
  purchaseOrderNo: "PO-2026-0001",
  billNo: "BILL-7788",
  purchaseContact: "+93 700 000 000",
  purchaseDate: "2026-02-02",
  currencyType: "USD",
  exchangeRate: 280.00,
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
  
  // Tab 3 details
  advancePercent: 10,
  advancePaymentDate: "2026-02-02",
  paymentDate: "2026-02-02",
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
  
  // Step 2 Active Item inputs
  goodsName: "PISTACHIOS KERNEL",
  size: "Large",
  brand: "Premium",
  origin: "Iran",
  hsCode: "0802.51",
  allotName: "ALT-4421",
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
    secondaryCurrency: "PKR - Rs",
    rate2: 280.00,
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
    secondaryCurrency: "PKR - Rs",
    rate2: 280.00,
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
    secondaryCurrency: "PKR - Rs",
    rate2: 280.00,
    finalAmount: 9063600.00
  }
];

function calculateItemTotals(form) {
  const qtyNo = Number(form.qtyNo || 0);
  const qtyKgs = Number(form.qtyKgs || 0);
  const emptyKgs = Number(form.emptyKgs || 0);
  const coursePrice = Number(form.coursePrice || 0);
  const rate2 = Number(form.rate2 || 1);
  const divideWeight = Number(form.divideWeight || 1);

  const grossWeight = qtyNo * qtyKgs;
  const totalEmptyDeduct = qtyNo * emptyKgs;
  const netWeight = Math.max(0, grossWeight - totalEmptyDeduct);
  const totalAmount = (netWeight / divideWeight) * coursePrice;
  const finalAmount = totalAmount * rate2;

  return {
    grossWeight,
    netWeight,
    totalAmount,
    finalAmount
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

export function PurchaseOrderWizard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("booking"); // "booking" | "goods" | "others"
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState("booking_report"); // "booking_report" | "contract" | "invoice"
  const [form, setForm] = useState(DEFAULT_FORM);
  const [goodsEntries, setGoodsEntries] = useState(SEEDED_GOODS);
  const [editingRemarksType, setEditingRemarksType] = useState(null);
  const [tempRemarksText, setTempRemarksText] = useState("");
  
  const [portalElement, setPortalElement] = useState(null);
  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalElement(document.getElementById("navbar-portal-target"));
    }
  }, []);
  
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [accountLookupMessage, setAccountLookupMessage] = useState("");
  const [accountLookupLoading, setAccountLookupLoading] = useState(null);

  const dropdownRef = React.useRef(null);
  const purchaseDropdownRef = React.useRef(null);
  const salesDropdownRef = React.useRef(null);

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
      }
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(event.target)) {
        setSalesDropdownOpen(false);
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
  const [mainBranches, setMainBranches] = useState([]);
  const [cityBranches, setCityBranches] = useState([]);
  const [dbAccounts, setDbAccounts] = useState(MOCK_ACCOUNTS);

  // Fetch session & countries on load
  useEffect(() => {
    let cancelled = false;
    async function initSession() {
      try {
        const response = await fetch("/api/erp/auth/session");
        const sessionRes = await response.json();
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
        if (!cancelled && res?.countries) {
          setCountries(res.countries);
        }
      } catch (err) {
        console.error("Failed to load countries:", err);
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
            ledgerCurrency: acc.currency || "USD"
          }));
          setDbAccounts(mapped);
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      }
    }
    initSession();
    initCountries();
    initAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const isSuperAdmin = session?.scopes?.isSuperAdmin ?? false;

  // Derived country options from master data (replaces old COUNTRY_OPTIONS hardcode)
  const masterCountryOptions = useMemo(() => countries, [countries]);

  // Load existing purchase order if purchaseOrderNo is in URL query parameters
  useEffect(() => {
    if (!session) return;
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const poNo = urlParams.get("purchaseOrderNo");
    if (!poNo) return;

    let cancelled = false;

    async function loadPO() {
      setSavingOrder(true);
      setSaveMessage("Loading purchase order details...");
      try {
        const poData = await lookupPurchaseBookingReport(
          poNo,
          form.countryId,
          form.countryBranchId,
          form.cityBranchId,
          isSuperAdmin
        );
        if (cancelled) return;

        if (poData) {
          const rawFormData = poData.form_data || {};
          const loadedForm = rawFormData.form || {};
          const loadedGoods = rawFormData.goodsEntries || [];

          setForm((prev) => ({
            ...prev,
            ...loadedForm,
            // Retain PO/Contract identification numbers
            purchaseOrderNo: poData.purchaseBookingOrderNumber || loadedForm.purchaseOrderNo || poNo,
            purchaseContractNo: poData.purchaseContractNo || loadedForm.purchaseContractNo || "",
          }));

          if (Array.isArray(loadedGoods) && loadedGoods.length) {
            setGoodsEntries(loadedGoods);
          }

          // Directly redirect to Step 4 report view
          setActiveTab("report");
          setSaveMessage("Purchase order loaded successfully.");
        } else {
          setSaveMessage(`Purchase order ${poNo} not found.`);
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
    const accountNo = account.accountCode || account.rawAccountCode || account.ledgerCode || "";
    const accountName = account.accountName || account.ledgerName || "";
    const branchName = account.cityBranchName || account.countryBranchName || "";
    const currency = (account.ledgerCurrency || "").toUpperCase();

    setForm((prev) => ({
      ...prev,
      ...(type === "purchase"
        ? {
            purchaseAccountNo: accountNo,
            purchaseAccountName: accountName,
            purchaseAccountBranch: branchName,
            purchaseAccountCurrency: currency || prev.purchaseAccountCurrency,
            supplierName: accountName || prev.supplierName,
          }
        : {
            salesAccountNo: accountNo,
            salesAccountName: accountName,
            salesAccountBranch: branchName,
            salesAccountCurrency: currency || prev.salesAccountCurrency,
            customerName: accountName || prev.customerName,
          }),
      currencyType: currency || prev.currencyType,
    }));
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

  const handleAddGoodsEntry = () => {
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
        exchangeRate: Number(form.exchangeRate || 1),
        totalAmount: calculated.totalAmount,
        op: form.operator || "*",
        secondaryCurrency: `${form.secondaryCurrency} - Rs`,
        rate2: Number(form.rate2 || 1),
        finalAmount: calculated.finalAmount
      }
    ]);
    setSaveMessage("Item added to live report draft list.");
    // Clear/reset item fields
    setForm((prev) => ({
      ...prev,
      goodsName: "",
      qtyNo: 0,
      qtyKgs: 0,
      emptyKgs: 0,
      coursePrice: 0,
      allotName: `ALT-${Math.floor(4424 + Math.random() * 1000)}`
    }));
  };

  const handleSavePurchaseOrder = async () => {
    setSavingOrder(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/erp/purchases/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryId: form.countryId || null,
          countryBranchId: form.countryBranchId || null,
          cityBranchId: form.cityBranchId || null,
          purchaseContractNo: form.purchaseContractNo || form.purchaseOrderNo,
          currencyCode: form.currencyType,
          exchangeRate: Number(form.exchangeRate || 1),
          orderTotal: reportTotals.grandFinal,
          formData: {
            form,
            totals: reportTotals,
            goodsEntries: goodsEntries,
            savedFrom: "purchase-order-wizard-redesign",
            savedAt: new Date().toISOString()
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Purchase order failed to save.");
      }
      setSaveMessage(`Successfully saved Purchase Order: ${payload.data?.purchaseOrderNo || form.purchaseOrderNo}`);
      setActiveTab("report");
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
      const response = await fetch("/api/erp/purchases/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryId: form.countryId || null,
          countryBranchId: form.countryBranchId || null,
          cityBranchId: form.cityBranchId || null,
          purchaseContractNo: form.purchaseContractNo || form.purchaseOrderNo,
          currencyCode: form.currencyType,
          exchangeRate: Number(form.exchangeRate || 1),
          orderTotal: reportTotals.grandFinal,
          formData: {
            form,
            totals: reportTotals,
            goodsEntries: goodsEntries,
            savedFrom: "purchase-order-wizard-redesign",
            savedAt: new Date().toISOString()
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Purchase order failed to save.");
      }
      setSaveMessage(`Successfully saved Purchase Order: ${payload.data?.purchaseOrderNo || form.purchaseOrderNo}`);
      setTimeout(() => {
        router.push("/dashboard/purchase/purchase-booking-journal-report");
      }, 1500);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Error saving order.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleReset = () => {
    setForm({
      ...DEFAULT_FORM,
      purchaseOrderNo: `PO-${Date.now()}`,
      salesOrderNo: `SO-${Date.now()}`,
      purchaseDate: new Date().toISOString().slice(0, 10),
    });
    setGoodsEntries([]);
    setSaveMessage("All inputs and goods listings cleared.");
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
          Others
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
                setActiveTab("report");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition border-b border-border/40 pb-2 mb-1"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="font-bold text-emerald-600 dark:text-emerald-450">View / Check Entry</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                setPreviewType("booking_report");
                setPreviewModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <Printer className="h-3.5 w-3.5 text-blue-500" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                alert("Email action triggered!");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
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
            <button
              type="button"
              onClick={() => {
                setViewDropdownOpen(false);
                setPreviewType("contract");
                setPreviewModalOpen(true);
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
                setPreviewType("invoice");
                setPreviewModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
            >
              <Receipt className="h-3.5 w-3.5 text-rose-500" />
              <span>Invoice</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (activeTab === "report") {
    return (
      <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] flex flex-col space-y-4 bg-background text-foreground p-6 animate-in fade-in duration-300 overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveTab("others")}
            className="flex items-center gap-1.5 h-9 text-xs font-bold"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Wizard
          </Button>

          <div className="text-center">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
              Verify Purchase Booking Entry
            </h1>
            <p className="text-[10px] text-muted-foreground">
              Please check accounts and goods specs before transferring to ledger registry
            </p>
          </div>

          <Button
            type="button"
            onClick={handleTransfer}
            disabled={savingOrder}
            className="flex items-center gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-4 shadow border-none"
          >
            <Check className="h-4 w-4" /> {savingOrder ? "Transferring..." : "Transfer & Post"}
          </Button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Booking & Session */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border pb-1">
              Booking & Session Details
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Booking Date:</span> <span className="font-semibold text-foreground">{form.purchaseDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GPBO No:</span> <span className="font-semibold text-foreground font-mono">{form.purchaseOrderNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Contract:</span> <span className="font-semibold text-foreground">{form.purchaseContractNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bill No:</span> <span className="font-semibold text-foreground font-mono">{form.billNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">User:</span> <span className="font-bold text-emerald-600 dark:text-emerald-450 uppercase">{form.userName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Branch Name:</span> <span className="font-semibold text-foreground">{form.branchName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Branch Code:</span> <span className="font-semibold text-foreground font-mono">{form.branchCode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Country Origin:</span> <span className="font-semibold text-foreground">{form.branchCountry}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Country Sales:</span> <span className="font-semibold text-foreground">{form.branchCountry}</span></div>
            </div>
          </div>

          {/* Card 2: Accounts */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border pb-1">
              Ledger Accounts
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Purchase Account:</span>
                <span className="font-bold text-foreground">{form.purchaseAccountNo}</span>
                <span className="block text-[10px] text-muted-foreground truncate">{form.purchaseAccountName}</span>
              </div>
              <div className="border-t border-border/60 pt-2.5">
                <span className="text-muted-foreground block text-[10px]">Sales Account:</span>
                <span className="font-bold text-foreground">{form.salesAccountNo}</span>
                <span className="block text-[10px] text-muted-foreground truncate">{form.salesAccountName}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Summary Totals */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border pb-1">
              Weight & Cargo Info
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Cargo KGS:</span> <span className="font-bold text-foreground font-mono">{reportTotals.totalGross.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deductions KGS:</span> <span className="font-bold text-rose-500 font-mono">{reportTotals.totalDeductions.toLocaleString()}</span></div>
              <div className="flex justify-between font-black"><span className="text-muted-foreground">Net Weight KGS:</span> <span className="font-mono">{reportTotals.totalNet.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cargo Units Name:</span> <span className="font-semibold text-foreground">{goodsEntries[0]?.qtyName || "BAGS"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Units:</span> <span className="font-semibold text-foreground font-mono">{reportTotals.totalQty.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Card 4: Currency & Grand Totals */}
          <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/20 pb-1 mb-2">
                Financial Summary
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Primary Currency:</span> <span className="font-bold text-foreground">{form.currencyType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Secondary Currency:</span> <span className="font-bold text-foreground">{goodsEntries[0]?.secondaryCurrency || "PKR"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Exchange Rate:</span> <span className="font-bold text-foreground font-mono">{form.exchangeRate}</span></div>
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-500/10 space-y-1">
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500 font-bold">Total Primary Amount</span>
                <div className="text-xs font-black text-foreground font-mono leading-tight truncate">
                  {currencySymbol(form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="pt-1 border-t border-emerald-500/5">
                <span className="block text-[8px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500 font-bold">Grand Total Amount</span>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-450 font-mono leading-tight truncate">
                  {currencySymbol(goodsEntries[0]?.secondaryCurrency || "PKR")}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable area for verification details */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 scrollbar-thin scrollbar-thumb-border">
          {/* Goods specification table */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
            Goods Items Specification Verification
          </h3>
          <div className="overflow-x-auto rounded border border-border bg-background">
            <table className="w-full text-xs text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-muted text-muted-foreground border-b border-border font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-3 py-2.5 text-center w-10">SR#</th>
                  <th className="px-3 py-2.5">Allot Name</th>
                  <th className="px-3 py-2.5">Good Name</th>
                  <th className="px-3 py-2.5 text-center">Size</th>
                  <th className="px-3 py-2.5 text-center">Brand</th>
                  <th className="px-3 py-2.5 text-center">Origin</th>
                  <th className="px-3 py-2.5 text-center">HS Code</th>
                  <th className="px-3 py-2.5">Qty Type</th>
                  <th className="px-3 py-2.5 text-right">Qty No</th>
                  <th className="px-3 py-2.5 text-right">1 Unit KGS</th>
                  <th className="px-3 py-2.5 text-right">Gross Weight</th>
                  <th className="px-3 py-2.5 text-right text-rose-500">Empty KGS</th>
                  <th className="px-3 py-2.5 text-right font-bold bg-muted/60">Net Weight</th>
                  <th className="px-3 py-2.5 text-center">Price Basis</th>
                  <th className="px-3 py-2.5 text-center">Divide Value</th>
                  <th className="px-3 py-2.5 text-right bg-primary/5">Primary Rate</th>
                  <th className="px-3 py-2.5 text-right bg-primary/5">Primary Total</th>
                  <th className="px-3 py-2.5 text-right bg-primary/5">Exchange</th>
                  <th className="px-3 py-2.5 text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">Final Amount</th>
                </tr>
              </thead>
              <tbody>
                {goodsEntries.map((row, index) => (
                  <tr key={index} className="border-t border-border hover:bg-muted/30 transition">
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground">{String(index + 1).padStart(2, "0")}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-foreground">{row.allotName}</td>
                    <td className="px-3 py-2 font-bold text-primary">{row.goodsName}</td>
                    <td className="px-3 py-2 text-center text-foreground">{row.size}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-muted text-foreground px-2 py-0.5 rounded text-[10px] border border-border">{row.brand}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-foreground">{row.origin}</td>
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground">{row.hsCode}</td>
                    <td className="px-3 py-2 font-semibold text-foreground">{row.qtyName}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.qtyNo.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.qtyKgs.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.grossWeight.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-500">{(row.qtyNo * row.emptyKgs).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-black bg-muted/30 font-mono text-foreground">{row.netWeight.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{row.priceType}</td>
                    <td className="px-3 py-2 text-center font-mono text-muted-foreground">{row.divideWeight || 1}</td>
                    <td className="px-3 py-2 text-right font-mono bg-primary/5">{currencySymbol(row.currencyType)}{row.coursePrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono bg-primary/5">{currencySymbol(row.currencyType)}{row.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right font-mono bg-primary/5">{row.rate2.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-black font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {currencySymbol(row.secondaryCurrency)}{row.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/80 font-bold border-t-2 border-border text-[10px]">
                  <td colSpan={8} className="px-3 py-2 text-right">Totals:</td>
                  <td className="px-3 py-2 text-right font-mono">{reportTotals.totalQty.toLocaleString()}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right font-mono">{reportTotals.totalGross.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-rose-500">{reportTotals.totalDeductions.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono bg-muted/60 text-foreground">{reportTotals.totalNet.toLocaleString()}</td>
                  <td colSpan={4} className="px-3 py-2 text-right font-mono bg-primary/5">{currencySymbol(form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-450">
                    {currencySymbol(goodsEntries[0]?.secondaryCurrency || "PKR")}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment and Loading details report block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Details Card */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-2 text-[10px] hover:shadow-sm transition duration-150">
            <div className="flex justify-between items-center border-b border-border pb-1">
              <h3 className="font-black uppercase tracking-wider text-primary text-[9px] flex items-center gap-1">
                Payment Schedule & Advance Terms
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab("others")}
                className="text-muted-foreground hover:text-primary transition p-0.5 rounded hover:bg-muted"
                title="Edit Payment Terms"
              >
                <PenLine className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2 text-foreground">
              <div className="flex justify-between border-b border-border/40 pb-1.5"><span className="text-muted-foreground">Payment Condition:</span> <span className="font-bold">{form.paymentType}</span></div>
              {form.paymentType === "Advance Payment" && (
                <div className="space-y-3">
                  {/* Purchase Side */}
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-[8px] uppercase font-black tracking-wider text-primary">Purchase Side ({form.purchaseAccountNo}):</span>
                    <div className="grid grid-cols-6 gap-1 font-mono text-[9px] pl-2 border-l border-primary/20 leading-tight">
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Total</span>
                        <strong className="text-foreground block">{currencySymbol(form.purchaseAccountCurrency || form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Pct</span>
                        <strong className="text-foreground block">{form.advancePercent}%</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-primary block uppercase font-bold">Adv Paid</span>
                        <strong className="text-primary block">{currencySymbol(form.purchaseAccountCurrency || form.currencyType)}{((reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Adv Date</span>
                        <span className="text-foreground block font-semibold">{form.advancePaymentDate}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Remaining</span>
                        <strong className="text-foreground block">{currencySymbol(form.purchaseAccountCurrency || form.currencyType)}{(reportTotals.grandPrimaryFinal - (reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Pay Date</span>
                        <span className="text-foreground block font-semibold">{form.paymentDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sales Side */}
                  <div className="space-y-1 border-t border-border/40 pt-2">
                    <span className="text-emerald-600 dark:text-emerald-500 block text-[8px] font-black uppercase tracking-wider">Sales Side ({form.salesAccountNo}):</span>
                    <div className="grid grid-cols-6 gap-1 font-mono text-[9px] pl-2 border-l border-emerald-500/20 text-emerald-600 dark:text-emerald-450 leading-tight">
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Total</span>
                        <strong className="text-foreground block">{currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Pct</span>
                        <strong className="text-foreground block">{form.advancePercent}%</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-emerald-600 dark:text-emerald-500 block uppercase font-bold">Adv Recd</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 block">{currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}{((reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Adv Date</span>
                        <span className="text-foreground block font-semibold">{form.advancePaymentDate}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Remaining</span>
                        <strong className="text-foreground block">{currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}{(reportTotals.grandFinal - (reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-[7px] text-muted-foreground block uppercase">Pay Date</span>
                        <span className="text-foreground block font-semibold">{form.paymentDate}</span>
                      </div>
                    </div>
                  </div>

                  {form.paymentDaysAndMethodDetails && (
                    <div className="border-t border-border/40 pt-2 text-[9px] leading-tight">
                      <span className="text-muted-foreground block text-[8px] uppercase">Schedule & Method:</span>
                      <p className="italic text-foreground">{form.paymentDaysAndMethodDetails}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Loading & Transit Details Card */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-2 text-[10px] hover:shadow-sm transition duration-150">
            <div className="flex justify-between items-center border-b border-border pb-1">
              <h3 className="font-black uppercase tracking-wider text-primary text-[9px] flex items-center gap-1">
                Loading & Transit Parameters
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab("others")}
                className="text-muted-foreground hover:text-primary transition p-0.5 rounded hover:bg-muted"
                title="Edit Transit Parameters"
              >
                <PenLine className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-1 text-foreground">
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping Mode:</span> <span className="font-bold">{form.shippingMode}</span></div>
              
              {/* Loading Details - Grouped Country, Port/Border/Airport, Date */}
              <div className="flex justify-between"><span className="text-muted-foreground">Loading Country:</span> <span className="font-semibold">{form.loadingCountry || "N/A"}</span></div>
              {form.shippingMode === "By Sea" && (
                <div className="flex justify-between"><span className="text-muted-foreground">Loading Port:</span> <span className="font-semibold">{form.loadingPort || "N/A"}</span></div>
              )}
              {form.shippingMode === "By Road" && (
                <div className="flex justify-between"><span className="text-muted-foreground">Loading Border:</span> <span className="font-semibold">{form.loadingBorder || "N/A"}</span></div>
              )}
              {form.shippingMode === "By Air" && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Airport Name:</span> <span className="font-semibold text-foreground">{form.airportName || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Airline Name:</span> <span className="font-semibold text-foreground">{form.airlineName || "N/A"}</span></div>
                </>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Loading Date:</span> <span className="font-semibold">{form.loadingDate || "N/A"}</span></div>
              
              {/* Received Details - Grouped Country, Port/Border/Airport, Date */}
              <div className="flex justify-between border-t border-border/30 pt-1 mt-1"><span className="text-muted-foreground font-semibold">Received Country:</span> <span className="font-semibold">{form.receivedCountry || "N/A"}</span></div>
              {form.shippingMode === "By Sea" && (
                <div className="flex justify-between"><span className="text-muted-foreground">Received Port:</span> <span className="font-semibold">{form.receivedPort || "N/A"}</span></div>
              )}
              {form.shippingMode === "By Road" && (
                <div className="flex justify-between"><span className="text-muted-foreground">Received Border:</span> <span className="font-semibold">{form.receivedBorder || "N/A"}</span></div>
              )}
              {form.shippingMode === "By Air" && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Received Airport:</span> <span className="font-semibold text-foreground">{form.receivedPortName || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Received Agent Name:</span> <span className="font-semibold text-foreground">{form.receivedAgentName || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Carrier / Agent:</span> <span className="font-semibold text-foreground">{form.transportAgent || "N/A"}</span></div>
                </>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Received Date:</span> <span className="font-semibold">{form.receivedDate || "N/A"}</span></div>
            </div>
          </div>
        </div>

        {/* Remarks, Previews and Save log */}
        <div className="bg-card border border-border rounded-xl p-4 text-xs space-y-3">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-border pb-2 gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-black text-muted-foreground block uppercase text-[10px]">
                Remarks Narration Log
              </span>
              
              {/* Document Previews / Reports Buttons Moved to Top Header */}
              <div className="flex items-center gap-1.5 bg-muted/65 p-0.5 rounded-lg border border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviewType("booking_report");
                    setPreviewModalOpen(true);
                  }}
                  className="h-6 px-1.5 text-[8px] font-bold flex items-center gap-1 bg-background hover:bg-muted transition-all border-none"
                >
                  <FileText className="h-3 w-3 text-blue-500" />
                  Order Report
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviewType("contract");
                    setPreviewModalOpen(true);
                  }}
                  className="h-6 px-1.5 text-[8px] font-bold flex items-center gap-1 bg-background hover:bg-muted transition-all border-none"
                >
                  <FileSignature className="h-3 w-3 text-purple-500" />
                  Contract
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviewType("invoice");
                    setPreviewModalOpen(true);
                  }}
                  className="h-6 px-1.5 text-[8px] font-bold flex items-center gap-1 bg-background hover:bg-muted transition-all border-none"
                >
                  <Receipt className="h-3 w-3 text-rose-500" />
                  Invoice
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <select
                value={editingRemarksType || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setEditingRemarksType(val);
                    if (val === "remarks") {
                      setTempRemarksText(form.remarks || "");
                    } else if (val === "orderReportRemarks") {
                      setTempRemarksText(form.orderReportRemarks || "");
                    } else if (val === "purchaseReportRemarks") {
                      setTempRemarksText(form.purchaseReportRemarks || "");
                    } else if (val === "purchaseInvoiceRemarks") {
                      setTempRemarksText(form.purchaseInvoiceRemarks || "");
                    }
                  } else {
                    setEditingRemarksType(null);
                    setTempRemarksText("");
                  }
                }}
                className="w-full sm:w-auto bg-background border border-border rounded px-2 py-0.5 text-[9px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Write Narration Report...</option>
                <option value="remarks">General Booking Remarks</option>
                <option value="orderReportRemarks">Purchase Order Report</option>
                <option value="purchaseReportRemarks">Purchase Contract</option>
                <option value="purchaseInvoiceRemarks">Purchase Invoice</option>
              </select>
            </div>
          </div>

          {editingRemarksType && (
            <div className="bg-muted/30 border border-primary/20 rounded p-3 space-y-2 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[9px] text-primary uppercase">
                  Editing: {
                    editingRemarksType === "remarks" ? "General Booking Remarks" :
                    editingRemarksType === "orderReportRemarks" ? "Purchase Order Report" :
                    editingRemarksType === "purchaseReportRemarks" ? "Purchase Contract" :
                    "Purchase Invoice"
                  }
                </span>
              </div>
              <textarea
                value={tempRemarksText}
                onChange={(e) => setTempRemarksText(e.target.value)}
                placeholder={`Enter custom narration for ${
                  editingRemarksType === "remarks" ? "General Remarks" :
                  editingRemarksType === "orderReportRemarks" ? "Order Report" :
                  editingRemarksType === "purchaseReportRemarks" ? "Contract" :
                  "Invoice"
                }...`}
                className="w-full min-h-[60px] bg-background text-foreground border border-border rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setEditingRemarksType(null);
                    setTempRemarksText("");
                  }}
                  variant="outline"
                  className="h-6 px-2 text-[9px] font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setValue(editingRemarksType, tempRemarksText);
                    setEditingRemarksType(null);
                    setTempRemarksText("");
                    setSaveMessage("Narration saved successfully.");
                    setTimeout(() => setSaveMessage(""), 3000);
                  }}
                  className="h-6 px-2 text-[9px] font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save Narration
                </Button>
              </div>
            </div>
          )}

          {/* List of saved report narrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <div className="bg-muted/40 p-2.5 rounded border border-border/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-500/20">
                  Order Report Remarks
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRemarksType("orderReportRemarks");
                    setTempRemarksText(form.orderReportRemarks || "");
                  }}
                  className="text-muted-foreground hover:text-primary transition text-primary hover:bg-muted p-0.5 rounded"
                  title="Edit Order Remarks"
                >
                  <PenLine className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-foreground font-medium min-h-[30px] leading-snug break-words">
                {form.orderReportRemarks || form.remarks || "Same as general booking remarks."}
              </p>
            </div>

            <div className="bg-muted/40 p-2.5 rounded border border-border/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-purple-500/20">
                  Purchase Contract Remarks
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRemarksType("purchaseReportRemarks");
                    setTempRemarksText(form.purchaseReportRemarks || "");
                  }}
                  className="text-muted-foreground hover:text-primary transition text-primary hover:bg-muted p-0.5 rounded"
                  title="Edit Contract Remarks"
                >
                  <PenLine className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-foreground font-medium min-h-[30px] leading-snug break-words">
                {form.purchaseReportRemarks || form.remarks || "Same as general booking remarks."}
              </p>
            </div>

            <div className="bg-muted/40 p-2.5 rounded border border-border/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-rose-500/20">
                  Purchase Invoice Remarks
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRemarksType("purchaseInvoiceRemarks");
                    setTempRemarksText(form.purchaseInvoiceRemarks || "");
                  }}
                  className="text-muted-foreground hover:text-primary transition text-primary hover:bg-muted p-0.5 rounded"
                  title="Edit Invoice Remarks"
                >
                  <PenLine className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-foreground font-medium min-h-[30px] leading-snug break-words">
                {form.purchaseInvoiceRemarks || form.remarks || "Same as general booking remarks."}
              </p>
            </div>

            <div className="bg-muted/40 p-2.5 rounded border border-border/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="bg-gray-500/10 text-muted-foreground dark:bg-gray-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-gray-500/20">
                  General Remarks
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRemarksType("remarks");
                    setTempRemarksText(form.remarks || "");
                  }}
                  className="text-muted-foreground hover:text-primary transition text-primary hover:bg-muted p-0.5 rounded"
                  title="Edit General Remarks"
                >
                  <PenLine className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-foreground font-medium min-h-[30px] leading-snug break-words">
                {form.remarks || "No narration remarks provided for this booking order entry."}
              </p>
            </div>
          </div>

          {saveMessage && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 font-bold flex gap-2 items-center text-xs animate-in slide-in-from-bottom-2 duration-200">
              <Check className="h-4 w-4 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground bg-background">
      
      {/* Title Header with Buttons, seamlessly matching theme */}
      {portalElement ? (
        createPortal(headerContent, portalElement)
      ) : (
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight uppercase text-foreground">Purchase Booking Order</h2>
          </div>

          {/* Small Stepper in the middle header */}
          <div className="flex items-center gap-1.5 bg-muted/65 p-1 rounded-full border border-border/80 text-[10px] font-bold shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("booking")}
              className={`px-3 py-1 rounded-full transition flex items-center gap-1 ${
                activeTab === "booking"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[8px] font-bold">1</span>
              Booking
            </button>
            
            <span className="text-muted-foreground/30 font-normal">/</span>

            <button
              type="button"
              onClick={() => setActiveTab("goods")}
              className={`px-3 py-1 rounded-full transition flex items-center gap-1 ${
                activeTab === "goods"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[8px] font-bold">2</span>
              Goods
            </button>

            <span className="text-muted-foreground/30 font-normal">/</span>

            <button
              type="button"
              onClick={() => setActiveTab("others")}
              className={`px-3 py-1 rounded-full transition flex items-center gap-1 ${
                activeTab === "others"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[8px] font-bold">3</span>
              Others
            </button>
          </div>

          <div className="flex gap-2 relative" ref={dropdownRef}>
            <Button
              type="button"
              onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
              className="flex items-center gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md font-bold"
            >
              <MoreVertical className="h-4 w-4" /> View
            </Button>

            {viewDropdownOpen && (
              <div className="absolute right-0 top-10 w-48 rounded-xl bg-card border border-border shadow-2xl z-50 p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                    setActiveTab("report");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition border-b border-border/40 pb-2 mb-1"
                >
                  <Eye className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                  <span className="font-bold text-emerald-600 dark:text-emerald-450">View / Check Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewDropdownOpen(false);
                    setPreviewType("booking_report");
                    setPreviewModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
                >
                  <Printer className="h-3.5 w-3.5 text-blue-500" />
                  <span>Print</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setViewDropdownOpen(false);
                    alert("Email action triggered!");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
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

                <button
                  type="button"
                  onClick={() => {
                    setViewDropdownOpen(false);
                    setPreviewType("contract");
                    setPreviewModalOpen(true);
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
                    setPreviewType("invoice");
                    setPreviewModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 text-left transition"
                >
                  <Receipt className="h-3.5 w-3.5 text-rose-500" />
                  <span>Invoice</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column Forms (approx 25% width - col-span-3) */}
        <section className="lg:col-span-3 space-y-4">
          
          {/* Metadata context block (replaces old tabs) */}
          <div className="sticky top-[72px] z-20 bg-background pb-3">
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
                  <span className="text-muted-foreground block text-[9px] uppercase">Branch Serial</span>
                  <span className="text-foreground font-semibold truncate block font-mono" title={form.branchCode}>{form.branchCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">Bill Serial</span>
                  <span className="text-foreground font-semibold truncate block font-mono" title={form.billNo}>{form.billNo}</span>
                </div>
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
                <div className="col-span-2 border-t border-border/40 pt-2 flex justify-between">
                  <span className="text-muted-foreground block text-[9px] uppercase">Deduct Weight</span>
                  <span className="text-rose-500 font-bold font-mono">{reportTotals.totalDeductions.toLocaleString()} kg</span>
                </div>
                <div className="col-span-2 border-t border-border/40 pt-2">
                  <span className="text-muted-foreground block text-[9px] uppercase">Total Purchase Amount</span>
                  <span className="text-foreground font-black font-mono block text-xs">
                    {currencySymbol(form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="col-span-2 border-t border-border/40 pt-2 pb-1 bg-emerald-500/5 px-2 rounded border border-emerald-500/10">
                  <span className="text-emerald-600 dark:text-emerald-450 block text-[8px] uppercase font-bold">Grand Final Amount</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono block text-sm">
                    {currencySymbol(goodsEntries[0]?.secondaryCurrency || "PKR")}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="col-span-2 pt-1.5 border-t border-border/40 mt-1 flex justify-between items-center">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold">Posting Date</span>
                  <span className="text-foreground font-bold font-mono">{form.purchaseDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content Wrapper */}
          <Card className="bg-card border-border shadow-md rounded-lg">
            <CardContent className="p-4">
              
              {/* TAB 1: PURCHASE BOOKING / BILL INFO */}
              {activeTab === "booking" && (
                <div className="space-y-4">
                  <div className="border-b border-border pb-2 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Purchase Booking / Bill Info</h3>
                    <p className="text-[10px] text-muted-foreground">Order headers, accounts and shipment rules setup</p>
                  </div>

                  {/* Scoping Fields (Locked according to roles) */}
                  <div className="bg-muted/40 p-3 rounded border border-border space-y-3">
                    <div className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Scope Boundaries
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Country</label>
                        {isSuperAdmin ? (
                          <select
                            value={form.countryId || ""}
                            onChange={(e) => setForm(prev => ({ ...prev, countryId: e.target.value, countryBranchId: "", cityBranchId: "" }))}
                            className="w-full bg-background border border-input rounded px-2 py-1 text-foreground focus:border-primary outline-none text-[10px]"
                          >
                            <option value="">Select</option>
                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ) : (
                          <div className="bg-muted border border-border px-2 py-1 rounded text-muted-foreground flex items-center gap-1 text-[10px]">
                            <Lock className="h-3 w-3 shrink-0" />
                            <span className="truncate">{form.branchCountry || "Locked"}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Branch</label>
                        {isSuperAdmin ? (
                          <select
                            value={form.countryBranchId || ""}
                            onChange={(e) => setForm(prev => ({ ...prev, countryBranchId: e.target.value, cityBranchId: "" }))}
                            disabled={!form.countryId}
                            className="w-full bg-background border border-input rounded px-2 py-1 text-foreground focus:border-primary outline-none text-[10px] disabled:opacity-50"
                          >
                            <option value="">Select</option>
                            {mainBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        ) : (
                          <div className="bg-muted border border-border px-2 py-1 rounded text-muted-foreground flex items-center gap-1 text-[10px]">
                            <Lock className="h-3 w-3 shrink-0" />
                            <span className="truncate">{form.branchName || "Locked"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative" ref={purchaseDropdownRef}>
                      <label className="block text-[10px] text-muted-foreground mb-1">Purchase Account No*</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPurchaseDropdownOpen(!purchaseDropdownOpen)}
                          className="flex-1 bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] text-left flex justify-between items-center h-8"
                        >
                          <span className="truncate">
                            {form.purchaseAccountNo ? `${form.purchaseAccountNo} - ${form.purchaseAccountName}` : "Select Account"}
                          </span>
                          <span className="text-muted-foreground text-[8px]">▼</span>
                        </button>
                        <Button
                          type="button"
                          onClick={() => handleAccountLookup("purchase")}
                          className="h-8 w-8 p-0 flex items-center justify-center transition shrink-0"
                        >
                          <Search className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {purchaseDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-full max-w-[280px] rounded-xl bg-card border border-border shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="p-1 border-b border-border/40 mb-1">
                            <div className="relative flex items-center">
                              <Search className="absolute left-2 h-3 w-3 text-muted-foreground" />
                              <input
                                type="text"
                                value={purchaseSearch}
                                onChange={(e) => setPurchaseSearch(e.target.value)}
                                placeholder="Search by name or code..."
                                className="w-full bg-background border border-input rounded pl-6 pr-2.5 py-1 text-[9px] outline-none focus:border-primary text-foreground"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {(() => {
                              const filtered = dbAccounts.filter(acc =>
                                acc.accountCode?.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
                                acc.accountName?.toLowerCase().includes(purchaseSearch.toLowerCase())
                              );
                              if (filtered.length === 0) {
                                return (
                                  <div className="px-2.5 py-3 text-center text-muted-foreground text-[10px] font-bold italic">
                                    No accounts match search query.
                                  </div>
                                );
                              }
                              return filtered.map((acc) => (
                                <button
                                  key={acc.accountCode}
                                  type="button"
                                  onClick={() => {
                                    applyAccountMaster("purchase", acc);
                                    setPurchaseDropdownOpen(false);
                                    setPurchaseSearch("");
                                  }}
                                  className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-muted text-left transition"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {acc.accountName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-foreground text-[10px] block truncate">{acc.accountName}</span>
                                      <span className="text-muted-foreground text-[8px] block font-mono truncate">{acc.accountCode} • {acc.cityBranchName}</span>
                                    </div>
                                  </div>
                                  <span className="text-[8px] bg-muted px-1 py-0.5 rounded text-muted-foreground font-bold font-mono uppercase shrink-0">
                                    {acc.ledgerCurrency}
                                  </span>
                                </button>
                              ));
                            })()}
                          </div>
                          <div className="border-t border-border/40 pt-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPurchaseDropdownOpen(false);
                                const newCode = prompt("Enter new purchase account code:");
                                if (newCode) {
                                  setValue("purchaseAccountNo", newCode);
                                  handleAccountLookup("purchase");
                                }
                              }}
                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/5 transition text-left"
                            >
                              <span className="text-sm">+</span>
                              <span>New Account</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={salesDropdownRef}>
                      <label className="block text-[10px] text-muted-foreground mb-1">Sales Account / Code No*</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSalesDropdownOpen(!salesDropdownOpen)}
                          className="flex-1 bg-background border border-input rounded px-2.5 py-1.5 text-foreground outline-none focus:border-primary text-[10px] text-left flex justify-between items-center h-8"
                        >
                          <span className="truncate">
                            {form.salesAccountNo ? `${form.salesAccountNo} - ${form.salesAccountName}` : "Select Account"}
                          </span>
                          <span className="text-muted-foreground text-[8px]">▼</span>
                        </button>
                        <Button
                          type="button"
                          onClick={() => handleAccountLookup("sales")}
                          className="h-8 w-8 p-0 flex items-center justify-center transition shrink-0"
                        >
                          <Search className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {salesDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-full max-w-[280px] rounded-xl bg-card border border-border shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="p-1 border-b border-border/40 mb-1">
                            <div className="relative flex items-center">
                              <Search className="absolute left-2 h-3 w-3 text-muted-foreground" />
                              <input
                                type="text"
                                value={salesSearch}
                                onChange={(e) => setSalesSearch(e.target.value)}
                                placeholder="Search by name or code..."
                                className="w-full bg-background border border-input rounded pl-6 pr-2.5 py-1 text-[9px] outline-none focus:border-primary text-foreground"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {(() => {
                              const filtered = dbAccounts.filter(acc =>
                                acc.accountCode?.toLowerCase().includes(salesSearch.toLowerCase()) ||
                                acc.accountName?.toLowerCase().includes(salesSearch.toLowerCase())
                              );
                              if (filtered.length === 0) {
                                return (
                                  <div className="px-2.5 py-3 text-center text-muted-foreground text-[10px] font-bold italic">
                                    No accounts match search query.
                                  </div>
                                );
                              }
                              return filtered.map((acc) => (
                                <button
                                  key={acc.accountCode}
                                  type="button"
                                  onClick={() => {
                                    applyAccountMaster("sales", acc);
                                    setSalesDropdownOpen(false);
                                    setSalesSearch("");
                                  }}
                                  className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-muted text-left transition"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {acc.accountName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-foreground text-[10px] block truncate">{acc.accountName}</span>
                                      <span className="text-muted-foreground text-[8px] block font-mono truncate">{acc.accountCode} • {acc.cityBranchName}</span>
                                    </div>
                                  </div>
                                  <span className="text-[8px] bg-muted px-1 py-0.5 rounded text-muted-foreground font-bold font-mono uppercase shrink-0">
                                    {acc.ledgerCurrency}
                                  </span>
                                </button>
                              ));
                            })()}
                          </div>
                          <div className="border-t border-border/40 pt-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSalesDropdownOpen(false);
                                const newCode = prompt("Enter new sales account code:");
                                if (newCode) {
                                  setValue("salesAccountNo", newCode);
                                  handleAccountLookup("sales");
                                }
                              }}
                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/5 transition text-left"
                            >
                              <span className="text-sm">+</span>
                              <span>New Account</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Contract No*</label>
                        <input
                          type="text"
                          value={form.purchaseContractNo}
                          onChange={(e) => setValue("purchaseContractNo", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Contract Date*</label>
                        <input
                          type="date"
                          value={form.purchaseDate}
                          onChange={(e) => setValue("purchaseDate", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Payment Type*</label>
                        <select
                          value={form.paymentType}
                          onChange={(e) => setValue("paymentType", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Ship Type*</label>
                        <select
                          value={form.shippingMode}
                          onChange={(e) => setValue("shippingMode", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          {LOADING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold italic pt-1">
                    * All fields details are shown to the RIGHT Live Report.
                  </p>

                  {/* Supplier & Customer — Master Form Pickers */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                      <User className="h-3 w-3" /> Parties (Master Forms)
                    </div>
                    <div className="space-y-2">
                      <CustomerPicker
                        label="Supplier / Seller"
                        value={form.supplierId || ""}
                        onValueChange={(id) => {
                          setValue("supplierId", id);
                        }}
                        placeholder="Search supplier from master..."
                      />
                      {form.supplierId && (
                        <p className="text-[9px] text-muted-foreground pl-1">Supplier linked from Customer Master.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <CustomerPicker
                        label="Customer / Buyer"
                        value={form.customerId || ""}
                        onValueChange={(id) => {
                          setValue("customerId", id);
                        }}
                        placeholder="Search buyer from master..."
                      />
                      {form.customerId && (
                        <p className="text-[9px] text-muted-foreground pl-1">Customer linked from Customer Master.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
                    <Button
                      type="button"
                      onClick={() => setActiveTab("goods")}
                      className="w-full font-bold h-7.5 text-[10px] py-1 shadow-sm"
                    >
                      Next
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className="w-full font-bold h-7.5 text-[10px] py-1"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: GOODS ENTRY */}
              {activeTab === "goods" && (
                <div className="space-y-4">
                  <div className="border-b border-border pb-2 mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Goods Entry</h3>
                    <p className="text-[10px] text-muted-foreground">Add materials, weights, rates & currency parameters</p>
                  </div>

                  {/* Top KPI mini metrics */}
                  <div className="bg-muted/60 border border-border rounded p-2.5 grid grid-cols-3 gap-2 text-[9px] leading-relaxed">
                    <div>
                      <span className="block text-muted-foreground">Total KGS:</span>
                      <strong className="text-foreground font-bold">{currentItemTotals.grossWeight.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Total Qty:</span>
                      <strong className="text-foreground font-bold">{form.qtyNo || 0}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">NET KGS:</span>
                      <strong className="text-foreground font-bold">{currentItemTotals.netWeight.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Total Items:</span>
                      <strong className="text-foreground font-bold">{goodsEntries.length}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Deduct KGS:</span>
                      <strong className="text-destructive font-bold">{(form.qtyNo * form.emptyKgs).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Final Amount:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{currencySymbol(form.secondaryCurrency)}{currentItemTotals.finalAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  {/* Inputs Grid */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Goods Name*</label>
                        <select
                          value={form.goodsName}
                          onChange={(e) => setValue("goodsName", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          {GOODS_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Size Specification</label>
                        <select
                          value={form.size}
                          onChange={(e) => setValue("size", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Brand</label>
                        <select
                          value={form.brand}
                          onChange={(e) => setValue("brand", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          {BRAND_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Origin Country</label>
                        <select
                          value={form.origin}
                          onChange={(e) => setValue("origin", e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none focus:border-primary text-[10px]"
                        >
                          <option value="">Select Origin</option>
                          {masterCountryOptions.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {form.origin && !masterCountryOptions.some(c => c.name === form.origin) && (
                            <option value={form.origin}>{form.origin}</option>
                          )}
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

                    <div className="bg-muted/40 p-2.5 rounded border border-border space-y-2">
                      <span className="block text-[9px] font-bold text-primary uppercase">Multi-Currency & Conversion</span>
                      <div className="grid grid-cols-5 gap-1.5 items-center">
                        <div className="col-span-2">
                          <label className="block text-[9px] text-muted-foreground mb-1">Currency 1</label>
                          <select
                            value={form.currencyType}
                            onChange={(e) => setValue("currencyType", e.target.value)}
                            className="w-full bg-background border border-input rounded px-1 py-1 text-foreground focus:border-primary outline-none text-[10px]"
                          >
                            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        
                        <div className="col-span-1 text-center font-bold text-muted-foreground text-xs mt-3">
                          *
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[9px] text-muted-foreground mb-1">Currency 2</label>
                          <select
                            value={form.secondaryCurrency}
                            onChange={(e) => setValue("secondaryCurrency", e.target.value)}
                            className="w-full bg-background border border-input rounded px-1 py-1 text-foreground focus:border-primary outline-none text-[10px]"
                          >
                            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="pt-1">
                        <label className="block text-[9px] text-muted-foreground mb-1">Conv. Rate (C2)</label>
                        <input
                          type="number"
                          value={form.rate2}
                          onChange={(e) => {
                            setValue("rate2", Number(e.target.value));
                            setValue("exchangeRate", Number(e.target.value));
                          }}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-foreground outline-none text-[10px]"
                        />
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

                  <div className="pt-3 border-t border-border flex flex-col gap-1.5">
                    <Button
                      type="button"
                      onClick={handleAddGoodsEntry}
                      className="w-full font-bold h-7.5 text-[10px] py-1 shadow"
                    >
                      Submit
                    </Button>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("booking")}
                        className="flex-1 font-bold h-7.5 text-[10px] py-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab("others")}
                        className="flex-1 font-bold h-7.5 text-[10px] py-1"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DETAILS (OTHERS) */}
              {activeTab === "others" && (
                <div className="space-y-4">
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
                              <select
                                value={form.loadingCountry || ""}
                                onChange={(e) => setValue("loadingCountry", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              >
                                <option value="">Select Country</option>
                                {masterCountryOptions.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Port</label>
                              <input
                                type="text"
                                value={form.loadingPort || ""}
                                onChange={(e) => setValue("loadingPort", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. Bandar Abbas"
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
                              <select
                                value={form.receivedCountry || ""}
                                onChange={(e) => setValue("receivedCountry", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              >
                                <option value="">Select Country</option>
                                {masterCountryOptions.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Port</label>
                              <input
                                type="text"
                                value={form.receivedPort || ""}
                                onChange={(e) => setValue("receivedPort", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. Karachi Port"
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

                      {form.shippingMode === "By Road" && (
                        <div className="space-y-2 text-[10px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Country</label>
                              <select
                                value={form.loadingCountry || ""}
                                onChange={(e) => setValue("loadingCountry", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              >
                                <option value="">Select Country</option>
                                {masterCountryOptions.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Loading Border</label>
                              <input
                                type="text"
                                value={form.loadingBorder || ""}
                                onChange={(e) => setValue("loadingBorder", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. Torkham Border"
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
                              <select
                                value={form.receivedCountry || ""}
                                onChange={(e) => setValue("receivedCountry", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              >
                                <option value="">Select Country</option>
                                {masterCountryOptions.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Border</label>
                              <input
                                type="text"
                                value={form.receivedBorder || ""}
                                onChange={(e) => setValue("receivedBorder", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. Peshawar Border"
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
                              <select
                                value={form.loadingCountry || ""}
                                onChange={(e) => setValue("loadingCountry", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              >
                                <option value="">Select Country</option>
                                {masterCountryOptions.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Airport Name</label>
                              <input
                                type="text"
                                value={form.airportName || ""}
                                onChange={(e) => setValue("airportName", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. Dubai Intl"
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
                              <select
                                value={form.receivedCountry || ""}
                                onChange={(e) => setValue("receivedCountry", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                              >
                                <option value="">Select Country</option>
                                {masterCountryOptions.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] text-muted-foreground mb-0.5">Received Airport Name</label>
                              <input
                                type="text"
                                value={form.receivedPortName || ""}
                                onChange={(e) => setValue("receivedPortName", e.target.value)}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none"
                                placeholder="e.g. JFK Airport"
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
                      onClick={handleSavePurchaseOrder}
                      disabled={savingOrder}
                      className="w-full font-bold h-7.5 text-[10px] py-1 shadow uppercase tracking-wider"
                    >
                      {savingOrder ? "Saving..." : "Submit Report"}
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
                </div>
              )}

            </CardContent>
          </Card>

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

        </section>

        {/* Right Column Preview Panel (approx 75% width - col-span-9) */}
        <section className="lg:col-span-9 space-y-4">
          
          {/* Main Preview Container */}
          <Card className="bg-card border-border shadow-md rounded-lg p-5 relative">
            
            {/* Empty space, cards automatically shifted to the top */}

            {/* Horizontal Cards row */}
            <div className="sticky top-[72px] z-10 bg-card pb-4 border-b border-border/40 mb-4 pt-1">
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
                    <div className="flex justify-between"><span className="text-muted-foreground">Origin Country:</span> <span className="font-semibold text-foreground truncate" title={form.branchCountry}>{form.branchCountry || "N/A"}</span></div>
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
                  </div>
                </div>

                {/* Card 4: Sales Account Details */}
                <div className="bg-card border border-border shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-primary/30 transition duration-200">
                  <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-border/60">
                    <span className="p-1 rounded-md bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Sales Account Details</h4>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between"><span className="text-muted-foreground">Account Code:</span> <span className="font-bold text-foreground truncate block w-full text-right font-mono" title={form.salesAccountNo}>{form.salesAccountNo}</span></div>
                    <div className="space-y-0.5 pt-1">
                      <span className="text-muted-foreground block text-[9px]">Account Name:</span>
                      <span className="font-semibold text-foreground block truncate text-xs text-primary" title={form.salesAccountName}>{form.salesAccountName}</span>
                    </div>
                    <div className="flex justify-between pt-1"><span className="text-muted-foreground">Branch:</span> <span className="font-semibold text-foreground truncate" title={form.salesAccountBranch}>{form.salesAccountBranch}</span></div>
                    <div className="flex justify-between pt-0.5"><span className="text-muted-foreground">Currency:</span> <span className="font-bold text-foreground">{form.salesAccountCurrency}</span></div>
                  </div>
                </div>

              </div>
            </div>

            {/* Goods and Container Report Section */}
            <div className="mt-6">
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
                      <th colSpan={3} className="px-2 py-3 text-center bg-primary/10 text-yellow-600 dark:text-yellow-450 font-bold">Primary Currency</th>
                      <th className="px-2 py-3 text-center w-8">OP</th>
                      <th colSpan={2} className="px-2 py-3 text-center bg-primary/5 text-yellow-600 dark:text-yellow-450 font-bold">Secondary Currency</th>
                      <th className="px-2 py-3 text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black">Final Amount</th>
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
                          
                          {/* Primary Currency colSpan */}
                          <td className="px-2 py-2.5 text-center font-bold text-yellow-600 dark:text-yellow-450 bg-primary/5">{currencySymbol(row.currencyType)}</td>
                          <td className="px-2 py-2.5 text-right font-mono bg-primary/5">{currencySymbol(row.currencyType)}{row.coursePrice.toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right font-mono bg-primary/5">{currencySymbol(row.currencyType)}{row.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          
                          {/* OP */}
                          <td className="px-2 py-2.5 text-center font-bold text-muted-foreground font-mono">*</td>
                          
                          {/* Secondary Currency colSpan */}
                          <td className="px-2 py-2.5 text-center font-bold text-yellow-600 dark:text-yellow-450 bg-primary/5">{currencySymbol(row.secondaryCurrency)}</td>
                          <td className="px-2 py-2.5 text-right font-mono bg-primary/5">{row.rate2.toFixed(2)}</td>
                          
                          {/* Final Amount */}
                          <td className="px-2 py-2.5 text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black font-mono">
                            {currencySymbol(row.secondaryCurrency)}{row.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <td colSpan={3} className="px-2 py-3 text-right font-mono bg-primary/5 text-yellow-600 dark:text-yellow-450">{currencySymbol(form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-2 py-3"></td>
                      <td colSpan={2} className="px-2 py-3"></td>
                      <td className="px-2 py-3 text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black font-mono">
                        {currencySymbol(goodsEntries[0]?.secondaryCurrency || "PKR")}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <span className="block text-[8px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500 font-bold">Grand Final ({currencySymbol(goodsEntries[0]?.secondaryCurrency || "PKR")})</span>
                  <strong className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {currencySymbol(goodsEntries[0]?.secondaryCurrency || "PKR")}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

            </div>

          </Card>

        </section>

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
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Purchase Account</h3>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Code:</span> <span className="font-semibold">{form.purchaseAccountNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Name:</span> <span className="font-semibold truncate max-w-[180px]">{form.purchaseAccountName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Currency:</span> <span className="font-bold">{form.purchaseAccountCurrency}</span></div>
                </div>

                <div className="space-y-1.5 border-l border-border/80 pl-6">
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Sales Account</h3>
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
                        <th className="px-3 py-2 text-right">Currency</th>
                        <th className="px-3 py-2 text-right">Final Amount</th>
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
                          <td className="px-3 py-2 text-right font-semibold">{currencySymbol(row.secondaryCurrency)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {currencySymbol(row.secondaryCurrency)}{row.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <h3 className="font-black uppercase tracking-wider text-[10px] text-primary mb-1">Payment Schedule & Advance Terms</h3>
                  <div className="flex justify-between border-b border-border/40 pb-1"><span className="text-muted-foreground">Payment Condition:</span> <span className="font-bold text-foreground">{form.paymentType}</span></div>
                  {form.paymentType === "Advance Payment" && (
                    <div className="space-y-3 pt-1">
                      {/* Purchase Side */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground block text-[8px] uppercase font-bold text-primary">Purchase Side ({form.purchaseAccountNo}):</span>
                        <div className="grid grid-cols-6 gap-1 font-mono text-[9px] pl-2 border-l border-primary/20 leading-tight">
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Total</span>
                            <strong className="text-foreground block">{currencySymbol(form.purchaseAccountCurrency || form.currencyType)}{reportTotals.grandPrimaryFinal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Pct</span>
                            <strong className="text-foreground block">{form.advancePercent}%</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-primary block uppercase font-bold">Adv Paid</span>
                            <strong className="text-primary block">{currencySymbol(form.purchaseAccountCurrency || form.currencyType)}{((reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Adv Date</span>
                            <span className="text-foreground block font-semibold">{form.advancePaymentDate}</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Remaining</span>
                            <strong className="text-foreground block">{currencySymbol(form.purchaseAccountCurrency || form.currencyType)}{(reportTotals.grandPrimaryFinal - (reportTotals.grandPrimaryFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
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
                            <strong className="text-foreground block">{currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Pct</span>
                            <strong className="text-foreground block">{form.advancePercent}%</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-emerald-600 dark:text-emerald-500 block uppercase font-bold">Adv Recd</span>
                            <strong className="text-emerald-600 block">{currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}{((reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Adv Date</span>
                            <span className="text-foreground block font-semibold">{form.advancePaymentDate}</span>
                          </div>
                          <div>
                            <span className="text-[7px] text-muted-foreground block uppercase">Remaining</span>
                            <strong className="text-foreground block">{currencySymbol(form.salesAccountCurrency || goodsEntries[0]?.secondaryCurrency || form.secondaryCurrency)}{(reportTotals.grandFinal - (reportTotals.grandFinal * (form.advancePercent || 0)) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
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
                      {currencySymbol(goodsEntries[0]?.secondaryCurrency || "PKR")}{reportTotals.grandFinal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
