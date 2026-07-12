"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Download, FileText, Link2, MoreVertical, Plus, Printer, RefreshCcw, Search, Ship, Building2, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewportActionMenu } from "@/components/ui/viewport-action-menu";
import { Card, CardContent } from "@/components/ui/card";
import { ErpPageActions } from "@/components/layout/erp-page-actions";
import { cn } from "@/lib/utils";

type LoadingStatus = "draft" | "pending" | "loaded" | "received" | "cancelled";


function CustomDropdown({ record, onLoadDetails }: { record: LoadingRecord, onLoadDetails: (r: LoadingRecord) => void }) {
  return (
    <ViewportActionMenu
      ariaLabel="Loading record actions"
      buttonClassName="grid h-7 w-7 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition"
      trigger={<MoreVertical className="h-3.5 w-3.5" />}
    >
      {(close) => (
        <div className="py-1">
          <button className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => close()}>Edit Record</button>
          <button className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { close(); onLoadDetails(record); }}>Load Details</button>
          <button className="flex w-full items-center px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 transition" onClick={() => { close(); window.open(`/dashboard/purchase/purchase-loading-records/${record.id}`, "_self"); }}>View Full Details</button>
        </div>
      )}
    </ViewportActionMenu>
  );
}

function calcLoadingFinance(h: LoadingRecord, poRow: any = {}, form: any = {}) {
  const qty = Number(h.report_payload?.loadedQuantity || h.report_payload?.loadingQuantity || h.loadedQuantity || 0);
  const poData = poRow?.form_data || {};
  const goods = poData.goodsEntries || [];
  
  const totalQuantity = Number(
    poData.totals?.totalQuantity ||
    goods.reduce((acc: number, item: any) => acc + Number(item.qtyNo || item.quantity || 0), 0) ||
    form.quantity ||
    0
  );
  
  const poTotal = Number(poRow?.order_total || poData.totals?.grandFinal || form.totalAmount || 0);
  
  let amountUSD = totalQuantity > 0 ? (qty / totalQuantity) * poTotal : poTotal;
  
  const exRate = Number(h.report_payload?.exchangeRatePKR || form.exchangeRate || poRow?.exchange_rate || 1);
  const amountPKR = amountUSD * exRate;
  const currency = h.report_payload?.pricingCurrency || form.currency || poRow?.currency_code || "USD";
  
  return { amountUSD, exRate, amountPKR, currency };
}

