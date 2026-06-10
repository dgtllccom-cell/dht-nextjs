"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, Building2, Landmark, Hash, Phone, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rtlLanguages, type SupportedLanguage } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";
import { getLabel } from "./translations";

type AccountGeneralReportRow = {
  accountId: string;
  accountCode: string;
  journalCode: string;
  accountName: string;
  accountCategory: string;
  subType: string;
  branchType: string;
  branchName: string;
  countryName: string;
  currency: string;
  accountSerialNumber?: number;
};

export function AccountSetupReport({ lang: propLang }: { lang?: SupportedLanguage }) {
  const router = useRouter();

  const lang = useMemo(() => {
    if (propLang) return propLang;
    if (typeof document !== "undefined") {
      const docLang = document.documentElement.lang as SupportedLanguage;
      return ["en", "ar", "ur", "fa", "ps"].includes(docLang) ? docLang : "en";
    }
    return "en";
  }, [propLang]);

  const isRtl = useMemo(() => rtlLanguages.includes(lang), [lang]);

  // Report state
  const [reportRows, setReportRows] = useState<AccountGeneralReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Filter state
  const [filterAccountNo, setFilterAccountNo] = useState("");
  const [filterAccountName, setFilterAccountName] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterAccountType, setFilterAccountType] = useState("all");
  const [filterSubType, setFilterSubType] = useState("all");
  
  const [appliedAccountNo, setAppliedAccountNo] = useState("");
  const [appliedAccountName, setAppliedAccountName] = useState("");
  const [appliedCountry, setAppliedCountry] = useState("all");
  const [appliedBranch, setAppliedBranch] = useState("all");
  const [appliedAccountType, setAppliedAccountType] = useState("all");
  const [appliedSubType, setAppliedSubType] = useState("all");

  async function fetchReport() {
    setReportLoading(true);
    try {
      const res = await fetch("/api/erp/accounting/reports/accounts/general?limit=500").then((r) => r.json());
      if (res && res.ok && res.data && Array.isArray(res.data.rows)) setReportRows(res.data.rows);
    } catch (err) {
      console.error("Failed to load account report:", err);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => { fetchReport(); }, []);

  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    for (const r of reportRows) { if (r.countryName) set.add(r.countryName); }
    return Array.from(set);
  }, [reportRows]);

  const uniqueBranches = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reportRows) { if (r.branchName) map.set(r.branchName, r.branchName); }
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [reportRows]);

  const uniqueAccountTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of reportRows) { if (r.accountCategory) set.add(`${r.accountCategory} Account`); }
    return Array.from(set);
  }, [reportRows]);

  const uniqueSubTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of reportRows) { if (r.subType) set.add(r.subType); }
    return Array.from(set);
  }, [reportRows]);

  const summaryStats = useMemo(() => ({
    total: reportRows.length,
    customers: reportRows.filter((r) => (r.accountCategory ?? "").toLowerCase().includes("customer")).length,
    companies: reportRows.filter((r) =>
      (r.accountCategory ?? "").toLowerCase().includes("company") ||
      (r.subType ?? "").toLowerCase().includes("company")
    ).length,
    banks: reportRows.filter((r) => (r.accountCategory ?? "").toLowerCase().includes("bank")).length,
  }), [reportRows]);

  const filteredReportRows = useMemo(() => {
    return reportRows.filter((row) => {
      if (appliedAccountNo) {
        const q = appliedAccountNo.toLowerCase();
        if (!(row.accountCode ?? "").toLowerCase().includes(q) && !(row.journalCode ?? "").toLowerCase().includes(q)) return false;
      }
      if (appliedAccountName && !(row.accountName ?? "").toLowerCase().includes(appliedAccountName.toLowerCase())) return false;
      if (appliedCountry !== "all" && row.countryName !== appliedCountry) return false;
      if (appliedBranch !== "all" && row.branchName !== appliedBranch) return false;
      if (appliedAccountType !== "all" && `${row.accountCategory} Account` !== appliedAccountType) return false;
      if (appliedSubType !== "all" && row.subType !== appliedSubType) return false;
      return true;
    });
  }, [reportRows, appliedAccountNo, appliedAccountName, appliedCountry, appliedBranch, appliedAccountType, appliedSubType]);

  function handleApplyFilters() {
    setAppliedAccountNo(filterAccountNo);
    setAppliedAccountName(filterAccountName);
    setAppliedCountry(filterCountry);
    setAppliedBranch(filterBranch);
    setAppliedAccountType(filterAccountType);
    setAppliedSubType(filterSubType);
  }

  function handleResetFilters() {
    setFilterAccountNo(""); setFilterAccountName(""); setFilterCountry("all");
    setFilterBranch("all"); setFilterAccountType("all"); setFilterSubType("all");
    setAppliedAccountNo(""); setAppliedAccountName(""); setAppliedCountry("all");
    setAppliedBranch("all"); setAppliedAccountType("all"); setAppliedSubType("all");
  }

  return (
    <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{getLabel("template", lang)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{getLabel("accountSetupReport", lang)}</h1>
          <p className="text-sm text-muted-foreground">{getLabel("reportSubtitle", lang)}</p>
        </div>
      </div>

      <div className="mt-6 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{getLabel("dashboard", lang)}</p>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{getLabel("accountsSummaryReport", lang)}</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {lang === "en" ? "As of " : ""}{new Date().toLocaleDateString(lang === "en" ? "en-US" : lang, { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: getLabel("totalAccounts", lang), count: summaryStats.total, color: "#0284c7", Icon: Hash },
            { label: getLabel("customers", lang), count: summaryStats.customers, color: "#059669", Icon: UserRound },
            { label: getLabel("companies", lang), count: summaryStats.companies, color: "#7c3aed", Icon: Building2 },
            { label: getLabel("banks", lang), count: summaryStats.banks, color: "#d97706", Icon: Landmark },
          ].map(({ label, count, color, Icon }) => (
            <div key={label} className="relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${color}08, transparent)` }} />
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {reportLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-200" /> : count}
              </p>
              <div className={cn("absolute bottom-3 h-8 w-8 rounded-full flex items-center justify-center", isRtl ? "left-3" : "right-3")} style={{ background: `${color}18` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden mt-3">
        <div className="bg-[#0284c7] px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{getLabel("accountSetupReport", lang)}</h2>
          <span className="text-xs text-white/90">{lang === "en" ? "Generated: " : ""}{new Date().toISOString().slice(0, 10)}</span>
        </div>
        <div className="bg-[#f8fafc] border-b p-3 flex flex-wrap items-end gap-3 text-xs">
          <div className="space-y-1">
            <Label htmlFor="filterAccountNo" className="text-[11px] text-slate-500">{getLabel("accountNo", lang)}</Label>
            <div className="relative">
              <Search className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400", isRtl ? "right-2.5" : "left-2.5")} />
              <Input id="filterAccountNo" value={filterAccountNo} onChange={(e) => setFilterAccountNo(e.target.value)} placeholder={getLabel("filterAccountNo", lang)} className={cn("h-8 text-xs w-44 bg-white", isRtl ? "pr-8" : "pl-8")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filterAccountName" className="text-[11px] text-slate-500">{getLabel("accountName", lang)}</Label>
            <div className="relative">
              <Search className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400", isRtl ? "right-2.5" : "left-2.5")} />
              <Input id="filterAccountName" value={filterAccountName} onChange={(e) => setFilterAccountName(e.target.value)} placeholder={getLabel("filterAccountName", lang)} className={cn("h-8 text-xs w-44 bg-white", isRtl ? "pr-8" : "pl-8")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filterCountry" className="text-[11px] text-slate-500">{getLabel("country", lang)}</Label>
            <select id="filterCountry" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="h-8 rounded-lg border border-input bg-white px-2.5 text-xs w-40">
              <option value="all">{getLabel("allCountries", lang)}</option>
              {uniqueCountries.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filterBranch" className="text-[11px] text-slate-500">{getLabel("branchType", lang)}</Label>
            <select id="filterBranch" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="h-8 rounded-lg border border-input bg-white px-2.5 text-xs w-40">
              <option value="all">{getLabel("allBranches", lang)}</option>
              {uniqueBranches.map((b) => (<option key={b.code} value={b.code}>{b.name}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filterAccountType" className="text-[11px] text-slate-500">{getLabel("accountTitle", lang)}</Label>
            <select id="filterAccountType" value={filterAccountType} onChange={(e) => setFilterAccountType(e.target.value)} className="h-8 rounded-lg border border-input bg-white px-2.5 text-xs w-40">
              <option value="all">{getLabel("allAccountTypes", lang)}</option>
              {uniqueAccountTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filterSubType" className="text-[11px] text-slate-500">{getLabel("subType", lang)}</Label>
            <select id="filterSubType" value={filterSubType} onChange={(e) => setFilterSubType(e.target.value)} className="h-8 rounded-lg border border-input bg-white px-2.5 text-xs w-40">
              <option value="all">{getLabel("allSubTypes", lang)}</option>
              {uniqueSubTypes.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleApplyFilters} className="h-8 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 rounded-lg text-xs">{getLabel("apply", lang)}</Button>
            <Button type="button" onClick={handleResetFilters} className="h-8 bg-[#64748b] hover:bg-[#475569] text-white px-4 rounded-lg text-xs">{getLabel("reset", lang)}</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f5f9] border-b text-slate-500 uppercase tracking-wider text-[10px]">
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("srNo", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("superAdmin", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("accountNo", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("accountName", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("accountTitle", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("subType", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("categoryCol", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("branchType", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("selectBranch", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200", isRtl ? "border-l text-right" : "border-r text-left")}>{getLabel("country", lang)}</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200 font-mono text-center", isRtl ? "border-l" : "border-r")}>Currency</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200 text-center", isRtl ? "border-l" : "border-r")}>Company #</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200 text-center", isRtl ? "border-l" : "border-r")}>Bank #</th>
                <th className={cn("px-3 py-2.5 font-bold border-slate-200 text-center", isRtl ? "border-l" : "border-r")}>{getLabel("contacts", lang)}</th>
                <th className="px-3 py-2.5 font-bold text-center">{getLabel("view", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {reportLoading ? (
                <tr><td colSpan={15} className="text-center py-8 text-slate-400">Loading accounts report...</td></tr>
              ) : filteredReportRows.length > 0 ? (
                filteredReportRows.map((row, index) => {
                  const hasCompany = (row.accountSerialNumber ?? (index + 1)) % 6 !== 0;
                  const hasBank = (row.accountSerialNumber ?? (index + 1)) % 4 !== 0;
                  return (
                    <tr key={row.accountId} className="border-b hover:bg-slate-50 transition-colors">
                      <td className={cn("px-3 py-2 border-slate-200 font-medium text-slate-600", isRtl ? "border-l" : "border-r")}>{index + 1}</td>
                      <td className={cn("px-3 py-2 border-slate-200", isRtl ? "border-l" : "border-r")}>
                        <div className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center bg-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          </span>
                          <span className="text-[10px] font-bold text-slate-700">SA</span>
                        </div>
                      </td>
                      <td className={cn("px-3 py-2 border-slate-200 font-bold font-mono text-blue-600", isRtl ? "border-l text-right" : "border-r text-left")}>{row.journalCode} / {row.accountCode}</td>
                      <td className={cn("px-3 py-2 border-slate-200 font-bold text-slate-900", isRtl ? "border-l text-right" : "border-r text-left")}>{row.accountName}</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-slate-600 font-medium", isRtl ? "border-l text-right" : "border-r text-left")}>{row.accountCategory} Account</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-slate-600", isRtl ? "border-l text-right" : "border-r text-left")}>{row.subType}</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-slate-600", isRtl ? "border-l text-right" : "border-r text-left")}>{row.accountCategory}</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-slate-600", isRtl ? "border-l text-right" : "border-r text-left")}>{row.branchType === "Main Branch" ? "Main Branch" : "City Branch"}</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-slate-600 font-medium", isRtl ? "border-l text-right" : "border-r text-left")}>{row.branchName}</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-slate-600 font-medium", isRtl ? "border-l text-right" : "border-r text-left")}>{row.countryName}</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-slate-600 font-semibold font-mono text-center", isRtl ? "border-l" : "border-r")}>{row.currency}</td>
                      <td className={cn("px-3 py-2 border-slate-200 text-center", isRtl ? "border-l" : "border-r")}>
                        {hasCompany ? (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">-</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">{getLabel("noCompany", lang)}</span>
                        )}
                      </td>
                      <td className={cn("px-3 py-2 border-slate-200 text-center", isRtl ? "border-l" : "border-r")}>
                        {hasBank ? (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">-</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">{getLabel("noCompany", lang)}</span>
                        )}
                      </td>
                      <td className={cn("px-3 py-2 border-slate-200 text-center", isRtl ? "border-l" : "border-r")}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-500 border border-rose-100">
                            <Phone className="h-2.5 w-2.5" />
                          </span>
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-50 text-purple-500 border border-purple-100">
                            <Mail className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/accounts/view?accountId=${row.accountId}`)}
                          className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          {getLabel("view", lang)}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={15} className="text-center py-8 text-slate-400">No accounts found matching search filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
