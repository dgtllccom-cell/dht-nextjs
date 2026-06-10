"use client";
import React, { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Package,
  Printer,
  Ship,
  Trash2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COUNTRY_OPTIONS = ["Iran", "Pakistan", "UAE", "Afghanistan", "India"];
const CURRENCY_OPTIONS = ["USD", "AED", "PKR", "AFN", "INR"];
const PAYMENT_TYPES = ["Advance Payment", "Invoice", "Final Payment", "Credit"];
const LOADING_TYPES = ["By Sea", "By Road", "By Air"];
const CONTAINER_TYPES = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "Non Reefer"];
const QTY_TYPE_OPTIONS = ["Cartons", "Bags", "Loose", "KGS", "Ton"];
const ORIGIN_OPTIONS = ["Iran", "Pakistan", "UAE", "Afghanistan", "India", "Turkey", "China"];
const PURCHASE_ACCOUNT_OPTIONS = ["PA-1001 - Najeebullah Purchase Account", "PA-1002 - Import Purchase Account", "PA-1003 - Stock Purchase Account"];
const SALES_ACCOUNT_OPTIONS = ["SA-2001 - Damaan Sales Account", "SA-2002 - Export Sales Account", "SA-2003 - Branch Sales Account"];

const DEFAULT_FORM = {
  purchaseAccountNo: "PA-1001",
  purchaseAccountName: "Najeebullah Purchase Account",
  purchaseAccountBranch: "Kabul Purchase Branch",
  purchaseAccountCurrency: "USD",
  salesAccountNo: "SA-2001",
  salesAccountName: "Damaan Sales Account",
  salesAccountBranch: "Dubai Sales Branch",
  salesAccountCurrency: "AED",
  purchaseContractNo: "PC-2026-001",
  purchaseOrderNo: "PO-2026-0001",
  billNo: "BILL-7788",
  purchaseContact: "+93 700 000 000",
  purchaseDate: "2026-01-29",
  currencyType: "USD",
  exchangeRate: 278.5,
  branchName: "Kabul Main Branch",
  branchCode: "BR-KBL-001",
  branchCity: "Kabul",
  branchCountry: "Afghanistan",
  userName: "Admin User",
  userId: "USR-1001",
  paymentType: "Advance Payment",
  advancePercentage: 10,
  advanceDueDate: "2026-02-05",
  paymentPercentage: 20,
  invoiceDueDate: "2026-02-10",
  remainingDueDate: "2026-03-01",
  creditDays: 30,
  loadingCondition: "By Sea",
  bookedContainerCount: 10,
  shipmentType: "By Ship",
  shippingMode: "By Sea",
  supplierName: "Zahid Supplies LLC",
  customerName: "Damaan Trading LLC",
  purchaseType: "Import Purchase",
  salesType: "Wholesale Sales",
  salesContractNo: "SC-2026-001",
  deliveryType: "Branch Delivery",
  salesStatus: "Draft",
  goodsName: "PISTACHIOS KERNEL",
  size: "Large",
  brand: "Premium",
  origin: "Iran",
  hsCode: "0802.51",
  qtyName: "Bags",
  qtyNo: 250,
  packetQty: 1000,
  qtyKgs: 1,
  emptyKgs: 1,
  divideType: "D/Kgs",
  divideWeight: 10,
  priceType: "P/Divide",
  coursePrice: 125,
  containerNo: "CONT-7788",
  containerType: "40 FT Reefer",
  loadingCountry: "Iran",
  loadingPort: "Bandar Abbas",
  loadingBorder: "",
  loadingDate: "2026-02-02",
  receivedCountry: "Pakistan",
  receivedPort: "Karachi Port",
  receivedBorder: "",
  receivedDate: "2026-02-18",
  vesselName: "",
  airlineName: "Emirates Cargo"
};

function buildBookedContainers(orderNo, count, type = "40 FT Reefer") {
  const safeCount = Math.max(0, Number(count || 0));
  return Array.from({ length: safeCount }, (_, index) => ({
    id: `${orderNo || "PO-DRAFT"}-CONT-${String(index + 1).padStart(2, "0")}`,
    purchaseOrderNo: orderNo || "PO-DRAFT",
    serial: index + 1,
    containerNo: `Container ${index + 1}`,
    containerType: type,
    loadingStatus: "Pending",
    loadedAt: "",
    loadingPort: "",
    receivedPort: "",
    linkedToPurchaseOrder: true
  }));
}

function getContainerStats(containers) {
  const total = containers.length;
  const loaded = containers.filter((container) => container.loadingStatus === "Loaded").length;
  return {
    total,
    loaded,
    remaining: Math.max(0, total - loaded),
    status: total === 0 ? "Draft" : loaded === 0 ? "Pending" : loaded === total ? "Completed" : "Partial"
  };
}

function calculateTotals(form) {
  const qtyNo = Number(form.qtyNo || 0);
  const qtyKgs = Number(form.qtyKgs || 0);
  const emptyKgs = Number(form.emptyKgs || 0);
  const divideWeight = Number(form.divideWeight || 1) || 1;
  const coursePrice = Number(form.coursePrice || 0);
  const exchangeRate = Number(form.exchangeRate || 1);
  const invoicePercentage = Number(form.paymentPercentage || 0);
  const advancePercentage = Number(form.advancePercentage || 0);

  const grossWeight = qtyNo * qtyKgs;
  const totalEmptyWeight = qtyNo * emptyKgs;
  const netWeight = grossWeight - totalEmptyWeight;
  const netKgs = netWeight;
  const totalDivide = netWeight / divideWeight;
  const totalAmount = totalDivide * coursePrice;
  const purchaseCurrencyTotal = totalAmount;
  const finalAmount = totalAmount * exchangeRate;
  const invoiceAmount = form.paymentType === "Invoice" ? (finalAmount * invoicePercentage) / 100 : 0;
  const advanceAmount = form.paymentType === "Advance Payment" ? (finalAmount * advancePercentage) / 100 : 0;
  const finalPaymentAmount = form.paymentType === "Final Payment" ? finalAmount : 0;
  const creditAmount = form.paymentType === "Credit" ? finalAmount : 0;
  const remainingAmount = form.paymentType === "Invoice" || form.paymentType === "Advance Payment" ? finalAmount - invoiceAmount - advanceAmount : 0;

  return {
    grossWeight,
    totalEmptyWeight,
    netWeight,
    netKgs,
    totalDivide,
    totalAmount,
    purchaseCurrencyTotal,
    finalAmount,
    invoiceAmount,
    advanceAmount,
    remainingAmount,
    finalPaymentAmount,
    creditAmount
  };
}

function runCalculationTests() {
  const advanceTotals = calculateTotals(DEFAULT_FORM);
  console.assert(advanceTotals.grossWeight === 250, "grossWeight should be quantity Ã— quantity kg");
  console.assert(advanceTotals.totalEmptyWeight === 250, "totalEmptyWeight should be quantity Ã— empty kg");
  console.assert(advanceTotals.netKgs === 0, "netKgs should be gross weight minus total empty weight");
  console.assert(advanceTotals.totalDivide === 0, "totalDivide should be netWeight Ã· divideWeight");
  console.assert(advanceTotals.totalAmount === 0, "totalAmount should be totalDivide Ã— price");
  console.assert(advanceTotals.purchaseCurrencyTotal === 0, "purchaseCurrencyTotal should equal totalAmount before exchange");
  console.assert(advanceTotals.finalAmount === 0, "finalAmount should include exchange rate");
  console.assert(advanceTotals.advanceAmount === 0, "advanceAmount should be 10% of finalAmount for Advance Payment");
  console.assert(advanceTotals.remainingAmount === 0, "remainingAmount should be final amount minus advance amount");
  console.assert(advanceTotals.invoiceAmount === 0, "invoiceAmount should be zero for Advance Payment");

  const invoiceTotals = calculateTotals({ ...DEFAULT_FORM, paymentType: "Invoice" });
  console.assert(invoiceTotals.invoiceAmount === 0, "invoiceAmount should be 20% of finalAmount");
  console.assert(invoiceTotals.remainingAmount === 0, "remainingAmount should be final amount minus invoice amount");

  const finalPaymentTotals = calculateTotals({ ...DEFAULT_FORM, paymentType: "Final Payment" });
  console.assert(finalPaymentTotals.finalPaymentAmount === finalPaymentTotals.finalAmount, "Final payment should equal final amount");
  console.assert(finalPaymentTotals.remainingAmount === 0, "remainingAmount should be zero for Final Payment");

  const creditTotals = calculateTotals({ ...DEFAULT_FORM, paymentType: "Credit" });
  console.assert(creditTotals.creditAmount === creditTotals.finalAmount, "Credit amount should equal final amount for Credit");
  console.assert(creditTotals.invoiceAmount === 0, "Invoice amount should be zero for Credit");

  const divideByZeroTotals = calculateTotals({ ...DEFAULT_FORM, divideWeight: 0 });
  console.assert(divideByZeroTotals.totalDivide === 0, "divideWeight zero should safely fall back to divide by 1");
}

