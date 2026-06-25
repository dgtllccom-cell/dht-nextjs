"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Unlock, Plus, Trash2, Save, FileText, LayoutDashboard, Settings2, Calculator, BadgePercent, Building2, User } from "lucide-react";
import { SupportedLanguage } from "@/lib/i18n/languages";
import { SimpleModal } from "@/components/ui/simple-modal";
import { apiGet, apiPost } from "@/lib/api/client";

type TaxCodeRow = {
  id: string;
  taxName: string;
  taxPct: number;
  countryName: string;
};

type RowEntry = {
  id: string;
  rowSerial: number;
  serial: string;
  branch: string;
  date: string;
  title: string;
  referenceNo: string;
  details: string;
  qty: number;
  unitPrice: number;
  amount: number;
  currency: string;
  operation: string;
  exchangeRate: number;
  finalAmount: number;
  taxOn: boolean;
  taxPct: number;
  taxAmt: number;
  grandAmount: number;
};

export function ExpensesBillEntryForm({ lang }: { lang: SupportedLanguage }) {
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  // Header State
  const [headerLocked, setHeaderLocked] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("UAE");
  const [billSerial, setBillSerial] = useState("");
  const [branch, setBranch] = useState("DB");
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billMode, setBillMode] = useState("new"); // "new" | "attached"
  const [billTitle, setBillTitle] = useState("purchase");
  const [referenceNo, setReferenceNo] = useState("");

  const detailsRef = useRef<HTMLInputElement>(null);

  // Row Entry State
  const [details, setDetails] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("AED");
  const [operation, setOperation] = useState("*");
  const [exchangeRate, setExchangeRate] = useState<number | "">("");
  const [finalAmount, setFinalAmount] = useState(0);

  // Tax State
  const [taxOn, setTaxOn] = useState(false);
  const [taxPct, setTaxPct] = useState<number | "">("");
  const [taxAmt, setTaxAmt] = useState(0);
  const [grandAmount, setGrandAmount] = useState(0);

  const [taxes, setTaxes] = useState<TaxCodeRow[]>([]);
  const [newTaxOpen, setNewTaxOpen] = useState(false);
  const [newTaxForm, setNewTaxForm] = useState({ taxName: "", taxPct: "", countryName: "" });

  const fetchTaxes = async () => {
    try {
      const data = await apiGet("/api/erp/master-data/taxes");
      setTaxes(data || []);
    } catch (err) {
      console.error("Failed to fetch taxes", err);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const saveNewTax = async () => {
    if (!newTaxForm.taxName || !newTaxForm.taxPct || !newTaxForm.countryName) {
      alert("Please fill all tax fields");
      return;
    }
    
    try {
      const data = await apiPost("/api/erp/master-data/taxes", {
        taxName: newTaxForm.taxName,
        taxPct: newTaxForm.taxPct,
        countryName: newTaxForm.countryName
      });
      
      await fetchTaxes();
      setTaxPct(data.taxPct);
      setNewTaxOpen(false);
      setNewTaxForm({ taxName: "", taxPct: "", countryName: "" });
    } catch (err: any) {
      alert(err.message || "Failed to save tax code");
    }
  };

  // Rows Data
  const [rows, setRows] = useState<RowEntry[]>([]);
  const [saving, setSaving] = useState(false);

  //persisted currency to show correct defaults
  const branchDefaultCurrency = (b: string) => {
    if (b === "DB" || b === "SHJ") return "AED";
    if (b === "KHI" || b === "LHE") return "PKR";
    if (b === "KBL") return "AFN";
    return "AED";
  };

  const generateNextSerial = (b: string, d: string) => {
    const period = d.replace(/-/g, "").slice(0, 6);
    const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
    return `${b}-${period}-${rand}`;
  };

  // Effects
  useEffect(() => {
    if (!headerLocked) {
      setBillSerial(generateNextSerial(branch, billDate));
      setCurrency(branchDefaultCurrency(branch));
    }
  }, [branch, billDate, headerLocked]);

  useEffect(() => {
    const q = Number(qty) || 0;
    const u = Number(unitPrice) || 0;
    const amt = q * u;
    setAmount(amt);

    const bCur = branchDefaultCurrency(branch);
    let final = amt;
    if (currency !== bCur) {
      const rate = Number(exchangeRate) || 0;
      if (rate > 0) {
        final = operation === "*" ? amt * rate : amt / rate;
      }
    }
    setFinalAmount(final);

    let tPct = 0, tAmt = 0, grand = final;
    if (taxOn) {
      tPct = Number(taxPct) || 0;
      tAmt = final * (tPct / 100);
      grand = final + tAmt;
    }
    setTaxAmt(tAmt);
    setGrandAmount(grand);
  }, [qty, unitPrice, currency, branch, operation, exchangeRate, taxOn, taxPct]);

  const showFx = currency !== branchDefaultCurrency(branch);

  const toggleHeaderLock = () => {
    setHeaderLocked(!headerLocked);
    if (!headerLocked && !billSerial) {
      setBillSerial(generateNextSerial(branch, billDate));
    }
  };

  const addRow = () => {
    if (!headerLocked) {
      alert("Please Lock the Header first.");
      return;
    }
    if (billMode === "attached" && !referenceNo.trim()) {
      alert("Linked Reference No is required for attached bills.");
      return;
    }
    if (!details.trim()) {
      alert("Enter details for the bill.");
      return;
    }
    if (finalAmount <= 0) {
      alert("Final amount must be greater than 0. Check Qty, Unit Price and FX rate.");
      return;
    }
    if (taxOn && (taxPct === "" || isNaN(Number(taxPct)))) {
      alert("Enter a valid Tax %");
      return;
    }

    const newRow: RowEntry = {
      id: crypto.randomUUID(),
      rowSerial: rows.length + 1,
      serial: billSerial,
      branch,
      date: billDate,
      title: billMode === "attached" ? billTitle : "-",
      referenceNo: billMode === "attached" ? referenceNo : "-",
      details: details.trim(),
      qty: Number(qty),
      unitPrice: Number(unitPrice),
      amount,
      currency,
      operation: showFx ? operation : "",
      exchangeRate: showFx ? Number(exchangeRate) : 0,
      finalAmount,
      taxOn,
      taxPct: taxOn ? Number(taxPct) : 0,
      taxAmt,
      grandAmount
    };

    setRows([...rows, newRow]);

    // Reset Entry Form
    setDetails("");
    setQty("");
    setUnitPrice("");
    setTaxPct("");
    setTaxOn(false);

    // Focus details for next row
    setTimeout(() => {
      detailsRef.current?.focus();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRow();
    }
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const handleSaveToDatabase = () => {
    setSaving(true);
    // Simulate API call
    console.log("Saving Expenses Bill Payload:", {
      header: { billSerial, branch, billDate, billTitle, purchaseNo },
      entries: rows
    });
    setTimeout(() => {
      setSaving(false);
      alert("Bill saved successfully! (Frontend Only Preview)");
      setRows([]);
      setHeaderLocked(false);
      setReferenceNo("");
      setViewMode("list");
    }, 1000);
  };

  const totalFinal = rows.reduce((sum, r) => sum + r.grandAmount, 0);

  return (
    <div className="container mx-auto p-4 max-w-[1400px] space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Expenses Bill
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and create new expense bills.</p>
        </div>
        {viewMode === "list" ? (
          <Button onClick={() => setViewMode("form")} className="bg-primary hover:bg-primary/90 text-white shadow-md">
            <Plus className="h-4 w-4 mr-2" /> New Bill
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setViewMode("list")}>
            Cancel
          </Button>
        )}
      </div>

      {viewMode === "list" ? (
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Serial</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No recent bills found. Click "New Bill" to create one.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <>
          {/* TOP REPORTS ROW (4 Steps) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Report 1: Branch Details */}
            <Card className="shadow-sm border-t-4 border-t-indigo-500 opacity-90 hover:opacity-100 transition-opacity">
              <CardHeader className="py-2 px-3 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs uppercase font-bold text-slate-600 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> 1. Branch Details</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Country</span>
                  <select 
                    className="border border-slate-200 rounded p-1 w-[130px] text-slate-700 bg-white" 
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    disabled={headerLocked}
                  >
                    <option value="UAE">UAE</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="Afghanistan">Afghanistan</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Main Branch</span>
                  <select className="border border-slate-200 rounded p-1 w-[130px] text-slate-700 bg-white" disabled={headerLocked}>
                    <option>Dubai HQ</option>
                    <option>Sharjah</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">City Branch</span>
                  <select className="border border-slate-200 rounded p-1 w-[130px] text-slate-700 bg-white" disabled={headerLocked}>
                    <option>Deira</option>
                    <option>Bur Dubai</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Report 2: User Details */}
            <Card className="shadow-sm border-t-4 border-t-blue-500 opacity-90 hover:opacity-100 transition-opacity">
              <CardHeader className="py-2 px-3 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs uppercase font-bold text-slate-600 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> 2. User Details</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">User ID</span>
                  <span className="font-semibold text-slate-700">superadmin</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Role</span>
                  <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Super Admin</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active Now</span>
                </div>
              </CardContent>
            </Card>

            {/* Report 3: Bill Info */}
            <Card className={`shadow-sm border-t-4 transition-colors duration-300 opacity-90 hover:opacity-100 ${headerLocked ? "border-t-emerald-500 bg-emerald-50/10" : "border-t-amber-400"}`}>
              <CardHeader className="py-2 px-3 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs uppercase font-bold text-slate-600 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> 3. Bill Info</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Bill Mode</span>
                  <select className="border border-primary/30 rounded p-1 w-[130px] text-primary bg-primary/5 font-bold" disabled={headerLocked} value={billMode} onChange={e=>setBillMode(e.target.value)}>
                    <option value="new">New Bill</option>
                    <option value="attached">Attached Bill</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Date</span>
                  <input type="date" className="border border-slate-200 rounded p-1 w-[130px] text-slate-700 bg-white" disabled={headerLocked} value={billDate} onChange={e=>setBillDate(e.target.value)} />
                </div>
                {billMode === "attached" ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Type</span>
                    <select className="border border-slate-200 rounded p-1 w-[130px] text-slate-700 bg-white" disabled={headerLocked} value={billTitle} onChange={e=>setBillTitle(e.target.value)}>
                      <option value="purchase">Purchase</option>
                      <option value="sales">Sales</option>
                      <option value="clearing">Clearing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Type</span>
                    <span className="text-slate-400 italic">N/A</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report 4: Bill Summary & Action */}
            <Card className={`shadow-sm border-t-4 transition-colors duration-300 opacity-90 hover:opacity-100 ${headerLocked ? "border-t-emerald-500 bg-emerald-50/10" : "border-t-amber-400"}`}>
              <CardHeader className="py-2 px-3 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs uppercase font-bold text-slate-600 flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> 4. Summary</span>
                  <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">{billSerial}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex flex-col justify-between h-[100px]">
                {billMode === "attached" ? (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600">Reference No</Label>
                    <Input placeholder="e.g. P-2025-0078" className="h-7 text-xs border-primary/30" disabled={headerLocked} value={referenceNo} onChange={e=>setReferenceNo(e.target.value)}/>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic mt-2 text-center bg-slate-50 p-1.5 rounded border border-dashed">
                    New independent bill.<br/>No reference required.
                  </div>
                )}
                
                <div className="pt-2 mt-auto">
                  <Button 
                    variant={headerLocked ? "outline" : "default"}
                    onClick={toggleHeaderLock}
                    size="sm"
                    className={`w-full h-7 text-xs shadow-sm ${headerLocked ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                  >
                    {headerLocked ? <><Unlock className="h-3.5 w-3.5 mr-1" /> Unlock Header</> : <><Lock className="h-3.5 w-3.5 mr-1" /> Lock Header</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>

      {/* ENTRY CARD */}
      <Card className={`shadow-sm transition-opacity duration-300 ${!headerLocked ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
        <CardHeader className="pb-3 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Add New Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            
            {/* Details */}
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="text-xs">Details</Label>
              <Input ref={detailsRef} value={details} onChange={e => setDetails(e.target.value)} onKeyDown={handleKeyDown} placeholder="Item or expense details..." />
            </div>

            {/* Qty & Unit Price */}
            <div className="w-20 space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input type="number" value={qty} onChange={e => setQty(e.target.value ? Number(e.target.value) : "")} onKeyDown={handleKeyDown} />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-xs">Unit Price</Label>
              <Input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value ? Number(e.target.value) : "")} onKeyDown={handleKeyDown} />
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs text-slate-500">Amount</Label>
              <Input readOnly value={amount.toFixed(2)} className="bg-slate-50 text-right font-mono" />
            </div>

            {/* Currency & FX */}
            <div className="w-24 space-y-1">
              <Label className="text-xs">Currency</Label>
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
                <option value="AFN">AFN</option>
              </select>
            </div>
            
            {showFx && (
              <>
                <div className="w-16 space-y-1">
                  <Label className="text-xs">Op</Label>
                  <select 
                    value={operation} 
                    onChange={e => setOperation(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="*">×</option>
                    <option value="/">÷</option>
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Ex. Rate</Label>
                  <Input type="number" step="0.0001" value={exchangeRate} onChange={e => setExchangeRate(e.target.value ? Number(e.target.value) : "")} onKeyDown={handleKeyDown} />
                </div>
              </>
            )}

            <div className="w-32 space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Final Amount</Label>
              <Input readOnly value={finalAmount.toFixed(2)} className="bg-slate-100 text-right font-mono font-semibold" />
            </div>

            {/* TAX */}
            <div className="w-24 space-y-1">
              <Label className="text-xs">Apply Tax?</Label>
              <div className="flex bg-slate-100 p-0.5 rounded-md border">
                <button 
                  type="button"
                  className={`flex-1 text-xs py-1.5 rounded-sm transition-colors ${!taxOn ? "bg-white shadow-sm font-medium" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setTaxOn(false)}
                >
                  No
                </button>
                <button 
                  type="button"
                  className={`flex-1 text-xs py-1.5 rounded-sm transition-colors ${taxOn ? "bg-amber-100 text-amber-700 font-bold shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setTaxOn(true)}
                >
                  Yes
                </button>
              </div>
            </div>

            {taxOn && (
              <>
                <div className="w-48 space-y-1 animate-in fade-in zoom-in duration-200">
                  <Label className="text-xs text-amber-600 font-bold">Tax Code</Label>
                  <div className="flex flex-col gap-1">
                    <select 
                      value={taxPct ? String(taxPct) : ""}
                      onChange={e => {
                        const selectedVal = e.target.value;
                        if (selectedVal === "NEW_TAX_CODE") {
                          setNewTaxOpen(true);
                          return;
                        }
                        if (!selectedVal) {
                          setTaxPct("");
                          return;
                        }
                        // since value is taxPct for now to match UI state without refactoring everything
                        setTaxPct(Number(selectedVal));
                      }}
                      className="flex h-9 w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 font-semibold cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {taxes.filter(t => selectedCountry === "UAE" ? t.countryName === "United Arab Emirates" : t.countryName === selectedCountry).map(t => (
                        <option key={t.id} value={t.taxPct}>{t.taxName} ({t.taxPct}%)</option>
                      ))}
                      <option value="NEW_TAX_CODE" className="font-bold text-primary">+ Add New Tax</option>
                    </select>
                  </div>
                </div>
                <div className="w-28 space-y-1 animate-in fade-in zoom-in duration-200">
                  <Label className="text-xs text-slate-500">Tax Amt</Label>
                  <Input readOnly value={taxAmt.toFixed(2)} className="bg-slate-50 text-right font-mono" />
                </div>
              </>
            )}

            <div className="w-32 space-y-1">
              <Label className="text-xs font-black text-slate-800">Total (Incl. Tax)</Label>
              <Input readOnly value={grandAmount.toFixed(2)} onKeyDown={handleKeyDown} className="bg-primary/5 border-primary/20 text-right font-mono font-bold text-primary cursor-pointer focus:ring-2 focus:ring-primary" title="Press Enter to Add Row" />
            </div>

            {/* Submit */}
            <div className="ml-auto flex items-end pb-1">
              <Button type="button" onClick={addRow} className="bg-slate-800 hover:bg-slate-900 text-white shadow-md">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* TABLE DATA */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
              <tr>
                <th className="px-3 py-3 font-semibold text-center w-10">No.</th>
                <th className="px-3 py-3 font-semibold">Details</th>
                <th className="px-3 py-3 font-semibold text-right">Qty</th>
                <th className="px-3 py-3 font-semibold text-right">Unit Price</th>
                <th className="px-3 py-3 font-semibold text-right">Amount</th>
                <th className="px-3 py-3 font-semibold text-center">Cur</th>
                <th className="px-3 py-3 font-semibold text-center">Op</th>
                <th className="px-3 py-3 font-semibold text-right">Rate</th>
                <th className="px-3 py-3 font-semibold text-right">Final</th>
                <th className="px-3 py-3 font-semibold text-right">Tax %</th>
                <th className="px-3 py-3 font-semibold text-right">Tax Amt</th>
                <th className="px-3 py-3 font-black text-slate-800 text-right bg-slate-100">Total</th>
                <th className="px-3 py-3 font-semibold text-center">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                    <Calculator className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No entries added yet. Lock the header and add rows.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 text-center font-bold text-slate-400">{r.rowSerial}</td>
                    <td className="px-3 py-2 text-slate-700 max-w-[150px] truncate" title={r.details}>{r.details}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500">{r.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center font-bold text-[11px]">{r.currency}</td>
                    <td className="px-3 py-2 text-center font-mono">{r.operation}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.exchangeRate > 0 ? r.exchangeRate.toFixed(4) : "-"}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{r.finalAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.taxOn ? <span className="inline-flex items-center text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]"><BadgePercent className="w-3 h-3 mr-0.5"/> {r.taxPct}%</span> : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-600">{r.taxOn ? r.taxAmt.toFixed(2) : "-"}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold bg-slate-50/50">{r.grandAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeRow(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-200">
              <tr>
                <td colSpan={11} className="px-4 py-3 text-right font-black text-slate-600">
                  GRAND TOTAL (Incl. Tax)
                </td>
                <td className="px-4 py-3 text-right font-mono font-black text-lg text-primary">
                  {totalFinal.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {rows.length > 0 && (
          <div className="p-4 bg-slate-50 border-t flex justify-end">
            <Button onClick={handleSaveToDatabase} disabled={saving} size="lg" className="px-8 font-bold shadow-md shadow-primary/20">
              {saving ? "Saving Bill..." : "Save Expenses Bill"}
              {!saving && <Save className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        )}
      </Card>
      </>
      )}
      
      {/* New Tax Modal */}
      {newTaxOpen && (
      <SimpleModal onClose={() => setNewTaxOpen(false)} title="Add New Tax Code">
        <div className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 font-bold">Country</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={newTaxForm.countryName}
              onChange={e => setNewTaxForm({...newTaxForm, countryName: e.target.value})}
            >
              <option value="">Select Country...</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Pakistan">Pakistan</option>
              <option value="Afghanistan">Afghanistan</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 font-bold">Tax Name</Label>
            <Input placeholder="e.g. VAT, GST" value={newTaxForm.taxName} onChange={e => setNewTaxForm({...newTaxForm, taxName: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 font-bold">Percentage (%)</Label>
            <Input type="number" step="0.01" placeholder="e.g. 5.0" value={newTaxForm.taxPct} onChange={e => setNewTaxForm({...newTaxForm, taxPct: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-2 border-t mt-6">
            <Button variant="outline" onClick={() => setNewTaxOpen(false)}>Cancel</Button>
            <Button onClick={saveNewTax} className="font-bold">Save Tax Code</Button>
          </div>
        </div>
      </SimpleModal>
      )}

    </div>
  );
}
