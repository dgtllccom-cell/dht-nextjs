"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, FileText, Settings2, Building2, Eye, Printer, Loader2, ArrowRightLeft } from "lucide-react";
import { SupportedLanguage } from "@/lib/i18n/languages";
import { apiGet, apiPost } from "@/lib/api/client";

type MoneyExchangeEntry = {
  id?: string;
  serial_no: string;
  branch_id: string;
  entry_date: string;
  transaction_type: string;
  account_no: string;
  qty_currency: string;
  ex_currency: string;
  operation: string;
  rate: number;
  quantity: number;
  final_amount: number;
  receipt_name: string;
  received_from: string;
  mobile: string;
  details: string;
  profit_base_currency: number;
  created_at?: string;
};

type SessionInfo = {
  user: { id: string; email: string | null; fullName: string | null };
  roles: string[];
  scopes: any;
};

export function MoneyExchangeForm({ lang }: { lang: SupportedLanguage }) {
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Scoping & context
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchCurrency, setBranchCurrency] = useState("PKR");
  const [entrySerial, setEntrySerial] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Loading states
  const [saving, setSaving] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [recentBills, setRecentBills] = useState<MoneyExchangeEntry[]>([]);

  // Form states
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountStatus, setAccountStatus] = useState<"idle"|"loading"|"found"|"error">("idle");
  
  const [transactionType, setTransactionType] = useState<"Purchase"|"Sale">("Purchase");
  const [qtyCurrency, setQtyCurrency] = useState("");
  const [exCurrency, setExCurrency] = useState("");
  const [operation, setOperation] = useState<"multiply"|"divide">("multiply");
  const [rate, setRate] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [finalAmount, setFinalAmount] = useState<number>(0);
  
  const [receiptName, setReceiptName] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [mobile, setMobile] = useState("");
  const [details, setDetails] = useState("");
  const [profit, setProfit] = useState<number | null>(null);

  // Filter
  const [searchQtyCur, setSearchQtyCur] = useState("");
  const [searchExCur, setSearchExCur] = useState("");

  useEffect(() => {
    setPortalNode(document.getElementById("erp-page-actions-slot"));
  }, []);

  // Fetch Session & Initial Data
  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet("/api/erp/auth/session"),
      apiGet("/api/erp/locations/countries"),
      apiGet("/api/erp/locations/city-branches")
    ]).then(([sess, cRes, bRes]) => {
      if (!active) return;
      setSessionInfo(sess);
      setCountries(cRes?.data || []);
      setBranches(bRes?.data || []);
      
      // Default to user's branch if possible
      const defaultBranchId = sess?.scopes?.cityBranchIds?.[0] || bRes?.data?.[0]?.id || "";
      setSelectedBranch(defaultBranchId);
      if (defaultBranchId) {
        const br = bRes?.data?.find((x: any) => x.id === defaultBranchId);
        if (br) {
          setSelectedCountry(br.country_id);
          setBranchCurrency(br.currency_code || "PKR");
        }
      }
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    // Generate Serial when branch changes
    if (selectedBranch) {
      const brCode = branches.find(b => b.id === selectedBranch)?.code || "BR";
      const random = String(Math.floor(Math.random() * 9000) + 1000);
      const period = entryDate.replace(/-/g, "").slice(0, 6);
      setEntrySerial(`${brCode}-EX-${period}-${random}`);
    }
  }, [selectedBranch, entryDate, branches]);

  const fetchRecentBills = async () => {
    try {
      setLoadingBills(true);
      const res = await apiGet(`/api/erp/money-exchange?branchId=${selectedBranch}`);
      if (res && res.entries) {
        setRecentBills(res.entries);
      }
    } catch (err) {
      console.error("Failed to fetch recent entries", err);
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    if (viewMode === "list" && selectedBranch) {
      fetchRecentBills();
    }
  }, [viewMode, selectedBranch]);

  // Account Lookup
  const searchAccount = async () => {
    if (!accountNo.trim()) return;
    setAccountStatus("loading");
    try {
      const qp = new URLSearchParams();
      qp.set("query", accountNo);
      qp.set("cityBranchId", selectedBranch);
      qp.set("limit", "1");
      const res = await apiGet<any>(`/api/erp/accounting/accounts/lookup?${qp.toString()}`);
      if (res && res.data && res.data.length > 0) {
        setAccountName(res.data[0].accountName);
        setAccountStatus("found");
      } else {
        setAccountStatus("error");
        setAccountName("Not Found");
      }
    } catch (err) {
      setAccountStatus("error");
      setAccountName("Lookup failed");
    }
  };

  // Calculations
  useEffect(() => {
    const r = Number(rate) || 0;
    const q = Number(quantity) || 0;
    if (r > 0 && q > 0) {
      const f = operation === "divide" ? q / r : q * r;
      setFinalAmount(f);
    } else {
      setFinalAmount(0);
    }
  }, [rate, quantity, operation]);

  // Save Entry
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountStatus !== "found") return alert("Please select a valid account first.");
    if (!qtyCurrency || !exCurrency || finalAmount <= 0) return alert("Please complete formula fields properly.");
    
    setSaving(true);
    try {
      const payload = {
        serialNo: entrySerial,
        branchId: selectedBranch,
        entryDate,
        transactionType,
        accountNo,
        qtyCurrency,
        exCurrency,
        operation,
        rate: Number(rate),
        quantity: Number(quantity),
        finalAmount,
        receiptName: receiptName.trim() || null,
        receivedFrom: receivedFrom.trim() || null,
        mobile: mobile.trim() || null,
        details: details.trim() || null,
        profitBaseCurrency: profit || 0
      };
      
      await apiPost("/api/erp/money-exchange", payload);
      alert("Exchange entry saved successfully!");
      
      // Reset
      setAccountNo("");
      setAccountName("");
      setAccountStatus("idle");
      setRate("");
      setQuantity("");
      setReceiptName("");
      setReceivedFrom("");
      setMobile("");
      setDetails("");
      setQtyCurrency("");
      setExCurrency("");
      setProfit(null);
      
      setViewMode("list");
    } catch (err: any) {
      alert(err.message || "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const filteredBills = useMemo(() => {
    return recentBills.filter(b => 
      b.qty_currency.toLowerCase().includes(searchQtyCur.toLowerCase()) &&
      b.ex_currency.toLowerCase().includes(searchExCur.toLowerCase())
    );
  }, [recentBills, searchQtyCur, searchExCur]);

  return (
    <div className="container mx-auto p-4 max-w-[1400px] space-y-6">
      {portalNode && createPortal(
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mr-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Money Changer
          </h1>
          {viewMode === "list" ? (
            <Button size="sm" onClick={() => setViewMode("form")} className="h-7 text-xs bg-primary hover:bg-primary/90 text-white shadow-sm">
              <Plus className="h-3 w-3 mr-1" /> New Entry
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setViewMode("list")} className="h-7 text-xs shadow-sm">
              Cancel
            </Button>
          )}
        </div>,
        portalNode
      )}

      {viewMode === "list" ? (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              Exchange Report
            </CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Search Qty Cur..." className="h-7 text-xs w-32" value={searchQtyCur} onChange={e=>setSearchQtyCur(e.target.value)} />
              <Input placeholder="Search Ex Cur..." className="h-7 text-xs w-32" value={searchExCur} onChange={e=>setSearchExCur(e.target.value)} />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Serial</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">A/C No</th>
                  <th className="px-3 py-2 font-semibold">Qty Cur</th>
                  <th className="px-3 py-2 font-semibold">Ex Cur</th>
                  <th className="px-3 py-2 font-semibold text-right">Rate</th>
                  <th className="px-3 py-2 font-semibold text-right">Qty</th>
                  <th className="px-3 py-2 font-semibold text-right">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingBills ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : filteredBills.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No recent entries found.</td></tr>
                ) : (
                  filteredBills.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{b.serial_no}</td>
                      <td className="px-3 py-2 text-slate-600">{b.entry_date}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.transaction_type === 'Purchase' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {b.transaction_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{b.account_no}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{b.qty_currency}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{b.ex_currency}</td>
                      <td className="px-3 py-2 text-right font-mono">{b.rate}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${b.transaction_type === 'Purchase' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {b.transaction_type === 'Purchase' ? '+' : '-'}{b.quantity.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{b.final_amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <Card className="shadow-sm border-t-4 border-t-indigo-500">
            <CardHeader className="py-2 px-3 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xs uppercase font-bold text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> 1. Branch & Session Details</span>
                <span className="bg-white px-2 py-0.5 rounded border text-[10px] font-mono text-slate-500">{entrySerial}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs pb-1 border-b">
                  <span className="text-slate-500 font-medium">Branch</span>
                  <select className="border-0 bg-transparent text-right font-bold text-slate-700 p-0 focus:ring-0 cursor-pointer" value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-between items-center text-xs pb-1 border-b">
                  <span className="text-slate-500 font-medium">Base Currency</span>
                  <span className="font-bold text-slate-700">{branchCurrency}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs pb-1 border-b">
                  <span className="text-slate-500 font-medium">User</span>
                  <span className="font-bold text-slate-700">{sessionInfo?.user?.fullName || "Admin"}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1 border-b">
                  <span className="text-slate-500 font-medium">Date</span>
                  <input type="date" value={entryDate} onChange={e=>setEntryDate(e.target.value)} className="border-0 bg-transparent text-right font-bold text-slate-700 p-0 h-4 focus:ring-0 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-amber-400">
            <CardHeader className="py-2 px-3 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xs uppercase font-bold text-slate-600 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> 2. Exchange Entry (Simple Formula)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Account Number</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Search Account Code..." value={accountNo} onChange={e=>setAccountNo(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); searchAccount();}}} className="h-8 text-sm max-w-sm" />
                    <Button type="button" onClick={searchAccount} className="h-8">Search</Button>
                  </div>
                  {accountStatus === "loading" && <p className="text-[10px] text-blue-500">Searching...</p>}
                  {accountStatus === "found" && <p className="text-[10px] text-emerald-600 font-bold">✓ {accountName}</p>}
                  {accountStatus === "error" && <p className="text-[10px] text-rose-500 font-bold">✗ Account not found</p>}
                </div>
                <div className="w-48 space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Transaction Type</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-bold" value={transactionType} onChange={e=>setTransactionType(e.target.value as any)}>
                    <option value="Purchase">Purchase</option>
                    <option value="Sale">Sale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Qty Currency</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={qtyCurrency} onChange={e=>setQtyCurrency(e.target.value)}>
                    <option value="">--</option>
                    <option value="AED">AED</option>
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AFN">AFN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Ex. Currency</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={exCurrency} onChange={e=>setExCurrency(e.target.value)}>
                    <option value="">--</option>
                    <option value="AED">AED</option>
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AFN">AFN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Op</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={operation} onChange={e=>setOperation(e.target.value as any)}>
                    <option value="multiply">×</option>
                    <option value="divide">÷</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Rate</Label>
                  <Input type="number" step="0.000001" className="h-8 text-sm" value={rate} onChange={e=>setRate(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Quantity</Label>
                  <Input type="number" step="0.01" className="h-8 text-sm" value={quantity} onChange={e=>setQuantity(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-indigo-600">Final Amount</Label>
                  <Input readOnly value={finalAmount > 0 ? finalAmount.toFixed(2) : ""} className="h-8 text-sm font-mono font-bold bg-slate-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Receipt Name</Label>
                  <Input className="h-8 text-sm" value={receiptName} onChange={e=>setReceiptName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Received From</Label>
                  <Input className="h-8 text-sm" value={receivedFrom} onChange={e=>setReceivedFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Mobile</Label>
                  <Input className="h-8 text-sm" value={mobile} onChange={e=>setMobile(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Details</Label>
                  <Input className="h-8 text-sm" value={details} onChange={e=>setDetails(e.target.value)} />
                </div>
              </div>

            </CardContent>
            <div className="p-3 bg-slate-50 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={()=>setViewMode("list")} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || accountStatus !== "found"} className="font-bold px-8 shadow-md">
                {saving ? "Saving..." : "Save Exchange Entry"}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
