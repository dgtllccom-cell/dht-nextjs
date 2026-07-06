"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Link2, MoreVertical, Plus, Printer, RefreshCcw, Search, Ship, Building2, ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
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
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [editingLoadingId, setEditingLoadingId] = useState<string | null>(null);

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
                        {formStep === 1 ? "New Loading (Step 1 of 3)" : formStep === 2 ? "New Loading (Step 2 of 3)" : "New Loading (Step 3 of 3)"}
                      </h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-500/30">Live</span>
                    </div>
                    <p className="text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-200/80">
                      {formStep === 1 ? "Enter shipping and routing details." : formStep === 2 ? "Enter goods and conversion details." : "Enter partial loading quantity below."}
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
                          Quantity No
                          <input value={quantityNo} onChange={(e) => setQuantityNo(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
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
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setFormStep(1)} className="rounded-full h-9 px-4 text-xs font-bold">
                          Back
                        </Button>
                        <div className="flex gap-2">
                          <Button type="button" onClick={() => setFormStep(3)} className="rounded-full h-9 bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700">
                            + Add Item to List
                          </Button>
                          <Button type="button" onClick={() => setFormStep(3)} className="rounded-full h-9 bg-cyan-600 px-4 text-xs font-bold text-white hover:bg-cyan-700">
                            Next: Other Details
                          </Button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">LOADING SUMMARY</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 mb-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Total KGS:</span>
                          <span className="text-slate-900 dark:text-white">{totalQuantity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Loaded KGS:</span>
                          <span className="text-slate-900 dark:text-white">{savedLoadedQuantity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Balance:</span>
                          <span className="text-rose-600 dark:text-rose-400">{Math.max(0, totalQuantity - savedLoadedQuantity).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>After Save:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{previewLoadedQuantity.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="h-px w-full bg-slate-200 dark:bg-slate-800 my-2" />

                      <div className="grid grid-cols-2 gap-3 mt-2 max-h-[50vh] overflow-y-auto pr-1">
                        <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 col-span-2 mt-2">
                          Loading Quantity *
                          <input
                            type="number"
                            min="0"
                            value={newLoadingQuantity}
                            onChange={(event) => setNewLoadingQuantity(event.target.value)}
                            placeholder="e.g. 2000"
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          />
                        </label>

                        <label className="space-y-1 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 col-span-2">
                          Loading Note
                          <input
                            value={newLoadingNote}
                            onChange={(event) => setNewLoadingNote(event.target.value)}
                            placeholder="Checking / brand / loading remarks"
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          />
                        </label>
                      </div>
                      <div className="mt-5 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFormStep(2)}
                          className="flex-1 h-10 font-bold border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300"
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void saveNewLoading()}
                          disabled={savingNewLoading || !newQuantity}
                          className="flex-1 h-10 bg-emerald-600 font-black tracking-widest uppercase text-[11px] text-white hover:bg-emerald-700 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                        >
                          {savingNewLoading ? "Saving..." : "Save Loading"}
                        </Button>
                      </div>
                    </>
                  )}
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
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Purchase Amount</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Exchange Rate</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Final Amount (PKR)</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Advance Amount</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Advance (PKR)</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Balance Amount</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-slate-500 text-right">Balance (PKR)</th>
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
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{itemPurchaseAmount > 0 ? itemPurchaseAmount.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{exRate > 1 ? exRate.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{itemFinalAmountPKR > 0 ? itemFinalAmountPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">{advAmt > 0 ? advAmt.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">{advPKR > 0 ? advPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-rose-600 dark:text-rose-400 text-right">{balAmt !== 0 ? balAmt.toLocaleString() : "-"}</td>
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
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{itemPurchaseAmount > 0 ? itemPurchaseAmount.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{exRate > 1 ? exRate.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{itemFinalAmountPKR > 0 ? itemFinalAmountPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">{advAmt > 0 ? advAmt.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">{advPKR > 0 ? advPKR.toLocaleString() : "-"}</td>
                          <td className="px-6 py-3 font-mono font-semibold text-rose-600 dark:text-rose-400 text-right">{balAmt !== 0 ? balAmt.toLocaleString() : "-"}</td>
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
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Loading Port</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Load Date</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Receive Port</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Receive Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {history.map((h, i) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => handleEditHistory(h)} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition" title="Edit Entry">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-400">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{h.report_payload?.blNumber || "-"}</td>
                        <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{h.carrier_name || h.report_payload?.vesselName || "-"}</td>
                        <td className="px-6 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-right">{h.report_payload?.loadedQuantity || h.loadedQuantity || "-"}</td>
                        <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{h.report_payload?.loadingPort || h.loading_location || "-"}</td>
                        <td className="px-6 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{h.report_payload?.loadingDate ? new Date(h.report_payload.loadingDate).toLocaleDateString() : (h.loaded_at ? new Date(h.loaded_at).toLocaleDateString() : "-")}</td>
                        <td className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300">{h.report_payload?.receivingPort || h.receiving_location || "-"}</td>
                        <td className="px-6 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{h.report_payload?.receivingDate ? new Date(h.report_payload.receivingDate).toLocaleDateString() : "-"}</td>
                      </tr>
                   ))}
                   {history.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-6 text-center font-medium text-slate-500">No loading history found.</td>
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
      <ErpPageActions />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 backdrop-blur p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search container / loading no / PO"
              className="h-8 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value as "all" | LoadingStatus)} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
            {statusOptions.map((option) => (
              <option key={option} value={option} className="uppercase">
                {option === "all" ? "All Status" : option}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadRecords()} disabled={loading} className="h-8 rounded-lg border-slate-200 text-xs font-bold">
            <RefreshCcw className={cn("mr-1.5 h-3.5 w-3.5 text-slate-500", loading && "animate-spin")} />
            Apply Filter
          </Button>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => window.print()} className="h-8 rounded-lg border-slate-200 text-xs font-bold">
          <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Print Report
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Metric label="Total Records" value={summary.total} />
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
                      "Purchase Amount",
                      "Exchange Rate",
                      "Final Amount (PKR)",
                      "Advance Amount",
                      "Advance (PKR)",
                      "Balance Amount",
                      "Balance (PKR)",
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
                      
                      // Financial Calculations
                      const totalAmt = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.finalAmount || g.totalAmount || 0), 0) : Number(form.totalAmount || form.finalAmount || 0);
                      const currency = form.secondaryCurrency?.split(" ")?.[0] || form.currency || "PKR";
                      const rawExRate = Number(form.exchangeRate || (poData as any).exchange_rate || 1);
                      const exchangeRate = isNaN(rawExRate) ? 1 : rawExRate;
                      
                      const purchaseAmtStr = totalAmt > 0 ? `${totalAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}` : "-";
                      const finalAmtPKR = totalAmt * exchangeRate;
                      const finalAmtPKRStr = finalAmtPKR > 0 ? `${finalAmtPKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";

                      const advanceAmt = Number(form.advanceAmount || 0);
                      const advanceAmtStr = advanceAmt > 0 ? `${advanceAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}` : "-";
                      const advanceFinalPKR = advanceAmt * exchangeRate;
                      const advanceFinalPKRStr = advanceFinalPKR > 0 ? `${advanceFinalPKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";

                      const balanceAmt = totalAmt - advanceAmt;
                      const balanceAmtStr = balanceAmt > 0 ? `${balanceAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}` : "-";
                      const balanceFinalPKR = balanceAmt * exchangeRate;
                      const balanceFinalPKRStr = balanceFinalPKR > 0 ? `${balanceFinalPKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";
                      
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
                            <div className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">{salesAccountNo}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider">{salesAccountName}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 leading-tight">
                            <div className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">{purchaseAccountNo}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider">{purchaseAccountName}</div>
                          </td>
                          <td className="min-w-[150px] px-4 py-2 text-[11px] text-slate-600 dark:text-slate-300">{combinedGoods}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{totalQty || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{totalNet || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{totalGross || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-bold text-emerald-600">{purchaseAmtStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px] font-semibold text-slate-400">{exchangeRate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-[#0f2942] dark:text-blue-400">{finalAmtPKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-bold text-amber-600">{advanceAmtStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-[#0f2942] dark:text-amber-400">{advanceFinalPKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-bold text-rose-600">{balanceAmtStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-rose-700 dark:text-rose-500">{balanceFinalPKRStr}</td>
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

