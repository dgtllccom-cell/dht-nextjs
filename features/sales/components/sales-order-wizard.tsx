"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Eye, 
  FileText, 
  Package, 
  Printer, 
  Search, 
  Ship, 
  Save, 
  X 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "@/features/customers/components/customer-picker";
import { CompanyPicker } from "@/features/companies/components/company-picker";
import { apiGet, apiPost } from "@/lib/api/client";

const CURRENCY_OPTIONS = ["USD", "AED", "EUR", "GBP", "PKR", "AFN", "INR", "CNY", "SAR"];
const LOADING_TYPES = ["By Sea", "By Road", "By Air"];
const CONTAINER_TYPES = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "LCL / Bulk"];
const QTY_TYPE_OPTIONS = ["BAGS", "CARTONS", "Loose", "KGS", "Ton"];
const SIZE_OPTIONS = ["Large", "Medium", "Standard", "Small"];
const BRAND_OPTIONS = ["Premium", "Choice", "Organic", "Standard"];
const GOODS_OPTIONS = ["PISTACHIOS KERNEL", "CASHEW NUTS (W320)", "WALNUTS INSHELL", "ALMONDS", "HAZELNUTS"];

const DEFAULT_FORM = {
  countryId: "",
  countryBranchId: "",
  cityBranchId: "",
  customerAccountId: "",
  customerLedgerId: "",
  salesOrderNo: "",
  salesContractNo: "",
  orderDate: new Date().toISOString().slice(0, 10),
  currencyCode: "USD",
  exchangeRate: 1,
  customerName: "",
  customerId: "",
  companyId: "",
  remarks: "",
  
  // Step 2 details (Goods)
  goodsName: "PISTACHIOS KERNEL",
  size: "Large",
  brand: "Premium",
  origin: "IRAN",
  qtyNo: 100,
  qtyName: "BAGS",
  qtyKgs: 25,
  grossWeight: 2500,
  netWeight: 2500,
  coursePrice: 15, // Rate per unit
  totalAmount: 1500,

  // Step 3 details (Logistics)
  shippingMode: "By Sea",
  loadingPort: "Karachi Port",
  dischargePort: "Jebel Ali Port",
  containerType: "40 FT",
  containerCount: 1,
  containerNumbers: "",
  vesselName: "",
  sealNumber: "",
  transportAgent: "",
  driverName: "",
  truckNumber: ""
};

