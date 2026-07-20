"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  ShoppingCart, Plus, Search, Scale, Coins,
  TrendingUp, User, CalendarDays, CheckCircle2,
  Trash2, Loader2, ArrowLeftRight, Check, Package
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CURRENCIES = ["USD", "AED", "PKR", "AFN", "INR", "IRR"];
const QUANTITY_NAMES = ["Bags", "Cartons", "Boxes", "Crates", "Bales", "Drums", "Pieces", "Custom"];

interface LocalPurchaseViewProps {
  session: any;
  goodsList: any[];
  countryBranches: any[];
  cityBranches: any[];
  companies: any[];
}

export function LocalPurchaseView({
  session,
  goodsList,
  countryBranches,
  cityBranches,
  companies
}: LocalPurchaseViewProps) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Branch Selection State
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCityBranchId, setSelectedCityBranchId] = useState("");

  // Form Fields State
  const [goodsId, setGoodsId] = useState("");
  const [customGoodsName, setCustomGoodsName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [quantityName, setQuantityName] = useState("Bags");
  const [customQuantityName, setCustomQuantityName] = useState("");
  
  // Weights (Inputs)
  const [quantityCount, setQuantityCount] = useState(""); // Number of packages
  const [weightPerPkg, setWeightPerPkg] = useState(""); // Weight per package (KGs)
  const [manualGrossWeight, setManualGrossWeight] = useState(""); // Override gross weight
  const [emptyKgs, setEmptyKgs] = useState(""); // Tare Deduction weight (KGs)
  const [divideKgs, setDivideKgs] = useState("50"); // Divisor (e.g. Bag Weight divisor, default 50)

  // Rate & Financials
  const [rateType, setRateType] = useState("per_kg"); // 'per_kg' or 'per_number'
  const [purchaseRate, setPurchaseRate] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState("1");

  // Determine active branch details
  const activeBranch = useMemo(() => {
    return countryBranches.find(b => b.id === selectedBranchId) || countryBranches[0];
  }, [countryBranches, selectedBranchId]);

  const activeCityBranches = useMemo(() => {
    if (!selectedBranchId) return [];
    return cityBranches.filter(c => c.countryBranchId === selectedBranchId);
  }, [cityBranches, selectedBranchId]);

  // Default selection based on user scope
  useEffect(() => {
    if (countryBranches.length > 0) {
      // If user has country branch assignment, default to it
      const userBranch = session.countryBranchIds?.[0];
      if (userBranch && countryBranches.some(b => b.id === userBranch)) {
        setSelectedBranchId(userBranch);
      } else {
        setSelectedBranchId(countryBranches[0].id);
      }
    }
  }, [countryBranches, session]);

  useEffect(() => {
    if (activeCityBranches.length > 0) {
      const userCityBranch = session.cityBranchIds?.[0];
      if (userCityBranch && activeCityBranches.some(c => c.id === userCityBranch)) {
        setSelectedCityBranchId(userCityBranch);
      } else {
        setSelectedCityBranchId(activeCityBranches[0].id);
      }
    } else {
      setSelectedCityBranchId("");
    }
  }, [activeCityBranches, session]);

  // Set local currency dynamically based on active branch
  const localCurrency = useMemo(() => {
    return activeBranch?.localCurrency || "PKR";
  }, [activeBranch]);

  // Load Saved Local Purchases
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/erp/purchases/local-purchase?countryBranchId=${selectedBranchId || ""}`);
      const payload = await res.json();
      if (payload.ok && payload.data?.purchases) {
        setPurchases(payload.data.purchases);
      }
    } catch (err) {
      console.error("Failed to load local purchases:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      void loadHistory();
    }
  }, [selectedBranchId]);

  // Automatic Weight Calculations
  const calculatedGrossWeight = useMemo(() => {
    const qty = Number(quantityCount || 0);
    const weight = Number(weightPerPkg || 0);
    return qty * weight;
  }, [quantityCount, weightPerPkg]);

  const totalGrossWeight = useMemo(() => {
    if (manualGrossWeight !== "") {
      return Number(manualGrossWeight);
    }
    return calculatedGrossWeight;
  }, [manualGrossWeight, calculatedGrossWeight]);

  const netWeight = useMemo(() => {
    const gross = totalGrossWeight;
    const tare = Number(emptyKgs || 0);
    return Math.max(0, gross - tare);
  }, [totalGrossWeight, emptyKgs]);

  const numbers = useMemo(() => {
    const divisor = Number(divideKgs || 0);
    if (divisor <= 0) return 0;
    return netWeight / divisor;
  }, [netWeight, divideKgs]);

  // Financial Calculations
  const purchaseCost = useMemo(() => {
    const rate = Number(purchaseRate || 0);
    if (rateType === "per_kg") {
      return netWeight * rate;
    } else {
      return numbers * rate;
    }
  }, [netWeight, numbers, rateType, purchaseRate]);

  const finalCost = useMemo(() => {
    const rate = Number(exchangeRate || 1);
    return purchaseCost * rate;
  }, [purchaseCost, exchangeRate]);

  // Handlers
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Resolve Goods name
    let selectedGoodsName = "";
    if (goodsId === "custom") {
      selectedGoodsName = customGoodsName.trim();
    } else {
      const selectedObj = goodsList.find(g => g.id === goodsId);
      selectedGoodsName = selectedObj ? selectedObj.goodsName || selectedObj.goods_name : "";
    }

    if (!selectedGoodsName) {
      alert("Please select or enter a Goods Name.");
      return;
    }

    if (!quantityCount || Number(quantityCount) <= 0) {
      alert("Please enter a valid packages count.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        companyId: activeBranch.companyId || companies[0]?.id,
        countryId: activeBranch.countryId,
        countryBranchId: selectedBranchId,
        cityBranchId: selectedCityBranchId || null,
        goodsId: goodsId === "custom" ? null : goodsId,
        goodsName: selectedGoodsName,
        supplierName: supplierName.trim() || "Local Market Vendor",
        quantityName: quantityName === "Custom" ? customQuantityName.trim() : quantityName,
        quantityKgs: Number(quantityCount),
        totalGrossWeight: totalGrossWeight,
        emptyKgs: Number(emptyKgs || 0),
        netWeight: netWeight,
        divideKgs: Number(divideKgs || 0),
        numbers: numbers,
        rateType: rateType,
        purchaseRate: Number(purchaseRate || 0),
        purchaseCurrency: purchaseCurrency,
        exchangeRate: Number(exchangeRate || 1),
        localCurrency: localCurrency,
        purchaseCost: purchaseCost,
        finalCost: finalCost
      };

      const res = await fetch("/api/erp/purchases/local-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error?.message || "Failed to save purchase.");
      }

      alert("Local Purchase recorded successfully!");
      // Reset form
      setGoodsId("");
      setCustomGoodsName("");
      setSupplierName("");
      setQuantityCount("");
      setWeightPerPkg("");
      setManualGrossWeight("");
      setEmptyKgs("");
      setPurchaseRate("");
      setExchangeRate("1");
      
      // Reload history
      await loadHistory();
    } catch (err: any) {
      alert(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  // Filter & Search History List
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const q = searchQuery.toLowerCase();
      return p.goodsName?.toLowerCase().includes(q) ||
             p.supplierName?.toLowerCase().includes(q) ||
             p.quantityName?.toLowerCase().includes(q);
    });
  }, [purchases, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    return filteredPurchases.reduce((acc, curr) => {
      acc.totalGross += Number(curr.totalGrossWeight || 0);
      acc.totalNet += Number(curr.netWeight || 0);
      acc.totalBags += Number(curr.numbers || 0);
      acc.totalCostLocal += Number(curr.finalCost || 0);
      return acc;
    }, { totalGross: 0, totalNet: 0, totalBags: 0, totalCostLocal: 0 });
  }, [filteredPurchases]);

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 space-y-6">
      {/* Header Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <ShoppingCart className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Local Purchase Registry
            </h1>
            <p className="text-xs text-slate-500 font-medium">Record and manage instant market purchases with exact tare weights and exchange rates.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Country Branch</span>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="h-9 w-52 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            >
              {countryBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          {activeCityBranches.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">City Branch</span>
              <select
                value={selectedCityBranchId}
                onChange={e => setSelectedCityBranchId(e.target.value)}
                className="h-9 w-52 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                {activeCityBranches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6 items-start">
        {/* Left Form Panel */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-800">
                <Plus className="h-4 w-4 text-blue-600" /> NEW TRANSACTION ENTRY
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              {/* Section 1: Item & Source Details */}
              <div className="space-y-3">
                <div className="border-l-2 border-blue-500 pl-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. Goods & Vendor Details</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Goods Selection *</label>
                    <select
                      value={goodsId}
                      onChange={e => setGoodsId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">Select Goods Master...</option>
                      {goodsList.map(g => (
                        <option key={g.id} value={g.id}>{g.goodsName || g.goods_name}</option>
                      ))}
                      <option value="custom">-- Custom/Enter Manually --</option>
                    </select>
                  </div>

                  {goodsId === "custom" && (
                    <div className="animate-in slide-in-from-top duration-300">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custom Goods Name *</label>
                      <input
                        value={customGoodsName}
                        onChange={e => setCustomGoodsName(e.target.value)}
                        placeholder="Enter Item Name"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplier/Vendor Name</label>
                    <input
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      placeholder="e.g. Local Market"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Quantities & Packing */}
              <div className="space-y-3 pt-2">
                <div className="border-l-2 border-emerald-500 pl-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2. Quantity & Packing Metrics</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Packing Type</label>
                    <select
                      value={quantityName}
                      onChange={e => setQuantityName(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                    >
                      {QUANTITY_NAMES.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>

                  {quantityName === "Custom" && (
                    <div className="animate-in slide-in-from-top duration-300">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custom Unit Type *</label>
                      <input
                        value={customQuantityName}
                        onChange={e => setCustomQuantityName(e.target.value)}
                        placeholder="e.g. Bundles"
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Packages Count *</label>
                    <input
                      type="number"
                      value={quantityCount}
                      onChange={e => setQuantityCount(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight Per Pack (KG)</label>
                    <input
                      type="number"
                      value={weightPerPkg}
                      onChange={e => setWeightPerPkg(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Manual Gross Weight (KG)</label>
                    <input
                      type="number"
                      value={manualGrossWeight}
                      onChange={e => setManualGrossWeight(e.target.value)}
                      placeholder={`Calc: ${calculatedGrossWeight} kg`}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Physical Deductions & Calcs */}
              <div className="space-y-3 pt-2">
                <div className="border-l-2 border-amber-500 pl-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3. Tare Weight Deductions</h4>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Empty KGs (Tare)</label>
                    <input
                      type="number"
                      value={emptyKgs}
                      onChange={e => setEmptyKgs(e.target.value)}
                      placeholder="Deduct kg"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono text-red-500 font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Net Weight (KG)</label>
                    <input
                      readOnly
                      value={netWeight.toFixed(2)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-mono font-black text-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Divide Size (KG)</label>
                    <input
                      type="number"
                      value={divideKgs}
                      onChange={e => setDivideKgs(e.target.value)}
                      placeholder="Divisor kg"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs font-mono text-slate-700">
                  <span className="flex items-center gap-1.5 font-bold text-slate-500"><Scale className="h-3.5 w-3.5 text-blue-500" /> Calculated Units / Bags:</span>
                  <span className="text-sm font-black text-blue-700">{numbers.toFixed(2)}</span>
                </div>
              </div>

              {/* Section 4: Pricing & Multi-Currency */}
              <div className="space-y-3 pt-2">
                <div className="border-l-2 border-indigo-500 pl-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">4. Rates & Conversions</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate Pricing Type</label>
                    <select
                      value={rateType}
                      onChange={e => setRateType(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="per_kg">Per KG Weight</option>
                      <option value="per_number">Per Bag / Unit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Price Rate *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={purchaseRate}
                      onChange={e => setPurchaseRate(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono font-bold text-emerald-700 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Purchase Currency</label>
                    <select
                      value={purchaseCurrency}
                      onChange={e => setPurchaseCurrency(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-1 text-xs outline-none focus:border-blue-500"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Exchange Rate</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={exchangeRate}
                      onChange={e => setExchangeRate(e.target.value)}
                      placeholder="1.0"
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Final Currency</label>
                    <input
                      readOnly
                      value={localCurrency}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-mono font-bold text-slate-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Totals Panel */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 space-y-2 mt-4 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Purchase Currency Cost:</span>
                  <span className="font-mono font-black text-white text-sm">
                    {purchaseCurrency} {purchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1">
                    <ArrowLeftRight className="h-3 w-3 text-emerald-400" /> Local/Final Cost:
                  </span>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    {localCurrency} {finalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Submit Action */}
              <Button
                type="submit"
                disabled={saving}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Recording Purchase...</>
                ) : (
                  <><Check className="h-4 w-4" /> Save Local Purchase Entry</>
                )}
              </Button>

            </CardContent>
          </Card>
        </form>

        {/* Right Dashboard panel */}
        <div className="space-y-6">
          {/* Summary Widgets Row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryBox label="Gross weight" value={`${stats.totalGross.toLocaleString()} kg`} color="text-slate-700" />
            <SummaryBox label="Net weight" value={`${stats.totalNet.toLocaleString()} kg`} color="text-blue-600" />
            <SummaryBox label="Calculated Bags" value={stats.totalBags.toFixed(1)} color="text-amber-600" />
            <SummaryBox label="Total Cost" value={`${localCurrency} ${stats.totalCostLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="text-emerald-600" />
          </div>

          {/* Registry History List */}
          <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <Coins className="h-4 w-4 text-blue-600 animate-bounce" /> TRANSACTIONS REGISTRY HISTORY
              </CardTitle>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item, vendor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 w-48 sm:w-60 rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-slate-500">Date</th>
                      <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-slate-500">Goods Name</th>
                      <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-slate-500">Supplier</th>
                      <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-slate-500 text-right">Packages</th>
                      <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-slate-500 text-right">Net Wt (kg)</th>
                      <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-slate-500 text-right">Bags</th>
                      <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-slate-500 text-right">Final Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-mono">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-300 mb-2" />
                          Loading registry database records...
                        </td>
                      </tr>
                    ) : filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-sans">
                          <Package className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                          <p className="font-bold text-slate-700">No registry records found</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Please check filter or record a new transaction.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-5 py-3 font-mono text-[10px] text-slate-500">
                            {new Date(row.createdAt).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-800">
                            {row.goodsName}
                          </td>
                          <td className="px-5 py-3 font-mono font-medium text-slate-600">
                            {row.supplierName || "-"}
                          </td>
                          <td className="px-5 py-3 font-mono font-bold text-slate-700 text-right">
                            {Number(row.quantityKgs || 0).toLocaleString()} {row.quantityName || "Bags"}
                          </td>
                          <td className="px-5 py-3 font-mono text-blue-600 font-bold text-right">
                            {Number(row.netWeight || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3 font-mono text-amber-600 font-bold text-right">
                            {Number(row.numbers || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                          <td className="px-5 py-3 font-mono text-emerald-600 font-black text-right">
                            {row.localCurrency} {Number(row.finalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition-shadow duration-300">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-base font-black font-mono tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
