"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ShieldCheck,
  Upload,
  UserPlus,
  MapPin,
  ClipboardList,
  Search,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import type { LocationCountry } from "@/features/locations/location-api";
import { listCities, listCountries, type LocationCity } from "@/features/locations/location-api";
import type { EnterpriseRole } from "@/lib/permissions/enterprise-roles";
import { enterpriseRolePermissions } from "@/lib/permissions/enterprise-roles";
import { apiPost } from "@/lib/api/client";
import { normalizeUserCode } from "@/lib/services/user-identity-service";

type MainBranchRow = { id: string; name: string; code: string; local_currency: string; is_main: boolean; city_id?: string | null };
type CityBranchRow = { id: string; name: string; code: string; city_name: string; local_currency: string; country_branch_id: string };

type WizardStep = 1 | 2 | 3;

type Banner = { tone: "ok" | "err"; text: string } | null;

const genderOptions = ["Male", "Female", "Other"] as const;

const branchTypeOptions = [
  { value: "main", label: "Main Branch" },
  { value: "city", label: "City Branch" }
] as const;

const roleOptions: Array<{ value: EnterpriseRole; label: string; help: string }> = [
  { value: "super_admin", label: "Super Admin User", help: "Global scope (full access)." },
  { value: "country_admin", label: "Country Admin User", help: "Country scope (one country)." },
  { value: "country_user", label: "Country User", help: "Country scope user (one country)." },
  { value: "main_branch_admin", label: "Main Branch Admin User", help: "Main branch scope (one main branch)." },
  { value: "city_branch_admin", label: "City/Branch User", help: "City branch scope (one city branch)." },
  { value: "accountant", label: "Accountant", help: "Branch scope with accounting permissions." },
  { value: "cashier", label: "Cashier", help: "Branch scope with payment permissions." },
  { value: "agent_user", label: "Agent User", help: "Limited branch access." },
  { value: "staff_user", label: "Staff User", help: "Limited branch access." },
  { value: "auditor_viewer", label: "Auditor / Viewer", help: "Read-only scope." }
];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function makeAutoRegNo() {
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `REG-${rand}`;
}

function toCountryOption(row: LocationCountry): SearchSelectOption {
  return {
    value: row.id,
    label: row.name,
    keywords: `${row.name} ${row.iso2 ?? ""} ${row.iso3 ?? ""} ${row.currency_code ?? ""}`
  };
}

function toSimpleOption(value: string, label = value): SearchSelectOption {
  return { value, label, keywords: label };
}

function groupPermissions(perms: string[]) {
  const groups = new Map<string, string[]>();
  for (const perm of perms) {
    const [resource] = perm.split(":");
    const key = (resource || "other").trim() || "other";
    const list = groups.get(key) ?? [];
    list.push(perm);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => [k, v.sort()] as const);
}

function reportRow(label: string, value: string, tone: "muted" | "primary" = "muted") {
  const safe = value?.trim() ? value.trim() : "-";
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={tone === "primary" ? "font-semibold text-emerald-300" : "font-semibold text-slate-100"}>{safe}</div>
    </div>
  );
}

