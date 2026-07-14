"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactNumberInput } from "@/components/ui/contact-number-input";
import { SearchSelect } from "@/components/ui/search-select";
import { CompanyPicker } from "@/features/companies/components/company-picker";
import { BranchOwnerPicker } from "@/features/branches/components/branch-owner-picker";
import { BranchLiveReportPanel } from "@/features/branches/components/branch-live-report-panel";
import { BranchRecordProfile, type BranchProfileSection } from "@/features/branches/components/branch-record-profile";
import { BranchReportActionsMenu } from "@/features/branches/components/branch-report-actions-menu";
import { downloadCsv } from "@/features/branches/components/branch-report-export";
import { PermissionAssignmentSection } from "@/features/users/components/permission-assignment-section";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import {
  LocationHierarchySelect,
  type LocationHierarchyMeta,
  type LocationHierarchyValue
} from "@/features/locations/components/location-hierarchy-select";
import type { LocationCountry } from "@/features/locations/location-api";
import { apiGet } from "@/lib/api/client";
import { getPermissionKeysForTemplate } from "@/lib/permissions/catalog";
import { openA4ReportWindow } from "@/lib/reports/open-a4-report-window";
import type { ContactTypeKey } from "@/features/contact-types/contact-type-api";

type CountryBranchRow = {
  id: string;
  country_id: string;
  name: string;
  code: string;
  local_currency: string;
  is_main: boolean;
  status: string;
  permission_template?: string | null;
  permission_grants?: string[] | null;
};

type CityBranchRow = {
  id: string;
  country_id: string;
  country_branch_id: string;
  city_name: string;
  name: string;
  code: string;
  local_currency: string;
  status: string;
  state_province_id?: string | null;
  district_id?: string | null;
  city_id?: string | null;
  area_location_id?: string | null;
  company_id?: string | null;
  owner_name?: string | null;
  contacts?: unknown;
  documents?: unknown;
  permission_template?: string | null;
  permission_grants?: string[] | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ContactRow = { type: string; value: string };
type CompanyRow = { id: string; name: string; legal_name: string | null; base_currency: string };
type OwnerCustomerRow = {
  id: string;
  customer_name: string;
  company_name: string | null;
  contact_person: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
};
type OwnerProfileRow = {
  userId: string;
  userCode: string;
  fullName: string;
  countryName: string;
  branchName: string;
  branchType: string;
  role: string;
  permissions: string[];
};
type OwnerPreview = {
  source: "customer" | "profile";
  code: string;
  name: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;
  country: string;
  branch: string;
  role: string;
};

const contactTypeOptions = ["Mobile", "Phone", "WhatsApp", "Email", "Fax"] as const;

function toContactTypeKey(label: string): ContactTypeKey | null {
  const normalized = (label || "").toLowerCase();
  if (normalized.startsWith("mobile")) return "mobile";
  if (normalized.startsWith("phone")) return "phone";
  if (normalized.startsWith("whatsapp")) return "whatsapp";
  if (normalized.startsWith("fax")) return "fax";
  if (normalized.startsWith("extension")) return "extension";
  return null;
}

function selectClassName() {
  return "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
}

function pillClassName() {
  return "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-slate-700 dark:text-slate-200";
}

function buildMailtoHref(subject: string, rows: Array<{ label: string; value: string }>) {
  const body = rows.map((row) => `${row.label}: ${row.value || "-"}`).join("\n");
  const params = new URLSearchParams({ subject, body });
  return `mailto:?${params.toString()}`;
}

function ReportRow({ label, value }: { label: string; value: string }) {
  const blank = !value || value === "-";

  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-dashed py-2 text-sm last:border-b-0">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <span className={blank ? "font-semibold text-muted-foreground" : "font-semibold text-foreground"}>
        {value || "-"}
      </span>
    </div>
  );
}

