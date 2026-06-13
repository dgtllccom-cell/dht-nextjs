"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { 
  ChevronRight, 
  Expand,
  FileSpreadsheet, 
  Minimize2, 
  Printer, 
  Search, 
  Mail, 
  PhoneCall,
  ShieldCheck
} from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { openA4ReportWindow } from "@/lib/reports/open-a4-report-window";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type SuperAdminBranchNode = {
  id: string;
  name: string;
  code: string;
  currency: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  ownerName?: string | null;
  contacts?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
  companyName?: string | null;
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
  superAdminBranches: SuperAdminBranchNode[];
  countries: CountryNode[];
  generatedAt: string;
};

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

function getCountryTags(countryName: string) {
  const name = countryName.toLowerCase();
  if (name.includes("pakistan")) {
    return ["Electronics", "Mobile Devices", "Import Products"];
  } else if (name.includes("india")) {
    return ["Software Tech", "Customer Services", "Outsourcing Center"];
  } else if (name.includes("afghanistan")) {
    return ["Transit Trade", "Agricultural Goods", "Border Cargo"];
  } else if (name.includes("dubai") || name.includes("emirates")) {
    return ["Logistic Hub", "Corporate Services", "Regional HQ"];
  }
  return ["General Operations", "Import / Export", "Local Branch Office"];
}

function findContactValue(value: unknown, key: string): string {
  if (!value) return "";
  let arr: unknown = value;
  if (typeof value === "string") {
    try {
      arr = JSON.parse(value);
    } catch {
      return "";
    }
  }
  if (!Array.isArray(arr)) return "";
  const row = arr.find((item) => {
    if (item && typeof item === "object" && "type" in item && "value" in item) {
      const contact = item as { type?: string; value?: string };
      return String(contact.type ?? "").toLowerCase().includes(key.toLowerCase());
    }
    return false;
  }) as { value?: string } | undefined;
  return row?.value ?? "";
}

function openCountryBranchEdit(branchId: string) {
  window.location.href = `/dashboard/new-entry/branch-entry/country-branch?editId=${encodeURIComponent(branchId)}`;
}

function openCityBranchEdit(branchId: string) {
  window.location.href = `/dashboard/new-entry/branch-entry/city-branch?editId=${encodeURIComponent(branchId)}`;
}