export function UserRegistrationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get("userId");

  const [banner, setBanner] = useState<Banner>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [createdResult, setCreatedResult] = useState<null | { userId: string; userCode: string; createdAt: string }>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [profileFile, setProfileFile] = useState<File | null>(null);

  // Step 1
  const [gender, setGender] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountRegNo, setAccountRegNo] = useState(() => makeAutoRegNo());

  // Step 2
  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countryId, setCountryId] = useState("");
  const [branchType, setBranchType] = useState<"" | "main" | "city">("");
  const [role, setRole] = useState<EnterpriseRole>("city_branch_admin");

  const [mainBranches, setMainBranches] = useState<MainBranchRow[]>([]);
  const [cityBranches, setCityBranches] = useState<CityBranchRow[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [countryBranchId, setCountryBranchId] = useState("");
  const [cityBranchId, setCityBranchId] = useState("");

  // Step 3
  const [userCode, setUserCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activePermGroup, setActivePermGroup] = useState<string>("users");
  const [permQuery, setPermQuery] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() => {
    const defaults = enterpriseRolePermissions["city_branch_admin"] ?? [];
    return [...new Set(defaults.map((p) => p.trim()).filter(Boolean))];
  });

  // Edit list states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedReportUserId, setSelectedReportUserId] = useState("current");
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isResettingBranch, setIsResettingBranch] = useState(true);
  const [shouldDefaultPermissions, setShouldDefaultPermissions] = useState(true);

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/erp/users/journal-report?limit=500").then((r) => r.json());
      if (res && res.rows && Array.isArray(res.rows)) {
        setUsersList(res.rows);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const loadUserForEditing = (row: any) => {
    setBanner(null);
    setCreatedResult(null);
    setIsResettingBranch(false);
    setShouldDefaultPermissions(false);

    setEditUserId(row.userId);
    setFullName(row.fullName);
    setGender("Male");
    setUserCode(row.userCode);
    setRole(row.role);
    setCountryId(row.countryId || "");

    const isMain = row.branchType === "Main Branch" || row.role === "main_branch_admin";
    const isCity = row.branchType === "City Branch" && row.role !== "main_branch_admin";

    if (isMain) {
      setBranchType("main");
      setCountryBranchId(row.branchId || "");
      setCityBranchId("");
    } else if (isCity) {
      setBranchType("city");
      setCityBranchId(row.branchId || "");
    } else {
      setBranchType("");
      setCountryBranchId("");
      setCityBranchId("");
    }

    setPassword("");
    setConfirmPassword("");
    setSelectedPermissions(row.permissions || []);
    setStep(1);
    setSelectedReportUserId(row.userId);
  };

  useEffect(() => {
    if (urlUserId && usersList.length > 0 && !editUserId) {
      const match = usersList.find((u) => u.userId === urlUserId);
      if (match) {
        loadUserForEditing(match);
      }
    }
  }, [urlUserId, usersList, editUserId]);

  const countryOptions = useMemo(() => countries.map(toCountryOption), [countries]);
  const branchTypeSelectOptions = useMemo(
    () => branchTypeOptions.map((o) => ({ value: o.value, label: o.label, keywords: o.label })),
    []
  );
  const roleSelectOptions = useMemo(
    () =>
      roleOptions.map((o) => ({
        value: o.value,
        label: o.label,
        keywords: `${o.label} ${o.help}`
      })),
    []
  );

  const selectedCountry = useMemo(() => countries.find((c) => c.id === countryId) ?? null, [countries, countryId]);
  const selectedMainBranch = useMemo(() => mainBranches.find((b) => b.id === countryBranchId) ?? null, [mainBranches, countryBranchId]);
  const selectedCityBranch = useMemo(() => cityBranches.find((b) => b.id === cityBranchId) ?? null, [cityBranches, cityBranchId]);

  const branchCode = useMemo(() => {
    if (branchType === "main") return selectedMainBranch?.code ?? "";
    if (branchType === "city") return selectedCityBranch?.code ?? "";
    return "";
  }, [branchType, selectedMainBranch, selectedCityBranch]);

  const cityName = useMemo(() => {
    if (branchType === "city") return selectedCityBranch?.city_name ?? "";
    if (branchType === "main") {
      const cityId = selectedMainBranch?.city_id ?? null;
      if (!cityId) return "";
      const match = cities.find((c) => c.id === cityId);
      return match?.name ?? "";
    }
    return "";
  }, [branchType, selectedCityBranch, selectedMainBranch, cities]);

  const allPermissions = useMemo(() => {
    const items = Object.values(enterpriseRolePermissions).flat();
    return [...new Set(items.map((p) => p.trim()).filter(Boolean))].sort();
  }, []);

  const groupedPermissions = useMemo(() => groupPermissions(allPermissions), [allPermissions]);

  const filteredGroups = useMemo(() => {
    const q = permQuery.trim().toLowerCase();
    if (!q) return groupedPermissions;
    return groupedPermissions
      .map(([group, perms]) => {
        const next = perms.filter((p) => p.toLowerCase().includes(q));
        return [group, next] as const;
      })
      .filter(([, perms]) => perms.length);
  }, [groupedPermissions, permQuery]);

  const activeGroupPermissions = useMemo(() => {
    return filteredGroups.find(([g]) => g === activePermGroup)?.[1] ?? filteredGroups[0]?.[1] ?? [];
  }, [activePermGroup, filteredGroups]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCountries(true);
      try {
        const rows = await listCountries();
        if (!cancelled) setCountries(rows);
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // When country changes, reset the branch selections.
    setBanner(null);
    setCreatedResult(null);
    if (isResettingBranch) {
      setBranchType("");
      setCountryBranchId("");
      setCityBranchId("");
      setMainBranches([]);
      setCityBranches([]);
      setCities([]);
    } else {
      setIsResettingBranch(true);
    }

    if (!countryId) return;

    (async () => {
      const res = await fetch(`/api/branch-management/country-branches?countryId=${encodeURIComponent(countryId)}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { countryBranches?: MainBranchRow[] };
      const list = Array.isArray(json.countryBranches) ? json.countryBranches : [];
      setMainBranches(list.filter((b) => Boolean(b.is_main)));
    })().catch(() => null);

    (async () => {
      const res = await fetch(`/api/branch-management/city-branches?countryId=${encodeURIComponent(countryId)}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { cityBranches?: CityBranchRow[] };
      const list = Array.isArray(json.cityBranches) ? json.cityBranches : [];
      setCityBranches(list);
    })().catch(() => null);

    (async () => {
      const list = await listCities({ countryId });
      setCities(list);
    })().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  useEffect(() => {
    // Default permissions for role.
    setCreatedResult(null);
    if (shouldDefaultPermissions) {
      const defaults = enterpriseRolePermissions[role] ?? [];
      setSelectedPermissions([...new Set(defaults.map((p) => p.trim()).filter(Boolean))]);
    } else {
      setShouldDefaultPermissions(true);
    }

    // Scope requirements:
    if (role === "super_admin") {
      setCountryId("");
      setBranchType("");
      setCountryBranchId("");
      setCityBranchId("");
      return;
    }
    if (role === "country_admin" || role === "country_user") {
      setBranchType("");
      setCountryBranchId("");
      setCityBranchId("");
      return;
    }
    if (role === "main_branch_admin") {
      setCityBranchId("");
      return;
    }
  }, [role]);

  async function generateUserCode() {
    setBanner(null);
    const qp = new URLSearchParams({ role });
    if (countryId) qp.set("countryId", countryId);

    try {
      const res = await fetch(`/api/erp/users/next-code?${qp.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { code?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to issue next User ID.");
      const code = normalizeUserCode(String(json.code || ""));
      setUserCode(code);
      return code;
    } catch (e: any) {
      setBanner({ tone: "err", text: e?.message || "Failed to generate User ID." });
      return null;
    }
  }

  useEffect(() => {
    // Auto-generate user code once role and required country scope is selected.
    if (!role) return;
    if (role !== "super_admin" && !isUuid(countryId)) return;
    if (!userCode) generateUserCode().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, countryId]);

  function togglePermission(perm: string) {
    const p = perm.trim();
    if (!p) return;
    setSelectedPermissions((current) => {
      const has = current.includes(p);
      if (has) return current.filter((x) => x !== p);
      return [...current, p];
    });
  }

  function canGoNext() {
    if (step === 1) return Boolean(gender && fullName.trim().length >= 2);
    if (step === 2) {
      if (role === "super_admin") return true;
      if (!isUuid(countryId)) return false;
      if (role === "country_admin" || role === "country_user") return true;
      if (role === "main_branch_admin") return Boolean(branchType === "main" && isUuid(countryBranchId));
      // Branch-scoped roles:
      if (branchType === "main") return Boolean(isUuid(countryBranchId));
      if (branchType === "city") return Boolean(isUuid(cityBranchId));
      return false;
    }
    return true;
  }

  function next() {
    if (step === 1) setStep(2);
    if (step === 2) setStep(3);
  }

  function prev() {
    if (step === 3) setStep(2);
    if (step === 2) setStep(1);
  }

  async function finish() {
    setBanner(null);
    setCreatedResult(null);

    const issuedCode = normalizeUserCode(userCode || "");
    if (!issuedCode) {
      setBanner({ tone: "err", text: "User ID is required." });
      return;
    }

    const isEdit = Boolean(editUserId);

    if (!isEdit && (!password || password.length < 8)) {
      setBanner({ tone: "err", text: "Password must be at least 8 characters." });
      return;
    }

    if (password && password.length < 8) {
      setBanner({ tone: "err", text: "Password must be at least 8 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setBanner({ tone: "err", text: "Confirm Password does not match." });
      return;
    }

    // Resolve scope IDs from the selected branch type.
    let resolvedCountryId: string | null = countryId || null;
    let resolvedCountryBranchId: string | null = null;
    let resolvedCityBranchId: string | null = null;

    if (role === "super_admin") {
      resolvedCountryId = null;
    } else if (role === "country_admin" || role === "country_user") {
      resolvedCountryBranchId = null;
      resolvedCityBranchId = null;
    } else if (role === "main_branch_admin") {
      resolvedCountryBranchId = countryBranchId || null;
    } else {
      // branch roles
      if (branchType === "main") {
        resolvedCountryBranchId = countryBranchId || null;
        resolvedCityBranchId = null;
      } else {
        resolvedCityBranchId = cityBranchId || null;
        resolvedCountryBranchId = selectedCityBranch?.country_branch_id ?? null;
      }
    }

    if (role !== "super_admin" && !resolvedCountryId) {
      setBanner({ tone: "err", text: "Country is required for this role." });
      return;
    }

    const preferredLanguage = (localStorage.getItem("erp_lang") || "en").toString();

    // Supabase requires email. We generate a stable internal email and rely on User ID login via profiles.user_code.
    const email = `${issuedCode.toLowerCase()}@users.damaan.local`;

    setSaving(true);
    try {
      const payload: any = {
        role,
        fullName: fullName.trim(),
        userCode: issuedCode,
        countryId: resolvedCountryId,
        countryBranchId: resolvedCountryBranchId,
        cityBranchId: resolvedCityBranchId,
        permissions: selectedPermissions
      };

      let res;
      if (isEdit) {
        payload.userId = editUserId;
        if (password) {
          payload.password = password;
        }

        const fetchRes = await fetch("/api/erp/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await fetchRes.json();
        if (!fetchRes.ok) throw new Error(json?.error?.message || json?.error || "Failed to update user.");
        res = { userId: editUserId, userCode: issuedCode };
      } else {
        payload.email = email;
        payload.password = password;
        payload.preferredLanguage = preferredLanguage;
        res = await apiPost<{ userId: string; userCode: string }>("/api/erp/users", payload);
      }

      setBanner({ tone: "ok", text: isEdit ? "User updated successfully." : "User created successfully." });
      localStorage.setItem("user_journal_dirty", new Date().toISOString());
      setCreatedResult({ userId: res.userId, userCode: res.userCode, createdAt: new Date().toISOString() });
      fetchUsers();
    } catch (e: any) {
      setBanner({ tone: "err", text: e?.message || "User operation failed." });
    } finally {
      setSaving(false);
    }
  }

  const steps = useMemo(
    () => [
      { number: 1 as const, label: "Personal Information", icon: <UserPlus className="h-4 w-4" aria-hidden /> },
      { number: 2 as const, label: "Country / Branch / Role", icon: <MapPin className="h-4 w-4" aria-hidden /> },
      { number: 3 as const, label: "Security & Permissions", icon: <ShieldCheck className="h-4 w-4" aria-hidden /> }
    ],
    []
  );

  const mainBranchOptions: SearchSelectOption[] = useMemo(
    () => mainBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})`, keywords: `${b.name} ${b.code}` })),
    [mainBranches]
  );

  const cityBranchOptions: SearchSelectOption[] = useMemo(
    () =>
      cityBranches.map((b) => ({
        value: b.id,
        label: `${b.name} (${b.code})`,
        keywords: `${b.name} ${b.code} ${b.city_name}`
      })),
    [cityBranches]
  );

  const filteredSidebarUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = sidebarFilter.toLowerCase().trim();
      if (!q) return true;
      return (
        (u.userCode ?? "").toLowerCase().includes(q) ||
        (u.fullName ?? "").toLowerCase().includes(q) ||
        (u.role ?? "").toLowerCase().includes(q)
      );
    });
  }, [usersList, sidebarFilter]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">User Registration & Setup</h1>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
              {editUserId ? "Edit Mode" : "New User"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, scope, and assign permissions for ERP users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/new-entry/users/journal-report")} className="h-9">
            <ClipboardList className="mr-1.5 h-4 w-4 text-slate-500" /> User Journal Report
          </Button>
        </div>
      </div>

      {/* ── Steps Indicator Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-500">
        {steps.map((s) => {
          const active = s.number === step;
          const completed = step > s.number;
          return (
            <button
              key={s.number}
              type="button"
              onClick={() => {
                if (s.number === 1 || (s.number > 1 && fullName.trim().length >= 2 && gender)) {
                  setStep(s.number);
                }
              }}
              className={`flex items-center gap-2 border rounded-lg p-2.5 text-left transition-all ${
                active
                  ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                  : completed
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 font-bold"
                  : "border-slate-100 bg-slate-50/50 text-slate-400"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                active
                  ? "bg-primary text-white"
                  : completed
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}>
                {completed ? "✓" : s.number}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Left Column Form + Right Column Preview/List ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Step View */}
        <section className="lg:col-span-5 rounded-lg border bg-card p-5 space-y-6">
          {/* Header Banner */}
          {banner ? (
            <div
              className={
                banner.tone === "ok"
                  ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800"
                  : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800"
              }
            >
              {banner.text}
            </div>
          ) : null}

          {/* Edit status indicator & cancel edit button */}
          {editUserId && (
            <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <span>Currently editing user <b>{userCode}</b>.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-950 font-bold hover:bg-amber-100"
                onClick={() => {
                  setEditUserId(null);
                  setFullName("");
                  setUserCode("");
                  setCountryId("");
                  setBranchType("");
                  setCountryBranchId("");
                  setCityBranchId("");
                  setSelectedPermissions([]);
                  setPassword("");
                  setConfirmPassword("");
                  setBanner(null);
                  setSelectedReportUserId("current");
                }}
              >
                Cancel Edit
              </Button>
            </div>
          )}

          {/* Confirmation Message */}
          {createdResult ? (
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardContent className="space-y-2 p-4">
                <div className="text-sm font-semibold text-emerald-900">Operation Successful</div>
                <div className="grid gap-1 text-sm text-emerald-900">
                  <div><b>User ID:</b> {createdResult.userCode}</div>
                  <div><b>Role:</b> {roleOptions.find((r) => r.value === role)?.label ?? role}</div>
                  <div><b>Scope:</b> {selectedCountry?.name ?? "-"} {branchCode ? ` / ${branchCode}` : ""} {cityName ? ` / ${cityName}` : ""}</div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCreatedResult(null);
                      setEditUserId(null);
                      setStep(1);
                      setGender("");
                      setFullName("");
                      setAccountRegNo(makeAutoRegNo());
                      setCountryId("");
                      setBranchType("");
                      setCountryBranchId("");
                      setCityBranchId("");
                      setUserCode("");
                      setPassword("");
                      setConfirmPassword("");
                      setProfileFile(null);
                      setPreviewImageUrl("");
                      setSelectedReportUserId("current");
                    }}
                  >
                    Register New User
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/dashboard/new-entry/users/journal-report")}
                  >
                    View Journal Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 1: Personal Information</h2>
              </div>

              <div className="flex items-center gap-4 rounded-xl border bg-muted/10 p-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-background">
                  {previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImageUrl} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold">Profile Picture</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setProfileFile(file);
                      if (!file) {
                        setPreviewImageUrl("");
                        return;
                      }
                      setPreviewImageUrl(URL.createObjectURL(file));
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <div className="mt-1 text-xs text-muted-foreground">Upload profile picture (optional)</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Select</option>
                    {genderOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Account Registration Number (Auto)</Label>
                  <Input value={accountRegNo} readOnly className="bg-muted/40 font-semibold" />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="button" onClick={() => { if (fullName.trim().length >= 2 && gender) { setStep(2); } else { setBanner({ tone: "err", text: "Please fill required (*) fields." }); } }} className="bg-primary text-white">
                  Next Step
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Scope Flow */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 2: Country / Branch / Role</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SearchSelect
                  label={loadingCountries ? "Country (Loading...)" : "Country *"}
                  value={countryId}
                  placeholder="Select country"
                  options={countryOptions}
                  disabled={loadingCountries || role === "super_admin"}
                  onValueChange={setCountryId}
                />

                <SearchSelect
                  label="Branch Type *"
                  value={branchType}
                  placeholder="Select branch type"
                  options={branchTypeSelectOptions}
                  disabled={role === "super_admin" || role === "country_admin" || role === "country_user"}
                  onValueChange={(v) => {
                    setBranchType(v as any);
                    setCountryBranchId("");
                    setCityBranchId("");
                  }}
                />

                {branchType === "main" ? (
                  <SearchSelect
                    label="Branch Name *"
                    value={countryBranchId}
                    placeholder="Select main branch"
                    options={mainBranchOptions}
                    disabled={role === "super_admin" || role === "country_admin" || role === "country_user" || !countryId}
                    onValueChange={setCountryBranchId}
                  />
                ) : branchType === "city" ? (
                  <SearchSelect
                    label="Branch Name *"
                    value={cityBranchId}
                    placeholder="Select city branch"
                    options={cityBranchOptions}
                    disabled={role === "super_admin" || role === "country_admin" || role === "country_user" || !countryId}
                    onValueChange={setCityBranchId}
                  />
                ) : (
                  <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground md:col-span-1">
                    Select Branch Type first.
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Branch Code (Auto)</Label>
                  <Input value={branchCode} readOnly className="bg-muted/40 font-semibold" />
                </div>

                <div className="space-y-2">
                  <Label>City (Auto)</Label>
                  <Input value={cityName} readOnly className="bg-muted/40 font-semibold" />
                </div>

                <SearchSelect
                  label="Role *"
                  value={role}
                  placeholder="Select role"
                  options={roleSelectOptions}
                  onValueChange={(v) => setRole(v as EnterpriseRole)}
                />
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button type="button" onClick={() => { if (canGoNext()) { setStep(3); } else { setBanner({ tone: "err", text: "Please complete required (*) fields." }); } }} className="bg-primary text-white">
                  Next Step
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Permissions & Finish */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 3: Security & Permissions</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>User ID *</Label>
                  <div className="flex gap-2">
                    <Input value={userCode} onChange={(e) => setUserCode(e.target.value)} placeholder="User login ID" />
                    <Button type="button" variant="outline" size="icon" aria-label="Regenerate" onClick={generateUserCode}>
                      <RefreshCcw className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{editUserId ? "Password (leave blank to keep current)" : "Password *"}</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{editUserId ? "Confirm Password" : "Confirm Password *"}</Label>
                  <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" type="password" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
                {/* Perm groups */}
                <div className="rounded-xl border bg-muted/10 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groups</div>
                  <Input className="h-8 text-xs mb-2" value={permQuery} onChange={(e) => setPermQuery(e.target.value)} placeholder="Filter..." />
                  <div className="max-h-[200px] overflow-y-auto rounded-lg border bg-background text-xs">
                    {filteredGroups.map(([group, perms]) => {
                      const active = group === activePermGroup;
                      const count = perms.filter((p) => selectedPermissions.includes(p)).length;
                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() => setActivePermGroup(group)}
                          className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-muted ${active ? "bg-muted font-bold" : ""}`}
                        >
                          <span className="truncate">{group}</span>
                          <span className="text-[10px] text-muted-foreground">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Permissions items */}
                <div className="rounded-xl border bg-muted/10 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Granted Permissions</div>
                  <div className="max-h-[250px] overflow-y-auto rounded-lg border bg-background p-2">
                    {activeGroupPermissions.length ? (
                      <div className="space-y-1">
                        {activeGroupPermissions.map((perm) => {
                          const checked = selectedPermissions.includes(perm);
                          return (
                            <label key={perm} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded text-primary"
                                checked={checked}
                                onChange={() => togglePermission(perm)}
                              />
                              <span className="font-semibold text-slate-700 truncate">{perm}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-xs text-slate-400">No permissions in this group.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button type="button" onClick={finish} disabled={saving} className="bg-primary text-white">
                  {saving ? "Saving..." : editUserId ? "Save Changes" : "Register User"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Live User Setup List / Report */}
        <aside className="lg:col-span-7 h-fit rounded-lg border bg-card lg:sticky lg:top-24">
          <div className="border-b px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-semibold">Live User Setup Report</h2>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={fetchUsers}>
                Refresh
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Select and configure users setup live.</p>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-2 text-xs">
              {/* Select User Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">Select User for Preview</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-white px-3 text-xs shadow-sm focus:outline-none"
                  value={selectedReportUserId}
                  onChange={(e) => {
                    setSelectedReportUserId(e.target.value);
                    if (e.target.value !== "current") {
                      const match = usersList.find((u) => u.userId === e.target.value);
                      if (match) loadUserForEditing(match);
                    }
                  }}
                >
                  <option value="current">{editUserId ? `Current Editing (${userCode})` : "Current Registration Draft"}</option>
                  {usersList.slice(0, 15).map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.userCode} - {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">Setup Progress</Label>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-semibold">
                  <div>1. Info: <span className={fullName ? "text-emerald-600" : "text-slate-400"}>{fullName ? "Done" : "Pending"}</span></div>
                  <div>2. Scope: <span className={countryId ? "text-emerald-600" : "text-slate-400"}>{countryId ? "Done" : "Pending"}</span></div>
                  <div className="col-span-2">3. Permissions: <span className={selectedPermissions.length ? "text-emerald-600" : "text-slate-400"}>{selectedPermissions.length ? `${selectedPermissions.length} assigned` : "Pending"}</span></div>
                </div>
              </div>
            </div>

            {/* Dynamic Summary Preview Card */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs space-y-3 border-t">
              {selectedReportUserId === "current" ? (
                <>
                  <h4 className="font-extrabold text-slate-600 uppercase tracking-widest text-[9px]">{editUserId ? "Currently Editing User Details" : "Registration Draft Preview"}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-semibold text-slate-700">
                    <div><b>Name:</b> <span className="text-slate-600">{fullName || "-"}</span></div>
                    <div><b>User ID:</b> <span className="text-slate-600">{userCode || "-"}</span></div>
                    <div><b>Role:</b> <span className="text-slate-600">{role || "-"}</span></div>
                    <div><b>Country:</b> <span className="text-slate-600">{selectedCountry?.name || "Global"}</span></div>
                    <div><b>Branch Code:</b> <span className="text-slate-600">{branchCode || "-"}</span></div>
                    <div><b>City:</b> <span className="text-slate-600">{cityName || "-"}</span></div>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <span className="text-[10px] text-slate-500 font-bold">Permissions: </span>
                    <span className="text-slate-600 font-mono text-[10px]">{selectedPermissions.slice(0, 10).join(", ")} {selectedPermissions.length > 10 ? `+${selectedPermissions.length - 10} more` : ""}</span>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="font-extrabold text-slate-600 uppercase tracking-widest text-[9px]">Saved User Details</h4>
                  {(() => {
                    const row = usersList.find((u) => u.userId === selectedReportUserId);
                    if (!row) return <div className="text-slate-400">No user selected.</div>;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-semibold text-slate-700">
                        <div><b>Name:</b> <span className="text-slate-600">{row.fullName}</span></div>
                        <div><b>User ID:</b> <span className="text-slate-600">{row.userCode}</span></div>
                        <div><b>Role:</b> <span className="text-slate-600">{row.role}</span></div>
                        <div><b>Country:</b> <span className="text-slate-600">{row.countryName}</span></div>
                        <div><b>Branch Type:</b> <span className="text-slate-600">{row.branchType}</span></div>
                        <div><b>Branch Name:</b> <span className="text-slate-600">{row.branchName}</span></div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Users list setup table */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saved Users Setup Directory</h3>
                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search directory..."
                    value={sidebarFilter}
                    onChange={(e) => setSidebarFilter(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500 uppercase tracking-wider text-[9px]">
                      <th className="px-2.5 py-2 font-bold border-r">User ID</th>
                      <th className="px-2.5 py-2 font-bold border-r">Full Name</th>
                      <th className="px-2.5 py-2 font-bold border-r">Role</th>
                      <th className="px-2.5 py-2 font-bold border-r text-center">Status</th>
                      <th className="px-2.5 py-2 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={5} className="text-center py-4 text-slate-400">Loading users...</td></tr>
                    ) : filteredSidebarUsers.length > 0 ? (
                      filteredSidebarUsers.slice(0, 10).map((u) => (
                        <tr key={u.userId} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-2.5 py-1.5 border-r font-mono text-[9px] text-blue-600 font-semibold">{u.userCode}</td>
                          <td className="px-2.5 py-1.5 border-r font-medium text-slate-800 max-w-[120px] truncate">{u.fullName}</td>
                          <td className="px-2.5 py-1.5 border-r text-slate-500 truncate">{u.role}</td>
                          <td className="px-2.5 py-1.5 border-r text-center">
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold ${u.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-400 border border-slate-200"}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => loadUserForEditing(u)}
                              className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="text-center py-4 text-slate-400">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