function LoadDetailsModal({ record, onClose, onSaved }: { record: LoadingRecord; onClose: () => void; onSaved?: () => void }) {
  const poData = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders)?.form_data || {};
  const form = poData.form || {};
  const goods = poData.goodsEntries || [];

  const branchLabel = `${record.country_branches?.name || form.branchName || "-"}${record.country_branches?.code ? ` (${record.country_branches.code})` : ""}`;
  const countryLabel = `${record.countries?.name || form.branchCountry || "-"}${record.countries?.iso2 ? ` (${record.countries.iso2})` : ""}`;

  const adminLabel = form.userName || form.userId || "Admin";

  const loadingCountry = form.loadingCountry || form.originCountry || "-";
  const loadingPort = record.loading_location || form.loadingPort || form.exitPort || "-";
  const loadingDate = record.loaded_at ? new Date(record.loaded_at).toLocaleDateString() : (form.loadingDate || "-");

  const receivingCountry = form.receivedCountry || form.destinationCountry || "-";
  const receivingPort = record.receiving_location || form.receivedPort || form.destinationPort || "-";
  const receivingDate = form.receivedDate || form.arrivalDate || "-";
  const workflow = poData.workflow || {};
  const reportPayload = record.report_payload || {};
  const totalQuantity = Number(
    workflow.totalQuantity ||
      poData.totals?.totalQuantity ||
      goods.reduce((acc: number, item: any) => acc + Number(item.qtyNo || item.quantity || 0), 0) ||
      form.quantity ||
      0
  );
  const savedLoadedQuantity = Number(
    workflow.loadedQuantity ||
      reportPayload.runningLoadedQuantity ||
      reportPayload.loadedQuantity ||
      (record.loading_status === "loaded" ? totalQuantity : 0) ||
      0
  );
  const [showNewLoading, setShowNewLoading] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [editingLoadingId, setEditingLoadingId] = useState<string | null>(null);
  const [containerNumberInput, setContainerNumberInput] = useState("");
  const [sealNumberInput, setSealNumberInput] = useState("");

  async function handleDeleteHistory(h: LoadingRecord) {
    if (!confirm("Are you sure you want to delete this loading record?")) return;
    try {
      setSavingNewLoading(true);
      const res = await fetch(`/api/erp/purchases/loading-records/${h.id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) throw new Error(payload.error?.message || payload.error || "Failed to delete.");
      setLoadingMessage("Record deleted.");
      window.dispatchEvent(new CustomEvent("erp:purchase-loading-saved"));
    } catch (e: any) {
      alert(e.message || "Failed to delete record.");
    } finally {
      setSavingNewLoading(false);
    }
  }

  function handleEditHistory(h: LoadingRecord) {
    setShowNewLoading(true);
    setFormStep(1);
    setEditingLoadingId(h.id);
    setBlNumber(h.report_payload?.blNumber || "");
    setContainerCount(String(h.report_payload?.containerCount || h.loadedContainers || 1));
    setLoadingCountryState(h.report_payload?.loadingCountry || "");
    setLoadingPortState(h.report_payload?.loadingPort || h.loading_location || "");
    setNewLoadingDate(h.report_payload?.loadingDate || (h.loaded_at ? h.loaded_at.slice(0, 10) : new Date().toISOString().slice(0, 10)));
    setReceivingCountryState(h.report_payload?.receivingCountry || "");
    setReceivingPortState(h.report_payload?.receivingPort || h.receiving_location || "");
    setReceivingDateState(h.report_payload?.receivingDate || "");
    setVesselName(h.report_payload?.vesselName || h.carrier_name || "");
    setNewLoadingQuantity(String(h.report_payload?.loadedQuantity || h.loadedQuantity || ""));
    setNewLoadingNote(h.remarks || "");
    setOriginCountry(h.report_payload?.originCountry || "India");
    setGoodsName(h.report_payload?.goodsName || "");
    setHsCode(h.report_payload?.hsCode || "0000");
    setAllotName(h.report_payload?.allotName || "ALT-4733");
    setBrand(h.report_payload?.brand || "");
    setSizeSpec(h.report_payload?.sizeSpec || "");
    setQtyName(h.report_payload?.qtyName || "BAGS");
    setQuantityNo(h.report_payload?.quantityNo || "");
    setOneQtyKgs(h.report_payload?.oneQtyKgs || "");
    setOneEmptyKgs(h.report_payload?.oneEmptyKgs || "");
    setDivideType(h.report_payload?.divideType || "D/KGs");
    setDivideWeightValue(h.report_payload?.divideWeightValue || "1");
    setPriceType(h.report_payload?.priceType || "P/KGs");
    setPriceRateC1(h.report_payload?.priceRateC1 || "");
    setQualityReportRef(h.report_payload?.qualityReportRef || "Passed");
    setPricingCurrency(h.report_payload?.pricingCurrency || "USD");
    setExchangeRatePKR(h.report_payload?.exchangeRatePKR || "287");
    setContainerNumberInput(h.container_number || h.report_payload?.containerNumber || "");
    setSealNumberInput(h.report_payload?.sealNumber || "");
  }

  const [newLoadingQuantity, setNewLoadingQuantity] = useState("");
  const [newLoadingDate, setNewLoadingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newLoadingNote, setNewLoadingNote] = useState("");
  const [originCountry, setOriginCountry] = useState("India");
  const [goodsName, setGoodsName] = useState("");
  const [hsCode, setHsCode] = useState("0000");
  const [allotName, setAllotName] = useState("ALT-4733");
  const [brand, setBrand] = useState("");
  const [sizeSpec, setSizeSpec] = useState("");
  const [qtyName, setQtyName] = useState("BAGS");
  const [quantityNo, setQuantityNo] = useState("");
  const [oneQtyKgs, setOneQtyKgs] = useState("");
  const [oneEmptyKgs, setOneEmptyKgs] = useState("");
  const [divideType, setDivideType] = useState("D/KGs");
  const [divideWeightValue, setDivideWeightValue] = useState("1");
  const [priceType, setPriceType] = useState("P/KGs");
  const [priceRateC1, setPriceRateC1] = useState("");
  const [qualityReportRef, setQualityReportRef] = useState("Passed");
  const [pricingCurrency, setPricingCurrency] = useState("USD");
  const [exchangeRatePKR, setExchangeRatePKR] = useState("287");
  const [blNumber, setBlNumber] = useState("");
  const [containerCount, setContainerCount] = useState("1");
  const [loadingCountryState, setLoadingCountryState] = useState(loadingCountry !== "-" ? loadingCountry : "");
  const [loadingPortState, setLoadingPortState] = useState(loadingPort !== "-" ? loadingPort : "");
  const [receivingCountryState, setReceivingCountryState] = useState(receivingCountry !== "-" ? receivingCountry : "");
  const [receivingPortState, setReceivingPortState] = useState(receivingPort !== "-" ? receivingPort : "");
  const [receivingDateState, setReceivingDateState] = useState(form.receivedDate || form.arrivalDate || "");
  const [vesselName, setVesselName] = useState("");
  const [savingNewLoading, setSavingNewLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [history, setHistory] = useState<LoadingRecord[]>([]);
  useEffect(() => {
    async function fetchHistory() {
      if (!record.purchase_order_id) return;
      try {
        const res = await fetch(`/api/erp/purchases/loading-records?limit=150`);
        const data = await res.json();
        if (data.ok && data.data?.records) {
           const matches = data.data.records.filter((r: LoadingRecord) => 
               r.purchase_order_id === record.purchase_order_id && 
               r.loading_status === "loaded"
           );
           setHistory(matches);
        }
      } catch (e) {}
    }
    fetchHistory();
  }, [record.purchase_order_id, savingNewLoading]);

  const itemLoadBalances = useMemo(() => {
    const balances: Record<string, { loaded: number }> = {};
    if (Array.isArray(history)) {
      history.forEach(h => {
        const gName = h.report_payload?.goodsName || h.report_payload?.item || "";
        const qty = Number(h.report_payload?.quantityNo || h.loadedQuantity || 0);
        if (gName) {
          if (!balances[gName]) balances[gName] = { loaded: 0 };
          balances[gName].loaded += qty;
        }
      });
    }
    return balances;
  }, [history]);

  const newQuantity = Math.max(0, Number(newLoadingQuantity || 0));
  const previewLoadedQuantity = Math.min(totalQuantity || savedLoadedQuantity + newQuantity, savedLoadedQuantity + newQuantity);
  const previewBalanceQuantity = Math.max(0, totalQuantity - previewLoadedQuantity);

  function downloadLoadDetails(kind: "json" | "pdf") {
    if (kind === "pdf") {
      window.print();
      return;
    }
    const payload = {
      loadingRecord: record.loading_record_no,
      purchaseOrder: record.purchase_order_no,
      branch: branchLabel,
      country: countryLabel,
      totalQuantity,
      loadedQuantity: savedLoadedQuantity,
      balanceQuantity: Math.max(0, totalQuantity - savedLoadedQuantity),
      goods,
      generatedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${record.loading_record_no || "loading-record"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveNewLoading() {
    if (!newQuantity) {
      setLoadingMessage("Enter loading quantity first.");
      return;
    }
    setSavingNewLoading(true);
    setLoadingMessage("");
    try {
      const targetId = editingLoadingId || (record.loading_status === "pending" ? record.id : null);
      const isPatch = !!targetId;
      
      const response = await fetch(isPatch ? `/api/erp/purchases/loading-records/${targetId}` : "/api/erp/purchases/loading-records", {
        method: isPatch ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryId: record.country_id ?? null,
          countryBranchId: record.country_branch_id ?? null,
          cityBranchId: record.city_branch_id ?? null,
          purchaseOrderId: record.purchase_order_id ?? null,
          purchaseOrderNo: record.purchase_order_no ?? null,
          containerNumber: record.container_number || `LOAD-${Date.now()}`,
          containerType: record.container_type || "40 FT",
          loadingStatus: "loaded",
          loadedAt: new Date(newLoadingDate).toISOString(),
          loadingLocation: loadingPortState || record.loading_location || loadingPort,
          receivingLocation: receivingPortState || record.receiving_location || receivingPort,
          shipmentStatus: previewBalanceQuantity > 0 ? "partial_loaded" : "fully_loaded",
          carrierName: vesselName || record.carrier_name || null,
          remarks: newLoadingNote || record.remarks || null,
          loadedContainers: Number(containerCount) || 1,
          loadedQuantity: newQuantity,
          reportPayload: {
            sourceRecordId: record.id,
            sourceLoadingRecordNo: record.loading_record_no,
            loadedQuantity: newQuantity,
            loadingQuantity: newQuantity,
            runningLoadedQuantity: savedLoadedQuantity + newQuantity,
            balanceQuantity: Math.max(0, totalQuantity - (savedLoadedQuantity + newQuantity)),
            blNumber,
            containerCount: Number(containerCount),
            loadingCountry: loadingCountryState,
            loadingPort: loadingPortState,
            loadingDate: newLoadingDate,
            receivingCountry: receivingCountryState,
            receivingPort: receivingPortState,
            receivingDate: receivingDateState,
            vesselName,
            action: "new_loading_entry",
            originCountry, goodsName, hsCode, allotName, brand, sizeSpec,
            qtyName, quantityNo, oneQtyKgs, oneEmptyKgs, divideType, divideWeightValue,
            priceType, priceRateC1, qualityReportRef, pricingCurrency, exchangeRatePKR
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || payload.error || "Loading entry was not saved.");
      setLoadingMessage(`Saved: ${payload.data?.loadingRecordNo || "new loading entry"}`);
      setEditingLoadingId(null);
      setFormStep(1);
      setNewLoadingQuantity("");
      setNewLoadingNote("");
      setBlNumber("");
      setContainerCount("1");
      setLoadingCountryState(loadingCountry !== "-" ? loadingCountry : "");
      setLoadingPortState(loadingPort !== "-" ? loadingPort : "");
      setReceivingCountryState(receivingCountry !== "-" ? receivingCountry : "");
      setReceivingPortState(receivingPort !== "-" ? receivingPort : "");
      setReceivingDateState(form.receivedDate || form.arrivalDate || "");
      setVesselName("");
      setOriginCountry("India");
      setGoodsName("");
      setHsCode("0000");
      setAllotName("ALT-4733");
      setBrand("");
      setSizeSpec("");
      setQtyName("BAGS");
      setQuantityNo("");
      setOneQtyKgs("");
      setOneEmptyKgs("");
      setDivideType("D/KGs");
      setDivideWeightValue("1");
      setPriceType("P/KGs");
      setPriceRateC1("");
      setQualityReportRef("Passed");
      setPricingCurrency("USD");
      setExchangeRatePKR("287");
      window.dispatchEvent(new CustomEvent("erp:purchase-loading-saved"));
      onSaved?.();
    } catch (error) {
      setLoadingMessage(error instanceof Error ? error.message : "Loading entry was not saved.");
    } finally {
      setSavingNewLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">Load Details Form</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Manage loading quantity, checking, brand note, PDF and download actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => {
            if (!showNewLoading) {
               setEditingLoadingId(null);
               setFormStep(1);
               setLoadingCountryState(loadingCountry !== "-" ? loadingCountry : "");
               setLoadingPortState(loadingPort !== "-" ? loadingPort : "");
               setReceivingCountryState(receivingCountry !== "-" ? receivingCountry : "");
               setReceivingPortState(receivingPort !== "-" ? receivingPort : "");
               setReceivingDateState(form.receivedDate || form.arrivalDate || "");
               setNewLoadingDate(form.loadingDate || new Date().toISOString().slice(0, 10));
               setBlNumber("");
               setContainerCount("1");
               setVesselName("");
               setOriginCountry("India");
               setGoodsName("");
               setHsCode("0000");
               setAllotName("ALT-4733");
               setBrand("");
               setSizeSpec("");
               setQtyName("BAGS");
               setQuantityNo("");
               setOneQtyKgs("");
               setOneEmptyKgs("");
               setDivideType("D/KGs");
               setDivideWeightValue("1");
               setPriceType("P/KGs");
               setPriceRateC1("");
               setQualityReportRef("Passed");
               setPricingCurrency("USD");
               setExchangeRatePKR("287");
               setNewLoadingQuantity("");
               setNewLoadingNote("");
            }
            setShowNewLoading((value) => !value);
          }} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Loading
          </Button>
          <ViewportActionMenu
            ariaLabel="Load detail actions"
            buttonClassName="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            trigger={<MoreVertical className="h-4 w-4" />}
          >
            {(close) => (
              <div className="py-1">
                <button className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => { close(); setLoadingMessage("Brand view selected for this loading report."); }}>
                  <Ship className="h-3.5 w-3.5 text-emerald-600" /> Brand
                </button>
                <button className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => { close(); setLoadingMessage("Checking view selected. Review quantity, dates and loading balance before saving."); }}>
                  <FileText className="h-3.5 w-3.5 text-blue-600" /> Checking
                </button>
                <button className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => { close(); downloadLoadDetails("json"); }}>
                  <Download className="h-3.5 w-3.5 text-indigo-600" /> Download
                </button>
                <button className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => { close(); downloadLoadDetails("pdf"); }}>
                  <Printer className="h-3.5 w-3.5 text-rose-600" /> PDF Download
                </button>
              </div>
            )}
          </ViewportActionMenu>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className={cn("grid gap-6 items-start", showNewLoading ? "grid-cols-1 lg:grid-cols-[400px_1fr]" : "grid-cols-1")}>
            {showNewLoading && (
              <div className="flex flex-col gap-4 animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="mb-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-100">
                        {formStep === 1 ? "New Loading (Step 1 of 2)" : "New Loading (Step 2 of 2)"}
                      </h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-500/30">Live</span>
                    </div>
                    <p className="text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-200/80">
                      {formStep === 1 ? "Enter shipping and routing details." : "Enter goods, pricing and container details."}
                    </p>
                  </div>

                  {formStep === 1 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 pr-1 pb-2">
                        <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 col-span-2">
                          B/L Number
                      <input
                        value={blNumber}
                        onChange={(e) => setBlNumber(e.target.value)}
                        placeholder="e.g. BL12345"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 col-span-2">
                      Containers Qty
                      <input
                        type="number"
                        min="1"
                        value={containerCount}
                        onChange={(e) => setContainerCount(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>

                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Loading Country
                      <input
                        value={loadingCountryState}
                        onChange={(e) => setLoadingCountryState(e.target.value)}
                        placeholder="e.g. Pakistan"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Loading Port
                      <input
                        value={loadingPortState}
                        onChange={(e) => setLoadingPortState(e.target.value)}
                        placeholder="e.g. Karachi"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>

                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Receiving Country
                      <input
                        value={receivingCountryState}
                        onChange={(e) => setReceivingCountryState(e.target.value)}
                        placeholder="e.g. UAE"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Receiving Port
                      <input
                        value={receivingPortState}
                        onChange={(e) => setReceivingPortState(e.target.value)}
                        placeholder="e.g. Jebel Ali"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>
                    
                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Loading Date
                      <input
                        type="date"
                        value={newLoadingDate}
                        onChange={(e) => setNewLoadingDate(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                      Receiving Date
                      <input
                        type="date"
                        value={receivingDateState}
                        onChange={(e) => setReceivingDateState(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>

                    <label className="space-y-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 col-span-2">
                      Vessel Name
                      <input
                        value={vesselName}
                        onChange={(e) => setVesselName(e.target.value)}
                        placeholder="e.g. MSC Alina"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </label>

                      </div>
                      <div className="mt-5">
                        <Button
                          type="button"
                          onClick={() => setFormStep(2)}
                          className="w-full h-10 rounded-lg bg-emerald-600 px-4 text-[11px] font-black uppercase tracking-widest text-white hover:bg-emerald-700"
                        >
                          Next Step
                        </Button>
                      </div>
                    </>
                  ) : formStep === 2 ? (
                    <div className="flex flex-col h-full pr-1 pt-2 pb-4">
                      <div className="mb-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">GOODS ENTRY</h4>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 mb-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">NET KGS:</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">0.00</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 col-span-2">
                          Origin Country
                          <input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="India" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                        
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 col-span-2">
                          Goods Name*
                          <select
                            value={goodsName}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              setGoodsName(selectedName);
                              const good = goods.find((g: any) => (g.itemName || g.goodsName || g.item) === selectedName);
                              if (good) {
                                if (good.hsCode) setHsCode(good.hsCode);
                                if (good.brandName || good.brand) setBrand(good.brandName || good.brand);
                                if (good.originCountry || good.origin) setOriginCountry(good.originCountry || good.origin);
                                if (good.qtyName || good.unit) setQtyName(good.qtyName || good.unit);
                                if (good.sizeSpec || good.size) setSizeSpec(good.sizeSpec || good.size);
                                // Quantity No is explicitly left empty for manual user entry as requested
                                if (good.qtyKgs) setOneQtyKgs(String(good.qtyKgs));
                                if (good.emptyKgs) setOneEmptyKgs(String(good.emptyKgs));
                                if (good.divideType) setDivideType(good.divideType);
                                if (good.divideWeightValue) setDivideWeightValue(String(good.divideWeightValue));
                                if (good.priceType) setPriceType(good.priceType);
                                if (good.coursePrice) setPriceRateC1(String(good.coursePrice));
                              }
                            }}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            <option value="">Select Goods</option>
                            {goods.map((g: any, i: number) => {
                              const name = g.itemName || g.goodsName || g.item;
                              if (!name) return null;
                              return <option key={i} value={name}>{name}</option>;
                            })}
                          </select>
                        </label>

                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          HS Code
                          <input value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="0000" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                        
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Allot Name / ID
                          <input value={allotName} onChange={(e) => setAllotName(e.target.value)} placeholder="ALT-4733" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>

                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Brand
                          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Select Brand" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                        
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Size Specification
                          <input value={sizeSpec} onChange={(e) => setSizeSpec(e.target.value)} placeholder="Select Size" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>

                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Qty Name
                          <input value={qtyName} onChange={(e) => setQtyName(e.target.value)} placeholder="BAGS" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                        
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Quantity No *
                          <input value={quantityNo} onChange={(e) => {
                            setQuantityNo(e.target.value);
                            setNewLoadingQuantity(e.target.value);
                          }} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>

                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          1 Qty KGS
                          <input value={oneQtyKgs} onChange={(e) => setOneQtyKgs(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                        
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          1 Empty KGS
                          <input value={oneEmptyKgs} onChange={(e) => setOneEmptyKgs(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>

                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Divide Type
                          <input value={divideType} onChange={(e) => setDivideType(e.target.value)} placeholder="D/KGs" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                        
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Divide Weight / Value
                          <input value={divideWeightValue} onChange={(e) => setDivideWeightValue(e.target.value)} placeholder="1" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>

                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Price Type
                          <input value={priceType} onChange={(e) => setPriceType(e.target.value)} placeholder="P/KGs" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                        
                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Price Rate (C1)
                          <input value={priceRateC1} onChange={(e) => setPriceRateC1(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>

                        <label className="space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 col-span-2">
                          Quality Report Reference
                          <input value={qualityReportRef} onChange={(e) => setQualityReportRef(e.target.value)} placeholder="Passed" className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                        </label>
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 mb-6 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400 mb-3">PURCHASE CURRENCY & CONVERSION</h4>
                        
                        <div className="flex flex-col gap-3">
                          <label className="space-y-1 text-[10px] font-bold text-teal-700 dark:text-teal-500">
                            Pricing Currency
                            <input value={pricingCurrency} onChange={(e) => setPricingCurrency(e.target.value)} placeholder="USD" className="h-9 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200" />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-teal-700 dark:text-teal-500">
                            Exchange Rate to PKR
                            <input value={exchangeRatePKR} onChange={(e) => setExchangeRatePKR(e.target.value)} placeholder="287" className="h-9 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200" />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-teal-700 dark:text-teal-500">
                            Container Number *
                            <input value={containerNumberInput} onChange={(e) => setContainerNumberInput(e.target.value)} placeholder="e.g. MSCU1234567" className="h-9 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200" />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-teal-700 dark:text-teal-500">
                            Seal Number *
                            <input value={sealNumberInput} onChange={(e) => setSealNumberInput(e.target.value)} placeholder="e.g. SL998877" className="h-9 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200" />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-teal-700 dark:text-teal-500">
                            Loading Note
                            <input value={newLoadingNote} onChange={(e) => setNewLoadingNote(e.target.value)} placeholder="e.g. Checking / brand remarks" className="h-9 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-200" />
                          </label>
                        </div>
                      </div>

                      {/* PO Items Status Summary Table */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-4 dark:border-slate-800 dark:bg-slate-900/30">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">PO ITEMS STATUS SUMMARY</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[9px] border-collapse bg-white dark:bg-slate-950 rounded-lg overflow-hidden border dark:border-slate-850">
                            <thead>
                              <tr className="border-b text-slate-400 font-bold uppercase tracking-wider bg-slate-50/80 dark:bg-slate-900/50">
                                <th className="px-2 py-1.5">Item</th>
                                <th className="px-2 py-1.5 text-right">PO Qty</th>
                                <th className="px-2 py-1.5 text-right">Loaded</th>
                                <th className="px-2 py-1.5 text-right">Balance</th>
                                <th className="px-2 py-1.5 text-right">Rate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {goods.map((g: any, gIdx: number) => {
                                const name = g.goodsName || g.item || "-";
                                const poQty = Number(g.qtyNo || g.quantity || 0);
                                const loaded = itemLoadBalances[name]?.loaded || 0;
                                const bal = Math.max(0, poQty - loaded);
                                const rate = Number(g.coursePrice || 0);
                                return (
                                  <tr key={gIdx} className="text-slate-655 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition">
                                    <td className="px-2 py-2 font-bold uppercase truncate max-w-[80px]" title={name}>{name}</td>
                                    <td className="px-2 py-2 text-right font-mono">{poQty.toLocaleString()}</td>
                                    <td className="px-2 py-2 text-right font-mono text-emerald-600 font-bold">{loaded.toLocaleString()}</td>
                                    <td className={cn("px-2 py-2 text-right font-mono font-bold", bal > 0 ? "text-rose-600" : "text-emerald-650")}>{bal.toLocaleString()}</td>
                                    <td className="px-2 py-2 text-right font-mono">{rate.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setFormStep(1)} className="rounded-full h-9 px-4 text-xs font-bold">
                          Back
                        </Button>
                        <Button type="button" onClick={() => void saveNewLoading()} disabled={savingNewLoading || !newQuantity || !containerNumberInput} className="rounded-full h-9 bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition active:scale-[0.98] disabled:opacity-50">
                          {savingNewLoading ? "Saving..." : "Save Loading"}
                        </Button>
                      </div>

                    </div>
                  ) : null}
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-6 min-w-0">
              <div className={cn("grid gap-4", showNewLoading ? "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4" : "grid-cols-1 lg:grid-cols-4")}>
            {/* BRANCH & BILL DETAILS (Combined) */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className="font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 text-[10px]">Branch & Bill Details</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Branch Name</div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{branchLabel}</div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">User Admin:</span>
                    <span className="font-bold text-emerald-600 uppercase">{adminLabel}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate pl-2" title={countryLabel}>{countryLabel}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Booking Date:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(record.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-amber-600 uppercase text-[10px]">{record.loading_status || "PENDING"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">System Serial:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{record.purchase_order_no || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Branch Serial:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{record.loading_record_no}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Loading Mode:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">By Sea</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Origin Country:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{loadingCountry}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PURCHASE ACCOUNT DETAILS */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <h3 className="font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 text-[10px]">Purchase Account Details</h3>
              </div>
              <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Account Code:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{form.purchaseAccountNumber || form.purchaseAccountNo || "-"}</span>
                  </div>
                  <div className="pt-2 pb-1">
                    <div className="text-[10px] text-slate-400 mb-0.5">Account Name:</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-snug">{form.purchaseAccountName || "مال خرید اکاؤنٹ"}</div>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Branch:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">PAKPKB</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Currency:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{form.currency || "PKR"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Company:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate pl-4" title={form.purchaseAccountName}>{form.purchaseAccountName || "NAJEEB AND COMPANY"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">KIND</div>
                       <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">INCOME</div>
                    </div>
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">TYPE</div>
                       <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Sub-Acct</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800">
                     <h4 className="mb-2 text-[9px] font-bold uppercase tracking-widest text-blue-500">SERIALS & REF</h4>
                     <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[10px]">
                       <div>
                         <div className="text-slate-400">Acct S/N</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">6</div>
                       </div>
                       <div>
                         <div className="text-slate-400">Country S/N</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">PAK-000006</div>
                       </div>
                       <div>
                         <div className="text-slate-400">Branch S/N</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">PAK-CHM-000002</div>
                       </div>
                       <div>
                         <div className="text-slate-400">Manual Ref</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">00124</div>
                       </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">OPENING BAL</div>
                       <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">₨ 0</div>
                    </div>
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">CURRENT BAL</div>
                       <div className="text-[11px] font-bold text-emerald-600">₨ 0</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 text-[10px] font-mono text-slate-500">
                    <div>MOB: +92 32283832844</div>
                    <div>WA: +923228383284</div>
                  </div>
              </div>
            </div>

            {/* SALES ACCOUNT (CR) */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <h3 className="font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 text-[10px]">Sales Account (CR)</h3>
              </div>
              <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Account Code:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{form.salesAccountNumber || form.salesAccountNo || "-"}</span>
                  </div>
                  <div className="pt-2 pb-1">
                    <div className="text-[10px] text-slate-400 mb-0.5">Account Name:</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-snug">{form.salesAccountName || "عزت اللہ تجری کھاتہ"}</div>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Branch:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">PAK-PKBA-001</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Currency:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{form.currency || "PKR"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Company:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate pl-4" title={form.salesAccountName}>{form.salesAccountName || "ABC Trading LLC"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">KIND</div>
                       <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">ASSET</div>
                    </div>
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">TYPE</div>
                       <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Sub-Acct</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800">
                     <h4 className="mb-2 text-[9px] font-bold uppercase tracking-widest text-blue-500">SERIALS & REF</h4>
                     <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[10px]">
                       <div>
                         <div className="text-slate-400">Acct S/N</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">11</div>
                       </div>
                       <div>
                         <div className="text-slate-400">Country S/N</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">PAK-000011</div>
                       </div>
                       <div>
                         <div className="text-slate-400">Branch S/N</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">PAK-CHM-000005</div>
                       </div>
                       <div>
                         <div className="text-slate-400">Manual Ref</div>
                         <div className="font-bold text-slate-700 dark:text-slate-300">C450</div>
                       </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">OPENING BAL</div>
                       <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">₨ 0</div>
                    </div>
                    <div>
                       <div className="text-[9px] uppercase tracking-widest text-slate-400">CURRENT BAL</div>
                       <div className="text-[11px] font-bold text-emerald-600">₨ 0</div>
                    </div>
                  </div>
              </div>
            </div>

            {/* LOADING REPORT */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Ship className="h-4 w-4" />
                </div>
                <h3 className="font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 text-[10px]">Loading Report</h3>
              </div>
              <div className="space-y-3 pt-1">
                 <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Total Quantity</span>
                    <span className="text-xl font-black font-mono text-slate-700 dark:text-slate-200">{totalQuantity.toLocaleString()}</span>
                 </div>
                 <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Loaded</span>
                    <span className="text-xl font-black font-mono text-emerald-600">{previewLoadedQuantity.toLocaleString()}</span>
                 </div>
                 <div className="bg-blue-50/60 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 shadow-sm flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600">New Loading</span>
                    <span className="text-xl font-black font-mono text-blue-600">{newQuantity.toLocaleString()}</span>
                 </div>
                 <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-lg border border-rose-100 dark:border-rose-900/30 shadow-sm flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-rose-600">Balance</span>
                    <span className="text-xl font-black font-mono text-rose-600">{previewBalanceQuantity.toLocaleString()}</span>
                 </div>
                 {previewBalanceQuantity > 0 && (
                   <Button
                     type="button"
                     onClick={() => {
                       const poRow = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders) || {};
                       const finance = calcLoadingFinance(record, poRow, form);
                       const loadedQty = record.report_payload?.loadedQuantity || record.loadedQuantity || 0;
                       const grossWeight = record.report_payload?.grossWeight || 0;
                       const netWeight = record.report_payload?.netWeight || 0;
                       const priceRate = record.report_payload?.priceRateC1 || 0;
                       const queryParams = new URLSearchParams({
                         purchaseOrderNo: record.purchase_order_no || "",
                         fromLoading: "true",
                         loadingRecordId: record.id,
                         loadedQty: String(loadedQty),
                         grossWeight: String(grossWeight),
                         netWeight: String(netWeight),
                         priceRate: String(priceRate),
                         amount: String(Math.max(0, (finance.amountUSD || 0) - ((totalQuantity > 0 ? (Number(record.report_payload?.loadedQuantity || record.loadedQuantity || 0) / totalQuantity) : 1) * Number(poRow.advance_paid || form.advanceAmount || 0)))),
                         exchangeRate: String(finance.exRate || 1),
                         currency: finance.currency || "USD",
                         amountPKR: String(Math.max(0, (finance.amountUSD || 0) - ((totalQuantity > 0 ? (Number(record.report_payload?.loadedQuantity || record.loadedQuantity || 0) / totalQuantity) : 1) * Number(poRow.advance_paid || form.advanceAmount || 0))) * (finance.exRate || 1))
                       }).toString();
                       window.open(`/dashboard/journal/purchase-order-payment/remaining?${queryParams}`, "_self");
                     }}
                     className="w-full h-10 mt-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
                   >
                     <Link2 className="h-4 w-4" />
                     Transfer Remaining to Journal
                   </Button>
                 )}
                 {loadingMessage ? (
                   <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                     {loadingMessage}
                   </div>
                 ) : null}
              </div>
            </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Goods & Container Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/50 dark:bg-slate-900/20">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 w-10">SR#</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Country</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Loading No</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Purchase Booking No.</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Sales Account</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Purchase Account</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Goods</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Quantity</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Net Weight</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Gross Weight</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Purchase Amount (PKR)</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Exchange Rate</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Advance Amount (PKR)</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Balance Amount (PKR)</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Payment Date</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Loading Country</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Loading Port</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Loading Date</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received Country</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received Port</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received Date</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {goods.length > 0 ? (
                    goods.map((g: any, i: number) => {
                      const gName = g.goodsName || g.item_name || form.itemName || "-";
                      const gDetails = g.brand || g.size || g.item_details || form.itemDetails || "";
                      const nameCombined = gDetails ? `${gName} - ${gDetails}` : gName;
                      const totals = poData.totals || {};
                      const finance = poData.finance || {};
                      
                      const itemPurchaseAmount = Number(g.purchaseAmount || g.amount || g.totalAmount || g.finalAmount) || Number(totals.totalAmount || totals.finalAmount || form.totalAmount || form.finalAmount || 0);
                      const exRate = Number(g.exchangeRate || form.exchangeRate || (poData as any).exchange_rate || 1);
                      const itemFinalAmountPKR = itemPurchaseAmount * exRate;
                      
                      const advAmt = Number(g.advanceAmount || finance.advanceAmount || form.advanceAmount || 0);
                      const advPKR = advAmt * exRate;
                      const balAmt = itemPurchaseAmount - advAmt;
                      const balPKR = balAmt * exRate;
                      const payDate = g.paymentDate || finance.paymentDate || form.paymentDate || form.purchaseDate || "-";

                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="px-6 py-3 font-medium text-slate-400">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{countryLabel}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{record.loading_record_no || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{record.purchase_order_no || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{form.salesAccountName || form.salesAccountNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{form.purchaseAccountName || form.supplierName || "-"}</td>
                          <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{nameCombined}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{g.qtyNo || g.quantity || 0}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{g.netWeight || 0}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{g.grossWeight || 0}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{itemFinalAmountPKR > 0 ? itemFinalAmountPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{exRate > 1 ? exRate.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">{advPKR > 0 ? advPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-rose-600 dark:text-rose-400 text-right">{balPKR !== 0 ? balPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{payDate}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{loadingCountry}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{loadingPort}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{loadingDate}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{receivingCountry}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{receivingPort}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{receivingDate}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">-</td>
                        </tr>
                      );
                    })
                  ) : (() => {
                      const totals = poData.totals || {};
                      const finance = poData.finance || {};
                      
                      const itemPurchaseAmount = Number(totals.totalAmount || totals.finalAmount || form.totalAmount || form.finalAmount || 0);
                      const exRate = Number(form.exchangeRate || (poData as any).exchange_rate || 1);
                      const itemFinalAmountPKR = itemPurchaseAmount * exRate;
                      
                      const advAmt = Number(finance.advanceAmount || form.advanceAmount || 0);
                      const advPKR = advAmt * exRate;
                      const balAmt = itemPurchaseAmount - advAmt;
                      const balPKR = balAmt * exRate;
                      const payDate = finance.paymentDate || form.paymentDate || form.purchaseDate || "-";

                      return (
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="px-6 py-3 font-medium text-slate-400">01</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{countryLabel}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{record.loading_record_no || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{record.purchase_order_no || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{form.salesAccountName || form.salesAccountNumber || "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{form.purchaseAccountName || form.supplierName || "-"}</td>
                          <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">
                            {form.goodsName || form.itemName || "-"} {form.itemDetails ? ` - ${form.itemDetails}` : ""}
                          </td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{form.quantity || 0}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{form.netWeight || 0}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{form.grossWeight || 0}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{itemFinalAmountPKR > 0 ? itemFinalAmountPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{exRate > 1 ? exRate.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">{advPKR > 0 ? advPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-rose-600 dark:text-rose-400 text-right">{balPKR !== 0 ? balPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{payDate}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{loadingCountry}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{loadingPort}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{loadingDate}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{receivingCountry}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{receivingPort}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{receivingDate}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">-</td>
                        </tr>
                      );
                    })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOADING HISTORY TABLE */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Loading History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/50 dark:bg-slate-900/20">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 w-10 text-center">Action</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 w-10">SR#</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">BL Number</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500">Vessel Name</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Load Qty</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Purchase Payment</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Exchange Rate</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Final Payment</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Loading Port</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Load Date</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Receive Port</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Receive Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {history.map((h, i) => {
                      const poRow = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders) || {};
                      const { amountUSD, exRate, amountPKR, currency } = calcLoadingFinance(h, poRow, form);
                      return (
                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="px-6 py-3 text-center flex items-center justify-center gap-1">
                            <button onClick={() => handleEditHistory(h)} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition" title="Edit Entry">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteHistory(h)} disabled={savingNewLoading} className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition disabled:opacity-50" title="Delete Entry">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {h.report_payload?.loadedQuantity && (
                              <button 
                                onClick={() => {
                                  const poRow = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders) || {};
                                  const finance = calcLoadingFinance(h, poRow, form);
                                  const loadedQty = h.report_payload?.loadedQuantity || h.loadedQuantity || 0;
                                  const grossWeight = h.report_payload?.grossWeight || 0;
                                  const netWeight = h.report_payload?.netWeight || 0;
                                  const priceRate = h.report_payload?.priceRateC1 || 0;
                                  
                                  const poAdvanceAmt = Number(poRow.advance_paid || form.advanceAmount || 0);
                                  const loadedAdvanceUSD = totalQuantity > 0 ? (loadedQty / totalQuantity) * poAdvanceAmt : poAdvanceAmt;
                                  const loadedRemainingUSD = Math.max(0, finance.amountUSD - loadedAdvanceUSD);
                                  const loadedRemainingPKR = loadedRemainingUSD * finance.exRate;
                                  
                                  const queryParams = new URLSearchParams({
                                    purchaseOrderNo: record.purchase_order_no || "",
                                    fromLoading: "true",
                                    loadingRecordId: h.id,
                                    loadedQty: String(loadedQty),
                                    grossWeight: String(grossWeight),
                                    netWeight: String(netWeight),
                                    priceRate: String(priceRate),
                                    amount: String(Math.max(0, (finance.amountUSD || 0) - ((totalQuantity > 0 ? (Number(record.report_payload?.loadedQuantity || record.loadedQuantity || 0) / totalQuantity) : 1) * Number(poRow.advance_paid || form.advanceAmount || 0)))),
                                    exchangeRate: String(finance.exRate || 1),
                                    currency: finance.currency || "USD",
                                    amountPKR: String(Math.max(0, (finance.amountUSD || 0) - ((totalQuantity > 0 ? (Number(record.report_payload?.loadedQuantity || record.loadedQuantity || 0) / totalQuantity) : 1) * Number(poRow.advance_paid || form.advanceAmount || 0))) * (finance.exRate || 1))
                                  }).toString();
                                  window.open(`/dashboard/journal/purchase-order-payment/remaining?${queryParams}`, "_self");
                                }}
                                className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50 transition"
                                title="Transfer Remaining Balance to Payment Journal"
                              >
                                <Link2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-400">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{h.report_payload?.blNumber || "-"}</td>
                          <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{h.carrier_name || h.report_payload?.vesselName || "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{h.report_payload?.loadedQuantity || h.loadedQuantity || "-"}</td>
                          <td className="px-6 py-3 font-mono font-bold text-slate-750 dark:text-slate-300 text-right">{amountUSD > 0 ? `${amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}` : "-"}</td>
                          <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-400 text-right">{exRate > 0 ? exRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "-"}</td>
                          <td className="px-6 py-3 font-mono font-black text-emerald-650 dark:text-emerald-400 text-right">{amountPKR > 0 ? `${amountPKR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR` : "-"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{h.report_payload?.loadingPort || h.loading_location || "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{h.report_payload?.loadingDate ? new Date(h.report_payload.loadingDate).toLocaleDateString() : (h.loaded_at ? new Date(h.loaded_at).toLocaleDateString() : "-")}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{h.report_payload?.receivingPort || h.receiving_location || "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{h.report_payload?.receivingDate ? new Date(h.report_payload.receivingDate).toLocaleDateString() : "-"}</td>
                        </tr>
                      );
                   })}
                   {history.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-6 py-6 text-center font-medium text-slate-500">No loading history found.</td>
                      </tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
type LoadingRecord = {
  id: string;
  purchase_order_id?: string | null;
  country_id?: string | null;
  country_branch_id?: string | null;
  city_branch_id?: string | null;
  loading_record_no: string;
  purchase_order_no: string | null;
  container_number: string;
  container_type: string | null;
  loading_status: LoadingStatus;
  loaded_at: string | null;
  loading_location: string | null;
  receiving_location: string | null;
  shipment_status: string | null;
  carrier_name: string | null;
  remarks: string | null;
  created_at: string;
  countries?: { name?: string | null; iso2?: string | null } | null;
  country_branches?: { name?: string | null; code?: string | null } | null;
  city_branches?: { name?: string | null; code?: string | null; city_name?: string | null } | null;
  purchase_orders?: { form_data?: any } | null;
  report_payload?: any;
};

type ApiPayload = {
  ok: boolean;
  data?: {
    records: LoadingRecord[];
    summary: {
      total: number;
      loaded: number;
      pending: number;
      received: number;
    };
    setupRequired?: boolean;
    setupMessage?: string | null;
  };
  error?: { message?: string } | string;
};

const statusOptions: Array<"all" | LoadingStatus> = ["all", "draft", "pending", "loaded", "received", "cancelled"];
const containerTypes = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "Non Reefer"];

function emptyForm() {
  return {
    linkPurchaseOrder: false,
    purchaseOrderNo: "",
    containerNumber: "",
    containerType: "40 FT",
    loadingStatus: "pending" as LoadingStatus,
    loadedAt: "",
    loadingLocation: "",
    receivingLocation: "",
    shipmentStatus: "open",
    carrierName: "",
    remarks: ""
  };
}

export function PurchaseLoadingRecordsView() {
  const [actionsSlot, setActionsSlot] = useState<Element | null>(null);

  useEffect(() => {
    const el = document.getElementById("erp-page-actions-slot");
    if (el) {
      setActionsSlot(el);
      return;
    }
    const timer = setInterval(() => {
      const el2 = document.getElementById("erp-page-actions-slot");
      if (el2) {
        setActionsSlot(el2);
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const [records, setRecords] = useState<LoadingRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, loaded: 0, pending: 0, received: 0 });
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LoadingStatus>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(() => emptyForm());
  const [selectedLoadDetailsRecord, setSelectedLoadDetailsRecord] = useState<LoadingRecord | null>(null);
  const [expandedSummaryCountries, setExpandedSummaryCountries] = useState<Record<string, boolean>>({});

  const loadingSummaryRows = useMemo(() => {
    if (!records || records.length === 0) return [];
    
    const groups: Record<string, {
      country: string;
      currency: string;
      totalPOs: Set<string>;
      totalQuantity: number;
      loadedQuantity: number;
      purchaseValue: number;
      loadedValue: number;
      branches: Record<string, {
        branch: string;
        currency: string;
        totalPOs: Set<string>;
        totalQuantity: number;
        loadedQuantity: number;
        purchaseValue: number;
        loadedValue: number;
      }>;
    }> = {};

    records.forEach(r => {
      const poData = (Array.isArray(r.purchase_orders) ? r.purchase_orders[0] : r.purchase_orders)?.form_data || {};
      const form = poData.form || {};
      const goods = poData.goodsEntries || [];

      const country = String(r.countries?.name || form.branchCountry || "Unknown Country").trim();
      const branch = String(r.country_branches?.name || form.branchName || "Unassigned Branch").trim();

      const poQty = goods.length > 0 
        ? goods.reduce((s: number, g: any) => s + Number(g.qtyNo || g.quantity || 0), 0) 
        : Number(form.quantity || 0);

      const loadedQty = Number(r.report_payload?.loadedQuantity || r.loadedQuantity || 0);

      const poTotalUSD = goods.length > 0 
        ? goods.reduce((s: number, g: any) => s + Number(g.finalAmount || g.totalAmount || 0), 0) 
        : Number(form.totalAmount || form.finalAmount || 0);
      const exRate = Number(r.report_payload?.exchangeRatePKR || form.exchangeRate || (poData as any).exchange_rate || 1);
      const poValuePKR = poTotalUSD * exRate;

      const loadedValPKR = poQty > 0 ? (loadedQty / poQty) * poValuePKR : 0;

      if (!groups[country]) {
        groups[country] = {
          country,
          currency: "PKR",
          totalPOs: new Set(),
          totalQuantity: 0,
          loadedQuantity: 0,
          purchaseValue: 0,
          loadedValue: 0,
          branches: {}
        };
      }

      const g = groups[country];
      if (r.purchase_order_no) g.totalPOs.add(r.purchase_order_no);
      g.loadedQuantity += loadedQty;
      
      if (!g.branches[branch]) {
        g.branches[branch] = {
          branch,
          currency: "PKR",
          totalPOs: new Set(),
          totalQuantity: 0,
          loadedQuantity: 0,
          purchaseValue: 0,
          loadedValue: 0
        };
      }

      const br = g.branches[branch];
      if (r.purchase_order_no) br.totalPOs.add(r.purchase_order_no);
      br.loadedQuantity += loadedQty;
      br.loadedValue += loadedValPKR;
    });

    const poTotalsCountry: Record<string, { totalQuantity: number; purchaseValue: number }> = {};
    const poTotalsBranch: Record<string, { totalQuantity: number; purchaseValue: number }> = {};

    const uniquePOs: Record<string, { poQty: number; poValuePKR: number; country: string; branch: string }> = {};
    records.forEach(r => {
      if (!r.purchase_order_no) return;
      if (uniquePOs[r.purchase_order_no]) return;
      
      const poData = (Array.isArray(r.purchase_orders) ? r.purchase_orders[0] : r.purchase_orders)?.form_data || {};
      const form = poData.form || {};
      const goods = poData.goodsEntries || [];
      const country = String(r.countries?.name || form.branchCountry || "Unknown Country").trim();
      const branch = String(r.country_branches?.name || form.branchName || "Unassigned Branch").trim();

      const poQty = goods.length > 0 
        ? goods.reduce((s: number, g: any) => s + Number(g.qtyNo || g.quantity || 0), 0) 
        : Number(form.quantity || 0);

      const poTotalUSD = goods.length > 0 
        ? goods.reduce((s: number, g: any) => s + Number(g.finalAmount || g.totalAmount || 0), 0) 
        : Number(form.totalAmount || form.finalAmount || 0);
      const exRate = Number(r.report_payload?.exchangeRatePKR || form.exchangeRate || (poData as any).exchange_rate || 1);
      const poValuePKR = poTotalUSD * exRate;

      uniquePOs[r.purchase_order_no] = { poQty, poValuePKR, country, branch };
    });

    Object.values(uniquePOs).forEach(p => {
      if (!poTotalsCountry[p.country]) {
        poTotalsCountry[p.country] = { totalQuantity: 0, purchaseValue: 0 };
      }
      poTotalsCountry[p.country].totalQuantity += p.poQty;
      poTotalsCountry[p.country].purchaseValue += p.poValuePKR;

      const brKey = `${p.country}-${p.branch}`;
      if (!poTotalsBranch[brKey]) {
        poTotalsBranch[brKey] = { totalQuantity: 0, purchaseValue: 0 };
      }
      poTotalsBranch[brKey].totalQuantity += p.poQty;
      poTotalsBranch[brKey].purchaseValue += p.poValuePKR;
    });

    return Object.values(groups).map(g => {
      const uniquePoTotals = poTotalsCountry[g.country] || { totalQuantity: 0, purchaseValue: 0 };
      g.totalQuantity = uniquePoTotals.totalQuantity;
      g.purchaseValue = uniquePoTotals.purchaseValue;

      const branchList = Object.values(g.branches).map(br => {
        const brKey = `${g.country}-${br.branch}`;
        const uniqueBrTotals = poTotalsBranch[brKey] || { totalQuantity: 0, purchaseValue: 0 };
        br.totalQuantity = uniqueBrTotals.totalQuantity;
        br.purchaseValue = uniqueBrTotals.purchaseValue;
        return br;
      }).sort((a, b) => a.branch.localeCompare(b.branch));

      return {
        ...g,
        branches: branchList
      };
    }).sort((a, b) => a.country.localeCompare(b.country));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (status !== "all" && record.loading_status !== status) return false;
      if (!q) return true;
      return [
        record.loading_record_no,
        record.purchase_order_no,
        record.container_number,
        record.container_type,
        record.loading_location,
        record.receiving_location,
        record.carrier_name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [query, records, status]);

  async function loadRecords() {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (status !== "all") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/erp/purchases/loading-records?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.ok) {
        const error = typeof payload.error === "string" ? payload.error : payload.error?.message;
        throw new Error(error || "Purchase Loading Records could not be loaded.");
      }
      setRecords(payload.data?.records ?? []);
      setSummary(payload.data?.summary ?? { total: 0, loaded: 0, pending: 0, received: 0 });
      setSetupMessage(payload.data?.setupMessage ?? null);
    } catch (error) {
      setRecords([]);
      setSummary({ total: 0, loaded: 0, pending: 0, received: 0 });
      setMessage(error instanceof Error ? error.message : "Purchase Loading Records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    const refresh = () => void loadRecords();
    window.addEventListener("focus", refresh);
    window.addEventListener("erp:purchase-order-saved", refresh);
    window.addEventListener("erp:purchase-transfer-saved", refresh);
    window.addEventListener("erp:purchase-loading-saved", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("erp:purchase-order-saved", refresh);
      window.removeEventListener("erp:purchase-transfer-saved", refresh);
      window.removeEventListener("erp:purchase-loading-saved", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveRecord() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/erp/purchases/loading-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderNo: form.linkPurchaseOrder ? form.purchaseOrderNo : null,
          containerNumber: form.containerNumber,
          containerType: form.containerType,
          loadingStatus: form.loadingStatus,
          loadedAt: form.loadedAt ? new Date(form.loadedAt).toISOString() : null,
          loadingLocation: form.loadingLocation,
          receivingLocation: form.receivingLocation,
          shipmentStatus: form.shipmentStatus,
          carrierName: form.carrierName,
          remarks: form.remarks,
          reportPayload: {
            standalone: true,
            explicitPurchaseOrderLink: form.linkPurchaseOrder,
            sourceModule: "purchase-loading-records"
          }
        })
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.ok) {
        const error = typeof payload.error === "string" ? payload.error : payload.error?.message;
        throw new Error(error || "Purchase Loading Record was not saved.");
      }
      setForm(emptyForm());
      setMessage("Purchase Loading Record saved.");
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Purchase Loading Record was not saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-none space-y-4 px-2 py-3 text-slate-900 dark:text-slate-100 sm:px-4">
      {selectedLoadDetailsRecord && (
        <LoadDetailsModal record={selectedLoadDetailsRecord} onClose={() => setSelectedLoadDetailsRecord(null)} onSaved={() => void loadRecords()} />
      )}
      {actionsSlot && createPortal(
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search container / loading no / PO"
              className="h-8 w-60 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>
          <SearchableSelect
            value={status}
            onChange={(val) => setStatus(val as "all" | LoadingStatus)}
            options={statusOptions.map(opt => ({ label: opt === "all" ? "All Status" : opt.toUpperCase(), value: opt }))}
            placeholder="All Status"
            className="w-32 text-xs font-semibold relative z-[45]"
          />
          <Button type="button" size="sm" variant="outline" onClick={() => void loadRecords()} disabled={loading} className="h-8 rounded-lg border-slate-200 text-xs font-bold">
            <RefreshCcw className={cn("mr-1.5 h-3.5 w-3.5 text-slate-500", loading && "animate-spin")} />
            Apply Filter
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => window.print()} className="h-8 rounded-lg border-slate-200 text-xs font-bold">
            <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Print
          </Button>
        </div>,
        actionsSlot
      )}

      {/* Super Admin Country Report Dashboard Header */}
      {loadingSummaryRows.length > 0 && (() => {
        let totalPoQty = 0;
        let totalLoadedQty = 0;
        let totalPurchaseValue = 0;
        let totalLoadedValue = 0;
        let activeBranchesCount = 0;
        
        loadingSummaryRows.forEach(r => {
          totalPoQty += r.totalQuantity;
          totalLoadedQty += r.loadedQuantity;
          totalPurchaseValue += r.purchaseValue;
          totalLoadedValue += r.loadedValue;
          activeBranchesCount += r.branches.length;
        });

        const activeCountriesCount = loadingSummaryRows.length;
        const totalRemainingQty = Math.max(0, totalPoQty - totalLoadedQty);
        const totalRemainingValue = Math.max(0, totalPurchaseValue - totalLoadedValue);

        const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const getFlag = (cName: string) => {
          if (!cName) return '🏳️';
          if (cName.toLowerCase().includes('pakistan')) return '🇵🇰';
          if (cName.toLowerCase().includes('iran')) return '🇮🇷';
          if (cName.toLowerCase().includes('arab emirates') || cName.toLowerCase().includes('uae')) return '🇦🇪';
          if (cName.toLowerCase().includes('afghanistan')) return '🇦🇫';
          if (cName.toLowerCase().includes('india')) return '🇮🇳';
          if (cName.toLowerCase().includes('china')) return '🇨🇳';
          return '🏳️';
        };

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

        return (
          <div className="flex flex-col mb-6 space-y-4">
            {/* 4 Panels Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Panel 1: Branch & User Details */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <div className="bg-blue-600 p-1 rounded-full text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400">1. BRANCH & USER DETAILS</h4>
                </div>
                <div className="p-4 flex flex-col gap-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
                  <div className="flex justify-between items-center">
                    <span>Country:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">🏳️ All Countries</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Branch Name:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">MAIN BRANCH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>User ID:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">SA001</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>User Name:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">SUPER ADMIN</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Role:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">SUPER ADMIN</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Date & Time:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{dateStr}, {timeStr}</span>
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    <span>Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-[10px]">Active</span>
                  </div>
                </div>
              </div>

              {/* Panel 2: Global Financial Summary */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <div className="bg-emerald-600 p-1 rounded-full text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">2. LOADING SUMMARY (PKR)</h4>
                </div>
                <div className="p-4 flex flex-col gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
                  <div className="flex justify-between items-center">
                    <span>Total Purchase Value:</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{formatMoney(totalPurchaseValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Loaded Value:</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">{formatMoney(totalLoadedValue)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-rose-600 dark:text-rose-500 font-bold uppercase">Remaining Value:</span>
                    <span className="font-black text-rose-700 dark:text-rose-400 font-mono text-sm">{formatMoney(totalRemainingValue)}</span>
                  </div>
                </div>
              </div>

              {/* Panel 3: Active Operations Summary */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-900/10">
                  <div className="bg-purple-600 p-1 rounded-full text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-800 dark:text-purple-400 truncate">3. ACTIVE OPERATIONS SUMMARY</h4>
                </div>
                <div className="p-4 flex flex-col gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
                  <div className="flex justify-between items-center">
                    <span>Total Active Countries:</span>
                    <span className="font-black text-purple-700 dark:text-purple-400 font-mono">{activeCountriesCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Active Branches:</span>
                    <span className="font-black text-purple-700 dark:text-purple-400 font-mono">{activeBranchesCount}</span>
                  </div>
                  <div className="flex justify-between items-center mt-auto pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                    <span>System Status:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Online</span>
                  </div>
                </div>
              </div>

              {/* Panel 4: Transaction Summary */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-900/10">
                  <div className="bg-orange-600 p-1 rounded-full text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-orange-800 dark:text-orange-400">4. LOADING QTY SUMMARY</h4>
                </div>
                <div className="p-4 flex flex-col gap-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
                  <div className="flex justify-between items-center">
                    <span>Total PO Qty (Bags):</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{totalPoQty.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Loaded Qty:</span>
                    <span className="font-bold text-emerald-600 font-mono">{totalLoadedQty.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-rose-600 dark:text-rose-500 font-bold uppercase">Total Remaining Qty:</span>
                    <span className="font-black text-rose-700 dark:text-rose-400 font-mono">{totalRemainingQty.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Last Updated:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{dateStr}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Country Dashboard Section */}
            <details className="group border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden" open>
              <summary className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 font-black text-slate-800 hover:bg-slate-100 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900/80 uppercase text-xs tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="transition-transform group-open:rotate-90">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </span>
                  All Countries Report Details
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                  {activeCountriesCount} Scoped Countries
                </span>
              </summary>
              
              <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {loadingSummaryRows.map((r, idx) => {
                    const totalQty = r.totalQuantity;
                    const loadedQty = r.loadedQuantity;
                    const balQty = Math.max(0, totalQty - loadedQty);
                    
                    return (
                      <details key={idx} className="group/card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                        <summary className="cursor-pointer list-none">
                          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white flex justify-between items-center">
                            <span className="font-black tracking-wide text-sm flex items-center gap-2">
                              <span className="transition-transform group-open/card:rotate-90">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                              </span>
                              {getFlag(r.country)} {r.country}
                            </span>
                            <span className="rounded bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                              {r.branches.length} Branches
                            </span>
                          </div>
                        </summary>
                        <div className="p-4">
                          <div className="mb-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Currency</span>
                              <span className="font-black text-slate-800 dark:text-slate-200 text-xs">{r.currency}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Qty</span>
                              <span className="font-black text-slate-800 dark:text-slate-200 font-mono text-[11px]">{totalQty.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Loaded Qty</span>
                              <span className="font-black text-emerald-600 font-mono text-[11px]">{loadedQty.toLocaleString()}</span>
                            </div>
                            <div className="mt-1 flex justify-between items-center border-t border-slate-200 pt-2 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remaining Bal. Qty</span>
                              <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-sm">{balQty.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex justify-between items-center">
                              <span>Branch Breakdown</span>
                              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] dark:bg-slate-800">All</span>
                            </h5>
                            {r.branches.map((b, bIdx) => {
                              const bBalQty = Math.max(0, b.totalQuantity - b.loadedQuantity);
                              return (
                                <div key={bIdx} className="flex flex-col gap-1.5 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <div className="flex justify-between items-center">
                                    <span className="font-black text-[10px] uppercase text-slate-700 dark:text-slate-300 truncate pr-2" title={b.branch}>{b.branch}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400">Total Qty</span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{b.totalQuantity.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400">Loaded Qty</span>
                                      <span className="font-bold text-emerald-500 font-mono">{b.loadedQuantity.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center col-span-2">
                                      <span className="text-slate-400">Bal. Qty</span>
                                      <span className="font-bold text-rose-500 font-mono">{bBalQty.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            </details>
          </div>
        );
      })()}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Metric label="Total Records" value={summary.total} tone="slate" />
        <Metric label="Loaded" value={summary.loaded} tone="green" />
        <Metric label="Pending" value={summary.pending} tone="amber" />
        <Metric label="Received" value={summary.received} tone="blue" />
      </div>

      {setupMessage ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          {setupMessage}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-blue-600" />
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Loading Records Report</h2>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide mt-0.5">Independent from Purchase Booking Order unless explicitly linked.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                    {[
                      "SR#",
                      "Country",
                      "Branch",
                      "User Name",
                      "Loading No",
                      "Purchase Booking No.",
                      "Sales Account",
                      "Purchase Account",
                      "Goods",
                      "Quantity",
                      "Net Weight",
                      "Gross Weight",
                      "Purchase Amount (PKR)",
                      "Exchange Rate",
                      "Advance Amount (PKR)",
                      "Balance Amount (PKR)",
                      "Payment Date",
                      "Loading Country",
                      "Loading Port",
                      "Loading Date",
                      "Received Country",
                      "Received Port",
                      "Received Date",
                      "Action"
                    ].map((head) => (
                      <th key={head} className="whitespace-nowrap px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={23} className="px-3 py-8 text-center text-muted-foreground">
                        Loading records...
                      </td>
                    </tr>
                  ) : filteredRecords.length ? (
                    filteredRecords.map((record, index) => {
                      const poData = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders)?.form_data || {};
                      const poRow = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders) || {};
                      const form = poData.form || {};
                      
                      // Account Info
                      const salesAccountNo = form.salesAccountNumber || form.salesAccountNo || "-";
                      const salesAccountName = form.salesAccountName || "-";
                      const purchaseAccountNo = form.purchaseAccountNumber || form.purchaseAccountNo || "-";
                      const purchaseAccountName = form.purchaseAccountName || "-";
                      
                      // Goods
                      const goods = poData.goodsEntries || [];
                      const goodsName = goods.map((g: any) => g.goodsName || g.item_name).filter(Boolean).join(", ") || form.itemName || "-";
                      const goodsDetails = goods.map((g: any) => g.brand || g.size || g.item_details).filter(Boolean).join(", ") || form.itemDetails || "-";
                      const combinedGoods = goodsName !== "-" ? `${goodsName}${goodsDetails !== "-" ? ` - ${goodsDetails}` : ""}` : "-";
                      const totalQty = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.qtyNo || g.quantity || 0), 0) : Number(form.quantity || 0);
                      const totalNet = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0);
                      const totalGross = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.grossWeight || 0), 0) : Number(form.grossWeight || 0);
                      
                      // Specific values for this loaded record
                      const loadedQty = Number(record.report_payload?.loadedQuantity || record.report_payload?.loadingQuantity || record.loadedQuantity || totalQty || 0);
                      const loadedQtyKgs = Number(record.report_payload?.oneQtyKgs || 0);
                      const loadedEmptyKgs = Number(record.report_payload?.oneEmptyKgs || 0);
                      
                      const netWeight = loadedQtyKgs > 0 ? loadedQty * (loadedQtyKgs - loadedEmptyKgs) : (totalQty > 0 ? (loadedQty / totalQty) * totalNet : totalNet);
                      const grossWeight = loadedQtyKgs > 0 ? loadedQty * loadedQtyKgs : (totalQty > 0 ? (loadedQty / totalQty) * totalGross : totalGross);

                      const { amountUSD: loadedUSD, exRate: loadedExRate, amountPKR: loadedPKR, currency: loadedCurrency } = calcLoadingFinance(record, poRow, form);

                      // Proportional advance amount for this loaded record
                      const poAdvanceAmt = Number(poRow.advance_paid || form.advanceAmount || 0);
                      const loadedAdvanceAmt = totalQty > 0 ? (loadedQty / totalQty) * poAdvanceAmt : poAdvanceAmt;
                      const loadedAdvancePKR = loadedAdvanceAmt * loadedExRate;
                      const loadedBalancePKR = loadedPKR - loadedAdvancePKR;

                      const loadedAmtPKRStr = loadedPKR > 0 ? `${loadedPKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";
                      const loadedAdvancePKRStr = loadedAdvancePKR > 0 ? `${loadedAdvancePKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";
                      const loadedBalancePKRStr = loadedBalancePKR !== 0 ? `${loadedBalancePKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";
                      
                      const paymentDate = form.advancePaymentDate || form.paymentDate || form.clearanceDate || "Nil";
                      
                      // Logistics
                      const loadingCountry = form.loadingCountry || form.originCountry || "-";
                      const loadingPort = form.loadingPort || form.exitPort || "-";
                      const loadingDateVal = form.loadingDate || "-";
                      const receivingCountry = form.receivedCountry || form.destinationCountry || "-";
                      const receivingPort = form.receivedPort || form.destinationPort || "-";
                      const receivingDateVal = form.receivedDate || form.arrivalDate || "-";
                      
                      const countryLabel = `${record.countries?.name || form.branchCountry || "-"}${record.countries?.iso2 ? ` (${record.countries.iso2})` : ""}`;
                      const branchLabel = `${record.country_branches?.name || form.branchName || "-"}${record.country_branches?.code ? ` (${record.country_branches.code})` : ""}`;
                      const adminLabel = form.userName || form.userId || "-";

                      return (
                        <tr key={record.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="whitespace-nowrap px-4 py-2 text-[10px] font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-semibold">{countryLabel}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-500">{branchLabel}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-semibold">{adminLabel}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-bold text-blue-600">{record.loading_record_no}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-semibold">{record.purchase_order_no ? <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200"><Link2 className="h-3 w-3 text-blue-500" />{record.purchase_order_no}</span> : "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 leading-tight">
                            <div className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-350">{salesAccountNo}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider">{salesAccountName}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 leading-tight">
                            <div className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-350">{purchaseAccountNo}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider">{purchaseAccountName}</div>
                          </td>
                          <td className="min-w-[150px] px-4 py-2 text-[11px] text-slate-600 dark:text-slate-300">{combinedGoods}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{loadedQty || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{netWeight || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{grossWeight || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-emerald-600 dark:text-emerald-400">{loadedAmtPKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px] font-semibold text-slate-400">{loadedExRate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-bold text-[#0f2942] dark:text-amber-400">{loadedAdvancePKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-rose-700 dark:text-rose-500">{loadedBalancePKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px]">{paymentDate}</td>
                          <td className="whitespace-nowrap px-4 py-2">{loadingCountry}</td>
                          <td className="whitespace-nowrap px-3 py-2">{record.loading_location || loadingPort || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px]">{record.loaded_at ? new Date(record.loaded_at).toLocaleDateString() : (loadingDateVal || "-")}</td>
                          <td className="whitespace-nowrap px-4 py-2">{receivingCountry}</td>
                          <td className="whitespace-nowrap px-4 py-2">{record.receiving_location || receivingPort || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px]">{receivingDateVal}</td>
                          <td className="whitespace-nowrap px-4 py-2">
                            <CustomDropdown record={record} onLoadDetails={setSelectedLoadDetailsRecord} />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={23} className="px-3 py-8 text-center text-muted-foreground">
                        No loading records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" | "blue" }) {
  const color = tone === "green" ? "text-emerald-600 dark:text-emerald-400" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : tone === "blue" ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-100";
  const bg = tone === "green" ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50" : tone === "amber" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50" : tone === "blue" ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800";
  
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", bg)}>
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("mt-1 text-2xl font-black font-mono tracking-tight", color)}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: LoadingStatus }) {
  const classes =
    status === "loaded" || status === "received"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "cancelled"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return <span className={cn("rounded-full px-2 py-1 text-xs font-black capitalize", classes)}>{status}</span>;
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