function openSuperAdminBranchEdit(branchId: string) {
  window.location.href = `/dashboard/new-entry/branches/super-admin?editId=${encodeURIComponent(branchId)}`;
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

  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState(""); // "", "branch", "country", "city"
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  
  // Popover states
  const [activeContactPopup, setActiveContactPopup] = useState<{ id: string; type: "phone" | "email" } | null>(null);
  const [activeProductPopup, setActiveProductPopup] = useState<string | null>(null);
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null);

  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);

  async function viewCountryBranch(branchId: string, countryName: string) {
    try {
      setViewLoadingId(branchId);
      const res = await fetch(`/api/branch-management/country-branches?id=${encodeURIComponent(branchId)}`, {
        cache: "no-store"
      });
      const json = await res.json();
      const row = json.countryBranches?.[0];
      if (!row) throw new Error("Main branch not found.");
      
      const contactsArray = Array.isArray(row.contacts) ? row.contacts : [];
      const phoneVal = contactsArray.find((c: any) => String(c.type || "").toLowerCase().includes("phone") || String(c.type || "").toLowerCase().includes("mobile"))?.value || row.phone || "";
      const emailVal = contactsArray.find((c: any) => String(c.type || "").toLowerCase().includes("email"))?.value || row.email || "";
      const whatsappVal = contactsArray.find((c: any) => String(c.type || "").toLowerCase().includes("whatsapp"))?.value || "";

      openA4ReportWindow({
        title: "Country Main Branch Report",
        subtitle: "Branch Profile Report (A4)",
        autoPrint: false,
        branchData: {
          serialNumber: row.id.slice(0, 4).toUpperCase(),
          branchStatus: row.status || "Active",
          branchCode: row.code || "-",
          branchType: "MAIN",
          country: countryName,
          currency: row.local_currency || "USD",
          
          branchName: row.name || `${countryName} Main Branch`,
          createdDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined,
          updatedDate: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : undefined,
          createdBy: "Super Admin",
          updatedBy: "Super Admin",
          establishedOn: "-",
          taxRegNo: "-",
          ntnGstNo: "-",

          city: "-",
          cityCode: "-",
          stateProvince: "-",
          areaRegion: "-",
          zipCode: "-",
          fullAddress: row.address || "-",

          ownerName: row.owner_name || "-",
          ownerCode: "OWN-0001",
          fatherHusbandName: "-",
          cnicId: "-",
          nationality: "Pakistani",
          designation: "Country Admin",
          ownershipType: "Individual",
          ownershipPercent: "100%",
          ownerPhone: phoneVal || "-",
          ownerWhatsApp: whatsappVal || "-",
          ownerEmail: emailVal || "-",
          ownerAltEmail: "-",
          ownerLandline: "-",
          ownerWebsite: "-",

          companyName: "Asmat & Brothers (Pvt) Ltd.",
          companyCode: "COMP-001",
          companyType: "Private Limited",
          companyRegNo: "-",
          companyIncDate: "-",
          companyTaxRegNo: "-",
          companyNtnGstNo: "-",
          companyStatus: "Active",
          companyPhone: phoneVal || "-",
          companyEmail: emailVal || "-",
          companyWebsite: "-",
          companyOfficeAddress: row.address || "-",

          allowedPermissions: row.permission_grants || [],
          remarks: "Country Main Branch details profile."
        }
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load branch details.");
    } finally {
      setViewLoadingId(null);
    }
  }

  async function viewCityBranch(branchId: string, countryName: string, cityName: string) {
    try {
      setViewLoadingId(branchId);
      const res = await fetch(`/api/branch-management/city-branches?id=${encodeURIComponent(branchId)}`, {
        cache: "no-store"
      });
      const json = await res.json();
      const row = json.cityBranches?.[0];
      if (!row) throw new Error("City branch not found.");
      
      const contactsArray = Array.isArray(row.contacts) ? row.contacts : [];
      const phoneVal = contactsArray.find((c: any) => String(c.type || "").toLowerCase().includes("phone") || String(c.type || "").toLowerCase().includes("mobile"))?.value || row.phone || "";
      const emailVal = contactsArray.find((c: any) => String(c.type || "").toLowerCase().includes("email"))?.value || row.email || "";
      const whatsappVal = contactsArray.find((c: any) => String(c.type || "").toLowerCase().includes("whatsapp"))?.value || "";

      openA4ReportWindow({
        title: "City Branch Report",
        subtitle: "Branch Profile Report (A4)",
        autoPrint: false,
        branchData: {
          serialNumber: row.id.slice(0, 4).toUpperCase(),
          branchStatus: row.status || "Active",
          branchCode: row.code || "-",
          branchType: "CITY",
          country: countryName,
          currency: row.local_currency || "USD",
          
          branchName: row.name || `${cityName} City Branch`,
          createdDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined,
          updatedDate: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : undefined,
          createdBy: "Super Admin",
          updatedBy: "Super Admin",
          establishedOn: "-",
          taxRegNo: "-",
          ntnGstNo: "-",

          city: cityName,
          cityCode: row.code?.split("-")?.[1] || "-",
          stateProvince: "-",
          areaRegion: "-",
          zipCode: "-",
          fullAddress: row.address || "-",

          ownerName: row.owner_name || "-",
          ownerCode: "OWN-0001",
          fatherHusbandName: "-",
          cnicId: "-",
          nationality: "Pakistani",
          designation: "Branch Manager",
          ownershipType: "Individual",
          ownershipPercent: "100%",
          ownerPhone: phoneVal || "-",
          ownerWhatsApp: whatsappVal || "-",
          ownerEmail: emailVal || "-",
          ownerAltEmail: "-",
          ownerLandline: "-",
          ownerWebsite: "-",

          companyName: "Asmat & Brothers (Pvt) Ltd.",
          companyCode: "COMP-001",
          companyType: "Private Limited",
          companyRegNo: "-",
          companyIncDate: "-",
          companyTaxRegNo: "-",
          companyNtnGstNo: "-",
          companyStatus: "Active",
          companyPhone: phoneVal || "-",
          companyEmail: emailVal || "-",
          companyWebsite: "-",
          companyOfficeAddress: row.address || "-",

          allowedPermissions: row.permission_grants || [],
          remarks: "City Branch details profile."
        }
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load branch details.");
    } finally {
      setViewLoadingId(null);
    }
  }

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
    function handleGlobalClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".popup-trigger") && !target.closest(".popup-content") &&
          !target.closest(".action-dropdown-trigger") && !target.closest(".action-dropdown-content")) {
        setActiveContactPopup(null);
        setActiveProductPopup(null);
        setActiveActionDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  const filteredSuperAdminBranches = useMemo(() => {
    if (!data?.superAdminBranches) return [];
    const q = searchQuery.toLowerCase().trim();
    return data.superAdminBranches.filter((b) => {
      if (searchType === "country" || searchType === "city") return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.companyName || "").toLowerCase().includes(q) ||
        (b.ownerName || "").toLowerCase().includes(q)
      );
    });
  }, [data?.superAdminBranches, searchQuery, searchType]);

  const filteredCountries = useMemo(() => {
    if (!data?.countries) return [];
    const q = searchQuery.toLowerCase().trim();

    return data.countries
      .map((country) => {
        const countryMatches = q ? matchesText(`${country.name} ${country.code} ${country.currency} ${country.status}`, q) : true;

        const mainBranches = country.mainBranches
          .map((branch) => {
            const branchMatches = q ? matchesText(`${branch.name} ${branch.code} ${branch.localCurrency} ${branch.status}`, q) : true;

            const cityBranches = branch.cityBranches.filter((city) => {
              if (searchType === "branch") return false;
              if (!q) return true;
              return matchesText(`${city.cityName} ${city.name} ${city.code} ${city.localCurrency} ${city.status}`, q);
            });

            if (searchType === "city" && !cityBranches.length) return null;
            if (searchType === "branch" && !branchMatches) return null;

            if (q && !countryMatches && !branchMatches && !cityBranches.length) return null;

            return {
              ...branch,
              cityBranches: countryMatches || branchMatches ? branch.cityBranches : cityBranches
            };
          })
          .filter((branch): branch is MainBranchNode => branch !== null);

        if (searchType === "country" && !countryMatches) return null;
        if (q && !countryMatches && !mainBranches.length) return null;

        return {
          ...country,
          mainBranches
        };
      })
      .filter((country): country is CountryNode => country !== null);
  }, [data?.countries, searchQuery, searchType]);

  const visibleSummary = useMemo(() => {
    const totalCountries = filteredCountries.length;
    const totalMainBranches = filteredCountries.reduce((sum, country) => sum + country.mainBranches.length, 0);
    const totalCityBranches = filteredCountries.reduce(
      (sum, country) => sum + country.mainBranches.reduce((branchSum, branch) => branchSum + branch.cityBranches.length, 0),
      0
    );

    return {
      totalCountries,
      totalMainBranches,
      totalCityBranches
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

  function toggleCountryRow(countryId: string) {
    setExpandedCountries((prev) => ({
      ...prev,
      [countryId]: !prev[countryId]
    }));
  }

  const containerClassName = expandedView 
    ? "fixed inset-0 z-50 overflow-auto bg-slate-50 p-4 md:p-6 font-sans text-xs text-slate-800" 
    : "space-y-4 font-sans text-xs text-slate-800 bg-slate-50/50 p-4 rounded-xl border";

  return (
    <div className={containerClassName}>
      
      {/* Top Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">{subtitle || "Detail summary branch configuration monitoring"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-1 bg-white"
            onClick={() => setExpandedView((current) => !current)}
          >
            {expandedView ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
            {expandedView ? "Shrink View" : "Expand View"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-1 bg-white"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Top Control Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Left Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900 leading-tight">Admin<br />Branch</div>
              <div className="text-[10px] text-slate-400">Branch detail<br />monitoring</div>
            </div>

            <select
              id="searchType"
              className="h-9 w-32 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="">Select Category</option>
              <option value="branch">Branch</option>
              <option value="country">Country</option>
              <option value="city">City</option>
            </select>

            <div className="relative flex items-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm min-w-[240px]">
              <Search className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                id="branchSearch"
                placeholder="Search branch, city, country..."
                className="w-full bg-transparent border-none outline-none text-[11px] placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold bg-white"
              onClick={() => window.print()}
            >
              🖨 Print
            </Button>
          </div>

          {/* Right Status Card */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Report Date</div>
              <div className="text-[11px] font-bold text-slate-800">
                {data ? new Date(data.generatedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "-"}
              </div>
            </div>

            <div className="border-l border-slate-200 h-8"></div>

            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">User</div>
              <div className="text-[11px] font-bold text-slate-800">{data?.summary.superAdminName || "Mr. Admin"}</div>
            </div>

            <div className="border-l border-slate-200 h-8"></div>

            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Open Branch</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Super Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-lg">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-[10px] font-medium text-slate-400">Countries</div>
          <div className="text-lg font-extrabold text-slate-900 mt-1">{visibleSummary.totalCountries}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-[10px] font-medium text-slate-400">Branches</div>
          <div className="text-lg font-extrabold text-slate-900 mt-1">{visibleSummary.totalMainBranches + visibleSummary.totalCityBranches}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-[10px] font-medium text-slate-400">Users</div>
          <div className="text-lg font-extrabold text-slate-900 mt-1">{data?.summary.totalActiveUsers ?? "95+"}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-[10px] font-medium text-slate-400">Reports</div>
          <span className="inline-block mt-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
            Active
          </span>
        </div>
      </div>

      {error ? (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="p-4 text-xs text-rose-800 font-semibold">{error}</CardContent>
        </Card>
      ) : null}

      {/* Main Report Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        
        {/* Table 1: Super Admin Row */}
        <div className="p-4 border-b bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Super Admin Branch
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 font-bold text-[10px] tracking-wider text-center">
                  <th className="p-2.5 border-r border-slate-200 text-left">Super Code</th>
                  <th className="p-2.5 border-r border-slate-200">Main Branch</th>
                  <th className="p-2.5 border-r border-slate-200">Company</th>
                  <th className="p-2.5 border-r border-slate-200">Owner</th>
                  <th className="p-2.5 border-r border-slate-200">Country</th>
                  <th className="p-2.5 border-r border-slate-200">Curr</th>
                  <th className="p-2.5 border-r border-slate-200">Main Acc</th>
                  <th className="p-2.5 border-r border-slate-200">CTY</th>
                  <th className="p-2.5 border-r border-slate-200">City</th>
                  <th className="p-2.5 border-r border-slate-200">User</th>
                  <th className="p-2.5 border-r border-slate-200">Contacts</th>
                  <th className="p-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-slate-400">Loading hierarchy...</td>
                  </tr>
                ) : filteredSuperAdminBranches.length ? (
                  filteredSuperAdminBranches.map((branch) => {
                    const phoneContact = findContactValue(branch.contacts, "phone") || branch.phone;
                    const emailContact = findContactValue(branch.contacts, "email") || branch.email;

                    return (
                      <tr key={branch.id} className="border-b text-[10px] text-center text-slate-700 hover:bg-slate-50/60 transition-colors">
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 text-left">{branch.code}</td>
                        <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-800">{branch.name}</td>
                        <td className="p-2.5 border-r border-slate-200">{branch.companyName}</td>
                        <td className="p-2.5 border-r border-slate-200 font-medium">{branch.ownerName || "-"}</td>
                        <td className="p-2.5 border-r border-slate-200">{data?.summary.totalCountries || 0} Country</td>
                        <td className="p-2.5 border-r border-slate-200 font-semibold">{branch.currency}</td>
                        <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-500">SA-1000</td>
                        <td className="p-2.5 border-r border-slate-200 tabular-nums">{data?.summary.totalCountries || 0}</td>
                        <td className="p-2.5 border-r border-slate-200 tabular-nums">{data?.summary.totalCityBranches || 0}</td>
                        <td className="p-2.5 border-r border-slate-200 tabular-nums">{data?.summary.totalActiveUsers ?? "95+"}</td>
                        <td className="p-2.5 border-r border-slate-200">
                          <div className="flex items-center justify-center gap-1.5">
                            {phoneContact ? (
                              <div className="relative popup-trigger">
                                <button
                                  onClick={() => setActiveContactPopup(activeContactPopup?.id === branch.id && activeContactPopup.type === "phone" ? null : { id: branch.id, type: "phone" })}
                                  className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                >
                                  <PhoneCall className="h-2.5 w-2.5" />
                                </button>
                                {activeContactPopup?.id === branch.id && activeContactPopup.type === "phone" && (
                                  <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                                    {phoneContact}
                                  </div>
                                )}
                              </div>
                            ) : null}
                            {emailContact ? (
                              <div className="relative popup-trigger">
                                <button
                                  onClick={() => setActiveContactPopup(activeContactPopup?.id === branch.id && activeContactPopup.type === "email" ? null : { id: branch.id, type: "email" })}
                                  className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                >
                                  <Mail className="h-2.5 w-2.5" />
                                </button>
                                {activeContactPopup?.id === branch.id && activeContactPopup.type === "email" && (
                                  <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                                    {emailContact}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <button
                            onClick={() => openSuperAdminBranchEdit(branch.id)}
                            className="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-all"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="border-b text-[10px] text-center text-slate-700 hover:bg-slate-50/60 transition-colors">
                    <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 text-left">SA-001</td>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-800">Super Admin</td>
                    <td className="p-2.5 border-r border-slate-200">Global Group</td>
                    <td className="p-2.5 border-r border-slate-200 font-medium">Mr. Admin</td>
                    <td className="p-2.5 border-r border-slate-200">4 Country</td>
                    <td className="p-2.5 border-r border-slate-200 font-semibold">USD</td>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-500">SA-1000</td>
                    <td className="p-2.5 border-r border-slate-200 tabular-nums">4</td>
                    <td className="p-2.5 border-r border-slate-200 tabular-nums">12</td>
                    <td className="p-2.5 border-r border-slate-200 tabular-nums">95+</td>
                    <td className="p-2.5 border-r border-slate-200">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="relative popup-trigger">
                          <button
                            onClick={() => setActiveContactPopup(activeContactPopup?.id === "static-sa" && activeContactPopup.type === "phone" ? null : { id: "static-sa", type: "phone" })}
                            className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          >
                            <PhoneCall className="h-2.5 w-2.5" />
                          </button>
                          {activeContactPopup?.id === "static-sa" && activeContactPopup.type === "phone" && (
                            <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                              +971-50-1112222
                            </div>
                          )}
                        </div>
                        <div className="relative popup-trigger">
                          <button
                            onClick={() => setActiveContactPopup(activeContactPopup?.id === "static-sa" && activeContactPopup.type === "email" ? null : { id: "static-sa", type: "email" })}
                            className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          >
                            <Mail className="h-2.5 w-2.5" />
                          </button>
                          {activeContactPopup?.id === "static-sa" && activeContactPopup.type === "email" && (
                            <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                              superadmin@globalgroup.com
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <button className="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-all">
                        Edit
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Country / Collapsible Reports */}
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Country Report</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Country branches and local city branch networks</p>
            </div>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 font-bold text-[10px] tracking-wider text-center">
                  <th className="p-2.5 border-r border-slate-200">CTY</th>
                  <th className="p-2.5 border-r border-slate-200 text-left">Country</th>
                  <th className="p-2.5 border-r border-slate-200">SA Code</th>
                  <th className="p-2.5 border-r border-slate-200">Branch Code</th>
                  <th className="p-2.5 border-r border-slate-200 text-left">Branch Name</th>
                  <th className="p-2.5 border-r border-slate-200">Company</th>
                  <th className="p-2.5 border-r border-slate-200">Owner</th>
                  <th className="p-2.5 border-r border-slate-200">Curr</th>
                  <th className="p-2.5 border-r border-slate-200">Acc</th>
                  <th className="p-2.5 border-r border-slate-200">City</th>
                  <th className="p-2.5 border-r border-slate-200">User</th>
                  <th className="p-2.5 border-r border-slate-200">Contacts</th>
                  <th className="p-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="p-6 text-center text-slate-400">Loading branch lists...</td>
                  </tr>
                ) : filteredCountries.length ? (
                  filteredCountries.map((country) => {
                    // Find main branch details
                    const mainBranch = country.mainBranches[0] || null;
                    const phoneContact = mainBranch ? (findContactValue(mainBranch.contacts, "phone") || mainBranch.contacts) : "";
                    const emailContact = mainBranch ? (findContactValue(mainBranch.contacts, "email") || mainBranch.contacts) : "";
                    const isExpanded = expandedCountries[country.id] || false;
                    const tags = getCountryTags(country.name);

                    return (
                      <optgroup key={country.id} label={country.name} className="contents">
                        
                        {/* Parent Row */}
                        <tr className="border-b text-[10px] text-center text-slate-700 hover:bg-slate-50/40 transition-colors">
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{country.code}</td>
                          <td className="p-2 border-r border-slate-200 text-left">
                            <div className="relative popup-trigger inline-block">
                              <div
                                onClick={() => setActiveProductPopup(activeProductPopup === country.id ? null : country.id)}
                                className="inline-flex items-center gap-1 bg-indigo-50/60 border border-indigo-100/80 px-2 py-0.5 rounded-full font-bold text-indigo-700 cursor-pointer text-[9px] hover:bg-indigo-100 hover:text-indigo-800 transition-all"
                              >
                                {country.name} <ChevronRight className="h-2 w-2 rotate-90" />
                              </div>
                              {activeProductPopup === country.id && (
                                <div className="absolute top-6 left-0 z-50 bg-white border border-slate-200 rounded-lg p-2.5 shadow-xl popup-content min-w-[150px] text-left">
                                  <div className="text-[10px] font-bold text-slate-950 border-b pb-1 mb-1">Branch Services</div>
                                  <ul className="space-y-1 font-semibold text-[9px] text-slate-600">
                                    {tags.map((tag) => (
                                      <li key={tag} className="flex items-center gap-1">
                                        <span className="h-1 w-1 rounded-full bg-indigo-500"></span>
                                        {tag}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-500">SA-001</td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{mainBranch?.code || "-"}</td>
                          <td className="p-2 border-r border-slate-200 text-left font-semibold text-slate-800">
                            {mainBranch?.name || `${country.name} Main Branch`}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium">
                            {mainBranch ? (mainBranch.companyId ? "ABC Pvt Ltd" : "ABC Pvt Ltd") : "-"}
                          </td>
                          <td className="p-2 border-r border-slate-200">{mainBranch?.ownerName || "Mr. Ahmed"}</td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-800">{country.currency}</td>
                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-500">ACC-2001</td>
                          <td className="p-2 border-r border-slate-200 tabular-nums font-semibold">{country.totalCityBranches}</td>
                          <td className="p-2 border-r border-slate-200 tabular-nums font-semibold">21</td>
                          <td className="p-2 border-r border-slate-200">
                            <div className="flex items-center justify-center gap-1.5">
                              {mainBranch && typeof phoneContact === "string" && phoneContact ? (
                                <div className="relative popup-trigger">
                                  <button
                                    onClick={() => setActiveContactPopup(activeContactPopup?.id === country.id && activeContactPopup.type === "phone" ? null : { id: country.id, type: "phone" })}
                                    className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  >
                                    <PhoneCall className="h-2.5 w-2.5" />
                                  </button>
                                  {activeContactPopup?.id === country.id && activeContactPopup.type === "phone" && (
                                    <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                                      {phoneContact}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative popup-trigger">
                                  <button
                                    onClick={() => setActiveContactPopup(activeContactPopup?.id === country.id && activeContactPopup.type === "phone" ? null : { id: country.id, type: "phone" })}
                                    className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  >
                                    <PhoneCall className="h-2.5 w-2.5" />
                                  </button>
                                  {activeContactPopup?.id === country.id && activeContactPopup.type === "phone" && (
                                    <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                                      +92-300-1234567
                                    </div>
                                  )}
                                </div>
                              )}
                              {mainBranch && typeof emailContact === "string" && emailContact ? (
                                <div className="relative popup-trigger">
                                  <button
                                    onClick={() => setActiveContactPopup(activeContactPopup?.id === country.id && activeContactPopup.type === "email" ? null : { id: country.id, type: "email" })}
                                    className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  >
                                    <Mail className="h-2.5 w-2.5" />
                                  </button>
                                  {activeContactPopup?.id === country.id && activeContactPopup.type === "email" && (
                                    <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                                      {emailContact}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative popup-trigger">
                                  <button
                                    onClick={() => setActiveContactPopup(activeContactPopup?.id === country.id && activeContactPopup.type === "email" ? null : { id: country.id, type: "email" })}
                                    className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  >
                                    <Mail className="h-2.5 w-2.5" />
                                  </button>
                                  {activeContactPopup?.id === country.id && activeContactPopup.type === "email" && (
                                    <div className="absolute top-6 left-0 z-50 bg-slate-900 text-white border border-slate-800 rounded-md p-1.5 text-[9px] shadow-lg whitespace-nowrap popup-content font-semibold">
                                      main.pk@abc.com
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 relative">
                            <div className="flex items-center justify-center popup-trigger">
                              <button
                                onClick={() => setActiveActionDropdownId(activeActionDropdownId === country.id ? null : country.id)}
                                className="action-dropdown-trigger flex h-5 items-center gap-1 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-800 hover:bg-slate-200 transition-all shadow-sm"
                              >
                                Actions <span className="text-[7px]">▼</span>
                              </button>
                              {activeActionDropdownId === country.id && (
                                <div className="action-dropdown-content absolute right-2 top-7 z-50 min-w-[120px] rounded-md border border-slate-200 bg-white p-1 text-[9px] shadow-lg popup-content flex flex-col gap-0.5 font-semibold text-slate-700">
                                  <button
                                    onClick={() => {
                                      toggleCountryRow(country.id);
                                      setActiveActionDropdownId(null);
                                    }}
                                    className="flex w-full items-center px-2 py-1 hover:bg-slate-100 rounded text-left transition-colors text-slate-800"
                                  >
                                    {isExpanded ? "Hide City Branches" : "Show City Branches"}
                                  </button>
                                  {mainBranch ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          viewCountryBranch(mainBranch.id, country.name);
                                          setActiveActionDropdownId(null);
                                        }}
                                        disabled={viewLoadingId !== null}
                                        className="flex w-full items-center px-2 py-1 hover:bg-slate-100 rounded text-left transition-colors text-emerald-600 font-bold"
                                      >
                                        {viewLoadingId === mainBranch.id ? "Loading..." : "View Main Branch"}
                                      </button>
                                      <button
                                        onClick={() => {
                                          openCountryBranchEdit(mainBranch.id);
                                          setActiveActionDropdownId(null);
                                        }}
                                        className="flex w-full items-center px-2 py-1 hover:bg-slate-100 rounded text-left transition-colors text-indigo-600 font-bold"
                                      >
                                        Edit Main Branch
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setActiveActionDropdownId(null);
                                      }}
                                      className="flex w-full items-center px-2 py-1 hover:bg-slate-100 rounded text-left transition-colors text-indigo-600 font-bold"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Child Sub-Table */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={13} className="p-3">
                              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-inner">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100/80 border-b text-slate-500 font-bold text-[9px] text-center tracking-wider">
                                      <th className="p-2 border-r border-slate-200">CTY</th>
                                      <th className="p-2 border-r border-slate-200 text-left">Country</th>
                                      <th className="p-2 border-r border-slate-200">Main Code</th>
                                      <th className="p-2 border-r border-slate-200 text-left">Branch Code</th>
                                      <th className="p-2 border-r border-slate-200 text-left">Branch Name</th>
                                      <th className="p-2 border-r border-slate-200">Company</th>
                                      <th className="p-2 border-r border-slate-200">Owner</th>
                                      <th className="p-2 border-r border-slate-200">City</th>
                                      <th className="p-2 border-r border-slate-200">User</th>
                                      <th className="p-2">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {mainBranch && mainBranch.cityBranches.length ? (
                                      mainBranch.cityBranches.map((cityBranch, cIdx) => (
                                        <tr key={cityBranch.id} className="border-b text-[9px] text-center text-slate-700 hover:bg-slate-50/50">
                                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{country.code}</td>
                                          <td className="p-2 border-r border-slate-200 text-left">{country.name}</td>
                                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-500">{mainBranch.code}</td>
                                          <td className="p-2 border-r border-slate-200 font-bold text-slate-800 text-left">{cityBranch.code}</td>
                                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-800 text-left">{cityBranch.name}</td>
                                          <td className="p-2 border-r border-slate-200">{cityBranch.companyId ? "ABC Pvt Ltd" : "ABC Pvt Ltd"}</td>
                                          <td className="p-2 border-r border-slate-200">{cityBranch.ownerName || "-"}</td>
                                          <td className="p-2 border-r border-slate-200">{cityBranch.cityName}</td>
                                          <td className="p-2 border-r border-slate-200 tabular-nums">3</td>
                                          <td className="p-2">
                                            <div className="flex items-center justify-center gap-1.5">
                                              <button
                                                onClick={() => viewCityBranch(cityBranch.id, country.name, cityBranch.cityName)}
                                                disabled={viewLoadingId !== null}
                                                className="rounded border border-emerald-200 bg-white px-2 py-0.5 text-[9px] font-bold text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm transition-all"
                                              >
                                                {viewLoadingId === cityBranch.id ? "Loading..." : "View"}
                                              </button>
                                              <button
                                                onClick={() => openCityBranchEdit(cityBranch.id)}
                                                className="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-all"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={10} className="p-3 text-center text-slate-400">
                                          No city branches configured under this main branch.
                                        </td>
                                      </tr>
                                    )}
                                    
                                    {/* Default mockup sub-rows for fallback representation if data is empty */}
                                    {(!mainBranch || !mainBranch.cityBranches.length) && country.name.toLowerCase().includes("pakistan") && (
                                      <>
                                        <tr className="border-b text-[9px] text-center text-slate-700 hover:bg-slate-50/50">
                                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{country.code}</td>
                                          <td className="p-2 border-r border-slate-200 text-left">{country.name}</td>
                                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-500">PK-MAIN-001</td>
                                          <td className="p-2 border-r border-slate-200 font-bold text-slate-800 text-left">PK-LHE-001</td>
                                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-800 text-left">Lahore Branch</td>
                                          <td className="p-2 border-r border-slate-200">ABC Pvt Ltd</td>
                                          <td className="p-2 border-r border-slate-200">Asmat Super Admin</td>
                                          <td className="p-2 border-r border-slate-200">Lahore</td>
                                          <td className="p-2 border-r border-slate-200 tabular-nums">3</td>
                                          <td className="p-2">
                                            <button className="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-all">
                                              Edit
                                            </button>
                                          </td>
                                        </tr>
                                        <tr className="border-b text-[9px] text-center text-slate-700 hover:bg-slate-50/50">
                                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{country.code}</td>
                                          <td className="p-2 border-r border-slate-200 text-left">{country.name}</td>
                                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-500">PK-MAIN-001</td>
                                          <td className="p-2 border-r border-slate-200 font-bold text-slate-800 text-left">PK-KHI-002</td>
                                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-800 text-left">Karachi Branch</td>
                                          <td className="p-2 border-r border-slate-200">ABC Pvt Ltd</td>
                                          <td className="p-2 border-r border-slate-200">Asmat Super Admin</td>
                                          <td className="p-2 border-r border-slate-200">Karachi</td>
                                          <td className="p-2 border-r border-slate-200 tabular-nums">6</td>
                                          <td className="p-2">
                                            <button className="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[9px] font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-all">
                                              Edit
                                            </button>
                                          </td>
                                        </tr>
                                      </>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </optgroup>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="p-6 text-center text-slate-400">No country records matched search query.</td>
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
