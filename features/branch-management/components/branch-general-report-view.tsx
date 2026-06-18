"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { 
  Ban,
  ChevronRight, 
  Eye,
  Expand,
  FileSpreadsheet, 
  KeyRound,
  Minimize2, 
  PencilLine,
  Printer, 
  Search, 
  Mail, 
  PhoneCall,
  Shield,
  ShieldCheck,
  Users
} from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { openA4ReportWindow } from "@/lib/reports/open-a4-report-window";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  userCount?: number;
  users?: BranchUserDetail[];
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
  userCount?: number;
  users?: BranchUserDetail[];
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
  userCount?: number;
  users?: BranchUserDetail[];
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
    users?: BranchUserDetail[];
  };
  superAdminBranches: SuperAdminBranchNode[];
  countries: CountryNode[];
  generatedAt: string;
};

type BranchUserDetail = {
  id: string;
  name: string;
  username: string;
  temporaryPassword: string | null;
  mobile: string;
  email: string;
  role: string;
  classification: string;
  mainUser: boolean;
  countryName: string;
  cityName: string;
  branchName: string;
  branchCode: string;
  department: string;
  permissions: string[];
  status: string;
  createdDate: string | null;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function openUserProfile(userId: string) {
  window.location.href = `/dashboard/new-entry/users/journal-report?userId=${encodeURIComponent(userId)}`;
}

function openUserEdit(userId: string) {
  window.location.href = `/dashboard/new-entry/users/registration?userId=${encodeURIComponent(userId)}`;
}

function UserCountButton({
  count,
  expanded,
  onClick,
  title
}: {
  count: number;
  expanded: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black tabular-nums transition-all",
        expanded
          ? "border-indigo-300 bg-indigo-600 text-white shadow-sm"
          : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
      )}
    >
      <Users className="h-3 w-3" />
      {count}
      <span className="text-[10px] leading-none">{expanded ? "-" : "+"}</span>
    </button>
  );
}