function formatBulletList(items: string[]) {
  if (!items.length) return <span className="text-sm text-muted-foreground">-</span>;
  return (
    <ul className="ms-4 list-disc text-sm text-slate-700 dark:text-slate-200">
      {items.map((item, idx) => (
        <li key={`${item}-${idx}`}>{item}</li>
      ))}
    </ul>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asIso3(country: LocationCountry | null) {
  if (!country) return "";
  const iso = (country.iso3 || country.iso2 || country.name || "").replace(/[^a-zA-Z]/g, "");
  return iso.slice(0, 3).toUpperCase() || "CTR";
}

function isCityBranchMatch(row: CityBranchRow, cityId: string, cityName: string) {
  if (cityId && row.city_id && row.city_id === cityId) return true;
  if (cityName && row.city_name) return row.city_name.trim().toLowerCase() === cityName.trim().toLowerCase();
  return false;
}

function compactCode(value: string, fallback: string) {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!clean) return fallback;
  return clean.slice(0, 4);
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function CityBranchSetup() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId") ?? "";
  const [drawerBranchData, setDrawerBranchData] = useState<any>(null);
  const [location, setLocation] = useState<LocationHierarchyValue>({
    countryId: "",
    stateProvinceId: "",
    districtId: "",
    cityId: "",
    areaId: ""
  });
  const [locationMeta, setLocationMeta] = useState<LocationHierarchyMeta>({
    country: null,
    state: null,
    district: null,
    city: null,
    area: null
  });

  const [currency, setCurrency] = useState("");
  const [fullAddress, setFullAddress] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPreview, setOwnerPreview] = useState<OwnerPreview | null>(null);

  const [countryBranchId, setCountryBranchId] = useState("");
  const [mainBranches, setMainBranches] = useState<CountryBranchRow[]>([]);

  const [existingCityBranches, setExistingCityBranches] = useState<CityBranchRow[]>([]);
  const [existingCitySearch, setExistingCitySearch] = useState("");
  const [editingCityBranchId, setEditingCityBranchId] = useState("");

  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [permissionTemplate, setPermissionTemplate] = useState("city-standard");
  const [permissionGrants, setPermissionGrants] = useState<string[]>(() => getPermissionKeysForTemplate("city-standard"));

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [manualZip, setManualZip] = useState("");

  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const selectedMainBranch = useMemo(
    () => mainBranches.find((b) => b.id === countryBranchId) ?? null,
    [mainBranches, countryBranchId]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!companyId) {
        setCompany(null);
        return;
      }
      try {
        const res = await apiGet<{ company: CompanyRow }>(`/api/erp/companies/${encodeURIComponent(companyId)}`);
        if (!cancelled) setCompany(res.company ?? null);
      } catch {
        if (!cancelled) setCompany(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    const q = ownerName.trim();
    if (!q) {
      setOwnerPreview(null);
      return;
    }

    (async () => {
      try {
        const [customersRes, usersRes] = await Promise.all([
          apiGet<{ customers: OwnerCustomerRow[] }>(`/api/erp/customers?q=${encodeURIComponent(q)}&limit=10`),
          apiGet<{ rows: OwnerProfileRow[] }>(`/api/erp/users/journal-report?q=${encodeURIComponent(q)}&limit=10`)
        ]);

        if (cancelled) return;

        const normalized = normalizeSearch(q);
        const customer =
          customersRes.customers?.find((row) =>
            [row.customer_name, row.company_name, row.contact_person, row.mobile, row.whatsapp, row.email]
              .filter(Boolean)
              .some((value) => normalizeSearch(String(value)) === normalized || normalizeSearch(String(value)).includes(normalized))
          ) ?? customersRes.customers?.[0] ?? null;

        if (customer) {
          setOwnerPreview({
            source: "customer",
            code: compactCode(customer.id, "CUST"),
            name: customer.customer_name,
            companyName: customer.company_name ?? "-",
            contactPerson: customer.contact_person ?? "-",
            mobile: customer.mobile ?? "-",
            whatsapp: customer.whatsapp ?? "-",
            email: customer.email ?? "-",
            address: customer.address ?? "-",
            country: locationMeta.country?.name ?? "-",
            branch: selectedMainBranch?.name ?? "-",
            role: "Customer / Owner"
          });
          return;
        }

        const profile =
          usersRes.rows?.find((row) => {
            const haystack = normalizeSearch([row.userCode, row.fullName, row.countryName, row.branchName, row.role].filter(Boolean).join(" "));
            return haystack.includes(normalized);
          }) ?? usersRes.rows?.[0] ?? null;

        if (profile) {
          setOwnerPreview({
            source: "profile",
            code: profile.userCode || compactCode(profile.userId, "USR"),
            name: profile.fullName,
            companyName: company?.name ?? "-",
            contactPerson: profile.fullName,
            mobile: "-",
            whatsapp: "-",
            email: "-",
            address: "-",
            country: profile.countryName || locationMeta.country?.name || "-",
            branch: profile.branchName || selectedMainBranch?.name || "-",
            role: profile.role
          });
          return;
        }

        setOwnerPreview(null);
      } catch {
        if (!cancelled) setOwnerPreview(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [company, locationMeta.country?.name, ownerName, selectedMainBranch?.name]);

  const hasAny = Boolean(
    location.countryId ||
      countryBranchId ||
      location.stateProvinceId ||
      location.cityId ||
      currency ||
      fullAddress ||
      companyId ||
      ownerName ||
      branchName ||
      branchCode ||
      permissionGrants.length ||
      contacts.some((c) => c.type || c.value)
  );

  const autoZip = locationMeta.area?.postal_code ?? locationMeta.city?.zip_code ?? "";
  // zip: manual entry wins; if empty, fall back to auto-derived value
  const zip = manualZip || autoZip;
  const previewCountry = locationMeta.country?.name || "-";
  const previewMainBranch = selectedMainBranch?.name || "-";
  const previewLocation = [locationMeta.state?.name, locationMeta.city?.name, locationMeta.area?.name, zip].filter(Boolean).join(" / ") || "-";
  const previewCompany = company?.name || "-";
  const companyCode = company?.id ? compactCode(company.id, "CMP") : "-";
  const parentPermissionGrants = selectedMainBranch?.permission_grants?.length ? selectedMainBranch.permission_grants : undefined;

  useEffect(() => {
    if (!parentPermissionGrants?.length) return;
    setPermissionGrants((current) => current.filter((permission) => parentPermissionGrants.includes(permission)));
  }, [parentPermissionGrants]);

  const matchingExistingCityBranch = useMemo(() => {
    if (!countryBranchId || !location.cityId || !locationMeta.city?.name) return null;
    return (
      existingCityBranches.find(
        (branch) =>
          branch.country_branch_id === countryBranchId &&
          isCityBranchMatch(branch, location.cityId, locationMeta.city?.name ?? "")
      ) ?? null
    );
  }, [countryBranchId, existingCityBranches, location.cityId, locationMeta.city?.name]);

  const activeExistingCityBranch = useMemo(() => {
    if (editingCityBranchId) {
      return existingCityBranches.find((branch) => branch.id === editingCityBranchId) ?? matchingExistingCityBranch;
    }
    return matchingExistingCityBranch;
  }, [editingCityBranchId, existingCityBranches, matchingExistingCityBranch]);

  const cityAlreadyExists = Boolean(
    location.cityId &&
      existingCityBranches.some((b) => {
        if (editingCityBranchId && b.id === editingCityBranchId) return false;
        if (b.city_id && b.city_id === location.cityId) return true;
        if (b.city_name && locationMeta.city?.name) {
          return b.city_name.trim().toLowerCase() === locationMeta.city.name.trim().toLowerCase();
        }
        return false;
      })
  );

  const contactItems = contacts
    .map((row) => {
      if (!row.type && !row.value) return null;
      return `${row.type || "Type"}: ${row.value || "-"}`;
    })
    .filter((row): row is string => Boolean(row));

  const reportRows = useMemo(
    () => [
      { label: "Country", value: previewCountry },
      { label: "Country Code", value: locationMeta.country?.iso2 || locationMeta.country?.iso3 || "-" },
      { label: "Country Main Branch", value: previewMainBranch },
      { label: "City Branch", value: activeExistingCityBranch?.name || branchName || "-" },
      { label: "Branch Code", value: activeExistingCityBranch?.code || branchCode || "-" },
      { label: "Currency", value: activeExistingCityBranch?.local_currency || currency || "-" },
      { label: "Location", value: previewLocation },
      { label: "Address", value: activeExistingCityBranch?.address || fullAddress || "-" },
      { label: "Company Name", value: previewCompany },
      { label: "Company Code", value: companyCode },
      { label: "Company Owner", value: ownerPreview?.name || activeExistingCityBranch?.owner_name || ownerName || "-" },
      { label: "Owner Details", value: ownerPreview ? `${ownerPreview.source.toUpperCase()} · ${ownerPreview.code}` : activeExistingCityBranch?.owner_name || ownerName || "-" },
      { label: "Permission Template", value: activeExistingCityBranch?.permission_template || permissionTemplate || "-" },
      {
        label: "Permission Grants",
        value: activeExistingCityBranch?.permission_grants?.length
          ? activeExistingCityBranch.permission_grants.join(", ")
          : permissionGrants.length
            ? permissionGrants.join(", ")
            : "-"
      },
      { label: "Contacts", value: contactItems.length ? contactItems.join(", ") : "-" }
    ],
    [
      activeExistingCityBranch?.address,
      activeExistingCityBranch?.code,
      activeExistingCityBranch?.local_currency,
      activeExistingCityBranch?.name,
      activeExistingCityBranch?.owner_name,
      branchCode,
      branchName,
      contactItems,
      currency,
      fullAddress,
      companyCode,
      ownerName,
      ownerPreview,
      permissionGrants,
      permissionTemplate,
      previewCompany,
      previewCountry,
      previewLocation,
      previewMainBranch
    ]
  );

  const editIdentityRows = useMemo(
    () => [
      { label: "Country", value: previewCountry },
      { label: "Main Branch", value: previewMainBranch },
      { label: "City Branch", value: activeExistingCityBranch?.name || branchName },
      { label: "Branch Code", value: activeExistingCityBranch?.code || branchCode },
      { label: "Record ID", value: editingCityBranchId },
      { label: "Status", value: activeExistingCityBranch?.status || "active" },
      { label: "Created Date", value: activeExistingCityBranch?.created_at ? new Date(activeExistingCityBranch.created_at).toLocaleString() : "" },
      { label: "Last Updated", value: activeExistingCityBranch?.updated_at ? new Date(activeExistingCityBranch.updated_at).toLocaleString() : "" }
    ],
    [activeExistingCityBranch, branchCode, branchName, editingCityBranchId, previewCountry, previewMainBranch]
  );

  const editProfileSections: BranchProfileSection[] = useMemo(
    () => [
      {
        title: "Branch Information",
        items: [
          { label: "Branch Name", value: activeExistingCityBranch?.name || branchName },
          { label: "Branch Code", value: activeExistingCityBranch?.code || branchCode },
          { label: "Currency", value: activeExistingCityBranch?.local_currency || currency },
          { label: "Status", value: activeExistingCityBranch?.status || "active" }
        ]
      },
      {
        title: "Location Information",
        items: [
          { label: "Country", value: previewCountry },
          { label: "Main Branch", value: previewMainBranch },
          { label: "Location", value: previewLocation },
          { label: "Address", value: activeExistingCityBranch?.address || fullAddress }
        ]
      },
      {
        title: "Company Information",
        items: [
          { label: "Company Name", value: company?.name },
          { label: "Company Code", value: company?.id ? compactCode(company.id, "CMP") : "" },
          { label: "Legal Name", value: company?.legal_name },
          { label: "Base Currency", value: company?.base_currency }
        ]
      },
      {
        title: "Owner Information",
        items: [
          { label: "Owner Name", value: ownerPreview?.name || activeExistingCityBranch?.owner_name || ownerName },
          { label: "Owner Code", value: ownerPreview?.code || "N/A" },
          { label: "Owner Source", value: ownerPreview?.source || "custom" },
          { label: "Owner Role", value: ownerPreview?.role || "Owner" }
        ]
      },
      {
        title: "Contact Information",
        items: [
          { label: "Contacts", value: contactItems.length ? contactItems.join(", ") : "" },
          { label: "Phone", value: contacts.find((row) => row.type.toLowerCase().includes("phone"))?.value },
          { label: "WhatsApp", value: contacts.find((row) => row.type.toLowerCase().includes("whatsapp"))?.value },
          { label: "Email", value: contacts.find((row) => row.type.toLowerCase().includes("email"))?.value || activeExistingCityBranch?.email }
        ]
      },
      {
        title: "Permissions",
        items: [
          { label: "Template", value: activeExistingCityBranch?.permission_template || permissionTemplate },
          {
            label: "Granted Permissions",
            value: activeExistingCityBranch?.permission_grants?.length
              ? activeExistingCityBranch.permission_grants.join(", ")
              : permissionGrants.length
                ? permissionGrants.join(", ")
                : ""
          }
        ]
      }
    ],
    [
      activeExistingCityBranch,
      branchCode,
      branchName,
      company,
      contactItems,
      contacts,
      currency,
      fullAddress,
      ownerName,
      ownerPreview,
      permissionGrants,
      permissionTemplate,
      previewCountry,
      previewLocation,
      previewMainBranch
    ]
  );

  const liveBranchData = useMemo(() => {
    const active = activeExistingCityBranch;
    const phoneVal = contacts.find((row) => row.type.toLowerCase().includes("phone"))?.value || "";
    const emailVal = contacts.find((row) => row.type.toLowerCase().includes("email"))?.value || active?.email || "";
    const whatsappVal = contacts.find((row) => row.type.toLowerCase().includes("whatsapp"))?.value || "";

    return {
      serialNumber: active?.id ? active.id.slice(0, 4).toUpperCase() : "0001",
      branchStatus: active?.status || (hasAny ? "Draft" : "Empty"),
      branchCode: active?.code || branchCode || "-",
      branchType: "CITY",
      country: previewCountry,
      currency: active?.local_currency || currency || "USD",
      
      grandparentBranch: {
        name: "ACCOUNTS.DGT.LLC Headquarters",
        code: "SUPER-HQ-001",
        type: "SUPER_ADMIN",
        status: "ACTIVE",
        currency: "USD"
      },
      parentBranch: selectedMainBranch
        ? {
            name: selectedMainBranch.name,
            code: selectedMainBranch.code,
            type: "MAIN",
            status: selectedMainBranch.status,
            currency: selectedMainBranch.local_currency
          }
        : undefined,

      branchName: active?.name || branchName || "-",
      createdDate: active?.created_at ? new Date(active.created_at).toLocaleDateString() : undefined,
      updatedDate: active?.updated_at ? new Date(active.updated_at).toLocaleDateString() : undefined,
      createdBy: "Super Admin",
      updatedBy: "Super Admin",
      establishedOn: "-",
      taxRegNo: "-",
      ntnGstNo: "-",

      city: locationMeta.city?.name || active?.city_name || "-",
      cityCode: locationMeta.city?.code || "-",
      stateProvince: locationMeta.state?.name || "-",
      areaRegion: locationMeta.area?.name || "-",
      zipCode: zip || "-",
      fullAddress: active?.address || fullAddress || "-",

      ownerName: ownerPreview?.name || active?.owner_name || ownerName || "-",
      ownerCode: ownerPreview?.code || "OWN-0001",
      fatherHusbandName: "-",
      cnicId: "-",
      nationality: "Pakistani",
      designation: "Branch Manager",
      ownershipType: "Individual",
      ownershipPercent: "100%",
      ownerPhone: phoneVal || ownerPreview?.mobile || "-",
      ownerWhatsApp: whatsappVal || ownerPreview?.whatsapp || "-",
      ownerEmail: emailVal || ownerPreview?.email || "-",
      ownerAltEmail: "-",
      ownerLandline: "-",
      ownerWebsite: ownerPreview?.address || "-",

      companyName: previewCompany || "-",
      companyCode: companyCode || "-",
      companyType: "Private Limited",
      companyRegNo: "-",
      companyIncDate: "-",
      companyTaxRegNo: "-",
      companyNtnGstNo: "-",
      companyStatus: "Active",
      companyPhone: phoneVal || "-",
      companyEmail: emailVal || "-",
      companyWebsite: "-",
      companyOfficeAddress: active?.address || fullAddress || "-",

      allowedPermissions: active?.permission_grants || permissionGrants,
      remarks: "This is a detailed city branch report representing live settings."
    };
  }, [
    activeExistingCityBranch,
    contacts,
    branchCode,
    previewCountry,
    currency,
    branchName,
    locationMeta,
    zip,
    fullAddress,
    ownerPreview,
    ownerName,
    previewCompany,
    companyCode,
    permissionGrants,
    hasAny
  ]);

  function openReport(autoPrint: boolean) {
    const activeLang = typeof document !== "undefined" ? document.documentElement.lang : "en";
    openA4ReportWindow({
      title: "City Branch Report",
      subtitle: "Store Entry Preview (A4)",
      autoPrint,
      branchData: liveBranchData,
      lang: activeLang
    });
  }

  function printReport() {
    openReport(true);
  }

  function viewReport() {
    openReport(false);
  }

  function editReport() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const firstField = document.querySelector("form input, form select, form textarea") as HTMLElement | null;
    firstField?.focus?.();
  }

  function normalizeContacts(value: unknown): ContactRow[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((row) => {
        const item = row as { type?: string; value?: string };
        const type = String(item.type ?? "").trim();
        const contactValue = String(item.value ?? "").trim();
        return type && contactValue ? { type, value: contactValue } : null;
      })
      .filter((row): row is ContactRow => Boolean(row));
  }

  function beginEditCityBranch(row: CityBranchRow) {
    setEditingCityBranchId(row.id);
    setCountryBranchId(row.country_branch_id);
    setLocation({
      countryId: row.country_id,
      stateProvinceId: row.state_province_id ?? "",
      districtId: row.district_id ?? "",
      cityId: row.city_id ?? "",
      areaId: row.area_location_id ?? ""
    });
    setLocationMeta({ country: null, state: null, district: null, city: null, area: null });
    setCurrency(row.local_currency || "");
    setFullAddress(row.address ?? "");
    setCompanyId(row.company_id ?? "");
    setOwnerName(row.owner_name ?? "");
    setContacts(normalizeContacts(row.contacts));
    setBranchName(row.name || "");
    setBranchCode(row.code || "");
    setPermissionTemplate(row.permission_template ?? "city-standard");
    setPermissionGrants(Array.isArray(row.permission_grants) ? row.permission_grants : getPermissionKeysForTemplate("city-standard"));
    setBanner({
      type: "success",
      message: `Editing Existing Branch\nBranch Name: ${row.name}\nBranch Code: ${row.code}`
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function viewSavedBranch(row: CityBranchRow) {
    const phoneVal = normalizeContacts(row.contacts).find((c) => c.type.toLowerCase().includes("phone") || c.type.toLowerCase().includes("mobile"))?.value || "";
    const emailVal = normalizeContacts(row.contacts).find((c) => c.type.toLowerCase().includes("email"))?.value || row.email || "";
    const whatsappVal = normalizeContacts(row.contacts).find((c) => c.type.toLowerCase().includes("whatsapp"))?.value || "";

    const payload = {
      serialNumber: row.id.slice(0, 4).toUpperCase(),
      branchStatus: row.status || "ACTIVE",
      branchCode: row.code || "-",
      branchType: "CITY",
      country: locationMeta.country?.name || "Country",
      currency: row.local_currency || currency || "USD",
      
      parentBranch: {
        name: selectedMainBranch?.name || "Main Branch",
        code: selectedMainBranch?.code || "MAIN",
        type: "MAIN",
        status: "ACTIVE",
        currency: selectedMainBranch?.local_currency || "USD"
      },

      branchName: row.name,
      createdDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined,
      updatedDate: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : undefined,
      createdBy: "Super Admin",
      updatedBy: "Super Admin",
      establishedOn: "-",
      taxRegNo: "-",
      ntnGstNo: "-",

      city: row.city_name || locationMeta.city?.name || "-",
      cityCode: "-",
      stateProvince: locationMeta.state?.name || "-",
      areaRegion: locationMeta.area?.name || "-",
      zipCode: zip || "-",
      fullAddress: row.address || "-",

      ownerName: row.owner_name || "-",
      ownerCode: "OWN-0001",
      fatherHusbandName: "-",
      cnicId: "-",
      nationality: "Pakistani",
      designation: "City Branch Manager",
      ownershipType: "Individual",
      ownershipPercent: "100%",
      ownerPhone: phoneVal || "-",
      ownerWhatsApp: whatsappVal || "-",
      ownerEmail: emailVal || "-",
      ownerAltEmail: "-",
      ownerLandline: "-",
      ownerWebsite: "-",

      companyName: previewCompany || "-",
      companyCode: companyCode || "-",
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

      allowedPermissions: Array.isArray(row.permission_grants) ? row.permission_grants : [],
      remarks: "Saved city branch details registry."
    };

    setDrawerBranchData(payload);
  }

  useEffect(() => {
    if (!isUuid(editId)) return;
    if (editingCityBranchId === editId) return;

    let cancelled = false;
    (async () => {
      setEditLoading(true);
      try {
        const res = await fetch(`/api/branch-management/city-branches?id=${encodeURIComponent(editId)}`, {
          cache: "no-store"
        });
        const json = (await res.json().catch(() => ({}))) as { cityBranches?: CityBranchRow[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setBanner({ type: "error", message: json.error || "City branch record not found." });
          return;
        }
        const row = Array.isArray(json.cityBranches) ? json.cityBranches[0] : null;
        if (!row) {
          setBanner({ type: "error", message: "City branch record not found." });
          return;
        }
        await loadMainBranches(row.country_id);
        await loadExistingCityBranches(row.country_id, row.country_branch_id);
        beginEditCityBranch(row);
      } catch (error) {
        if (!cancelled) setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to load city branch record." });
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function emailReport() {
    if (typeof window === "undefined") return;
    window.location.href = buildMailtoHref("City Branch Report", reportRows);
  }

  function exportReportCsv() {
    const rows = [["Field", "Value"], ...reportRows.map((row) => [row.label, row.value])];
    downloadCsv(`city-branch_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const filteredExistingCityBranches = useMemo(() => {
    const q = existingCitySearch.trim().toLowerCase();
    if (!q) return existingCityBranches;
    return existingCityBranches.filter((b) => {
      const haystack = [b.code, b.name, b.city_name].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [existingCityBranches, existingCitySearch]);

  async function loadMainBranches(nextCountryId: string) {
    if (!isUuid(nextCountryId)) {
      setMainBranches([]);
      return;
    }
    const res = await fetch(`/api/branch-management/country-branches?countryId=${encodeURIComponent(nextCountryId)}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      setMainBranches([]);
      return;
    }
    const json = (await res.json()) as { countryBranches?: CountryBranchRow[] };
    const list = Array.isArray(json.countryBranches) ? json.countryBranches : [];
    setMainBranches(list.filter((b) => b.is_main));
  }

  async function loadExistingCityBranches(nextCountryId: string, nextCountryBranchId: string) {
    if (!isUuid(nextCountryId) || !isUuid(nextCountryBranchId)) {
      setExistingCityBranches([]);
      return [];
    }
    const res = await fetch(
      `/api/branch-management/city-branches?countryId=${encodeURIComponent(nextCountryId)}&countryBranchId=${encodeURIComponent(
        nextCountryBranchId
      )}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      setExistingCityBranches([]);
      return [];
    }
    const json = (await res.json()) as { cityBranches?: CityBranchRow[] };
    const list = Array.isArray(json.cityBranches) ? json.cityBranches : [];
    setExistingCityBranches(list);
    return list;
  }

  function suggestBranchCode(meta: LocationHierarchyMeta, existingCount: number) {
    const prefix = asIso3(meta.country);
    const num = String(Math.max(1, existingCount + 1)).padStart(3, "0");
    const cityCode = compactCode(meta.city?.code || meta.city?.name || "", "CITY");
    return `${prefix}-${cityCode}-${num}`;
  }

  function suggestBranchName(meta: LocationHierarchyMeta) {
    const city = meta.city?.name?.trim();
    if (!city) return "";
    return `${city} City Branch`;
  }

  async function onCountrySelected(next: LocationHierarchyValue, meta: LocationHierarchyMeta) {
    setBanner(null);
    if (editingCityBranchId && next.countryId === location.countryId) {
      setLocation(next);
      setLocationMeta(meta);
      if (meta.country?.currency_code) {
        setCurrency(meta.country.currency_code.toUpperCase());
      }
      return;
    }
    setLocation(next);
    setLocationMeta(meta);

    setCurrency(meta.country?.currency_code?.toUpperCase() || "");
    setFullAddress("");

    setCountryBranchId("");
    setMainBranches([]);
    setExistingCityBranches([]);
    setPermissionTemplate("city-standard");
    setPermissionGrants(getPermissionKeysForTemplate("city-standard"));
    setEditingCityBranchId("");

    setBranchName("");
    setBranchCode("");

    if (meta.country?.phone_code) {
      const code = meta.country.phone_code;
      setContacts((prev) => {
        if (prev.length === 0) {
          return [{ type: "Mobile", value: code + " " }];
        }
        return prev.map((c) => {
          if (["Mobile", "Phone", "WhatsApp"].includes(c.type) && !c.value.trim()) {
            return { ...c, value: code + " " };
          }
          return c;
        });
      });
    }

    if (!isUuid(next.countryId)) return;
    await loadMainBranches(next.countryId);
  }

  async function onMainBranchSelected(nextId: string) {
    setBanner(null);
    setCountryBranchId(nextId);
    const list = await loadExistingCityBranches(location.countryId, nextId);
    setBranchCode(suggestBranchCode(locationMeta, list.length));
    const parent = mainBranches.find((branch) => branch.id === nextId);
    const parentPermissions = parent?.permission_grants?.length ? parent.permission_grants : undefined;
    setPermissionGrants((current) => (parentPermissions ? current.filter((permission) => parentPermissions.includes(permission)) : current));
  }

  function onLocationChange(next: LocationHierarchyValue, meta: LocationHierarchyMeta) {
    setLocation(next);
    setLocationMeta(meta);

    // Auto-fill ZIP from newly selected area or city (only if user hasn't typed a manual zip)
    const derivedZip = meta.area?.postal_code ?? meta.city?.zip_code ?? "";
    if (derivedZip) setManualZip(""); // clear manual so auto shows through

    if (editingCityBranchId) return;

    if (!branchName.trim()) {
      const nextName = suggestBranchName(meta);
      if (nextName) setBranchName(nextName);
    }

    if (countryBranchId) {
      setBranchCode(suggestBranchCode(meta, existingCityBranches.length));
    }
  }

  function addNewTypePrompt() {
    const value = window.prompt("Enter new type");
    if (!value) return null;
    const clean = value.trim();
    if (!clean) return null;
    return clean;
  }

  function updateContact(idx: number, updates: Partial<ContactRow>) {
    setContacts((current) => current.map((row, i) => (i === idx ? { ...row, ...updates } : row)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);

    if (!isUuid(location.countryId) || !isUuid(countryBranchId)) {
      setBanner({ type: "error", message: "Please select a valid Country and Main Branch." });
      return;
    }

    if (!isUuid(location.stateProvinceId) || !isUuid(location.cityId) || !locationMeta.city?.name) {
      setBanner({ type: "error", message: "Please select State/Province and City from Location Settings." });
      return;
    }

    if (cityAlreadyExists) {
      setBanner({
        type: "error",
        message: `City Branch Already Exists\nBranch Name: ${activeExistingCityBranch?.name || "-"}\nBranch Code: ${activeExistingCityBranch?.code || "-"}\nStatus: ${activeExistingCityBranch?.status || "-"}`
      });
      return;
    }

    if (!branchName.trim()) {
      setBanner({ type: "error", message: "Branch Name is required." });
      return;
    }

    if (!branchCode.trim()) {
      setBanner({ type: "error", message: "Branch Code is required." });
      return;
    }

    if (!permissionTemplate || !permissionGrants.length) {
      setBanner({
        type: "error",
        message: "Please select a Permissions Template and at least one explicit permission before saving the City Branch."
      });
      return;
    }

    if (parentPermissionGrants?.length && permissionGrants.some((permission) => !parentPermissionGrants.includes(permission))) {
      setBanner({
        type: "error",
        message: "City Branch permissions must be selected from the Country/Main Branch permissions only."
      });
      return;
    }

    setSaving(true);
    try {
      const contactsPayload = contacts
        .map((row) => ({ type: row.type.trim(), value: row.value.trim() }))
        .filter((row) => row.type && row.value);

      const emailContact = contactsPayload.find((row) => row.type.toLowerCase().includes("email"))?.value;
      const email = emailContact && emailContact.includes("@") ? emailContact : `${branchCode.trim().toLowerCase()}@dgt.llc`;
      const phone = contactsPayload.find((row) => row.type.toLowerCase().includes("phone") || row.type.toLowerCase().includes("mobile"))?.value;
      const whatsappNumber = contactsPayload.find((row) => row.type.toLowerCase().includes("whatsapp"))?.value;

      const res = await fetch("/api/branch-management/city-branches", {
        method: editingCityBranchId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingCityBranchId || undefined,
          countryId: location.countryId,
          countryBranchId,
          cityName: locationMeta.city.name,
          stateProvinceId: location.stateProvinceId || undefined,
          districtId: location.districtId || undefined,
          cityId: location.cityId || undefined,
          areaLocationId: location.areaId || undefined,
          name: branchName,
          code: branchCode,
          currencyCode: currency || locationMeta.country?.currency_code || "USD",
          address: fullAddress.trim() || undefined,
          phone: phone || undefined,
          email,
          whatsappNumber: whatsappNumber || undefined,
          companyId: companyId || undefined,
          ownerName: ownerName.trim() || undefined,
          permissionTemplate,
          permissionGrants,
          contacts: contactsPayload.length ? contactsPayload : undefined
        })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        let message = "Failed to save city branch.";
        if (json?.error) {
          if (typeof json.error === "string") {
            message = json.error;
          } else if (json.error.message && typeof json.error.message === "string") {
            message = json.error.message;
          } else if (json.error.fieldErrors && typeof json.error.fieldErrors === "object") {
            const fieldMsgs = Object.entries(json.error.fieldErrors)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
              .join("; ");
            message = `Validation Error: ${fieldMsgs}`;
          } else {
            message = JSON.stringify(json.error);
          }
        }
        setBanner({ type: "error", message });
        return;
      }

      setBanner({ type: "success", message: `${editingCityBranchId ? "Updated" : "Saved"}: ${branchName} (${branchCode})` });
      const list = await loadExistingCityBranches(location.countryId, countryBranchId);
      setEditingCityBranchId("");
      if (!editingCityBranchId) {
        setBranchCode(suggestBranchCode(locationMeta, list.length));
        setBranchName("");
        setPermissionTemplate("city-standard");
        setPermissionGrants(parentPermissionGrants?.length ? getPermissionKeysForTemplate("city-standard").filter((p) => parentPermissionGrants.includes(p)) : getPermissionKeysForTemplate("city-standard"));
      }
    } catch (err) {
      setBanner({ type: "error", message: err instanceof Error ? err.message : "Failed to save city branch." });
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setBanner(null);
    setLocation({ countryId: "", stateProvinceId: "", districtId: "", cityId: "", areaId: "" });
    setLocationMeta({ country: null, state: null, district: null, city: null, area: null });
    setCurrency("");
    setFullAddress("");
    setCountryBranchId("");
    setMainBranches([]);
    setExistingCityBranches([]);
    setBranchName("");
    setBranchCode("");
    setOwnerName("");
    setOwnerPreview(null);
    setContacts([]);
    setPermissionTemplate("city-standard");
    setPermissionGrants(getPermissionKeysForTemplate("city-standard"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">New Entry</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">City Branch</h1>
          <p className="text-sm text-muted-foreground">
            City branches must pick Country first, then Main Branch, then State/City from Settings / Location.
          </p>
        </div>
        <span className={pillClassName()}>
          <b>Scope:</b> City branch under selected Country Main Branch
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>City Branch Setup</CardTitle>
          </CardHeader>

          <CardContent>
            {editLoading ? (
              <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground">
                Loading existing city branch for edit...
              </div>
            ) : null}
            {banner ? (
              <div
                className={
                  banner.type === "success"
                    ? "mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                    : "mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                }
                role="status"
              >
                <div className="whitespace-pre-line">{banner.message}</div>
                {activeExistingCityBranch && !editingCityBranchId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => beginEditCityBranch(activeExistingCityBranch)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit Existing Branch
                  </Button>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={onSubmit} onReset={onReset} className="space-y-6">
              <section className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 1 - Country & Currency</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <LocationHierarchySelect
                    value={location}
                    showState={false}
                    showCity={false}
                    showArea={false}
                    onChange={onCountrySelected}
                  />

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Currency</Label>
                    <Input value={currency} readOnly placeholder="Auto from selected Country" />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 2 - Main Branch</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SearchSelect
                    label="Select Main Branch"
                    value={countryBranchId}
                    placeholder={location.countryId ? "Select main branch" : "Select country first"}
                    disabled={!location.countryId}
                    options={mainBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                    onValueChange={(value) => void onMainBranchSelected(value)}
                  />

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Main Branch Code</Label>
                    <Input value={selectedMainBranch?.code ?? ""} readOnly />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 3 - Location</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="space-y-2 md:col-span-4">
                    <Label className="text-xs text-slate-600">Country (auto)</Label>
                    <Input value={locationMeta.country?.name ?? ""} readOnly />
                  </div>
                  <div className="space-y-2 md:col-span-8">
                    <LocationHierarchySelect
                      value={location}
                      showCountry={false}
                      showDistrict={false}
                      showArea={true}
                      allowManageLink={false}
                      onChange={onLocationChange}
                      disabled={!location.countryId}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-4">
                    <Label className="text-xs text-slate-600">ZIP / Postal Code</Label>
                    <Input
                      value={zip}
                      onChange={(e) => setManualZip(e.target.value)}
                      placeholder={autoZip ? autoZip : "Enter ZIP / postal code"}
                    />
                    {!manualZip && autoZip && (
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Auto from selected area or city &mdash; type to override
                      </p>
                    )}
                    {manualZip && (
                      <button
                        type="button"
                        onClick={() => setManualZip("")}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 underline leading-tight"
                      >
                        Clear manual &mdash; use auto ({autoZip || "none"})
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-8">
                    <Label className="text-xs text-slate-600">Full Address</Label>
                    <textarea
                      value={fullAddress}
                      onChange={(event) => setFullAddress(event.target.value)}
                      placeholder="Area / Road, Building, Street, Landmark, etc."
                      className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-bold text-blue-600 dark:text-blue-400">4</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 4 - City Branch Details</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Branch Name</Label>
                    <Input value={branchName} onChange={(event) => setBranchName(event.target.value)} placeholder="e.g. Chaman City Branch" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Branch Code</Label>
                    <Input value={branchCode} onChange={(event) => setBranchCode(event.target.value)} placeholder="Auto suggests from Country + City code" />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-bold text-blue-600 dark:text-blue-400">5</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 5 - Company & Branch Owner</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <CompanyPicker
                    label="Company Name"
                    value={companyId}
                    onValueChange={setCompanyId}
                    placeholder="Search company"
                    createButtonPlacement="below"
                    disabled={!location.countryId}
                  />

                  <div className="space-y-2">
                    <BranchOwnerPicker
                      value={ownerName}
                      onValueChange={setOwnerName}
                      disabled={!location.countryId}
                      placeholder="Search owner"
                      createButtonPlacement="below"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-bold text-blue-600 dark:text-blue-400">6</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 6 - Contacts</h2>
                </div>
                <div className="space-y-3">
                  {contacts.map((row, idx) => (
                    <div key={`contact-${idx}`} className="grid gap-2 md:grid-cols-[180px_1fr_120px]">
                      <select
                        className={selectClassName()}
                        value={row.type}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "__new__") {
                            const next = addNewTypePrompt();
                            if (!next) return;
                            updateContact(idx, { type: next });
                            return;
                          }
                          updateContact(idx, { type: value });
                        }}
                      >
                        <option value="">Select Type</option>
                        {contactTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                        <option value="__new__">+ Add New Type</option>
                      </select>

                      {toContactTypeKey(row.type) ? (
                        <ContactNumberInput
                          label=""
                          hideLabel
                          showHelp={false}
                          countryId={location.countryId || null}
                          contactTypeKey={toContactTypeKey(row.type) as ContactTypeKey}
                          value={row.value}
                          disabled={!location.countryId}
                          onValueChange={(next) => updateContact(idx, { value: next })}
                        />
                      ) : (
                        <Input
                          value={row.value}
                          onChange={(event) => updateContact(idx, { value: event.target.value })}
                          placeholder="Enter value"
                        />
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => setContacts((current) => current.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setContacts((current) => [...current, { type: "", value: "" }])}>
                      + Add Contact
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-bold text-blue-600 dark:text-blue-400">7</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Step 7 - Roles & Permissions</h2>
                </div>
                <PermissionAssignmentSection
                  level="city"
                  template={permissionTemplate}
                  selected={permissionGrants}
                  onTemplateChange={setPermissionTemplate}
                  onSelectedChange={setPermissionGrants}
                  parentPermissions={parentPermissionGrants}
                  required
                  note="City permissions are explicit and are not inherited automatically from the Country/Main Branch."
                />
              </section>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="reset" variant="outline" disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !location.countryId || !countryBranchId || cityAlreadyExists}>
                  {saving ? "Saving..." : editingCityBranchId ? "Update" : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-4">
          <BranchLiveReportPanel
            title="Store Entry (Live Preview)"
            status={hasAny ? "Draft" : "Empty"}
            branchData={liveBranchData}
            summary={[
              { label: "Branch", value: previewMainBranch || "-" },
              { label: "Country", value: previewCountry || "-" },
              { label: "Currency", value: currency || "USD" }
            ]}
            actions={
              <BranchReportActionsMenu
                ariaLabel="City branch actions"
                disabled={!hasAny}
                onView={viewReport}
                onEdit={editReport}
                onPrint={printReport}
                onPdf={() => openReport(true)}
                onEmail={emailReport}
                onExcel={exportReportCsv}
              />
            }
            steps={[
              {
                title: "Step 1 - Company & Owner",
                rows: [
                  { label: "Company Name", value: previewCompany },
                  { label: "Company Code", value: companyCode },
                  { label: "Legal Name", value: company?.legal_name || "-" },
                  { label: "Base Currency", value: company?.base_currency || currency || "USD" },
                  { label: "Owner", value: ownerPreview?.name || ownerName || "-" },
                  { label: "Owner Code", value: ownerPreview?.code || "-" },
                  { label: "Source", value: ownerPreview ? ownerPreview.source : "-" },
                  { label: "Role / Branch", value: ownerPreview ? [ownerPreview.role, ownerPreview.branch].filter(Boolean).join(" · ") : "-" }
                ]
              },
              {
                title: "Step 2 - Location",
                rows: [
                  { label: "Country", value: previewCountry || "-" },
                  { label: "Country Code", value: locationMeta.country?.iso2 || locationMeta.country?.iso3 || "-" },
                  { label: "State", value: locationMeta.state?.name || "-" },
                  { label: "State Code", value: locationMeta.state?.code || "-" },
                  { label: "District", value: locationMeta.district?.name || "-" },
                  { label: "City", value: locationMeta.city?.name || "-" },
                  { label: "City Code", value: locationMeta.city?.code || "-" },
                  { label: "Location", value: previewLocation || "-" },
                  { label: "Branch Name", value: branchName || "-" },
                  { label: "Branch Code", value: branchCode || "-" }
                ]
              },
              {
                title: "Step 3 - Contact & Address",
                rows: [
                  { label: "Currency", value: currency || "USD" },
                  { label: "Address", value: fullAddress || "-" },
                  { label: "Contacts", value: contactItems.length ? contactItems.join(", ") : "-" }
                ]
              },
              {
                title: "Step 4 - Roles & Permissions",
                rows: [
                  { label: "Permission Template", value: permissionTemplate || "-" },
                  { label: "Permission Count", value: String(permissionGrants.length) },
                  { label: "Parent Limited", value: parentPermissionGrants?.length ? "Yes" : "No" },
                  { label: "Permissions", value: permissionGrants.length ? permissionGrants.join(", ") : "-" }
                ]
              }
            ]}
            footer={
              <div className="space-y-3">
                {editingCityBranchId ? (
                  <BranchRecordProfile
                    title="Editing Existing Branch"
                    subtitle="Saved data, completed fields, and missing information."
                    identity={editIdentityRows}
                    sections={editProfileSections}
                  />
                ) : null}
                {hasAny ? (
                  <>
                    {cityAlreadyExists ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                        <div className="font-semibold">A City Branch already exists for this City under the selected Main Branch.</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div>
                            <b>Branch Name:</b> {activeExistingCityBranch?.name || "-"}
                          </div>
                          <div>
                            <b>Branch Code:</b> {activeExistingCityBranch?.code || "-"}
                          </div>
                          <div>
                            <b>City:</b> {locationMeta.city?.name || "-"}
                          </div>
                          <div>
                            <b>Main Branch:</b> {previewMainBranch}
                          </div>
                          <div>
                            <b>Status:</b> {activeExistingCityBranch?.status || "-"}
                          </div>
                        </div>
                        {activeExistingCityBranch ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7"
                            onClick={() => beginEditCityBranch(activeExistingCityBranch)}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit Existing Branch
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    <details className="border-t pt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-foreground">Existing City Branches (This Main Branch)</summary>
                      {existingCityBranches.length ? (
                        <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                          <li>
                            <Input
                              value={existingCitySearch}
                              onChange={(event) => setExistingCitySearch(event.target.value)}
                              placeholder="Search branches"
                            />
                          </li>
                          {filteredExistingCityBranches.slice(0, 6).map((b) => (
                            <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                              <span>
                                <span className="font-semibold text-foreground">{b.code}</span>
                                <span className="text-muted-foreground">{" - "}</span>
                                <span className="text-muted-foreground">{b.name}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => viewSavedBranch(b)}>
                                  <Eye className="h-3.5 w-3.5" aria-hidden />
                                  View
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => beginEditCityBranch(b)}>
                                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  Edit
                                </Button>
                              </div>
                            </li>
                          ))}
                          {filteredExistingCityBranches.length > 6 ? (
                            <li className="text-xs text-muted-foreground">+{filteredExistingCityBranches.length - 6} more...</li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No city branches yet.</p>
                      )}
                    </details>
                  </>
                ) : null}
              </div>
            }
          />
        </div>
      </div>

      <DetailDrawer
        isOpen={drawerBranchData !== null}
        onClose={() => setDrawerBranchData(null)}
        title="City Branch Details"
        subtitle="Verification certificate and branch permissions"
      >
        {drawerBranchData && (
          <BranchLiveReportPanel
            title="Saved City Branch"
            status={drawerBranchData.branchStatus}
            branchData={drawerBranchData}
          />
        )}
      </DetailDrawer>
    </div>
  );
}

