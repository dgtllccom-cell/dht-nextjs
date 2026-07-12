"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Save, RefreshCw, Plus, Calendar, Globe,
  CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp,
  DollarSign, BarChart3, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type CountryRate = {
  id: string;
  country_id: string;
  rate_date: string;
  buying_rate: number;
  selling_rate: number;
  credit_rate: number;
  debit_rate: number;
  updated_at: string;
  countries?: { name: string; currency_code: string; iso2?: string | null };
};

type CountryOption = {
  id: string;
  name: string;
  currency_code: string;
  iso2: string | null;
};

function money(value: number, digits = 4) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function getFlag(iso2: string | null | undefined) {
  if (!iso2) return "🏳";
  return iso2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

type EditingRow = {
  countryId: string;
  countryName: string;
  currency: string;
  iso2: string | null;
  buyingRate: string;
  sellingRate: string;
  creditRate: string;
  debitRate: string;
  rateDate: string;
  currentRate: CountryRate | null;
};

export function DailyExchangeRateManager() {
  const [rates, setRates] = useState<CountryRate[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { type: "success" | "error"; text: string }>>({});
  const [editingRows, setEditingRows] = useState<Record<string, EditingRow>>({});
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [rateHistory, setRateHistory] = useState<Record<string, CountryRate[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  async function loadData() {
    setLoading(true);
    try {
      const [ratesRes, countriesRes] = await Promise.all([
        apiGet<{ rates: CountryRate[] }>("/api/erp/currency/daily-rates?latest=true"),
        apiGet<{ countries?: CountryOption[]; data?: CountryOption[] }>("/api/erp/admin/countries?limit=100"),
      ]);
      
      const ratesList = ratesRes.rates ?? [];
      setRates(ratesList);

      // Build countries from the response; fall back to extracting from rates
      const countriesList: CountryOption[] = (countriesRes.countries ?? countriesRes.data ?? []);
      if (countriesList.length === 0) {
        // Extract unique countries from rate data
        const seen = new Set<string>();
        const extracted: CountryOption[] = [];
        for (const r of ratesList) {
          if (r.country_id && !seen.has(r.country_id)) {
            seen.add(r.country_id);
            extracted.push({
              id: r.country_id,
              name: r.countries?.name ?? "Unknown",
              currency_code: r.countries?.currency_code ?? "USD",
              iso2: r.countries?.iso2 ?? null,
            });
          }
        }
        setCountries(extracted);
      } else {
        setCountries(countriesList);
      }

      // Pre-populate editing rows with current rates
      const rowMap: Record<string, EditingRow> = {};
      for (const rate of ratesList) {
        const country = countriesList.find((c) => c.id === rate.country_id);
        rowMap[rate.country_id] = {
          countryId: rate.country_id,
          countryName: rate.countries?.name ?? country?.name ?? "Unknown",
          currency: rate.countries?.currency_code ?? country?.currency_code ?? "USD",
          iso2: rate.countries?.iso2 ?? country?.iso2 ?? null,
          buyingRate: String(rate.buying_rate),
          sellingRate: String(rate.selling_rate),
          creditRate: String(rate.credit_rate),
          debitRate: String(rate.debit_rate),
          rateDate: rate.rate_date ?? isoToday(),
          currentRate: rate,
        };
      }
      // Add countries that don't have a rate yet
      for (const country of countriesList) {
        if (!rowMap[country.id]) {
          rowMap[country.id] = {
            countryId: country.id,
            countryName: country.name,
            currency: country.currency_code,
            iso2: country.iso2 ?? null,
            buyingRate: "",
            sellingRate: "",
            creditRate: "",
            debitRate: "",
            rateDate: isoToday(),
            currentRate: null,
          };
        }
      }
      setEditingRows(rowMap);
    } catch (err) {
      console.error("Failed to load exchange rates:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadHistory(countryId: string) {
    setHistoryLoading((prev) => ({ ...prev, [countryId]: true }));
    try {
      const res = await apiGet<{ rates: CountryRate[] }>(
        `/api/erp/currency/daily-rates?countryId=${countryId}`
      );
      setRateHistory((prev) => ({ ...prev, [countryId]: res.rates ?? [] }));
    } catch (err) {
      console.error("Failed to load rate history:", err);
    } finally {
      setHistoryLoading((prev) => ({ ...prev, [countryId]: false }));
    }
  }

  function toggleExpanded(countryId: string) {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
        if (!rateHistory[countryId]) {
          void loadHistory(countryId);
        }
      }
      return next;
    });
  }

  async function saveRate(countryId: string) {
    const row = editingRows[countryId];
    if (!row) return;

    const buying = Number(row.buyingRate);
    const selling = Number(row.sellingRate);
    const credit = Number(row.creditRate || row.sellingRate);
    const debit = Number(row.debitRate || row.buyingRate);

    if (!buying || !selling) {
      setMessages((prev) => ({
        ...prev,
        [countryId]: { type: "error", text: "Buying and Selling rates are required." },
      }));
      return;
    }

    setSaving(countryId);
    setMessages((prev) => ({ ...prev, [countryId]: undefined as any }));

    try {
      await apiPost("/api/erp/currency/latest-rate", {
        countryId,
        countryBranchId: null,
        rateDate: row.rateDate,
        buyingRate: buying,
        sellingRate: selling,
        creditRate: credit || selling,
        debitRate: debit || buying,
      });

      setMessages((prev) => ({
        ...prev,
        [countryId]: { type: "success", text: `Rate saved for ${row.rateDate}. 1 USD = ${selling} ${row.currency}` },
      }));

      await loadData();
      // Reload history for this country if expanded
      if (expandedCountries.has(countryId)) {
        await loadHistory(countryId);
      }
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [countryId]: { type: "error", text: err instanceof Error ? err.message : "Failed to save rate." },
      }));
    } finally {
      setSaving(null);
    }
  }

  const sortedRows = useMemo(() => {
    return Object.values(editingRows).sort((a, b) => a.countryName.localeCompare(b.countryName));
  }, [editingRows]);

  const totalCountries = sortedRows.length;
  const ratedCountries = sortedRows.filter((r) => r.currentRate).length;
  const todayRated = sortedRows.filter((r) => r.currentRate?.rate_date === isoToday()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mr-3" />
        <span className="text-sm font-medium">Loading exchange rates...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            Daily Exchange Rate Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Set and manage daily USD exchange rates for each country. These rates are used across the entire ERP.
          </p>
        </div>
        <Button
          onClick={loadData}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Countries</span>
          </div>
          <p className="text-3xl font-black">{totalCountries}</p>
          <p className="text-xs text-slate-400 mt-1">Total configured</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Rated</span>
          </div>
          <p className="text-3xl font-black">{ratedCountries}</p>
          <p className="text-xs text-emerald-300 mt-1">Have rate set</p>
        </div>
        <div className={cn(
          "rounded-2xl p-4 shadow-lg text-white col-span-2 sm:col-span-1",
          todayRated === totalCountries && totalCountries > 0
            ? "bg-gradient-to-br from-blue-900 to-blue-800"
            : "bg-gradient-to-br from-amber-900 to-amber-800"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Today</span>
          </div>
          <p className="text-3xl font-black">{todayRated}</p>
          <p className="text-xs text-amber-300 mt-1">Updated for {isoToday()}</p>
        </div>
      </div>

      {/* Country Rate Cards */}
      <div className="space-y-3">
        {sortedRows.map((row) => {
          const isExpanded = expandedCountries.has(row.countryId);
          const isSaving = saving === row.countryId;
          const message = messages[row.countryId];
          const hasCurrentRate = !!row.currentRate;
          const isToday = row.currentRate?.rate_date === isoToday();

          return (
            <div
              key={row.countryId}
              className={cn(
                "rounded-2xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all",
                hasCurrentRate
                  ? "border-emerald-200 dark:border-emerald-900"
                  : "border-amber-200 dark:border-amber-900"
              )}
            >
              {/* Card Header */}
              <div className={cn(
                "px-5 py-4 flex items-center justify-between gap-3",
                hasCurrentRate
                  ? "bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-900"
                  : "bg-gradient-to-r from-amber-50 to-white dark:from-amber-950 dark:to-slate-900"
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{getFlag(row.iso2)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 dark:text-slate-100 text-sm">{row.countryName}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isToday
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          : hasCurrentRate
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {isToday ? "Updated Today" : hasCurrentRate ? `Last: ${row.currentRate?.rate_date}` : "No Rate Set"}
                      </span>
                    </div>
                    {hasCurrentRate && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        1 USD = <span className="font-bold text-slate-700 dark:text-slate-300">{money(row.currentRate!.selling_rate)} {row.currency}</span>
                        {" · "}Buy: {money(row.currentRate!.buying_rate)} {row.currency}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold bg-slate-800 text-white dark:bg-slate-700 px-2 py-1 rounded-lg">
                    {row.currency}
                  </span>
                  <button
                    onClick={() => toggleExpanded(row.countryId)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Rate Input Form */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</Label>
                    <Input
                      type="date"
                      value={row.rateDate}
                      onChange={(e) =>
                        setEditingRows((prev) => ({
                          ...prev,
                          [row.countryId]: { ...prev[row.countryId], rateDate: e.target.value },
                        }))
                      }
                      className="h-9 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Buy Rate</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="e.g. 278.00"
                      value={row.buyingRate}
                      onChange={(e) =>
                        setEditingRows((prev) => ({
                          ...prev,
                          [row.countryId]: { ...prev[row.countryId], buyingRate: e.target.value },
                        }))
                      }
                      className="h-9 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Sell Rate</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="e.g. 280.00"
                      value={row.sellingRate}
                      onChange={(e) =>
                        setEditingRows((prev) => ({
                          ...prev,
                          [row.countryId]: { ...prev[row.countryId], sellingRate: e.target.value },
                        }))
                      }
                      className="h-9 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Debit Rate</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="Same as Buy"
                      value={row.debitRate}
                      onChange={(e) =>
                        setEditingRows((prev) => ({
                          ...prev,
                          [row.countryId]: { ...prev[row.countryId], debitRate: e.target.value },
                        }))
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Credit Rate</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="Same as Sell"
                      value={row.creditRate}
                      onChange={(e) =>
                        setEditingRows((prev) => ({
                          ...prev,
                          [row.countryId]: { ...prev[row.countryId], creditRate: e.target.value },
                        }))
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="text-[10px] text-slate-400">
                    Rates are: local currency units per 1 USD (e.g. 1 USD = <strong>{row.sellingRate || "?"} {row.currency}</strong>)
                  </div>
                  <Button
                    onClick={() => saveRate(row.countryId)}
                    disabled={isSaving || !row.buyingRate || !row.sellingRate}
                    size="sm"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isSaving ? "Saving..." : "Save Rate"}
                  </Button>
                </div>

                {message && (
                  <div className={cn(
                    "mt-2 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg",
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {message.type === "success" ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    {message.text}
                  </div>
                )}
              </div>

              {/* Rate History (Expanded) */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="px-5 py-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rate History</span>
                  </div>
                  {historyLoading[row.countryId] ? (
                    <div className="px-5 pb-4 text-xs text-slate-400 flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading history...
                    </div>
                  ) : (
                    <div className="px-5 pb-4 overflow-x-auto">
                      <table className="w-full text-xs border-separate border-spacing-0">
                        <thead>
                          <tr>
                            {["Date", "Buy Rate", "Sell Rate", "Debit Rate", "Credit Rate"].map((h) => (
                              <th key={h} className="text-left py-1.5 px-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(rateHistory[row.countryId] ?? []).slice(0, 10).map((hist) => (
                            <tr key={hist.id} className="hover:bg-white dark:hover:bg-slate-900 transition-colors">
                              <td className="py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">{hist.rate_date}</td>
                              <td className="py-1.5 px-2 text-emerald-700 dark:text-emerald-400 font-semibold">{money(hist.buying_rate)}</td>
                              <td className="py-1.5 px-2 text-blue-700 dark:text-blue-400 font-semibold">{money(hist.selling_rate)}</td>
                              <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">{money(hist.debit_rate)}</td>
                              <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">{money(hist.credit_rate)}</td>
                            </tr>
                          ))}
                          {(rateHistory[row.countryId] ?? []).length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-3 px-2 text-slate-400 text-center">No history found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {sortedRows.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold">No countries found.</p>
            <p className="text-sm">Add countries first from Country Management.</p>
          </div>
        )}
      </div>
    </div>
  );
}
