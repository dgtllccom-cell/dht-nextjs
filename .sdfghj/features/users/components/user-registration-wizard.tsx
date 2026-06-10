"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ShieldCheck,
  Upload,
  UserPlus,
  MapPin
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
    setBranchType("");
    setCountryBranchId("");
    setCityBranchId("");
    setMainBranches([]);
    setCityBranches([]);
    setCities([]);

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
    const defaults = enterpriseRolePermissions[role] ?? [];
    setSelectedPermissions([...new Set(defaults.map((p) => p.trim()).filter(Boolean))]);

    // Scope requirements:
    if (role === "super_admin") {
      setCountryId("");
      setBranchType("");
      setCountryBranchId("");
      setCityBranchId("");
      return;
    }
    if (role === "country_admin") {
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
      if (role === "country_admin") return true;
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

    if (!password || password.length < 8) {
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
    } else if (role === "country_admin") {
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
      const res = await apiPost<{ userId: string; userCode: string }>("/api/erp/users", {
        role,
        fullName: fullName.trim(),
        email,
        password,
        preferredLanguage,
        userCode: issuedCode,
        countryId: resolvedCountryId,
        countryBranchId: resolvedCountryBranchId,
        cityBranchId: resolvedCityBranchId,
        permissions: selectedPermissions
      });

      setBanner({ tone: "ok", text: "User created successfully." });
      localStorage.setItem("user_journal_dirty", new Date().toISOString());
      setCreatedResult({ userId: res.userId, userCode: res.userCode, createdAt: new Date().toISOString() });
    } catch (e: any) {
      setBanner({ tone: "err", text: e?.message || "User creation failed." });
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

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">New Entry / User Entry</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">User Registration</h1>
            <p className="text-sm text-muted-foreground">Create ERP users with scope, role, and permission assignment.</p>
          </div>
        </div>

        {banner ? (
          <div
            className={
              banner.tone === "ok"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
                : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
            }
          >
            {banner.text}
          </div>
        ) : null}

        {createdResult ? (
          <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
            <CardContent className="space-y-2 p-4">
              <div className="text-sm font-semibold text-emerald-900">Registration Confirmation</div>
              <div className="grid gap-1 text-sm text-emerald-900">
                <div>
                  <b>User ID:</b> {createdResult.userCode}
                </div>
                <div>
                  <b>Role:</b> {roleOptions.find((r) => r.value === role)?.label ?? role}
                </div>
                <div>
                  <b>Scope:</b> {selectedCountry?.name ?? "-"} {branchCode ? ` / ${branchCode}` : ""} {cityName ? ` / ${cityName}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setCreatedResult(null);
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
                  }}
                >
                  Create Another User
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/dashboard/new-entry/users/journal-report")}
                >
                  View User Journal Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((s) => {
            const active = s.number === step;
            const done = s.number < step;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setStep(s.number)}
                className={
                  "rounded-xl border px-4 py-3 text-left transition " +
                  (active ? "border-primary/40 bg-primary/5" : done ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-200 bg-card")
                }
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={
                      "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold " +
                      (done ? "bg-emerald-500 text-white" : active ? "bg-primary text-white" : "bg-slate-200 text-slate-600")
                    }
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden /> : s.number}
                  </span>
                  <span className="text-xs text-muted-foreground">Step {s.number}</span>
                </div>
                <div className={"flex items-center gap-2 text-sm font-semibold " + (active ? "text-primary" : done ? "text-emerald-700" : "text-slate-700")}>
                  {s.icon}
                  {s.label}
                </div>
              </button>
            );
          })}
        </div>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{steps.find((s) => s.number === step)?.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 ? (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Personal Information
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
                    <div className="mt-1 text-xs text-muted-foreground">Preview shows after upload. (Storage upload will be wired next.)</div>
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
                        <option key={g} value={g}>
                          {g}
                        </option>
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
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  <MapPin className="h-4 w-4" aria-hidden />
                  Country / Branch / Role Flow
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
                  Flow: Country select → Branch Type → Branch Name → Branch Code auto-fill → City auto-fill → Role select.
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
                    disabled={role === "super_admin" || role === "country_admin"}
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
                      disabled={role === "super_admin" || role === "country_admin" || !countryId}
                      onValueChange={setCountryBranchId}
                    />
                  ) : branchType === "city" ? (
                    <SearchSelect
                      label="Branch Name *"
                      value={cityBranchId}
                      placeholder="Select city branch"
                      options={cityBranchOptions}
                      disabled={role === "super_admin" || role === "country_admin" || !countryId}
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

                <div className="rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
                  Role scope rules: Super Admin = global. Country Admin = country only. Main Branch Admin = main branch scope. Branch roles = city/main scope.
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  User Security & Permissions
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>User ID *</Label>
                    <div className="flex gap-2">
                      <Input value={userCode} onChange={(e) => setUserCode(e.target.value)} placeholder="Auto generated user ID" />
                      <Button type="button" variant="outline" size="icon" aria-label="Regenerate" onClick={generateUserCode}>
                        <RefreshCcw className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">User can login with this User ID (user_code) or with the internal email.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Confirm Password *</Label>
                    <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" type="password" />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                  <div className="rounded-xl border bg-muted/10 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permission Groups</div>
                    <Input
                      className="h-9 text-xs"
                      value={permQuery}
                      onChange={(e) => setPermQuery(e.target.value)}
                      placeholder="Search permissions..."
                    />
                    <div className="mt-3 max-h-[320px] overflow-y-auto rounded-lg border bg-background">
                      {filteredGroups.map(([group, perms]) => {
                        const active = group === activePermGroup;
                        const count = perms.filter((p) => selectedPermissions.includes(p)).length;
                        return (
                          <button
                            key={group}
                            type="button"
                            onClick={() => setActivePermGroup(group)}
                            className={
                              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted " +
                              (active ? "bg-muted font-semibold" : "")
                            }
                          >
                            <span className="truncate">{group}</span>
                            <span className="text-xs text-muted-foreground">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/10 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</div>
                    <div className="max-h-[380px] overflow-y-auto rounded-lg border bg-background p-2">
                      {activeGroupPermissions.length ? (
                        <div className="space-y-2">
                          {activeGroupPermissions.map((perm) => {
                            const checked = selectedPermissions.includes(perm);
                            return (
                              <label key={perm} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-primary"
                                  checked={checked}
                                  onChange={() => togglePermission(perm)}
                                />
                                <div className="text-sm">
                                  <div className="font-semibold text-slate-800">{perm}</div>
                                  <div className="text-xs text-muted-foreground">Tick/Untick to grant or revoke.</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground">No permissions in this group.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={prev} disabled={step === 1 || saving}>
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Back
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {step < 3 ? (
                  <Button type="button" onClick={next} disabled={!canGoNext() || saving}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                ) : (
                  <Button type="button" onClick={finish} disabled={saving}>
                    {saving ? "Saving..." : "Finish Registration"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-4">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live Report</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Updates automatically while typing / selecting.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportRow("Name", fullName, "primary")}
            {reportRow("Country", selectedCountry?.name ?? "-")}
            {reportRow("Branch Type", branchType ? (branchType === "main" ? "Main Branch" : "City Branch") : "-")}
            {reportRow("Branch Name", branchType === "main" ? selectedMainBranch?.name ?? "-" : selectedCityBranch?.name ?? "-")}
            {reportRow("Branch Code", branchCode || "-")}
            {reportRow("City", cityName || "-")}
            <div className="my-2 border-t border-dashed" />
            {reportRow("User ID", userCode || "-")}
            {reportRow("Role", roleOptions.find((r) => r.value === role)?.label ?? role)}

            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Permissions</div>
              <div className="max-h-[180px] overflow-y-auto rounded-lg border bg-muted/10 p-2">
                {selectedPermissions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPermissions.slice(0, 24).map((p) => (
                      <span key={p} className="rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                        {p}
                      </span>
                    ))}
                    {selectedPermissions.length > 24 ? (
                      <span className="rounded bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                        +{selectedPermissions.length - 24} more
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-rose-700">None Selected</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