function BranchUsersPanel({
  title,
  hierarchy,
  users
}: {
  title: string;
  hierarchy: string[];
  users: BranchUserDetail[];
}) {
  const grouped = users.reduce<Record<string, BranchUserDetail[]>>((acc, user) => {
    const key = user.classification || "Staff User";
    acc[key] = acc[key] ?? [];
    acc[key].push(user);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 text-left shadow-inner">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700">
            <Users className="h-4 w-4" />
            {title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-500">
            {hierarchy.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-1">
                <span className="rounded bg-white px-1.5 py-0.5 text-slate-700 ring-1 ring-slate-200">{item || "-"}</span>
                {index < hierarchy.length - 1 ? <ChevronRight className="h-3 w-3 text-slate-400" /> : null}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-right shadow-sm">
          <div className="text-[9px] font-black uppercase text-slate-400">Total Users</div>
          <div className="text-sm font-black text-indigo-700">{users.length}</div>
        </div>
      </div>

      {users.length ? (
        <>
          <div className="mb-2 grid gap-2 md:grid-cols-3">
            {Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">{group}</div>
                <div className="mt-1 text-sm font-black text-slate-900">{list.length}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-[1500px] w-full border-collapse text-[9px]">
              <thead>
                <tr className="border-b bg-slate-50 text-center font-black uppercase tracking-wide text-slate-500">
                  <th className="border-r p-2 text-left">User Name</th>
                  <th className="border-r p-2">Login ID</th>
                  <th className="border-r p-2">Temp Password</th>
                  <th className="border-r p-2">Mobile</th>
                  <th className="border-r p-2">Email</th>
                  <th className="border-r p-2">Role</th>
                  <th className="border-r p-2">Main User</th>
                  <th className="border-r p-2">Country</th>
                  <th className="border-r p-2">City</th>
                  <th className="border-r p-2">Branch</th>
                  <th className="border-r p-2">Branch Code</th>
                  <th className="border-r p-2">Department</th>
                  <th className="border-r p-2">Permissions</th>
                  <th className="border-r p-2">Status</th>
                  <th className="border-r p-2">Created</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b text-center text-slate-700 hover:bg-indigo-50/30">
                    <td className="border-r p-2 text-left font-bold text-slate-900">{user.name || "-"}</td>
                    <td className="border-r p-2 font-mono font-black text-indigo-700">{user.username || "-"}</td>
                    <td className="border-r p-2 font-mono">{user.temporaryPassword || "-"}</td>
                    <td className="border-r p-2">{user.mobile || "-"}</td>
                    <td className="border-r p-2">{user.email || "-"}</td>
                    <td className="border-r p-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-black text-slate-700">{user.role || "-"}</span>
                    </td>
                    <td className="border-r p-2 font-bold">{user.mainUser ? "Yes" : "No"}</td>
                    <td className="border-r p-2">{user.countryName || "-"}</td>
                    <td className="border-r p-2">{user.cityName || "-"}</td>
                    <td className="border-r p-2">{user.branchName || "-"}</td>
                    <td className="border-r p-2 font-mono font-bold">{user.branchCode || "-"}</td>
                    <td className="border-r p-2">{user.department || "-"}</td>
                    <td className="border-r p-2 text-left">
                      <div className="max-w-[220px] truncate" title={(user.permissions || []).join(", ")}>
                        {user.permissions?.length ? user.permissions.slice(0, 4).join(", ") : "-"}
                        {user.permissions?.length > 4 ? `, +${user.permissions.length - 4} more` : ""}
                      </div>
                    </td>
                    <td className="border-r p-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-black",
                          user.status === "Active" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                        )}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="border-r p-2">{formatDateTime(user.createdDate)}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button type="button" title="View Profile" aria-label="View Profile" onClick={() => openUserProfile(user.id)} className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50">
                          <Eye className="h-3 w-3" />
                        </button>
                        <button type="button" title="Edit User" aria-label="Edit User" onClick={() => openUserEdit(user.id)} className="rounded border border-indigo-200 bg-white p-1 text-indigo-600 hover:bg-indigo-50">
                          <PencilLine className="h-3 w-3" />
                        </button>
                        <button type="button" title="Reset Password" aria-label="Reset Password" onClick={() => alert(`Reset Password: ${user.username}`)} className="rounded border border-amber-200 bg-white p-1 text-amber-600 hover:bg-amber-50">
                          <KeyRound className="h-3 w-3" />
                        </button>
                        <button type="button" title="Disable User" aria-label="Disable User" onClick={() => alert(`Disable User: ${user.username}`)} className="rounded border border-rose-200 bg-white p-1 text-rose-600 hover:bg-rose-50">
                          <Ban className="h-3 w-3" />
                        </button>
                        <button type="button" title="View Permissions" aria-label="View Permissions" onClick={() => alert((user.permissions || []).join("\n") || "No explicit permissions found.")} className="rounded border border-emerald-200 bg-white p-1 text-emerald-600 hover:bg-emerald-50">
                          <Shield className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center text-[10px] font-bold text-slate-400">
          No users are assigned to this hierarchy level yet.
        </div>
      )}
    </div>
  );
}

export function BranchGeneralReportView({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [expandedView, setExpandedView] = useState(false);
  const [data, setData] = useState<BranchGeneralReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState(""); // "", "branch", "country", "city"
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  const [expandedUserScope, setExpandedUserScope] = useState<string | null>(null);
  
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
      
      const phoneVal = findContactValue(row.contacts, "phone") || findContactValue(row.contacts, "mobile") || row.phone || "";
      const emailVal = findContactValue(row.contacts, "email") || row.email || "";
      const whatsappVal = findContactValue(row.contacts, "whatsapp") || "";

      const activeLang = typeof document !== "undefined" ? document.documentElement.lang : "en";
      openA4ReportWindow({
        title: "Country Main Branch Report",
        subtitle: "Branch Profile Report (A4)",
        autoPrint: false,
        lang: activeLang,
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
      
      const phoneVal = findContactValue(row.contacts, "phone") || findContactValue(row.contacts, "mobile") || row.phone || "";
      const emailVal = findContactValue(row.contacts, "email") || row.email || "";
      const whatsappVal = findContactValue(row.contacts, "whatsapp") || "";

      const activeLang = typeof document !== "undefined" ? document.documentElement.lang : "en";
      openA4ReportWindow({
        title: "City Branch Report",
        subtitle: "Branch Profile Report (A4)",
        autoPrint: false,
        lang: activeLang,
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

  function toggleUserScope(scopeId: string) {
    setExpandedUserScope((current) => (current === scopeId ? null : scopeId));
  }

  const containerClassName = expandedView 
    ? "fixed inset-0 z-50 overflow-auto bg-slate-50 p-4 md:p-6 font-sans text-xs text-slate-800" 
    : "space-y-4 font-sans text-xs text-slate-800 bg-slate-50/50 p-4 rounded-xl border";

  return (
    <div className={containerClassName}>
      
      {/* Unified Header, Metrics & Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left Side: Title and Subtitle */}
        <div className="min-w-[180px]">
          <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Super Admin
          </div>
          <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none mt-0.5">
            {title}
          </h1>
          <div className="text-[9px] font-bold text-slate-500 mt-1">
            {subtitle || "Super Admin — Countries — Main Branches — City Branches"}
          </div>
        </div>

        {/* Middle Left: Filter Controls */}
        <div className="flex items-center gap-2 flex-grow max-w-sm">
          <select
            id="searchType"
            className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-[10px] font-extrabold text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
          >
            <option value="">Select Category</option>
            <option value="branch">Branch</option>
            <option value="country">Country</option>
            <option value="city">City</option>
          </select>

          <div className="relative flex items-center bg-white border border-slate-300 rounded-lg px-2.5 h-8 shadow-sm flex-grow">
            <Search className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
            <input
              type="text"
              id="branchSearch"
              placeholder="Search branch, city, country..."
              className="w-full bg-transparent border-none outline-none text-[10px] font-semibold placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          
          {/* Interactive Metric Filter Buttons */}
          <button
            type="button"
            className={cn(
              "h-8 px-2.5 rounded-lg border text-[10px] font-bold shadow-sm transition-all duration-200 flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500",
              searchType === "country"
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-350"
            )}
            onClick={() => setSearchType(searchType === "country" ? "" : "country")}
          >
            <span>Countries</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded font-mono text-[9px] font-extrabold leading-none",
              searchType === "country" ? "bg-indigo-500/40 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {visibleSummary.totalCountries}
            </span>
          </button>

          <button
            type="button"
            className={cn(
              "h-8 px-2.5 rounded-lg border text-[10px] font-bold shadow-sm transition-all duration-200 flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500",
              searchType === "branch"
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-355"
            )}
            onClick={() => setSearchType(searchType === "branch" ? "" : "branch")}
          >
            <span>Branches</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded font-mono text-[9px] font-extrabold leading-none",
              searchType === "branch" ? "bg-indigo-500/40 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {visibleSummary.totalMainBranches + visibleSummary.totalCityBranches}
            </span>
          </button>

          <button
            type="button"
            className={cn(
              "h-8 px-2.5 rounded-lg border text-[10px] font-bold shadow-sm transition-all duration-200 flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500",
              searchType === "city"
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-355"
            )}
            onClick={() => setSearchType(searchType === "city" ? "" : "city")}
          >
            <span>Users</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded font-mono text-[9px] font-extrabold leading-none",
              searchType === "city" ? "bg-indigo-500/40 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {data?.summary.totalActiveUsers ?? "95+"}
            </span>
          </button>

          <button
            type="button"
            className={cn(
              "h-8 px-2.5 rounded-lg border text-[10px] font-bold shadow-sm transition-all duration-200 flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500",
              (!searchType && !searchQuery)
                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-100"
                : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/80 hover:border-amber-300"
            )}
            onClick={() => {
              setSearchType("");
              setSearchQuery("");
            }}
            title={(!searchType && !searchQuery) ? "All filters cleared" : "Reset category & search query"}
          >
            <span>Reports</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase leading-none font-mono",
              (!searchType && !searchQuery) ? "bg-emerald-500/40 text-white" : "bg-amber-200 text-amber-900"
            )}>
              {(!searchType && !searchQuery) ? "Active" : "Reset"}
            </span>
          </button>

          <div className="border-l border-slate-200 h-6 mx-1"></div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[10px] font-bold gap-1 bg-white border-slate-300 hover:bg-slate-50 focus:ring-1 focus:ring-indigo-500"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[10px] font-bold gap-1 bg-white border-slate-300 hover:bg-slate-50 focus:ring-1 focus:ring-indigo-500"
            onClick={() => setExpandedView((current) => !current)}
          >
            {expandedView ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
            {expandedView ? "Shrink" : "Expand"}
          </Button>

          <div className="border-l border-slate-200 h-6 mx-1"></div>

          {/* Very compact user info info bubble/pill */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 h-8">
            <div className="text-right">
              <div className="text-[8px] font-bold text-slate-400 uppercase leading-none">User</div>
              <div className="text-[9px] font-extrabold text-slate-700 leading-none mt-0.5">{data?.summary.superAdminName || "Super Admin"}</div>
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Open Branch: Super Admin"></div>
          </div>
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

                    const scopeId = `super-admin-users-${branch.id}`;
                    const users = data?.summary.users ?? [];

                    return (
                      <Fragment key={branch.id}>
                      <tr className="border-b text-[10px] text-center text-slate-700 hover:bg-slate-50/60 transition-colors">
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 text-left">{branch.code}</td>
                        <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-800">{branch.name}</td>
                        <td className="p-2.5 border-r border-slate-200">{branch.companyName}</td>
                        <td className="p-2.5 border-r border-slate-200 font-medium">{branch.ownerName || "-"}</td>
                        <td className="p-2.5 border-r border-slate-200">{data?.summary.totalCountries || 0} Country</td>
                        <td className="p-2.5 border-r border-slate-200 font-semibold">{branch.currency}</td>
                        <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-500">SA-1000</td>
                        <td className="p-2.5 border-r border-slate-200 tabular-nums">{data?.summary.totalCountries || 0}</td>
                        <td className="p-2.5 border-r border-slate-200 tabular-nums">{data?.summary.totalCityBranches || 0}</td>
                        <td className="p-2.5 border-r border-slate-200 tabular-nums">
                          <UserCountButton
                            count={users.length || data?.summary.totalActiveUsers || 0}
                            expanded={expandedUserScope === scopeId}
                            onClick={() => toggleUserScope(scopeId)}
                            title="Show all ERP users under Super Admin"
                          />
                        </td>
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
                      {expandedUserScope === scopeId ? (
                        <tr className="border-b bg-indigo-50/20">
                          <td colSpan={12} className="p-3">
                            <BranchUsersPanel
                              title="Super Admin User Directory"
                              hierarchy={["Super Admin", "All Countries", "All Branches", "Users"]}
                              users={users}
                            />
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
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
                    const countryUserScopeId = `country-users-${country.id}`;
                    const countryUsers = country.users ?? [];
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
                          <td className="p-2 border-r border-slate-200 tabular-nums font-semibold">
                            <UserCountButton
                              count={countryUsers.length}
                              expanded={expandedUserScope === countryUserScopeId}
                              onClick={() => toggleUserScope(countryUserScopeId)}
                              title={`Show users for ${country.name}`}
                            />
                          </td>
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

                        {expandedUserScope === countryUserScopeId ? (
                          <tr className="bg-indigo-50/20">
                            <td colSpan={13} className="p-3">
                              <BranchUsersPanel
                                title={`${country.name} Users`}
                                hierarchy={[country.name, mainBranch?.name || "Main Branch", "All City Branches", "User List"]}
                                users={countryUsers}
                              />
                            </td>
                          </tr>
                        ) : null}

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
                                      mainBranch.cityBranches.map((cityBranch) => {
                                        const cityUserScopeId = `city-users-${cityBranch.id}`;
                                        const cityUsers = cityBranch.users ?? [];

                                        return (
                                          <Fragment key={cityBranch.id}>
                                            <tr className="border-b text-[9px] text-center text-slate-700 hover:bg-slate-50/50">
                                              <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{country.code}</td>
                                              <td className="p-2 border-r border-slate-200 text-left">{country.name}</td>
                                              <td className="p-2 border-r border-slate-200 font-semibold text-slate-500">{mainBranch.code}</td>
                                              <td className="p-2 border-r border-slate-200 font-bold text-slate-800 text-left">{cityBranch.code}</td>
                                              <td className="p-2 border-r border-slate-200 font-semibold text-slate-800 text-left">{cityBranch.name}</td>
                                              <td className="p-2 border-r border-slate-200">{cityBranch.companyId ? "ABC Pvt Ltd" : "ABC Pvt Ltd"}</td>
                                              <td className="p-2 border-r border-slate-200">{cityBranch.ownerName || "-"}</td>
                                              <td className="p-2 border-r border-slate-200">{cityBranch.cityName}</td>
                                              <td className="p-2 border-r border-slate-200 tabular-nums">
                                                <UserCountButton
                                                  count={cityUsers.length}
                                                  expanded={expandedUserScope === cityUserScopeId}
                                                  onClick={() => toggleUserScope(cityUserScopeId)}
                                                  title={`Show users for ${cityBranch.name}`}
                                                />
                                              </td>
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
                                            {expandedUserScope === cityUserScopeId ? (
                                              <tr className="bg-indigo-50/20">
                                                <td colSpan={10} className="p-3">
                                                  <BranchUsersPanel
                                                    title={`${cityBranch.name} Users`}
                                                    hierarchy={[country.name, mainBranch.name, cityBranch.name, "User List"]}
                                                    users={cityUsers}
                                                  />
                                                </td>
                                              </tr>
                                            ) : null}
                                          </Fragment>
                                        );
                                      })
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
