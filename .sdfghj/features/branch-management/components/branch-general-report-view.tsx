"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronRight, Download, Expand, Eye, FileDown, FileSpreadsheet, Globe2, Minimize2, MoreVertical, Pencil, Printer, Search, ShieldCheck, Users } from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { ReportFilterMenu } from "@/components/reports/report-filter-menu";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { BranchRecordProfile, type BranchProfileSection } from "@/features/branches/components/branch-record-profile";
import { cn } from "@/lib/utils";

type CityBranchNode = {
  id: string;
  cityName: string;
  name: string;
  code: string;
  localCurrency: string;
  status: string;
  address?: string | null;
  companyId?: string | null;
  ownerName?: string | null;
  contacts?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type MainBranchNode = {
  id: string;
  name: string;
  code: string;
  localCurrency: string;
  status: string;
  isMain: boolean;
  address?: string | null;
  companyId?: string | null;
  ownerName?: string | null;
  contacts?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
  cityBranches: CityBranchNode[];
};

type CountryNode = {
  id: string;
  name: string;
  code: string;
  currency: string;
  status: string;
  totalMainBranches: number;
  totalCityBranches: number;
  totalActiveMainBranches: number;
  totalActiveCityBranches: number;
  mainBranches: MainBranchNode[];
};

type BranchGeneralReportResponse = {
  summary: {
    superAdminName: string;
    totalCountries: number;
    totalMainBranches: number;
    totalCityBranches: number;
    totalActiveUsers: number;
    totalActiveBranches: number;
  };
  countries: CountryNode[];
  generatedAt: string;
};

type HierarchyDetail =
  | { level: "Country"; country: CountryNode; branch?: never; city?: never }
  | { level: "Main Branch"; country: CountryNode; branch: MainBranchNode; city?: never }
  | { level: "City Branch"; country: CountryNode; branch: MainBranchNode; city: CityBranchNode };

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesText(haystack: string, query: string) {
  if (!query) return true;
  return normalizeSearch(haystack).includes(normalizeSearch(query));
}

function csvEscape(value: string) {
  const v = (value ?? "").toString();
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadTextFile(filename: string, contents: string, mime = "text/plain") {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildCountryLabel(country: CountryNode) {
  return `${country.name} (${country.code})`;
}

function buildBranchLabel(branch: MainBranchNode) {
  return `${branch.name} (${branch.code})`;
}

function buildCityLabel(city: CityBranchNode) {
  return `${city.cityName} - ${city.name} (${city.code})`;
}

function openCountryBranchEdit(branchId: string) {
  window.location.href = `/dashboard/new-entry/branch-entry/country-branch?editId=${encodeURIComponent(branchId)}`;
}

function openCityBranchEdit(branchId: string) {
  window.location.href = `/dashboard/new-entry/branch-entry/city-branch?editId=${encodeURIComponent(branchId)}`;
}

function openPrintView() {
  window.print();
}

export function BranchGeneralReportView({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string | null;
}) {
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [data, setData] = useState<BranchGeneralReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<HierarchyDetail | null>(null);

  const [draftQuery, setDraftQuery] = useState("");
  const [draftCountryId, setDraftCountryId] = useState("all");
  const [draftStatus, setDraftStatus] = useState("all");

  const [query, setQuery] = useState("");
  const [countryId, setCountryId] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiGet<BranchGeneralReportResponse>("/api/branch-management/general-report");
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!actionsOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActionsOpen(false);
    }

    function onMouseDown(e: MouseEvent) {
      const root = actionsRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setActionsOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [actionsOpen]);

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) return;
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const countryOptions: SearchSelectOption[] = useMemo(() => {
    return [
      { value: "all", label: "All Countries", keywords: "all countries" },
      ...(data?.countries ?? []).map((country) => ({
        value: country.id,
        label: buildCountryLabel(country),
        keywords: [country.name, country.code, country.currency].filter(Boolean).join(" ")
      }))
    ];
  }, [data]);

  const filteredCountries = useMemo(() => {
    const source = data?.countries ?? [];
    const q = query.trim();
    const countryFilter = countryId !== "all" ? countryId : null;
    const statusFilter = status !== "all" ? status : null;

    return source
      .filter((country) => (countryFilter ? country.id === countryFilter : true))
      .filter((country) => {
        if (!statusFilter) return true;
        return country.status === statusFilter;
      })
      .map((country) => {
        const countryMatches = q
          ? matchesText(`${country.name} ${country.code} ${country.currency} ${country.status}`, q)
          : true;

        const mainBranches = country.mainBranches
          .filter((branch) => {
            if (statusFilter && branch.status !== statusFilter) return false;
            return true;
          })
          .map((branch) => {
            const branchMatches = q ? matchesText(`${branch.name} ${branch.code} ${branch.localCurrency} ${branch.status}`, q) : true;

            const cityBranches = branch.cityBranches.filter((city) => {
              if (statusFilter && city.status !== statusFilter) return false;
              if (!q) return true;
              return matchesText(`${city.cityName} ${city.name} ${city.code} ${city.localCurrency} ${city.status}`, q);
            });

            if (q && !countryMatches && !branchMatches && !cityBranches.length) return null;

            return {
              ...branch,
              cityBranches: countryMatches || branchMatches ? branch.cityBranches.filter((city) => !statusFilter || city.status === statusFilter) : cityBranches
            };
          })
          .filter((branch): branch is MainBranchNode => branch !== null);

        if (q && !countryMatches && !mainBranches.length) return null;

        return {
          ...country,
          mainBranches: countryMatches ? country.mainBranches.filter((branch) => !statusFilter || branch.status === statusFilter).map((branch) => ({
            ...branch,
            cityBranches: branch.cityBranches.filter((city) => !statusFilter || city.status === statusFilter)
          })) : mainBranches
        };
      })
      .filter((country): country is CountryNode => country !== null);
  }, [countryId, data?.countries, query, status]);

  const visibleSummary = useMemo(() => {
    const totalCountries = filteredCountries.length;
    const totalMainBranches = filteredCountries.reduce((sum, country) => sum + country.mainBranches.length, 0);
    const totalCityBranches = filteredCountries.reduce(
      (sum, country) => sum + country.mainBranches.reduce((branchSum, branch) => branchSum + branch.cityBranches.length, 0),
      0
    );
    const totalActiveBranches =
      filteredCountries.reduce((sum, country) => sum + country.mainBranches.filter((branch) => branch.status === "active").length, 0) +
      filteredCountries.reduce(
        (sum, country) => sum + country.mainBranches.reduce((branchSum, branch) => branchSum + branch.cityBranches.filter((city) => city.status === "active").length, 0),
        0
      );

    return {
      totalCountries,
      totalMainBranches,
      totalCityBranches,
      totalActiveBranches
    };
  }, [filteredCountries]);

  function exportCsv() {
    if (!data) return;

    const rows: string[][] = [
      ["Level", "Country", "Country Code", "Main Branch", "Main Branch Code", "City", "City Branch", "City Branch Code", "Status", "Currency"]
    ];

    for (const country of filteredCountries) {
      rows.push(["Country", country.name, country.code, "", "", "", "", "", country.status, country.currency]);
      for (const branch of country.mainBranches) {
        rows.push([
          "Main Branch",
          country.name,
          country.code,
          branch.name,
          branch.code,
          "",
          "",
          "",
          branch.status,
          branch.localCurrency
        ]);
        for (const city of branch.cityBranches) {
          rows.push([
            "City Branch",
            country.name,
            country.code,
            branch.name,
            branch.code,
            city.cityName,
            city.name,
            city.code,
            city.status,
            city.localCurrency
          ]);
        }
      }
    }

    const csv = rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\r\n");
    downloadTextFile(`branch-general-report_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  }

  function viewCountry(country: CountryNode) {
    setSelectedDetail({ level: "Country", country });
  }

  function viewMainBranch(country: CountryNode, branch: MainBranchNode) {
    setSelectedDetail({ level: "Main Branch", country, branch });
  }

  function viewCityBranch(country: CountryNode, branch: MainBranchNode, city: CityBranchNode) {
    setSelectedDetail({ level: "City Branch", country, branch, city });
  }

  function printDetail(detail: HierarchyDetail) {
    setSelectedDetail(detail);
    window.setTimeout(() => window.print(), 120);
  }

  async function openFullscreen() {
    if (typeof document === "undefined") return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setExpandedView((current) => !current);
    }
  }

  const containerClassName = expandedView ? "fixed inset-0 z-50 overflow-auto bg-background p-4 md:p-6" : "space-y-4";

  return (
    <div className={containerClassName}>
      <ReportPageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setExpandedView((current) => !current)}
            >
              {expandedView ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Expand className="h-4 w-4" aria-hidden />}
              {expandedView ? "Shrink View" : "Expand View"}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={openFullscreen}>
              <Expand className="h-4 w-4" aria-hidden />
              Open Full Screen
            </Button>
            <div className="relative" ref={actionsRef}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Report actions"
                disabled={loading}
                onClick={() => setActionsOpen((v) => !v)}
              >
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>

              {actionsOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-lg border bg-background shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setActionsOpen(false);
                      window.print();
                    }}
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Print
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setActionsOpen(false);
                      window.print();
                    }}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    PDF Download
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setActionsOpen(false);
                      exportCsv();
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" aria-hidden />
                    Excel Download
                  </button>
                </div>
              ) : null}
            </div>

            <ReportFilterMenu ariaLabel="Branch filters" disabled={loading}>
              <div className="border-b bg-muted/10 px-3 py-2 text-sm font-semibold">Branch Filters</div>
              <div className="space-y-3 p-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      className="h-9 pl-9 text-xs"
                      value={draftQuery}
                      onChange={(e) => setDraftQuery(e.target.value)}
                      placeholder="Search country, code, branch, or city"
                    />
                  </div>
                </div>

                <SearchSelect
                  label="Country"
                  value={draftCountryId}
                  placeholder="All countries"
                  options={countryOptions}
                  onValueChange={setDraftCountryId}
                  disabled={loading}
                />

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Status</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    disabled={loading}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDraftQuery("");
                      setDraftCountryId("all");
                      setDraftStatus("all");
                      setQuery("");
                      setCountryId("all");
                      setStatus("all");
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setQuery(draftQuery.trim());
                      setCountryId(draftCountryId);
                      setStatus(draftStatus);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </ReportFilterMenu>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Globe2} label="Countries" value={visibleSummary.totalCountries} />
        <StatCard icon={Building2} label="Main Branches" value={visibleSummary.totalMainBranches} />
        <StatCard icon={ChevronRight} label="City Branches" value={visibleSummary.totalCityBranches} />
        <StatCard icon={Users} label="Active Users" value={data?.summary.totalActiveUsers ?? 0} />
        <StatCard icon={ShieldCheck} label="Active Branches" value={visibleSummary.totalActiveBranches} />
      </section>

      {error ? (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-3 xl:grid-cols-5">
            <InfoBlock label="Super Admin" value={data?.summary.superAdminName ?? "-"} />
            <InfoBlock label="Countries" value={String(data?.summary.totalCountries ?? 0)} />
            <InfoBlock label="Main Branches" value={String(data?.summary.totalMainBranches ?? 0)} />
            <InfoBlock label="City Branches" value={String(data?.summary.totalCityBranches ?? 0)} />
            <InfoBlock label="Generated" value={data ? new Date(data.generatedAt).toLocaleString() : "-"} />
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[1.35fr_0.65fr_0.65fr_0.65fr_0.6fr_1fr] gap-0 border-b bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-slate-800">
              <div>Country / Branch Hierarchy</div>
              <div className="text-center">Main Branches</div>
              <div className="text-center">City Branches</div>
              <div className="text-center">Status</div>
              <div className="text-center">Currency</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="divide-y">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading branch hierarchy...</div>
              ) : filteredCountries.length ? (
                filteredCountries.map((country) => (
                  <details key={country.id} className="group">
                    <summary className="cursor-pointer list-none px-4 py-3 hover:bg-muted/40">
                      <div className="grid grid-cols-[1.35fr_0.65fr_0.65fr_0.65fr_0.6fr_1fr] items-center gap-3">
                        <div className="flex items-center gap-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
                          <div>
                            <div className="text-sm font-semibold text-foreground">{country.name}</div>
                            <div className="text-xs text-muted-foreground">{country.code}</div>
                          </div>
                        </div>
                        <div className="text-center text-sm font-semibold tabular-nums">{country.totalMainBranches}</div>
                        <div className="text-center text-sm font-semibold tabular-nums">{country.totalCityBranches}</div>
                        <div className="text-center">
                          <StatusPill status={country.status} />
                        </div>
                        <div className="text-center text-sm font-semibold">{country.currency}</div>
                        <HierarchyActions
                          onView={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            viewCountry(country);
                          }}
                          onPrint={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            printDetail({ level: "Country", country });
                          }}
                          onPdf={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            printDetail({ level: "Country", country });
                          }}
                        />
                      </div>
                    </summary>

                    <div className="border-t bg-muted/10 px-4 py-4">
                      <div className="overflow-hidden rounded-lg border bg-background">
                        <div className="grid grid-cols-[1.2fr_0.65fr_0.55fr_0.55fr_1.15fr] gap-0 border-b bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <div>Main Branch</div>
                          <div>Code</div>
                          <div>City Branches</div>
                          <div>Status</div>
                          <div className="text-right">Actions</div>
                        </div>

                        <div className="divide-y">
                          {country.mainBranches.map((branch) => (
                            <details key={branch.id} className="group">
                              <summary className="cursor-pointer list-none px-4 py-3 hover:bg-muted/30">
                                <div className="grid grid-cols-[1.2fr_0.65fr_0.55fr_0.55fr_1.15fr] items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
                                    <div>
                                      <div className="text-sm font-medium text-foreground">{branch.name}</div>
                                      <div className="text-[11px] text-muted-foreground">{branch.localCurrency}</div>
                                    </div>
                                  </div>
                                  <div className="text-sm font-semibold">{branch.code}</div>
                                  <div className="text-sm font-semibold tabular-nums">{branch.cityBranches.length}</div>
                                  <div className="text-left">
                                    <StatusPill status={branch.status} />
                                  </div>
                                  <HierarchyActions
                                    onView={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      viewMainBranch(country, branch);
                                    }}
                                    onEdit={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      openCountryBranchEdit(branch.id);
                                    }}
                                    onPrint={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      printDetail({ level: "Main Branch", country, branch });
                                    }}
                                    onPdf={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      printDetail({ level: "Main Branch", country, branch });
                                    }}
                                  />
                                </div>
                              </summary>

                              <div className="border-t bg-background px-4 py-3">
                                <div className="overflow-hidden rounded-md border">
                                  <div className="grid grid-cols-[0.9fr_1fr_0.55fr_0.55fr_0.55fr_1.1fr] gap-0 bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <div>City</div>
                                    <div>City Branch</div>
                                    <div>Code</div>
                                    <div>Status</div>
                                    <div>Currency</div>
                                    <div className="text-right">Actions</div>
                                  </div>
                                  <div className="divide-y">
                                    {branch.cityBranches.length ? (
                                      branch.cityBranches.map((cityBranch) => (
                                        <div key={cityBranch.id} className="grid grid-cols-[0.9fr_1fr_0.55fr_0.55fr_0.55fr_1.1fr] items-center gap-0 px-3 py-2 text-sm">
                                          <div className="text-foreground">{cityBranch.cityName}</div>
                                          <div className="font-medium text-foreground">{cityBranch.name}</div>
                                          <div className="font-semibold text-foreground">{cityBranch.code}</div>
                                          <div>
                                            <StatusPill status={cityBranch.status} />
                                          </div>
                                          <div className="font-semibold text-foreground">{cityBranch.localCurrency}</div>
                                          <HierarchyActions
                                            onView={() => viewCityBranch(country, branch, cityBranch)}
                                            onEdit={() => openCityBranchEdit(cityBranch.id)}
                                            onPrint={() => printDetail({ level: "City Branch", country, branch, city: cityBranch })}
                                            onPdf={() => printDetail({ level: "City Branch", country, branch, city: cityBranch })}
                                          />
                                        </div>
                                      ))
                                    ) : (
                                      <div className="px-3 py-3 text-sm text-muted-foreground">No city branches under this main branch.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No branch hierarchy found for the selected filters.</div>
              )}
            </div>
          </div>

          {selectedDetail ? (
            <BranchHierarchyDetailPanel
              detail={selectedDetail}
              onClose={() => setSelectedDetail(null)}
              onEdit={() => {
                if (selectedDetail.level === "Main Branch") openCountryBranchEdit(selectedDetail.branch.id);
                if (selectedDetail.level === "City Branch") openCityBranchEdit(selectedDetail.city.id);
              }}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function HierarchyActions({
  onView,
  onEdit,
  onPrint,
  onPdf
}: {
  onView: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onEdit?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onPrint: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onPdf: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button type="button" size="sm" variant="outline" className="h-8 px-2" aria-label="View Branch" title="View Branch" onClick={onView}>
        <Eye className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden 2xl:inline">View</span>
      </Button>
      {onEdit ? (
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" aria-label="Edit Branch" title="Edit Branch" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden 2xl:inline">Edit</span>
        </Button>
      ) : null}
      <Button type="button" size="sm" variant="outline" className="h-8 px-2" aria-label="Print Branch" title="Print Branch" onClick={onPrint}>
        <Printer className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden 2xl:inline">Print</span>
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8 px-2" aria-label="Download PDF" title="Download PDF" onClick={onPdf}>
        <FileDown className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden 2xl:inline">PDF</span>
      </Button>
    </div>
  );
}

function BranchHierarchyDetailPanel({
  detail,
  onClose,
  onEdit
}: {
  detail: HierarchyDetail;
  onClose: () => void;
  onEdit: () => void;
}) {
  const branch = detail.level === "Country" ? null : detail.branch;
  const city = detail.level === "City Branch" ? detail.city : null;
  const record = city ?? branch;
  const contactText = normalizeContactsForDisplay(record?.contacts);
  const identity = [
    { label: "Record Type", value: detail.level },
    { label: "Country", value: detail.country.name },
    { label: "Main Branch", value: branch?.name },
    { label: "City Branch", value: city?.name },
    { label: "Branch Code", value: record?.code || detail.country.code },
    { label: "Status", value: record?.status || detail.country.status },
    { label: "Created Date", value: record?.createdAt ? new Date(record.createdAt).toLocaleString() : "" },
    { label: "Last Updated", value: record?.updatedAt ? new Date(record.updatedAt).toLocaleString() : "" }
  ];
  const sections: BranchProfileSection[] = [
    {
      title: "Country Details",
      items: [
        { label: "Country Name", value: detail.country.name },
        { label: "Country Code", value: detail.country.code },
        { label: "Currency", value: detail.country.currency },
        { label: "Status", value: detail.country.status }
      ]
    },
    {
      title: "Main Branch Details",
      items: [
        { label: "Branch Name", value: branch?.name },
        { label: "Branch Code", value: branch?.code },
        { label: "Currency", value: branch?.localCurrency },
        { label: "City Branches", value: branch ? String(branch.cityBranches.length) : "" }
      ]
    },
    {
      title: "City Branch Details",
      items: [
        { label: "City", value: city?.cityName },
        { label: "City Branch", value: city?.name },
        { label: "Branch Code", value: city?.code },
        { label: "Currency", value: city?.localCurrency }
      ]
    },
    {
      title: "Company Information",
      items: [
        { label: "Company ID", value: record?.companyId },
        { label: "Company Name", value: "" },
        { label: "Legal Name", value: "" },
        { label: "Base Currency", value: record?.localCurrency || detail.country.currency }
      ]
    },
    {
      title: "Owner Information",
      items: [
        { label: "Owner Name", value: record?.ownerName },
        { label: "Owner Code", value: "" },
        { label: "Owner Source", value: "" },
        { label: "Role / Branch", value: detail.level }
      ]
    },
    {
      title: "Contact Information",
      items: [
        { label: "Address", value: record?.address },
        { label: "Contacts", value: contactText },
        { label: "Phone", value: findContactValue(record?.contacts, "phone") },
        { label: "Email", value: findContactValue(record?.contacts, "email") }
      ]
    },
    {
      title: "Permissions",
      items: [
        { label: "Permission Template", value: "" },
        { label: "Permission Grants", value: "" }
      ]
    },
    {
      title: "Audit Information",
      items: [
        { label: "Record ID", value: record?.id || detail.country.id },
        { label: "Created Date", value: record?.createdAt ? new Date(record.createdAt).toLocaleString() : "" },
        { label: "Last Updated", value: record?.updatedAt ? new Date(record.updatedAt).toLocaleString() : "" },
        { label: "Profile Status", value: record?.status || detail.country.status }
      ]
    }
  ];

  return (
    <div className="rounded-xl border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-slate-900 px-4 py-2 text-white dark:bg-slate-800">
        <div>
          <div className="text-sm font-semibold">View Mode - {detail.level}</div>
          <div className="text-xs text-slate-300">Complete branch hierarchy detail</div>
        </div>
        <div className="flex items-center gap-2">
          {detail.level !== "Country" ? (
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={openPrintView}>
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Print
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={openPrintView}>
            <FileDown className="h-3.5 w-3.5" aria-hidden />
            PDF
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="p-4">
        <BranchRecordProfile
          title={`${detail.level} ERP Profile`}
          subtitle="Complete branch hierarchy profile with missing and completed information."
          identity={identity}
          sections={sections}
        />
      </div>
    </div>
  );
}

function normalizeContactsForDisplay(value: unknown) {
  if (!Array.isArray(value)) return "";
  const contacts = value
    .map((row) => {
      const item = row as { type?: string; value?: string };
      const type = String(item.type ?? "").trim();
      const contactValue = String(item.value ?? "").trim();
      return type && contactValue ? `${type}: ${contactValue}` : "";
    })
    .filter(Boolean);
  return contacts.join(", ");
}

function findContactValue(value: unknown, key: string) {
  if (!Array.isArray(value)) return "";
  const row = value.find((item) => {
    const contact = item as { type?: string; value?: string };
    return String(contact.type ?? "").toLowerCase().includes(key);
  }) as { value?: string } | undefined;
  return row?.value ?? "";
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", tone)}>
      {status}
    </span>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