runCalculationTests();

export default function PurchaseOrderWizardForm() {
  const [step, setStep] = useState(1);
  const [showActions, setShowActions] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [goodsEntries, setGoodsEntries] = useState([]);
  const [purchaseContainers, setPurchaseContainers] = useState(() => buildBookedContainers(DEFAULT_FORM.purchaseOrderNo, DEFAULT_FORM.bookedContainerCount, DEFAULT_FORM.containerType));
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedBookingReport, setSavedBookingReport] = useState(null);

  const baseCurrency = useMemo(
    () => (form.currencyType || form.purchaseAccountCurrency || form.salesAccountCurrency || "USD").toUpperCase(),
    [form.currencyType, form.purchaseAccountCurrency, form.salesAccountCurrency]
  );
  const totals = useMemo(() => calculateTotals(form), [form]);
  const containerStats = useMemo(() => getContainerStats(purchaseContainers), [purchaseContainers]);
  const setValue = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const createBookingContainers = () => {
    setPurchaseContainers(buildBookedContainers(form.purchaseOrderNo, form.bookedContainerCount, form.containerType));
    setSaveMessage(`Purchase Booking Order ${form.purchaseOrderNo} has ${form.bookedContainerCount} booked containers ready for loading.`);
  };
  const markContainerLoaded = (containerId) => {
    setPurchaseContainers((previous) =>
      previous.map((container) =>
        container.id === containerId
          ? {
              ...container,
              loadingStatus: "Loaded",
              loadedAt: new Date().toISOString(),
              loadingPort: form.loadingPort || form.loadingBorder || form.loadingCountry,
              receivedPort: form.receivedPort || form.receivedBorder || form.receivedCountry,
              containerType: form.containerType,
              linkedToPurchaseOrder: true
            }
          : container
      )
    );
  };
  const saveGoodsEntry = () => {
    setGoodsEntries((previous) => [
      ...previous,
      {
        goodsName: form.goodsName,
        size: form.size,
        brand: form.brand,
        origin: form.origin,
        hsCode: form.hsCode,
        qtyName: form.qtyName,
        quantity: form.qtyNo,
        qtyNo: form.qtyNo,
        qtyKgs: form.qtyKgs,
        grossWeight: totals.grossWeight,
        totalEmptyWeight: totals.totalEmptyWeight,
        netWeight: totals.netWeight,
        divideWeight: form.divideWeight,
        totalDivide: totals.totalDivide,
        priceType: form.priceType,
        divideType: form.divideType,
        price: form.coursePrice,
        totalAmount: totals.totalAmount,
        currencyType: form.currencyType,
        exchangeRate: form.exchangeRate,
        finalAmount: totals.finalAmount,
        emptyKgs: form.emptyKgs
      }
    ]);
    setSaveMessage("Goods added to draft. Click Submit Order to save this purchase order to the database.");
    setForm((previous) => ({ ...previous, goodsName: "", qtyNo: 0, qtyKgs: 0, emptyKgs: 0, divideWeight: 1, coursePrice: 0 }));
  };
  const submitOrder = async () => {
    setSavingOrder(true);
    setSaveMessage("");
    try {
      const activeGoodsEntries = goodsEntries.length
        ? goodsEntries
        : [
            {
              goodsName: form.goodsName,
              size: form.size,
              brand: form.brand,
              origin: form.origin,
              hsCode: form.hsCode,
              qtyName: form.qtyName,
              qtyNo: form.qtyNo,
              qtyKgs: form.qtyKgs,
              grossWeight: totals.grossWeight,
              totalEmptyWeight: totals.totalEmptyWeight,
              netWeight: totals.netWeight,
              divideWeight: form.divideWeight,
              totalDivide: totals.totalDivide,
              priceType: form.priceType,
              divideType: form.divideType,
              price: form.coursePrice,
              totalAmount: totals.totalAmount,
              currencyType: form.currencyType,
              exchangeRate: form.exchangeRate,
              finalAmount: totals.finalAmount,
              emptyKgs: form.emptyKgs
            }
          ];

      const response = await fetch("/api/erp/purchases/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseContractNo: form.purchaseContractNo || form.purchaseOrderNo,
          currencyCode: baseCurrency,
          exchangeRate: Number(form.exchangeRate || 1),
          orderTotal: Number(totals.finalAmount || 0),
          formData: {
            form,
            totals,
            goodsEntries: activeGoodsEntries,
            purchaseBooking: {
              purchaseOrderNo: form.purchaseOrderNo,
              totalContainersBooked: containerStats.total,
              containersLoaded: containerStats.loaded,
              remainingContainers: containerStats.remaining,
              loadingStatus: containerStats.status,
              containers: purchaseContainers
            },
            savedFrom: "purchase-order-wizard",
            savedAt: new Date().toISOString()
          }
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Purchase order was not saved.");
      }

      setSavedBookingReport({
        form: { ...form, purchaseOrderNo: payload.data.purchaseOrderNo || form.purchaseOrderNo },
        totals: { ...totals },
        goodsEntries: activeGoodsEntries.map((entry) => ({ ...entry })),
        containerStats: { ...containerStats },
        savedAt: new Date().toISOString()
      });
      setSaveMessage(`Saved to database: ${payload.data.purchaseOrderNo}`);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Purchase order was not saved.");
    } finally {
      setSavingOrder(false);
    }
  };

  const steps = [
    { no: 1, title: "Purchase Estimate", icon: <FileText className="h-4 w-4" /> },
    { no: 2, title: "Goods Estimate", icon: <Package className="h-4 w-4" /> },
    { no: 3, title: "Payment Estimate", icon: <CreditCard className="h-4 w-4" /> },
    { no: 4, title: "Loading Estimate", icon: <Ship className="h-4 w-4" /> }
  ];

  return (
    <div className="bpcc min-h-screen px-[22px] pb-[28px] text-[var(--text)]">
      <PurchaseBookingStyles />
      <main className="bpcc-workspace min-h-[calc(100vh-100px)] border border-blue-500/10 p-[22px] shadow-2xl">
        <Header
          showActions={showActions}
          setShowActions={setShowActions}
          steps={steps}
          step={step}
          setStep={setStep}
          form={form}
          setValue={setValue}
          totals={totals}
        />

        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="bpcc-left-card rounded-lg text-[var(--text)] shadow-[0_20px_35px_rgba(0,0,0,.25)] xl:sticky xl:top-4">
            <CardContent className="p-3">
              <StepTabs steps={steps} step={step} setStep={setStep} />
              {step === 1 && <PurchaseSetup form={form} setValue={setValue} />}
              {step === 2 && (
                <GoodsEntry
                  form={form}
                  setValue={setValue}
                  totals={totals}
                  goodsEntries={goodsEntries}
                  saveGoodsEntry={saveGoodsEntry}
                  baseCurrency={baseCurrency}
                  purchaseLedgerName={form.purchaseAccountName}
                  salesLedgerName={form.salesAccountName}
                  scopeCountryName={form.branchCountry || form.origin}
                  scopeBranchName={form.branchName || form.purchaseAccountBranch}
                  branchCode={form.branchCode}
                  userName={form.userName || "Admin User"}
                />
              )}
              {step === 3 && <PaymentStep form={form} setValue={setValue} totals={totals} />}
              {step === 4 && (
                <LoadingStep
                  form={form}
                  setValue={setValue}
                  containers={purchaseContainers}
                  containerStats={containerStats}
                  createBookingContainers={createBookingContainers}
                  markContainerLoaded={markContainerLoaded}
                />
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#24344c] pt-3">
                <Button
                  disabled={step === 1}
                  onClick={() => setStep((currentStep) => Math.max(1, currentStep - 1))}
                  variant="outline"
                  className="h-[34px] border-[#475569] bg-[#334155] text-[11px] font-black text-[#d8e3f1] hover:bg-[#475569] hover:text-white"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                {step < 4 ? (
                  <Button onClick={() => setStep((currentStep) => Math.min(4, currentStep + 1))} className="h-[34px] bg-[#2f6df6] text-[11px] font-black text-white hover:bg-blue-600">
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={submitOrder} disabled={savingOrder} className="h-[34px] bg-emerald-500 text-[11px] font-black text-white hover:bg-emerald-400 disabled:opacity-60">
                    {savingOrder ? "Saving..." : "Submit Order"} <Check className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
              {saveMessage ? (
                <div
                  className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                    saveMessage.startsWith("Saved to database")
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  {saveMessage}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <section className="bpcc-report-zone min-w-0 space-y-3 rounded-lg bg-[var(--panel2)] p-3 text-[var(--text)]">
            {savedBookingReport ? (
              <SavedPurchaseBookingReport report={savedBookingReport} onClear={() => setSavedBookingReport(null)} />
            ) : (
              <>
                <TopBookingPackets form={form} setValue={setValue} totals={totals} />
                <LiveReport form={form} totals={totals} goodsEntries={goodsEntries} containerStats={containerStats} />
                <GoodsContainerReport
                  form={form}
                  totals={totals}
                  goodsEntries={goodsEntries}
                  containers={purchaseContainers}
                  containerStats={containerStats}
                  markContainerLoaded={markContainerLoaded}
                />
              </>
            )}
          </section>
        </div>

      </main>
    </div>
  );
}

function PurchaseBookingStyles() {
  return (
    <style>{`
      .bpcc {
        --bg:#f4f7fb; --page:#ffffff; --panel:#ffffff; --panel2:#f8fafc; --input:#ffffff; --line:#d7e0ec;
        --text:#0f172a; --muted:#64748b; --blue:#2563eb; --cyan:#0891b2; --green:#059669; --red:#dc2626; --yellow:#b45309;
        background:var(--bg);
        font-family:"Plus Jakarta Sans", Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .dark .bpcc,
      .bpcc[data-theme="dark"] {
        --bg:#050b14; --page:#0b1424; --panel:#111c2e; --panel2:#172437; --input:#081122; --line:#24344c;
        --text:#f8fafc; --muted:#8aa0bd; --blue:#2f6df6; --cyan:#22d3ee; --green:#10b981; --red:#ef4444; --yellow:#fbbf24;
      }
      .bpcc-workspace { background:var(--page); }
      .bpcc-report-zone {
        border:1px solid var(--line);
        box-shadow:0 20px 35px rgba(0,0,0,.12);
      }
      .bpcc-left-card,
      .bpcc-packet,
      .bpcc-report-card,
      .bpcc-table-card,
      .bpcc-section {
        background:var(--panel2) !important;
        border-color:var(--line) !important;
      }
      .bpcc-packet,
      .bpcc-report-card,
      .bpcc-table-card {
        box-shadow:0 14px 30px rgba(0,0,0,.12);
      }
      .bpcc-right-wrap { background:color-mix(in srgb, var(--panel2), var(--page) 22%); }
      .bpcc input,
      .bpcc select,
      .bpcc textarea {
        background:var(--input) !important;
        border-color:var(--line) !important;
        color:var(--text) !important;
      }
      .bpcc input::placeholder,
      .bpcc textarea::placeholder { color:var(--muted); opacity:.8; }
      .bpcc-table-row:nth-child(odd) { background:color-mix(in srgb, var(--panel2), var(--input) 40%); }
      .bpcc-table-row:hover { background:color-mix(in srgb, var(--blue), transparent 88%); }
      .bpcc-report-zone .bpcc-top-packets { margin-bottom:0; }
      .bpcc-report-zone .bpcc-table-card { margin-top:0; }
    `}</style>
  );
}

function Header({ showActions, setShowActions, steps, step, setStep, form, setValue, totals }) {
  return (
    <div className="mb-[18px] flex h-14 items-center justify-between rounded-xl border border-[var(--line)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--panel),#000_8%),color-mix(in_srgb,var(--panel2),var(--blue)_8%))] px-[18px]">
      <div className="flex items-center gap-3 text-[18px] font-black">
        <span className="h-6 w-1 rounded-full bg-[#22d3ee]" aria-hidden />
        Booking Purchase / Booking Confirm
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => window.print()} className="h-[34px] rounded-lg bg-white px-[18px] text-[11px] font-black text-slate-900">
          Print
        </button>
        <button type="button" className="h-[34px] rounded-lg border border-[#475569] bg-[#334155] px-[18px] text-[11px] font-black text-white">
          Preview
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className="h-[34px] rounded-lg border border-[#475569] bg-[#334155] px-3 text-white hover:border-blue-400"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showActions && (
            <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
              <ActionItem icon={<Download className="h-4 w-4 text-rose-300" />} label="Export PDF" />
              <ActionItem icon={<Printer className="h-4 w-4 text-emerald-300" />} label="Print" />
              <ActionItem icon={<Eye className="h-4 w-4 text-cyan-300" />} label="View Full Report" />
              <ActionItem icon={<CreditCard className="h-4 w-4 text-amber-300" />} label="Open Ledger" />
              <ActionItem icon={<FileText className="h-4 w-4 text-violet-300" />} label="Open Roznamcha" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopBookingPackets({ form, setValue, totals }) {
  return (
    <div className="bpcc-top-packets mb-[18px] grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_1.15fr]">
      <div className="bpcc-packet rounded-[10px] border p-3">
        <div className="mb-2 flex items-center justify-between border-b border-[var(--line)] pb-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-[#22d3ee]">Purchase Code</span>
          <span className="rounded bg-[var(--input)] px-2 py-1 text-[9px] font-black text-[var(--yellow)]">{form.purchaseAccountNo || "-"}</span>
        </div>
        <AccountSearchField
          label="Purchase Account"
          listId="top-purchase-account-options"
          options={PURCHASE_ACCOUNT_OPTIONS}
          value={form.purchaseAccountNo}
          onChange={(event) => setValue("purchaseAccountNo", event.target.value)}
        />
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <PacketMini label="Name" value={form.purchaseAccountName} />
          <PacketMini label="Branch" value={form.purchaseAccountBranch} />
          <PacketMini label="Currency" value={form.purchaseAccountCurrency || form.currencyType} />
          <PacketMini label="Balance" value={`${formatNumber(totals.finalAmount)} ${form.currencyType}`} tone="green" />
        </div>
      </div>

      <div className="bpcc-packet rounded-[10px] border p-3">
        <div className="mb-2 flex items-center justify-between border-b border-[var(--line)] pb-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-[#22d3ee]">Sales Code</span>
          <span className="rounded bg-[var(--input)] px-2 py-1 text-[9px] font-black text-[var(--yellow)]">{form.salesAccountNo || "-"}</span>
        </div>
        <AccountSearchField
          label="Sales Account"
          listId="top-sales-account-options"
          options={SALES_ACCOUNT_OPTIONS}
          value={form.salesAccountNo}
          onChange={(event) => setValue("salesAccountNo", event.target.value)}
        />
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <PacketMini label="Name" value={form.salesAccountName} />
          <PacketMini label="Branch" value={form.salesAccountBranch} />
          <PacketMini label="Currency" value={form.salesAccountCurrency || form.currencyType} />
          <PacketMini label="Status" value={form.paymentType} tone="blue" />
        </div>
      </div>

      <div className="bpcc-packet rounded-[10px] border p-3">
        <div className="mb-2 flex items-center justify-between border-b border-[var(--line)] pb-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-[#22d3ee]">Bill / Booking Detail</span>
          <span className="rounded bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300">{form.paymentType || "Draft"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Purchase Order No" value={form.purchaseOrderNo} onChange={(event) => setValue("purchaseOrderNo", event.target.value)} />
          <Field label="Purchase Date" type="date" value={form.purchaseDate} onChange={(event) => setValue("purchaseDate", event.target.value)} />
          <Field label="Contract No" value={form.purchaseContractNo} onChange={(event) => setValue("purchaseContractNo", event.target.value)} />
          <Field label="Bill No" value={form.billNo} onChange={(event) => setValue("billNo", event.target.value)} />
        </div>
      </div>
    </div>
  );
}

function PacketMini({ label, value, tone = "default" }) {
  const toneClass = tone === "green" ? "text-emerald-400" : tone === "blue" ? "text-[var(--cyan)]" : "text-[var(--text)]";
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--input)] px-2 py-1.5">
      <div className="text-[8px] font-black uppercase text-[var(--muted)]">{label}</div>
      <div className={`mt-0.5 truncate text-[10px] font-black ${toneClass}`}>{value || "-"}</div>
    </div>
  );
}

function StepTabs({ steps, step, setStep }) {
  return (
    <div className="mb-[10px] space-y-1.5">
      {steps.map((item) => {
        const active = step === item.no;
        const done = item.no < step;
        const cardClass = active ? "bg-[#2f6df6] text-white" : done ? "bg-emerald-500/20 text-emerald-100" : "bg-[#334155] text-[#9db0ca]";
        const badgeClass = done
          ? "bg-emerald-500 text-white"
          : active
            ? "bg-blue-500 text-white"
            : "bg-slate-800 text-slate-400";

        return (
          <button key={item.no} type="button" onClick={() => setStep(item.no)} className={`h-[25px] w-full rounded-[4px] border-0 px-2 text-left text-[9px] font-black transition ${cardClass}`}>
            <div className="flex items-center gap-1.5">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${badgeClass}`}>
                {done ? <Check className="h-3 w-3" /> : item.no}
              </span>
              <span className="min-w-0 truncate text-[9px] font-semibold leading-tight">{item.title}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PurchaseSetup({ form, setValue }) {
  return (
    <Section title="1) Purchase / Payment / Loading Entry">
      <div className="grid grid-cols-1 gap-2">
        <Field label="Purchase Contract No" value={form.purchaseContractNo} onChange={(event) => setValue("purchaseContractNo", event.target.value)} />
        <Field label="Purchase Contact Number" value={form.purchaseContact} onChange={(event) => setValue("purchaseContact", event.target.value)} />
        <div className="grid grid-cols-2 gap-1.5 md:col-span-2">
          <Select label="Payment Type" value={form.paymentType} onChange={(event) => setValue("paymentType", event.target.value)} options={PAYMENT_TYPES} />
          <Select label="Ship Type" value={form.loadingCondition} onChange={(event) => setValue("loadingCondition", event.target.value)} options={LOADING_TYPES} />
        </div>

        <div className="grid grid-cols-2 gap-1.5 md:col-span-2">
          <Select label="Purchase Currency" value={form.currencyType} onChange={(event) => setValue("currencyType", event.target.value)} options={CURRENCY_OPTIONS} />
          <Field label="Exchange Rate" type="number" value={form.exchangeRate} onChange={(event) => setValue("exchangeRate", event.target.value)} />
        </div>
      </div>
    </Section>
  );
}

function GoodsEntry({ form, setValue, totals, goodsEntries, saveGoodsEntry, baseCurrency }) {
  const primaryCurrency = (form.currencyType || baseCurrency || "USD").toUpperCase();

  return (
    <Section title="Step 2 - Goods Entry / Divide Calculation">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {[
            ["Total Qty", formatNumber(form.qtyNo)],
            ["1 Qty KGS", formatNumber(form.qtyKgs)],
            ["Gross Weight", formatNumber(totals.grossWeight)],
            ["Net Weight", formatNumber(totals.netWeight)],
            ["Divide", formatNumber(totals.totalDivide)],
            ["Final Amount", `${formatNumber(totals.finalAmount)} ${primaryCurrency}`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[var(--line)] bg-[var(--input)] px-2 py-1.5">
              <div className="text-[8px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
              <div className="mt-0.5 truncate font-black text-[var(--text)]">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Goods Name" value={form.goodsName} onChange={(event) => setValue("goodsName", event.target.value)} />
          <Field label="Size" value={form.size} onChange={(event) => setValue("size", event.target.value)} />
          <Field label="Brand" value={form.brand} onChange={(event) => setValue("brand", event.target.value)} />
          <Select label="Origin Country" value={form.origin} onChange={(event) => setValue("origin", event.target.value)} options={[...ORIGIN_OPTIONS, "+ New Origin"]} />
          <Field label="HS Code" value={form.hsCode} onChange={(event) => setValue("hsCode", event.target.value)} />
          <Select label="Quantity Type" value={form.qtyName} onChange={(event) => setValue("qtyName", event.target.value)} options={[...QTY_TYPE_OPTIONS, "+ New Quantity Type"]} />
          <Field label="Quantity No" type="number" value={form.qtyNo} onChange={(event) => setValue("qtyNo", event.target.value)} />
          <Field label="Quantity KGS" type="number" value={form.qtyKgs} onChange={(event) => setValue("qtyKgs", event.target.value)} />
          <Field label="Gross Weight" type="number" value={formatPlain(totals.grossWeight)} readOnly />
          <Field label="Empty KGS Per Qty" type="number" value={form.emptyKgs} onChange={(event) => setValue("emptyKgs", event.target.value)} />
          <Field label="Total Empty Weight" type="number" value={formatPlain(totals.totalEmptyWeight)} readOnly />
          <Field label="Net Weight" type="number" value={formatPlain(totals.netWeight)} readOnly />
          <Select label="Divide Type" value={form.divideType} onChange={(event) => setValue("divideType", event.target.value)} options={["KG", "Ton", "Bag", "Carton", "Box", "Custom"]} />
          <Field label="Divide Weight" type="number" value={form.divideWeight} onChange={(event) => setValue("divideWeight", event.target.value)} />
          <Field label="Total Divide" type="number" value={formatPlain(totals.totalDivide)} readOnly />
          <Select label="Price Type" value={form.priceType} onChange={(event) => setValue("priceType", event.target.value)} options={["P/Divide", "P/Kgs", "P/Ton", "P/Bag"]} />
          <Field label={`${form.priceType} Price (${currencySymbol(primaryCurrency)})`} type="number" value={form.coursePrice} onChange={(event) => setValue("coursePrice", event.target.value)} />
          <Field label="Final Amount" type="number" value={formatPlain(totals.finalAmount)} readOnly />
        </div>

        <div className="flex justify-end">
          <Button onClick={saveGoodsEntry} className="h-8 bg-emerald-500 px-4 text-xs font-black text-slate-950 hover:bg-emerald-400">
            Save Goods Entry
          </Button>
        </div>
      </div>
    </Section>
  );
}

function PaymentStep({ form, setValue, totals }) {
  return (
    <Section title="Step 3 â€” Payment Details From Purchase Setup">
      <div className="mb-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200">
        Selected Payment Type: <b>{form.paymentType}</b> | Selected Loading Type: <b>{form.loadingCondition}</b>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field label={`Purchase Total (${form.currencyType})`} type="number" value={formatPlain(totals.purchaseCurrencyTotal)} readOnly />
        <Field label="Exchange Rate" type="number" value={form.exchangeRate} onChange={(event) => setValue("exchangeRate", event.target.value)} />
        <Field label="Final Amount (Converted)" type="number" value={formatPlain(totals.finalAmount)} readOnly />
        <Select label="Payment Type" value={form.paymentType} onChange={(event) => setValue("paymentType", event.target.value)} options={PAYMENT_TYPES} />

        {form.paymentType === "Invoice" && (
          <>
            <Field label="Invoice Percentage %" type="number" value={form.paymentPercentage} onChange={(event) => setValue("paymentPercentage", event.target.value)} />
            <Field label="Invoice Amount (Auto)" type="number" value={formatPlain(totals.invoiceAmount)} readOnly />
            <Field label="Remaining Amount (Auto)" type="number" value={formatPlain(totals.remainingAmount)} readOnly />
            <Field label="Invoice Due Date" type="date" value={form.invoiceDueDate} onChange={(event) => setValue("invoiceDueDate", event.target.value)} />
            <Field label="Remaining Due Date" type="date" value={form.remainingDueDate} onChange={(event) => setValue("remainingDueDate", event.target.value)} />
          </>
        )}

        {form.paymentType === "Advance Payment" && (
          <>
            <Field label="Advance Payment %" type="number" value={form.advancePercentage} onChange={(event) => setValue("advancePercentage", event.target.value)} />
            <Field label="Advance Amount (Auto)" type="number" value={formatPlain(totals.advanceAmount)} readOnly />
            <Field label="Advance Due Date" type="date" value={form.advanceDueDate} onChange={(event) => setValue("advanceDueDate", event.target.value)} />
            <Field label="Remaining Amount (Auto)" type="number" value={formatPlain(totals.remainingAmount)} readOnly />
            <Field label="Remaining Due Date" type="date" value={form.remainingDueDate} onChange={(event) => setValue("remainingDueDate", event.target.value)} />
          </>
        )}

        {form.paymentType === "Credit" && (
          <>
            <Field label="Credit Days" type="number" value={form.creditDays} onChange={(event) => setValue("creditDays", event.target.value)} />
            <Field label="Credit Amount" type="number" value={formatPlain(totals.creditAmount)} readOnly />
          </>
        )}

        {form.paymentType === "Final Payment" && <Field label="Final Payment Amount" type="number" value={formatPlain(totals.finalPaymentAmount)} readOnly />}
      </div>
    </Section>
  );
}

function LoadingStep({ form, setValue, containers, containerStats, createBookingContainers, markContainerLoaded }) {
  return (
    <Section title="Step 4 - Purchase Loading From Booking Order">
      <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
        Purchase Booking Order: <b>{form.purchaseOrderNo}</b> | Booked Containers: <b>{containerStats.total}</b> | Loaded: <b>{containerStats.loaded}</b> | Remaining: <b>{containerStats.remaining}</b>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field label="Booked Containers" type="number" value={form.bookedContainerCount} onChange={(event) => setValue("bookedContainerCount", event.target.value)} />
        <button type="button" onClick={createBookingContainers} className="mt-5 h-[30px] rounded bg-[#2f6df6] text-[10px] font-black text-white">
          Confirm Booking Containers
        </button>
        <Select label="Loading / Ship Type" value={form.loadingCondition} onChange={(event) => setValue("loadingCondition", event.target.value)} options={LOADING_TYPES} />

        {form.loadingCondition === "By Sea" && (
          <>
            <Field label="Container No" value={form.containerNo} onChange={(event) => setValue("containerNo", event.target.value)} />
            <Select label="Container Type" value={form.containerType} onChange={(event) => setValue("containerType", event.target.value)} options={CONTAINER_TYPES} />
            <Select label="Loading Country" value={form.loadingCountry} onChange={(event) => setValue("loadingCountry", event.target.value)} options={COUNTRY_OPTIONS} />
            <Select label="Loading Port" value={form.loadingPort} onChange={(event) => setValue("loadingPort", event.target.value)} options={["Bandar Abbas", "Karachi Port", "Jebel Ali", "+ New Loading Port"]} />
            <Field label="Loading Date" type="date" value={form.loadingDate} onChange={(event) => setValue("loadingDate", event.target.value)} />
            <Select label="Received Country" value={form.receivedCountry} onChange={(event) => setValue("receivedCountry", event.target.value)} options={COUNTRY_OPTIONS} />
            <Select label="Received Port" value={form.receivedPort} onChange={(event) => setValue("receivedPort", event.target.value)} options={["Karachi Port", "Jebel Ali", "Bandar Abbas", "+ New Received Port"]} />
            <Field label="Received Date" type="date" value={form.receivedDate} onChange={(event) => setValue("receivedDate", event.target.value)} />
          </>
        )}

        {form.loadingCondition === "By Road" && (
          <>
            <Select label="Loading Country" value={form.loadingCountry} onChange={(event) => setValue("loadingCountry", event.target.value)} options={COUNTRY_OPTIONS} />
            <Select label="Loading Border" value={form.loadingBorder} onChange={(event) => setValue("loadingBorder", event.target.value)} options={["Torkham", "Chaman", "Taftan", "+ New Loading Border"]} />
            <Field label="Loading Date" type="date" value={form.loadingDate} onChange={(event) => setValue("loadingDate", event.target.value)} />
            <Select label="Received Country" value={form.receivedCountry} onChange={(event) => setValue("receivedCountry", event.target.value)} options={COUNTRY_OPTIONS} />
            <Select label="Received Border" value={form.receivedBorder} onChange={(event) => setValue("receivedBorder", event.target.value)} options={["Torkham", "Chaman", "Taftan", "+ New Received Border"]} />
            <Field label="Received Date" type="date" value={form.receivedDate} onChange={(event) => setValue("receivedDate", event.target.value)} />
          </>
        )}

        {form.loadingCondition === "By Air" && (
          <>
            <Select label="Loading Country" value={form.loadingCountry} onChange={(event) => setValue("loadingCountry", event.target.value)} options={COUNTRY_OPTIONS} />
            <Select label="Loading Airport" value={form.loadingPort} onChange={(event) => setValue("loadingPort", event.target.value)} options={["Dubai Airport", "Kabul Airport", "Istanbul Airport", "+ New Loading Airport"]} />
            <Field label="Airlines Name" value={form.airlineName} onChange={(event) => setValue("airlineName", event.target.value)} />
            <Field label="Loading Date" type="date" value={form.loadingDate} onChange={(event) => setValue("loadingDate", event.target.value)} />
            <Select label="Received Country" value={form.receivedCountry} onChange={(event) => setValue("receivedCountry", event.target.value)} options={COUNTRY_OPTIONS} />
            <Select label="Received Airport" value={form.receivedPort} onChange={(event) => setValue("receivedPort", event.target.value)} options={["Karachi Airport", "Dubai Airport", "Kabul Airport", "+ New Received Airport"]} />
            <Field label="Received Date" type="date" value={form.receivedDate} onChange={(event) => setValue("receivedDate", event.target.value)} />
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-[10px]">
        <PacketMini label="Total Booked" value={containerStats.total} />
        <PacketMini label="Loaded" value={containerStats.loaded} tone="green" />
        <PacketMini label="Remaining" value={containerStats.remaining} />
        <PacketMini label="Status" value={containerStats.status} tone="blue" />
      </div>

      <div className="mt-3 overflow-auto rounded-lg border border-[var(--line)]">
        <table className="w-full min-w-[760px] border-collapse bg-[var(--input)] text-[10px]">
          <thead>
            <tr className="bg-[#111827] text-left text-[8px] uppercase tracking-[.4px] text-slate-200">
              {["SR#", "Purchase Booking Order", "Container", "Type", "Loading", "Receiving", "Status", "Action"].map((head) => (
                <th key={head} className="whitespace-nowrap px-2.5 py-2 font-black">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {containers.map((container) => (
              <tr key={container.id} className="bpcc-table-row border-t border-[var(--line)]">
                <td className="px-2.5 py-2">{String(container.serial).padStart(2, "0")}</td>
                <td className="px-2.5 py-2 font-black text-[var(--cyan)]">{container.purchaseOrderNo}</td>
                <td className="px-2.5 py-2">{container.containerNo}</td>
                <td className="px-2.5 py-2">{container.containerType}</td>
                <td className="px-2.5 py-2">{container.loadingPort || "-"}</td>
                <td className="px-2.5 py-2">{container.receivedPort || "-"}</td>
                <td className="px-2.5 py-2">
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black ${container.loadingStatus === "Loaded" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {container.loadingStatus}
                  </span>
                </td>
                <td className="px-2.5 py-2">
                  <button
                    type="button"
                    disabled={container.loadingStatus === "Loaded"}
                    onClick={() => markContainerLoaded(container.id)}
                    className="h-7 rounded bg-emerald-500 px-2 text-[9px] font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {container.loadingStatus === "Loaded" ? "Linked" : "Load"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function LiveReport({ form, totals, goodsEntries, containerStats }) {
  const primaryCurrency = (form.currencyType || "USD").toUpperCase();
  const totalEntries = goodsEntries.length || (form.goodsName ? 1 : 0);

  return (
    <aside className="bpcc-right-wrap min-w-0 rounded-lg border border-[var(--line)] p-[16px]">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div>
          <div className="text-[13px] font-black uppercase tracking-[1px] text-[var(--text)]">Purchase Confirm Report</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--muted)]">Live purchase, account, shipment and totals preview</div>
        </div>
        <button type="button" className="h-[30px] rounded-md border border-[#ff5b75] bg-rose-500/10 px-3 text-[10px] font-black text-[#ff5b75]">
          <Trash2 className="mr-1 inline h-3 w-3" /> Clear
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-5">
        <Info
          compact
          title="Purchase Details"
          rows={[
            ["PO No", form.purchaseOrderNo],
            ["Date", form.purchaseDate],
            ["Contract", form.purchaseContractNo],
            ["Bill No", form.billNo],
            ["Payment", form.paymentType]
          ]}
        />
        <Info
          compact
          title="Account Details"
          rows={[
            ["Purchase", form.purchaseAccountName],
            ["Purchase Code", form.purchaseAccountNo],
            ["Sales", form.salesAccountName],
            ["Sales Code", form.salesAccountNo],
            ["Currency", primaryCurrency]
          ]}
        />
        <Info
          compact
          title="Shipment Details"
          rows={[
            ["Mode", form.loadingCondition],
            ["Container", form.containerNo || form.containerType],
            ["Loading", [form.loadingCountry, form.loadingPort || form.loadingBorder].filter(Boolean).join(" / ")],
            ["Receiving", [form.receivedCountry, form.receivedPort || form.receivedBorder].filter(Boolean).join(" / ")],
            ["Branch", form.branchName]
          ]}
        />
        <Info
          compact
          title="Bill / Booking Detail"
          rows={[
            ["Booking No", form.purchaseOrderNo],
            ["Bill No", form.billNo],
            ["Supplier", form.purchaseAccountName],
            ["Customer", form.salesAccountName],
            ["Containers", `${containerStats.loaded}/${containerStats.total} loaded`]
          ]}
        />
        <Info
          compact
          title="Summary Totals"
          rows={[
            ["Entries", totalEntries],
            ["Gross KGS", formatNumber(totals.grossWeight)],
            ["Net Weight", formatNumber(totals.netWeight)],
            ["Total Divide", formatNumber(totals.totalDivide)],
            ["Final Amount", `${formatNumber(totals.finalAmount)} ${primaryCurrency}`],
            ["Loading Status", containerStats.status]
          ]}
        />
      </div>
    </aside>
  );
}

function SavedPurchaseBookingReport({ report, onClear }) {
  const { form, totals, goodsEntries, containerStats, savedAt } = report;
  const primaryCurrency = (form.currencyType || "USD").toUpperCase();
  const reportRows = goodsEntries.length
    ? goodsEntries
    : [
        {
          goodsName: form.goodsName || "-",
          size: form.size || "-",
          brand: form.brand || "-",
          origin: form.origin || "-",
          hsCode: form.hsCode || "-",
          qtyName: form.qtyName || "-",
          qtyNo: form.qtyNo,
          qtyKgs: form.qtyKgs,
          grossWeight: totals.grossWeight,
          emptyKgs: form.emptyKgs,
          netWeight: totals.netWeight,
          divideType: form.divideType,
          priceType: form.priceType,
          price: form.coursePrice,
          currencyType: form.currencyType,
          totalAmount: totals.totalAmount,
          exchangeRate: form.exchangeRate,
          finalAmount: totals.finalAmount
        }
      ];
  const totalGross = reportRows.reduce((sum, row) => sum + Number(row.grossWeight || 0), 0);
  const totalNet = reportRows.reduce((sum, row) => sum + Number(row.netWeight || 0), 0);
  const grandTotal = reportRows.reduce((sum, row) => sum + Number(row.finalAmount || 0), 0);
  const openPreview = () => openSavedReportPreview(reportRows, form, totals, containerStats, savedAt, false);
  const printPreview = () => openSavedReportPreview(reportRows, form, totals, containerStats, savedAt, true);
  const downloadPreview = () => downloadSavedReportPreview(reportRows, form, totals, containerStats, savedAt);

  return (
    <section className="rounded-xl border border-[#334155] bg-[#111827] p-4 text-slate-200 shadow-2xl">
      <div className="mb-4 flex items-center justify-between border-b border-[#263348] pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-100">Purchase Booking Report</h2>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Saved booking confirmation report
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openPreview} className="rounded bg-blue-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-blue-400">
            Preview
          </button>
          <button type="button" onClick={downloadPreview} className="rounded bg-emerald-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-emerald-400">
            Download
          </button>
          <button type="button" onClick={printPreview} className="rounded bg-white px-3 py-1.5 text-[10px] font-black text-slate-950 hover:bg-slate-200">
            Print
          </button>
          <button type="button" onClick={onClear} className="rounded bg-rose-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-rose-400">
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-5">
        <SavedReportCard
          title="Booking / Bill Detail"
          rows={[
            ["Booking Date", formatDate(savedAt || form.purchaseDate)],
            ["Fiscal Year", String(new Date(savedAt || Date.now()).getFullYear())],
            ["Status", form.salesStatus || "Draft"],
            ["GPBO", form.purchaseOrderNo],
            ["BPBO", form.billNo || form.purchaseContractNo],
            ["Contract", form.purchaseContractNo]
          ]}
        />
        <SavedReportCard
          title="Login Detail"
          rows={[
            ["User", form.userName || "Admin"],
            ["Login Time", formatTime(savedAt)],
            ["IP Address", "-"],
            ["Location", [form.branchCity, form.branchCountry].filter(Boolean).join(", ") || form.branchName]
          ]}
          highlightLast
        />
        <SavedReportCard
          title="Purchase Account"
          rows={[
            ["Account Code", form.purchaseAccountNo],
            ["Account Name", form.purchaseAccountName],
            ["Branch", form.purchaseAccountBranch],
            ["Currency", form.purchaseAccountCurrency || primaryCurrency]
          ]}
        />
        <SavedReportCard
          title="Sales Account"
          rows={[
            ["Account Code", form.salesAccountNo],
            ["Account Name", form.salesAccountName],
            ["Branch", form.salesAccountBranch],
            ["Currency", form.salesAccountCurrency || primaryCurrency]
          ]}
        />
        <SavedReportCard
          title="Summary Totals"
          rows={[
            ["Total KGS", formatNumber(totalGross)],
            ["Net Weight", formatNumber(totalNet)],
            ["Containers", `${containerStats.loaded}/${containerStats.total}`],
            ["Grand Final Amount", `${formatNumber(grandTotal)} ${primaryCurrency}`]
          ]}
          amount
        />
      </div>

      <div className="my-4 text-center text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">
        Goods and Container Report
      </div>

      <div className="overflow-auto rounded-lg border border-[#2b3a52] bg-[#0f172a]">
        <table className="w-full min-w-[1550px] border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#0b1220] text-left text-[8px] uppercase tracking-[0.08em] text-slate-300">
              {[
                "SR#",
                "Allot Name",
                "Good Name",
                "Size",
                "Brand",
                "Origin",
                "HS Code",
                "Qty Name",
                "Qty No",
                "1 Qty KGS",
                "Gross Weight",
                "Empty KGS",
                "Net Weight",
                "Price Type",
                "Divide Type",
                "Primary Currency",
                "Total Amount",
                "OP",
                "Secondary Currency",
                "Final Amount"
              ].map((head) => (
                <th key={head} className="whitespace-nowrap px-3 py-3 font-black">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row, index) => (
              <tr key={`${row.goodsName}-${index}`} className="border-t border-[#24344c] text-slate-300 hover:bg-[#172437]">
                <td className="whitespace-nowrap px-3 py-3">{String(index + 1).padStart(2, "0")}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.allotName || `ALT-${String(index + 4421).padStart(4, "0")}`}</td>
                <td className="whitespace-nowrap px-3 py-3 font-black text-blue-400">{row.goodsName || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.size || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="rounded bg-slate-700 px-2 py-1 text-[9px]">{row.brand || "-"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3">{row.origin || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.hsCode || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.qtyName || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatNumber(row.qtyNo)}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatNumber(row.qtyKgs)}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatNumber(row.grossWeight)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-black text-rose-400">{formatNumber(row.emptyKgs)}</td>
                <td className="whitespace-nowrap bg-[#172b3e] px-3 py-3 font-black text-slate-100">{formatNumber(row.netWeight)}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.priceType || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3">{row.divideType || "-"}</td>
                <td className="whitespace-nowrap bg-[#1d3d8f] px-3 py-3 font-black text-amber-300">{row.currencyType || primaryCurrency}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatNumber(row.totalAmount)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-black text-blue-400">x</td>
                <td className="whitespace-nowrap bg-[#17356f] px-3 py-3 font-black text-amber-300">{form.salesAccountCurrency || primaryCurrency}</td>
                <td className="whitespace-nowrap bg-[#075f44] px-3 py-3 text-right font-black text-emerald-300">{formatNumber(row.finalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SavedReportCard({ title, rows, amount = false, highlightLast = false }) {
  return (
    <div className="rounded-lg border border-[#2b3a52] bg-[#1b2637] p-3">
      <div className="mb-3 border-b border-cyan-400/20 pb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-400">{title}</div>
      <div className="space-y-1 text-[10px]">
        {rows.map(([label, value], index) => {
          const isLast = index === rows.length - 1;
          return (
            <div key={`${title}-${label}`} className="grid grid-cols-[105px_1fr] gap-2">
              <span className="truncate text-slate-500">{label}</span>
              <span className={`truncate text-right font-black ${amount && isLast ? "text-cyan-300" : highlightLast && isLast ? "text-emerald-300" : "text-slate-100"}`}>
                {value || "-"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function escapeHtml(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSavedReportHtml(reportRows, form, totals, containerStats, savedAt) {
  const primaryCurrency = (form.currencyType || "USD").toUpperCase();
  const totalGross = reportRows.reduce((sum, row) => sum + Number(row.grossWeight || 0), 0);
  const totalNet = reportRows.reduce((sum, row) => sum + Number(row.netWeight || 0), 0);
  const grandTotal = reportRows.reduce((sum, row) => sum + Number(row.finalAmount || 0), 0);
  const rowsHtml = reportRows
    .map(
      (row, index) => `
        <tr>
          <td>${String(index + 1).padStart(2, "0")}</td>
          <td>${escapeHtml(row.allotName || `ALT-${String(index + 4421).padStart(4, "0")}`)}</td>
          <td class="blue">${escapeHtml(row.goodsName)}</td>
          <td>${escapeHtml(row.size)}</td>
          <td><span class="chip">${escapeHtml(row.brand)}</span></td>
          <td>${escapeHtml(row.origin)}</td>
          <td>${escapeHtml(row.hsCode)}</td>
          <td>${escapeHtml(row.qtyName)}</td>
          <td>${formatNumber(row.qtyNo)}</td>
          <td>${formatNumber(row.qtyKgs)}</td>
          <td>${formatNumber(row.grossWeight)}</td>
          <td class="red">${formatNumber(row.emptyKgs)}</td>
          <td class="net">${formatNumber(row.netWeight)}</td>
          <td>${escapeHtml(row.priceType)}</td>
          <td>${escapeHtml(row.divideType)}</td>
          <td class="primary">${escapeHtml(row.currencyType || primaryCurrency)}</td>
          <td>${formatNumber(row.totalAmount)}</td>
          <td class="blue">x</td>
          <td class="secondary">${escapeHtml(form.salesAccountCurrency || primaryCurrency)}</td>
          <td class="final">${formatNumber(row.finalAmount)}</td>
        </tr>
      `
    )
    .join("");

  const card = (title, rows, amount = false) => `
    <section class="card">
      <h3>${escapeHtml(title)}</h3>
      ${rows
        .map(
          ([label, value], index) => `
            <div class="kv">
              <span>${escapeHtml(label)}</span>
              <b class="${amount && index === rows.length - 1 ? "amount" : ""}">${escapeHtml(value)}</b>
            </div>
          `
        )
        .join("")}
    </section>
  `;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Purchase Booking Report - ${escapeHtml(form.purchaseOrderNo)}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#0b1220;color:#d8e3f1;font-family:Inter,Arial,sans-serif;font-size:12px}
    .wrap{padding:18px}.report{border:1px solid #334155;background:#111827;border-radius:12px;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.35)}
    .head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #263348;padding-bottom:12px;margin-bottom:14px}
    h1{font-size:15px;margin:0;color:#f8fafc}.sub{margin-top:5px;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.18em}
    .cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.card{border:1px solid #2b3a52;background:#1b2637;border-radius:9px;padding:12px}
    .card h3{margin:0 0 10px;border-bottom:1px solid rgba(34,211,238,.22);padding-bottom:8px;color:#22d3ee;font-size:10px;text-transform:uppercase;letter-spacing:.14em}
    .kv{display:grid;grid-template-columns:108px 1fr;gap:8px;margin:5px 0}.kv span{color:#64748b}.kv b{text-align:right;color:#f8fafc}.amount{color:#22d3ee!important;font-size:14px}
    .mid{text-align:center;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.24em;margin:18px 0 10px}
    .table-wrap{overflow:auto;border:1px solid #2b3a52;border-radius:9px;background:#0f172a} table{width:100%;min-width:1500px;border-collapse:collapse}
    th{background:#0b1220;color:#cbd5e1;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.08em;padding:11px}
    td{border-top:1px solid #24344c;padding:11px;white-space:nowrap} tr:hover{background:#172437}
    .blue{color:#60a5fa;font-weight:900}.red{color:#fb7185;font-weight:900}.chip{background:#334155;border-radius:4px;padding:3px 7px}.net{background:#172b3e;color:#fff;font-weight:900}
    .primary{background:#1d3d8f;color:#fbbf24;font-weight:900}.secondary{background:#17356f;color:#fbbf24;font-weight:900}.final{background:#075f44;color:#6ee7b7;font-weight:900;text-align:right}
    .totals{display:flex;justify-content:flex-end;gap:24px;margin-top:12px;border:1px solid #2b3a52;border-radius:9px;background:#0f172a;padding:12px}.totals span{color:#64748b;text-transform:uppercase;font-size:9px}.totals b{display:block;color:#fff;font-size:14px}
    @media print{body{background:#fff}.wrap{padding:0}.report{box-shadow:none;border:0;border-radius:0}.head button{display:none}}
    @media(max-width:1100px){.cards{grid-template-columns:1fr 1fr}.totals{justify-content:flex-start;flex-wrap:wrap}}
  </style>
</head>
<body>
  <div class="wrap">
    <main class="report">
      <div class="head">
        <div><h1>Purchase Booking Report</h1><div class="sub">Saved booking confirmation report</div></div>
        <div>${escapeHtml(form.purchaseOrderNo)} · ${escapeHtml(formatDate(savedAt || form.purchaseDate))}</div>
      </div>
      <div class="cards">
        ${card("Booking / Bill Detail", [["Booking Date", formatDate(savedAt || form.purchaseDate)], ["Fiscal Year", String(new Date(savedAt || Date.now()).getFullYear())], ["Status", form.salesStatus || "Draft"], ["GPBO", form.purchaseOrderNo], ["BPBO", form.billNo || form.purchaseContractNo], ["Contract", form.purchaseContractNo]])}
        ${card("Login Detail", [["User", form.userName || "Admin"], ["Login Time", formatTime(savedAt)], ["IP Address", "-"], ["Location", [form.branchCity, form.branchCountry].filter(Boolean).join(", ") || form.branchName]])}
        ${card("Purchase Account", [["Account Code", form.purchaseAccountNo], ["Account Name", form.purchaseAccountName], ["Branch", form.purchaseAccountBranch], ["Currency", form.purchaseAccountCurrency || primaryCurrency]])}
        ${card("Sales Account", [["Account Code", form.salesAccountNo], ["Account Name", form.salesAccountName], ["Branch", form.salesAccountBranch], ["Currency", form.salesAccountCurrency || primaryCurrency]])}
        ${card("Summary Totals", [["Total KGS", formatNumber(totalGross)], ["Net Weight", formatNumber(totalNet)], ["Containers", `${containerStats.loaded}/${containerStats.total}`], ["Grand Final Amount", `${formatNumber(grandTotal)} ${primaryCurrency}`]], true)}
      </div>
      <div class="mid">Goods and Container Report</div>
      <div class="table-wrap">
        <table>
          <thead><tr>${["SR#","Allot Name","Good Name","Size","Brand","Origin","HS Code","Qty Name","Qty No","1 Qty KGS","Gross Weight","Empty KGS","Net Weight","Price Type","Divide Type","Primary Currency","Total Amount","OP","Secondary Currency","Final Amount"].map((head) => `<th>${head}</th>`).join("")}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <div class="totals">
        <div><span>Total KGS</span><b>${formatNumber(totalGross)}</b></div>
        <div><span>Net Weight</span><b>${formatNumber(totalNet)}</b></div>
        <div><span>Grand Total</span><b>${formatNumber(grandTotal)} ${primaryCurrency}</b></div>
      </div>
    </main>
  </div>
</body>
</html>`;
}

function openSavedReportPreview(reportRows, form, totals, containerStats, savedAt, shouldPrint) {
  const html = buildSavedReportHtml(reportRows, form, totals, containerStats, savedAt);
  const preview = window.open("", "_blank", "noopener,noreferrer,width=1440,height=900");
  if (!preview) return;
  preview.document.open();
  preview.document.write(html);
  preview.document.close();
  if (shouldPrint) {
    preview.addEventListener("load", () => preview.print(), { once: true });
    setTimeout(() => preview.print(), 500);
  }
}

function downloadSavedReportPreview(reportRows, form, totals, containerStats, savedAt) {
  const html = buildSavedReportHtml(reportRows, form, totals, containerStats, savedAt);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${form.purchaseOrderNo || "purchase-booking-report"}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function GoodsContainerReport({ form, totals, goodsEntries, containers, containerStats, markContainerLoaded }) {
  const primaryCurrency = (form.currencyType || "USD").toUpperCase();
  const reportRows = goodsEntries.length
    ? goodsEntries
    : [
        {
          goodsName: form.goodsName || "-",
          size: form.size || "-",
          brand: form.brand || "-",
          origin: form.origin || "-",
          hsCode: form.hsCode || "-",
          qtyName: form.qtyName || "-",
          qtyNo: form.qtyNo,
          grossWeight: totals.grossWeight,
          emptyKgs: form.emptyKgs,
          totalEmptyWeight: totals.totalEmptyWeight,
          netWeight: totals.netWeight,
          divideType: form.divideType,
          divideWeight: form.divideWeight,
          totalDivide: totals.totalDivide,
          priceType: form.priceType,
          price: form.coursePrice,
          currencyType: form.currencyType,
          totalAmount: totals.totalAmount,
          exchangeRate: form.exchangeRate,
          finalAmount: totals.finalAmount
        }
      ];
  const totalGross = reportRows.reduce((sum, row) => sum + Number(row.grossWeight || 0), 0);
  const totalNet = reportRows.reduce((sum, row) => sum + Number(row.netWeight || 0), 0);
  const totalFinal = reportRows.reduce((sum, row) => sum + Number(row.finalAmount || 0), 0);

  return (
    <section className="bpcc-table-card mt-[18px] rounded-[10px] border p-[16px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[13px] font-black uppercase tracking-[1px] text-[var(--text)]">Goods Container Report</span>
          <span className="ml-2 rounded border border-[var(--line)] px-2 py-1 text-[9px] font-extrabold text-[var(--muted)]">Live Inventory</span>
        </div>
        <div className="text-[10px] font-bold uppercase text-[var(--muted)]">Rows: {reportRows.length}</div>
      </div>

      <div className="overflow-auto rounded-lg border border-[var(--line)]">
        <table className="w-full min-w-[1500px] border-collapse bg-[var(--input)] text-[10px] text-[var(--text)]">
          <thead>
            <tr className="bg-[#111827] text-left text-[8px] uppercase tracking-[.4px] text-slate-200">
              {["SR#", "Good Name", "Size", "Brand", "Origin", "HS Code", "Qty Name", "Qty No", "Gross KG", "Empty/Bag", "Total Empty", "Net KG", "Divide", "Price Type", "Price", "Currency", "Total Amount", "Ex. Rate", "Final Amount"].map((head) => (
                <th key={head} className="whitespace-nowrap px-2.5 py-2.5 font-black">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row, index) => (
              <tr key={`${row.goodsName}-${index}`} className="bpcc-table-row border-t border-[var(--line)]">
                <td className="whitespace-nowrap px-2.5 py-2.5">{String(index + 1).padStart(2, "0")}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5 font-black text-[var(--cyan)]">{row.goodsName || "-"}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{row.size || "-"}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{row.brand || "-"}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{row.origin || "-"}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{row.hsCode || "-"}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{row.qtyName || "-"}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{formatNumber(row.qtyNo)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{formatNumber(row.grossWeight)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5 text-rose-400">{formatNumber(row.emptyKgs)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5 text-rose-400">{formatNumber(row.totalEmptyWeight)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5 font-black text-[var(--yellow)]">{formatNumber(row.netWeight)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{row.divideType || "-"} / {formatNumber(row.divideWeight)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{row.priceType || "-"}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{formatNumber(row.price)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5 text-emerald-400">{row.currencyType || primaryCurrency}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5">{formatNumber(row.totalAmount)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5 text-[var(--blue)]">{formatNumber(row.exchangeRate)}</td>
                <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-black text-[var(--cyan)]">{formatNumber(row.finalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-6 rounded-lg border border-[var(--line)] bg-[var(--input)] px-4 py-3">
        <SummaryMetric label="Total KGS" value={formatNumber(totalGross)} />
        <SummaryMetric label="Net Weight" value={formatNumber(totalNet)} />
        <SummaryMetric label="Grand Total" value={`${formatNumber(totalFinal)} ${primaryCurrency}`} strong />
      </div>

    </section>
  );
}

function buildPaymentRows(form, totals) {
  const rows = [
    ["Payment Type", form.paymentType],
    ["Purchase Total", `${formatNumber(totals.purchaseCurrencyTotal)} ${form.currencyType}`],
    ["Exchange Rate", form.exchangeRate],
    ["Final Amount", formatNumber(totals.finalAmount)]
  ];

  if (form.paymentType === "Advance Payment") {
    return [...rows, ["Advance %", `${form.advancePercentage}%`], ["Advance Amount", formatNumber(totals.advanceAmount)], ["Advance Due", form.advanceDueDate], ["Remaining Amount", formatNumber(totals.remainingAmount)], ["Remaining Due", form.remainingDueDate]];
  }

  if (form.paymentType === "Invoice") {
    return [...rows, ["Invoice %", `${form.paymentPercentage}%`], ["Invoice Amount", formatNumber(totals.invoiceAmount)], ["Invoice Due", form.invoiceDueDate], ["Remaining Amount", formatNumber(totals.remainingAmount)], ["Remaining Due", form.remainingDueDate]];
  }

  if (form.paymentType === "Final Payment") {
    return [...rows, ["Final Payment", formatNumber(totals.finalPaymentAmount)]];
  }

  return [...rows, ["Credit Days", form.creditDays], ["Credit", formatNumber(totals.creditAmount)]];
}

function buildLoadingRows(form) {
  if (form.loadingCondition === "By Sea") {
    return [["Type", "By Sea"], ["Container", form.containerNo], ["Container Type", form.containerType], ["Loading Country", form.loadingCountry], ["Loading Port", form.loadingPort], ["Loading Date", form.loadingDate], ["Received Country", form.receivedCountry], ["Received Port", form.receivedPort], ["Received Date", form.receivedDate]];
  }

  if (form.loadingCondition === "By Road") {
    return [["Type", "By Road"], ["Loading Country", form.loadingCountry], ["Loading Border", form.loadingBorder || "-"], ["Loading Date", form.loadingDate], ["Received Country", form.receivedCountry], ["Received Border", form.receivedBorder || "-"], ["Received Date", form.receivedDate]];
  }

  return [["Type", "By Air"], ["Loading Country", form.loadingCountry], ["Loading Airport", form.loadingPort], ["Airlines", form.airlineName], ["Loading Date", form.loadingDate], ["Received Country", form.receivedCountry], ["Received Airport", form.receivedPort], ["Received Date", form.receivedDate]];
}

function Section({ title, children }) {
  return (
    <div className="bpcc-section rounded-[7px] border p-2">
      <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-[var(--yellow)]">{title}</div>
      {children}
    </div>
  );
}

function Info({ title, rows, compact = false }) {
  return (
    <div className={`rounded-[9px] border border-[var(--line)] bg-[var(--panel2)] ${compact ? 'p-3' : 'p-3.5'}`}>
      <div className={`border-b border-[var(--line)] font-black uppercase text-[var(--blue)] ${compact ? "mb-2 pb-2 text-[9px]" : "mb-3 pb-2 text-xs"}`}>{title}</div>
      <div className={`${compact ? "space-y-0.5 text-[10px]" : "space-y-1 text-xs"}`}>
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} className={`grid border-b border-[var(--line)] py-1 last:border-b-0 ${compact ? "grid-cols-[92px_1fr] gap-1" : "grid-cols-[115px_1fr] gap-2"}`}>
            <span className="text-[9px] font-extrabold uppercase text-[var(--muted)]">{label}</span>
            <span className="text-right font-black text-[var(--text)]">{value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopReportCard({ title, rows }) {
  return (
    <div className="rounded-md border border-slate-700 bg-[#1b2637] px-2 py-1.5">
      <div className="mb-1 border-b border-cyan-500/25 pb-1 text-[8px] font-bold uppercase tracking-widest text-cyan-300">{title}</div>
      <div className="space-y-0.5 text-[9px]">
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} className="grid grid-cols-[76px_1fr] gap-1">
            <span className="truncate text-slate-500">{label}</span>
            <span className="truncate text-right font-semibold text-slate-100">{value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "cyan" }) {
  const toneClass = tone === "green" ? "text-emerald-300" : "text-[#22d3ee]";
  return (
    <div className="min-h-[38px] rounded-md border border-[#334155] bg-[#0b1220] px-2 py-1">
      <div className="text-[8px] font-bold uppercase tracking-widest text-[#94a3b8]">{label}</div>
      <div className={`mt-0.5 truncate text-xs font-bold ${toneClass}`}>{value || "-"}</div>
    </div>
  );
}

function SummaryMetric({ label, value, strong = false }) {
  return (
    <div className="text-right">
      <span className="block text-[9px] font-black uppercase text-[var(--muted)]">{label}</span>
      <b className={`${strong ? "text-[18px] text-[var(--cyan)]" : "text-[15px] text-[var(--text)]"}`}>{value || "-"}</b>
    </div>
  );
}

function AccountSearchField({ label, listId, options, value, onChange }) {
  return (
    <label>
      <div className="mb-1 text-[9px] font-extrabold uppercase text-[var(--muted)]">{label}</div>
      <input
        value={value}
        onChange={onChange}
        list={listId}
        className="h-[30px] w-full rounded border px-2 text-[11px] outline-none placeholder:text-slate-500 focus:border-[#2f6df6] focus:ring-2 focus:ring-blue-500/15"
        placeholder="Search account no / code / name"
      />
      <datalist id={listId}>
        {options.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </label>
  );
}

function Field({ label, className = "", ...props }) {
  return (
    <label className={className}>
      <div className="mb-1 text-[9px] font-extrabold uppercase text-[var(--muted)]">{label}</div>
      <input {...props} className="h-[30px] w-full rounded border px-2 text-[11px] outline-none placeholder:text-slate-500 focus:border-[#2f6df6] focus:ring-2 focus:ring-blue-500/15 disabled:opacity-80" />
    </label>
  );
}

function NewableField({ label, buttonLabel, value, onChange }) {
  return (
    <div>
      <Field label={label} value={value} onChange={onChange} />
      <div className="pt-0.5 text-right">
        <button type="button" className="text-[9px] text-cyan-300 hover:text-cyan-200">{buttonLabel}</button>
      </div>
    </div>
  );
}

function NewableSelect({ label, buttonLabel, value, options, onChange }) {
  return (
    <div className="space-y-0.5">
      <Select label={label} value={value} onChange={onChange} options={options} />
      <button type="button" className="mt-1 text-xs text-cyan-300">{buttonLabel}</button>
    </div>
  );
}

function Select({ label, value, options, onChange, className = "" }) {
  return (
    <label className={className}>
      <div className="mb-1 text-[9px] font-extrabold uppercase text-[var(--muted)]">{label}</div>
      <select value={value} onChange={onChange} className="h-[30px] w-full rounded border px-2 text-[11px] outline-none focus:border-[#2f6df6] focus:ring-2 focus:ring-blue-500/15">
        {options.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

function ActionItem({ icon, label }) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 hover:bg-blue-500/10">
      {icon}
      {label}
    </button>
  );
}

function currencySymbol(currency) {
  if (currency === "USD") return "$";
  if (currency === "AED") return "AED";
  if (currency === "PKR") return "â‚¨";
  if (currency === "AFN") return "Ø‹";
  if (currency === "INR") return "â‚¹";
  return currency || "";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatPlain(value) {
  return String(Math.round(Number(value || 0) * 100) / 100);
}

export function PurchaseOrderWizard() {
  return <PurchaseOrderWizardForm />;
}