export function SalesOrderWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [countries, setCountries] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [cityBranches, setCityBranches] = useState<any[]>([]);

  useEffect(() => {
    async function loadSelectData() {
      try {
        const res = await apiGet<{ countries: any[] }>("/api/erp/locations/countries");
        setCountries(res.countries || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadSelectData();
  }, []);

  // Fetch branches when country changes
  useEffect(() => {
    if (!form.countryId) {
      setBranches([]);
      return;
    }
    async function loadBranches() {
      try {
        const res = await apiGet<{ ok: boolean; data: { branches: any[] } }>(`/api/erp/locations/branches/main?countryId=${form.countryId}`);
        if (res.ok && res.data?.branches) {
          setBranches(res.data.branches);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadBranches();
  }, [form.countryId]);

  // Fetch city branches when country branch changes
  useEffect(() => {
    if (!form.countryBranchId) {
      setCityBranches([]);
      return;
    }
    async function loadCityBranches() {
      try {
        const res = await apiGet<{ cityBranches: any[] }>(`/api/branch-management/city-branches?countryBranchId=${form.countryBranchId}`);
        setCityBranches(res.cityBranches || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadCityBranches();
  }, [form.countryBranchId]);

  // Auto calculate total amount
  useEffect(() => {
    const qty = Number(form.qtyNo || 0);
    const rate = Number(form.coursePrice || 0);
    const gross = qty * Number(form.qtyKgs || 0);
    setForm((f) => ({
      ...f,
      totalAmount: qty * rate,
      grossWeight: gross,
      netWeight: gross
    }));
  }, [form.qtyNo, form.coursePrice, form.qtyKgs]);

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        countryId: form.countryId || null,
        countryBranchId: form.countryBranchId || null,
        cityBranchId: form.cityBranchId || null,
        customerAccountId: form.customerAccountId || null,
        customerLedgerId: form.customerLedgerId || null,
        salesOrderNo: form.salesOrderNo?.trim() || null,
        salesContractNo: form.salesContractNo?.trim() || null,
        orderDate: form.orderDate,
        customerName: form.customerName || null,
        productSummary: `${form.goodsName} (${form.size})`,
        quantity: Number(form.qtyNo),
        totalWeight: Number(form.netWeight),
        currencyCode: form.currencyCode,
        exchangeRate: Number(form.exchangeRate),
        orderTotal: Number(form.totalAmount),
        paidAmount: 0,
        remainingAmount: Number(form.totalAmount),
        salesStatus: "draft",
        formData: {
          form,
          goodsEntries: [
            {
              goodsName: form.goodsName,
              qtyNo: form.qtyNo,
              qtyName: form.qtyName,
              qtyKgs: form.qtyKgs,
              grossWeight: form.grossWeight,
              netWeight: form.netWeight,
              coursePrice: form.coursePrice,
              totalAmount: form.totalAmount,
              origin: form.origin,
              brand: form.brand
            }
          ]
        }
      };

      const res = await apiPost<any>("/api/erp/sales/orders", payload);
      setMessage("✅ Sales Booking created successfully! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard/sales/sales-order");
      }, 1500);
    } catch (err: any) {
      setMessage("❌ Failed to save Sales Booking: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100">
      
      {/* Wizard Step Progress Tracker */}
      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-850">
        {[
          { step: 1, title: "1. Parties Details" },
          { step: 2, title: "2. Goods & Amounts" },
          { step: 3, title: "3. Logistics & Ports" },
          { step: 4, title: "4. Review & Post" }
        ].map((item) => (
          <div key={item.step} className="flex items-center space-x-2">
            <span className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border",
              step === item.step
                ? "bg-cyan-600 border-cyan-500 text-white"
                : step > item.step
                  ? "bg-emerald-950 border-emerald-900 text-emerald-400"
                  : "bg-slate-900 border-slate-800 text-slate-500"
            )}>
              {item.step}
            </span>
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              step === item.step ? "text-cyan-400 font-bold" : "text-slate-500"
            )}>{item.title}</span>
          </div>
        ))}
      </div>

      {message && (
        <div className={cn(
          "px-4 py-3 rounded-xl border text-sm font-semibold",
          message.startsWith("✅")
            ? "bg-emerald-950/60 border-emerald-900 text-emerald-300"
            : "bg-red-950/60 border-red-900 text-red-300"
        )}>
          {message}
        </div>
      )}

      {/* Main Forms Card */}
      <Card className="bg-slate-900/50 border-slate-800 p-6 rounded-2xl">
        <CardContent className="p-0">
          
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">Sales Order Scope & Client Identity</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5 uppercase">Country</label>
                  <select
                    value={form.countryId}
                    onChange={(e) => setForm({ ...form, countryId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5 uppercase">Main Branch</label>
                  <select
                    value={form.countryBranchId}
                    onChange={(e) => setForm({ ...form, countryBranchId: e.target.value })}
                    disabled={!form.countryId}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-white disabled:opacity-40"
                  >
                    <option value="">Select Main Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5 uppercase">City Branch</label>
                  <select
                    value={form.cityBranchId}
                    onChange={(e) => setForm({ ...form, cityBranchId: e.target.value })}
                    disabled={!form.countryBranchId}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-white disabled:opacity-40"
                  >
                    <option value="">Select City Branch</option>
                    {cityBranches.map((cb) => (
                      <option key={cb.id} value={cb.id}>{cb.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <CustomerPicker
                    value={form.customerId}
                    onValueChange={(val, label) => setForm({ ...form, customerId: val, customerName: label || "" })}
                    countryId={form.countryId}
                    label="Select Client / Buyer Name"
                  />
                </div>
                <div>
                  <CompanyPicker
                    value={form.companyId}
                    onValueChange={(val) => setForm({ ...form, companyId: val })}
                    label="Select Selling Company"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Sales Order No / Contract Reference</label>
                  <input
                    type="text"
                    value={form.salesContractNo}
                    onChange={(e) => setForm({ ...form, salesContractNo: e.target.value })}
                    placeholder="e.g. DGT-SO-9092"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Booking Currency</label>
                  <select
                    value={form.currencyCode}
                    onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-white"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Exchange Rate</label>
                  <input
                    type="number"
                    step="any"
                    value={form.exchangeRate}
                    onChange={(e) => setForm({ ...form, exchangeRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">Products & Commodity Metrics</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Product Type</label>
                  <select
                    value={form.goodsName}
                    onChange={(e) => setForm({ ...form, goodsName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-white"
                  >
                    {GOODS_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Product Brand</label>
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-white"
                  >
                    {BRAND_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Origin</label>
                  <input
                    type="text"
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Quantity Rate</label>
                  <input
                    type="number"
                    value={form.qtyNo || ""}
                    onChange={(e) => setForm({ ...form, qtyNo: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Unit</label>
                  <select
                    value={form.qtyName}
                    onChange={(e) => setForm({ ...form, qtyName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs"
                  >
                    {QTY_TYPE_OPTIONS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">KGs per Unit</label>
                  <input
                    type="number"
                    value={form.qtyKgs || ""}
                    onChange={(e) => setForm({ ...form, qtyKgs: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Sales Unit Price ({form.currencyCode})</label>
                  <input
                    type="number"
                    value={form.coursePrice || ""}
                    onChange={(e) => setForm({ ...form, coursePrice: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-bold text-cyan-400"
                  />
                </div>
              </div>

              <div className="bg-cyan-950/20 p-4 rounded-xl border border-cyan-950 flex justify-between items-baseline">
                <span className="text-xs uppercase font-bold text-slate-400">Total Calculated Revenue:</span>
                <span className="text-2xl font-black text-cyan-400">
                  {form.totalAmount.toLocaleString()} {form.currencyCode}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">Logistics & Custom Ports details</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1.5 uppercase">Shipping Mode</label>
                  <select
                    value={form.shippingMode}
                    onChange={(e) => setForm({ ...form, shippingMode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-white"
                  >
                    {LOADING_TYPES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Port of Loading</label>
                  <input
                    type="text"
                    value={form.loadingPort}
                    onChange={(e) => setForm({ ...form, loadingPort: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Port of Discharge</label>
                  <input
                    type="text"
                    value={form.dischargePort}
                    onChange={(e) => setForm({ ...form, dischargePort: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Container Type</label>
                  <select
                    value={form.containerType}
                    onChange={(e) => setForm({ ...form, containerType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white text-xs"
                  >
                    {CONTAINER_TYPES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1">Container Count</label>
                  <input
                    type="number"
                    value={form.containerCount || ""}
                    onChange={(e) => setForm({ ...form, containerCount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Container Numbers</label>
                  <input
                    type="text"
                    value={form.containerNumbers}
                    onChange={(e) => setForm({ ...form, containerNumbers: e.target.value })}
                    placeholder="e.g. MSCO-9092, DRY-1122"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Truck Registration Number</label>
                  <input
                    type="text"
                    value={form.truckNumber}
                    onChange={(e) => setForm({ ...form, truckNumber: e.target.value })}
                    placeholder="e.g. QA-9800"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Driver Name</label>
                  <input
                    type="text"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Transport Company</label>
                  <input
                    type="text"
                    value={form.transportAgent}
                    onChange={(e) => setForm({ ...form, transportAgent: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2 font-black uppercase text-cyan-400">Final Review & Post Sales Booking</h3>

              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-baseline border-b border-slate-900 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Client / Buyer</span>
                    <span className="text-lg font-black text-white">{form.customerName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider text-right">Order Date</span>
                    <span className="text-sm font-bold text-slate-300">{form.orderDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Product:</span>
                    <span className="font-bold">{form.goodsName} ({form.size})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Weight:</span>
                    <span className="font-bold">{form.netWeight?.toLocaleString()} KG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity:</span>
                    <span className="font-bold">{form.qtyNo} {form.qtyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Containers Booked:</span>
                    <span className="font-bold text-indigo-400">{form.containerCount} x {form.containerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipping via:</span>
                    <span className="font-bold">{form.shippingMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discharge Port:</span>
                    <span className="font-bold">{form.dischargePort}</span>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-400">Grand Total Invoice:</span>
                  <span className="text-2xl font-black text-cyan-400">
                    {form.totalAmount.toLocaleString()} {form.currencyCode}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-455 mb-1.5 uppercase">Remarks / Special Terms</label>
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white"
                  placeholder="Enter invoice notes, shipping terms, payment guarantee info..."
                />
              </div>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="flex justify-between items-center border-t border-slate-850 pt-6 mt-6">
            <Button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(step - 1)}
              variant="outline"
              className="border-slate-800 bg-transparent text-slate-400 hover:bg-slate-950 font-bold"
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" /> Previous Step
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Next Step <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8"
              >
                {saving ? "Posting Booking..." : "✅ Confirm Sales Booking"}
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
