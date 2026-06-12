"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, Globe2, Info, Map, MapPin, Plus, Save, Search, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type CountryRow = {
  id: string;
  name: string;
  iso2: string | null;
  iso3: string | null;
  currency_code: string;
  default_language_code: string | null;
  is_active: boolean;
  official_email: string;
  admin_email: string;
  whatsapp_number: string | null;
};

type StateRow = {
  id: string;
  country_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type DistrictRow = {
  id: string;
  country_id: string;
  state_province_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type CityRow = {
  id: string;
  country_id: string;
  state_province_id: string | null;
  district_id: string | null;
  name: string;
  code: string | null;
  zip_code: string | null;
  is_active: boolean;
};

type ZipRow = {
  id: string;
  country_id: string;
  state_province_id: string | null;
  district_id: string | null;
  city_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type ModalMode =
  | "add-country"
  | "edit-country"
  | "add-state"
  | "edit-state"
  | "add-district"
  | "edit-district"
  | "add-city"
  | "edit-city"
  | "add-zip"
  | "edit-zip";

const MAX_STATES_PER_COUNTRY = 15;
const MAX_DISTRICTS_PER_STATE = 40;
const MAX_CITIES_PER_DISTRICT = 100;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function option(value: string, label: string, keywords?: string): SearchSelectOption {
  return { value, label, keywords };
}

function StatusPill({ active }: { active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed py-1.5 text-xs last:border-0">
      <span className="font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-right font-semibold text-foreground">{value || "-"}</span>
    </div>
  );
}

function LimitNote({ text, reached = false }: { text: string; reached?: boolean }) {
  return (
    <div
      className={cn(
        "mt-2 flex items-start gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium",
        reached
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200"
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function SpecGroup({ items }: { items: string[] }) {
  return (
    <div className="space-y-2 rounded-xl border bg-background p-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2 text-xs font-medium text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function LocationManagementWizard() {
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState({ countries: false, states: false, districts: false, cities: false, zips: false });

  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [zips, setZips] = useState<ZipRow[]>([]);

  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [zipId, setZipId] = useState("");
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCountry = useMemo(() => countries.find((row) => row.id === countryId) ?? null, [countries, countryId]);
  const selectedState = useMemo(() => states.find((row) => row.id === stateId) ?? null, [states, stateId]);
  const selectedDistrict = useMemo(() => districts.find((row) => row.id === districtId) ?? null, [districts, districtId]);
  const selectedCity = useMemo(() => cities.find((row) => row.id === cityId) ?? null, [cities, cityId]);
  const selectedZip = useMemo(() => zips.find((row) => row.id === zipId) ?? null, [zips, zipId]);

  const stateLimitReached = Boolean(countryId && states.length >= MAX_STATES_PER_COUNTRY);
  const districtLimitReached = Boolean(stateId && districts.length >= MAX_DISTRICTS_PER_STATE);
  const cityLimitReached = Boolean(districtId && cities.length >= MAX_CITIES_PER_DISTRICT);

  const [draft, setDraft] = useState({
    countryName: "",
    countryCode: "",
    countryIso3: "",
    currency: "USD",
    language: "en",
    stateName: "",
    stateCode: "",
    districtName: "",
    districtCode: "",
    cityName: "",
    cityCode: "",
    cityZip: "",
    zipCode: "",
    areaName: "",
    isActive: true,
    officialEmail: "",
    adminEmail: "",
    whatsappNumber: ""
  });

  const countryOptions = useMemo(
    () => countries.map((row) => option(row.id, `${row.name} (${row.iso2 ?? row.currency_code})`, `${row.name} ${row.iso2 ?? ""} ${row.iso3 ?? ""} ${row.currency_code}`)),
    [countries]
  );
  const stateOptions = useMemo(() => states.map((row) => option(row.id, row.code ? `${row.name} (${row.code})` : row.name, `${row.name} ${row.code ?? ""}`)), [states]);
  const districtOptions = useMemo(() => districts.map((row) => option(row.id, row.code ? `${row.name} (${row.code})` : row.name, `${row.name} ${row.code ?? ""}`)), [districts]);
  const cityOptions = useMemo(
    () => cities.map((row) => option(row.id, row.code ? `${row.name} (${row.code})` : row.name, `${row.name} ${row.code ?? ""} ${row.zip_code ?? ""}`)),
    [cities]
  );
  const zipOptions = useMemo(() => zips.map((row) => option(row.id, `${row.code ?? "-"} · ${row.name}`, `${row.code ?? ""} ${row.name}`)), [zips]);

  async function loadCountries(q?: string) {
    setLoading((cur) => ({ ...cur, countries: true }));
    try {
      const qp = new URLSearchParams();
      const query = normalizeText(q ?? "");
      if (query) qp.set("q", query);
      const res = await apiGet<{ countries: CountryRow[] }>(`/api/erp/locations/countries?${qp.toString()}`);
      setCountries(res.countries ?? []);
    } finally {
      setLoading((cur) => ({ ...cur, countries: false }));
    }
  }

  async function loadStates(nextCountryId: string, q?: string) {
    setLoading((cur) => ({ ...cur, states: true }));
    try {
      const qp = new URLSearchParams({ countryId: nextCountryId });
      const query = normalizeText(q ?? "");
      if (query) qp.set("q", query);
      const res = await apiGet<{ states: StateRow[] }>(`/api/erp/locations/states?${qp.toString()}`);
      setStates(res.states ?? []);
    } finally {
      setLoading((cur) => ({ ...cur, states: false }));
    }
  }

  async function loadDistricts(nextStateId: string, q?: string) {
    setLoading((cur) => ({ ...cur, districts: true }));
    try {
      const qp = new URLSearchParams({ stateProvinceId: nextStateId });
      const query = normalizeText(q ?? "");
      if (query) qp.set("q", query);
      const res = await apiGet<{ districts: DistrictRow[] }>(`/api/erp/locations/districts?${qp.toString()}`);
      setDistricts(res.districts ?? []);
    } finally {
      setLoading((cur) => ({ ...cur, districts: false }));
    }
  }

  async function loadCities(nextCountryId: string, nextStateId: string, nextDistrictId: string, q?: string) {
    setLoading((cur) => ({ ...cur, cities: true }));
    try {
      const qp = new URLSearchParams({ countryId: nextCountryId });
      if (nextStateId) qp.set("stateProvinceId", nextStateId);
      if (nextDistrictId) qp.set("districtId", nextDistrictId);
      const query = normalizeText(q ?? "");
      if (query) qp.set("q", query);
      const res = await apiGet<{ cities: CityRow[] }>(`/api/erp/locations/cities?${qp.toString()}`);
      setCities(res.cities ?? []);
    } finally {
      setLoading((cur) => ({ ...cur, cities: false }));
    }
  }

  async function loadZips(nextCityId: string, q?: string) {
    setLoading((cur) => ({ ...cur, zips: true }));
    try {
      const qp = new URLSearchParams({ cityId: nextCityId });
      const query = normalizeText(q ?? "");
      if (query) qp.set("q", query);
      const res = await apiGet<{ areas: ZipRow[] }>(`/api/erp/locations/areas?${qp.toString()}`);
      setZips(res.areas ?? []);
    } finally {
      setLoading((cur) => ({ ...cur, zips: false }));
    }
  }

  useEffect(() => {
    loadCountries().catch((e: any) => setBanner(e?.message || "Failed to load countries"));
  }, []);

  useEffect(() => {
    setStateId("");
    setDistrictId("");
    setCityId("");
    setZipId("");
    setStates([]);
    setDistricts([]);
    setCities([]);
    setZips([]);
    if (countryId) loadStates(countryId).catch((e: any) => setBanner(e?.message || "Failed to load states"));
  }, [countryId]);

  useEffect(() => {
    setDistrictId("");
    setCityId("");
    setZipId("");
    setDistricts([]);
    setCities([]);
    setZips([]);
    if (stateId) loadDistricts(stateId).catch((e: any) => setBanner(e?.message || "Failed to load districts"));
  }, [stateId]);

  useEffect(() => {
    setCityId("");
    setZipId("");
    setCities([]);
    setZips([]);
    if (countryId && stateId && districtId) loadCities(countryId, stateId, districtId).catch((e: any) => setBanner(e?.message || "Failed to load cities"));
  }, [countryId, stateId, districtId]);

  useEffect(() => {
    setZipId("");
    setZips([]);
    if (cityId) loadZips(cityId).catch((e: any) => setBanner(e?.message || "Failed to load zip codes"));
  }, [cityId]);

  function openModal(mode: ModalMode) {
    setBanner(null);
    if (mode === "add-state" && stateLimitReached) {
      setBanner(`This country already has ${MAX_STATES_PER_COUNTRY} States / Provinces.`);
      return;
    }
    if (mode === "add-district" && districtLimitReached) {
      setBanner(`This State / Province already has ${MAX_DISTRICTS_PER_STATE} Districts.`);
      return;
    }
    if (mode === "add-city" && cityLimitReached) {
      setBanner(`This District already has ${MAX_CITIES_PER_DISTRICT} Cities.`);
      return;
    }
    if (mode === "edit-country" && selectedCountry) {
      setDraft({
        ...draft,
        countryName: selectedCountry.name,
        countryCode: selectedCountry.iso2 ?? "",
        countryIso3: selectedCountry.iso3 ?? "",
        currency: selectedCountry.currency_code,
        language: selectedCountry.default_language_code ?? "en",
        isActive: selectedCountry.is_active,
        officialEmail: selectedCountry.official_email ?? "",
        adminEmail: selectedCountry.admin_email ?? "",
        whatsappNumber: selectedCountry.whatsapp_number ?? ""
      });
    } else if (mode === "edit-state" && selectedState) {
      setDraft({ ...draft, stateName: selectedState.name, stateCode: selectedState.code ?? "", isActive: selectedState.is_active });
    } else if (mode === "edit-district" && selectedDistrict) {
      setDraft({ ...draft, districtName: selectedDistrict.name, districtCode: selectedDistrict.code ?? "", isActive: selectedDistrict.is_active });
    } else if (mode === "edit-city" && selectedCity) {
      setDraft({ ...draft, cityName: selectedCity.name, cityCode: selectedCity.code ?? "", cityZip: selectedCity.zip_code ?? "", isActive: selectedCity.is_active });
    } else if (mode === "edit-zip" && selectedZip) {
      setDraft({ ...draft, zipCode: selectedZip.code ?? "", areaName: selectedZip.name, isActive: selectedZip.is_active });
    } else {
      setDraft({
        countryName: "",
        countryCode: "",
        countryIso3: "",
        currency: selectedCountry?.currency_code ?? "USD",
        language: selectedCountry?.default_language_code ?? "en",
        stateName: "",
        stateCode: "",
        districtName: "",
        districtCode: "",
        cityName: "",
        cityCode: "",
        cityZip: "",
        zipCode: "",
        areaName: "",
        isActive: true,
        officialEmail: "",
        adminEmail: "",
        whatsappNumber: ""
      });
    }
    setModal(mode);
  }

  function updateDraft(key: keyof typeof draft, value: string | boolean) {
    setDraft((cur) => ({ ...cur, [key]: value }));
  }

  async function saveModal() {
    if (!modal) return;
    setSaving(true);
    setBanner(null);
    try {
      if (modal === "add-country") {
        if (!draft.officialEmail.trim()) {
          throw new Error("Official Email is required");
        }
        if (!draft.adminEmail.trim()) {
          throw new Error("Admin Email is required");
        }
        const res = await apiPost<{ country: CountryRow }>("/api/erp/locations/countries", {
          name: draft.countryName,
          iso2: draft.countryCode || null,
          iso3: draft.countryIso3 || null,
          currencyCode: draft.currency,
          defaultLanguageCode: draft.language,
          officialEmail: draft.officialEmail,
          adminEmail: draft.adminEmail,
          whatsappNumber: draft.whatsappNumber || null
        });
        setCountries((cur) => [res.country, ...cur.filter((row) => row.id !== res.country.id)]);
        setCountryId(res.country.id);
      }
      if (modal === "edit-country" && selectedCountry) {
        if (!draft.officialEmail.trim()) {
          throw new Error("Official Email is required");
        }
        if (!draft.adminEmail.trim()) {
          throw new Error("Admin Email is required");
        }
        const res = await apiPatch<{ country: CountryRow }>(`/api/erp/locations/countries/${selectedCountry.id}`, {
          name: draft.countryName,
          iso2: draft.countryCode || null,
          iso3: draft.countryIso3 || null,
          currencyCode: draft.currency,
          defaultLanguageCode: draft.language,
          isActive: draft.isActive,
          officialEmail: draft.officialEmail,
          adminEmail: draft.adminEmail,
          whatsappNumber: draft.whatsappNumber || null
        });
        setCountries((cur) => cur.map((row) => (row.id === res.country.id ? res.country : row)));
      }
      if (modal === "add-state") {
        if (stateLimitReached) throw new Error(`Maximum ${MAX_STATES_PER_COUNTRY} States / Provinces are allowed per Country.`);
        const res = await apiPost<{ state: StateRow }>("/api/erp/locations/states", { countryId, name: draft.stateName, code: draft.stateCode || null });
        setStates((cur) => [res.state, ...cur.filter((row) => row.id !== res.state.id)]);
        setStateId(res.state.id);
      }
      if (modal === "edit-state" && selectedState) {
        const res = await apiPatch<{ state: StateRow }>(`/api/erp/locations/states/${selectedState.id}`, {
          name: draft.stateName,
          code: draft.stateCode || null,
          isActive: draft.isActive
        });
        setStates((cur) => cur.map((row) => (row.id === res.state.id ? res.state : row)));
      }
      if (modal === "add-district") {
        if (districtLimitReached) throw new Error(`Maximum ${MAX_DISTRICTS_PER_STATE} Districts are allowed per State.`);
        const res = await apiPost<{ district: DistrictRow }>("/api/erp/locations/districts", {
          countryId,
          stateProvinceId: stateId,
          name: draft.districtName,
          code: draft.districtCode || null
        });
        setDistricts((cur) => [res.district, ...cur.filter((row) => row.id !== res.district.id)]);
        setDistrictId(res.district.id);
      }
      if (modal === "edit-district" && selectedDistrict) {
        const res = await apiPatch<{ district: DistrictRow }>(`/api/erp/locations/districts/${selectedDistrict.id}`, {
          name: draft.districtName,
          code: draft.districtCode || null,
          isActive: draft.isActive
        });
        setDistricts((cur) => cur.map((row) => (row.id === res.district.id ? res.district : row)));
      }
      if (modal === "add-city") {
        if (cityLimitReached) throw new Error(`Maximum ${MAX_CITIES_PER_DISTRICT} Cities are allowed per District.`);
        const res = await apiPost<{ city: CityRow }>("/api/erp/locations/cities", {
          countryId,
          stateProvinceId: stateId,
          districtId,
          name: draft.cityName,
          code: draft.cityCode || null,
          zipCode: draft.cityZip || null
        });
        setCities((cur) => [res.city, ...cur.filter((row) => row.id !== res.city.id)]);
        setCityId(res.city.id);
      }
      if (modal === "edit-city" && selectedCity) {
        const res = await apiPatch<{ city: CityRow }>(`/api/erp/locations/cities/${selectedCity.id}`, {
          name: draft.cityName,
          code: draft.cityCode || null,
          zipCode: draft.cityZip || null,
          isActive: draft.isActive,
          districtId
        });
        setCities((cur) => cur.map((row) => (row.id === res.city.id ? res.city : row)));
      }
      if (modal === "add-zip") {
        const res = await apiPost<{ area: ZipRow }>("/api/erp/locations/areas", {
          countryId,
          stateProvinceId: stateId,
          districtId,
          cityId,
          name: draft.areaName,
          code: draft.zipCode || null
        });
        setZips((cur) => [res.area, ...cur.filter((row) => row.id !== res.area.id)]);
        setZipId(res.area.id);
      }
      if (modal === "edit-zip" && selectedZip) {
        const res = await apiPatch<{ area: ZipRow }>(`/api/erp/locations/areas/${selectedZip.id}`, {
          name: draft.areaName,
          code: draft.zipCode || null,
          isActive: draft.isActive
        });
        setZips((cur) => cur.map((row) => (row.id === res.area.id ? res.area : row)));
      }
      setModal(null);
    } catch (e: any) {
      setBanner(e?.message || "Unable to save location");
    } finally {
      setSaving(false);
    }
  }

  const path = [selectedCountry?.name, selectedState?.name, selectedDistrict?.name, selectedCity?.name, selectedZip?.code].filter(Boolean).join(" -> ");
  const hierarchyLabel = selectedCountry
    ? `You can add up to ${MAX_STATES_PER_COUNTRY} States in ${selectedCountry.name}. Each State can have up to ${MAX_DISTRICTS_PER_STATE} Districts and ${MAX_CITIES_PER_DISTRICT} Cities per District.`
    : `Select a Country to manage up to ${MAX_STATES_PER_COUNTRY} States, ${MAX_DISTRICTS_PER_STATE} Districts, ${MAX_CITIES_PER_DISTRICT} Cities, and unlimited Zip/Tehsil Codes.`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Settings / Management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Location Management</h1>
          <p className="text-sm text-muted-foreground">Centralized Country to State/Province to District to City to Zip Code hierarchy for the full ERP.</p>
        </div>
        <div className="rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          {path || "Select hierarchy"}
        </div>
      </div>

      {banner ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {banner}
        </div>
      ) : null}

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
        {hierarchyLabel}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-4 w-4 text-primary" /> Location Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            <PickerCard
              icon={Globe2}
              title="1. Country"
              selected={selectedCountry?.name ?? ""}
              meta={selectedCountry ? `${selectedCountry.iso2 ?? "-"} · ${selectedCountry.currency_code}` : "Country Name / Code / Status"}
              active={selectedCountry?.is_active}
              canEdit={Boolean(selectedCountry)}
              onEdit={() => openModal("edit-country")}
            >
              <SearchSelect
                label={loading.countries ? "Country (Loading...)" : "Country"}
                value={countryId}
                options={countryOptions}
                placeholder="Search country"
                disabled={loading.countries}
                onValueChange={setCountryId}
                createLabel="+ New Country"
                createButtonPlacement="below"
                onCreateNew={() => openModal("add-country")}
              />
            </PickerCard>

            <PickerCard
              icon={Map}
              title="2. State / Province"
              selected={selectedState?.name ?? ""}
              meta={selectedState ? `${selectedState.code ?? "-"} · Parent: ${selectedCountry?.name ?? "-"}` : "Select country first"}
              active={selectedState?.is_active}
              canEdit={Boolean(selectedState)}
              onEdit={() => openModal("edit-state")}
            >
              <SearchSelect
                label={loading.states ? "State / Province (Loading...)" : "State / Province"}
                value={stateId}
                options={stateOptions}
                placeholder={countryId ? "Search state/province" : "Select country first"}
                disabled={!countryId || loading.states}
                onValueChange={setStateId}
                createLabel={stateLimitReached ? `Max ${MAX_STATES_PER_COUNTRY} States Reached` : "+ New State"}
                createButtonPlacement="below"
                onCreateNew={() => openModal("add-state")}
              />
              <LimitNote
                text={
                  countryId
                    ? states.length
                      ? `${states.length}/${MAX_STATES_PER_COUNTRY} States available under ${selectedCountry?.name ?? "selected country"}`
                      : `No State saved under ${selectedCountry?.name ?? "selected country"} yet. Click + New State.`
                    : `Maximum ${MAX_STATES_PER_COUNTRY} States per Country`
                }
                reached={stateLimitReached}
              />
            </PickerCard>

            <PickerCard
              icon={Map}
              title="3. District"
              selected={selectedDistrict?.name ?? ""}
              meta={selectedDistrict ? `${selectedDistrict.code ?? "-"} · Parent: ${selectedState?.name ?? "-"}` : "Select state first"}
              active={selectedDistrict?.is_active}
              canEdit={Boolean(selectedDistrict)}
              onEdit={() => openModal("edit-district")}
            >
              <SearchSelect
                label={loading.districts ? "District (Loading...)" : "District"}
                value={districtId}
                options={districtOptions}
                placeholder={stateId ? "Search district" : "Select state first"}
                disabled={!stateId || loading.districts}
                onValueChange={setDistrictId}
                createLabel={districtLimitReached ? `Max ${MAX_DISTRICTS_PER_STATE} Districts Reached` : "+ New District"}
                createButtonPlacement="below"
                onCreateNew={() => openModal("add-district")}
              />
              <LimitNote
                text={
                  stateId
                    ? districts.length
                      ? `${districts.length}/${MAX_DISTRICTS_PER_STATE} Districts available under ${selectedState?.name ?? "selected state"}`
                      : `No District saved under ${selectedState?.name ?? "selected state"} yet. Click + New District.`
                    : `Maximum ${MAX_DISTRICTS_PER_STATE} Districts per State`
                }
                reached={districtLimitReached}
              />
            </PickerCard>

            <PickerCard
              icon={MapPin}
              title="4. City"
              selected={selectedCity?.name ?? ""}
              meta={selectedCity ? `${selectedCity.code ?? "-"} · Parent: ${selectedDistrict?.name ?? "-"}` : "Select district first"}
              active={selectedCity?.is_active}
              canEdit={Boolean(selectedCity)}
              onEdit={() => openModal("edit-city")}
            >
              <SearchSelect
                label={loading.cities ? "City (Loading...)" : "City"}
                value={cityId}
                options={cityOptions}
                placeholder={districtId ? "Search city" : "Select district first"}
                disabled={!districtId || loading.cities}
                onValueChange={setCityId}
                createLabel={cityLimitReached ? `Max ${MAX_CITIES_PER_DISTRICT} Cities Reached` : "+ New City"}
                createButtonPlacement="below"
                onCreateNew={() => openModal("add-city")}
              />
              <LimitNote
                text={
                  districtId
                    ? cities.length
                      ? `${cities.length}/${MAX_CITIES_PER_DISTRICT} Cities available under ${selectedDistrict?.name ?? "selected district"}`
                      : `No City saved under ${selectedDistrict?.name ?? "selected district"} yet. Click + New City.`
                    : `Maximum ${MAX_CITIES_PER_DISTRICT} Cities per District`
                }
                reached={cityLimitReached}
              />
            </PickerCard>

            <PickerCard
              icon={Search}
              title="5. Zip / Postal Code (Tehsil / Area)"
              selected={selectedZip?.code ?? ""}
              meta={selectedZip ? `${selectedZip.name} · Parent: ${selectedCity?.name ?? "-"}` : "Select city first"}
              active={selectedZip?.is_active}
              canEdit={Boolean(selectedZip)}
              onEdit={() => openModal("edit-zip")}
            >
              <SearchSelect
                label={loading.zips ? "Zip Code (Loading...)" : "Zip Code"}
                value={zipId}
                options={zipOptions}
                placeholder={cityId ? "Search zip/postal code" : "Select city first"}
                disabled={!cityId || loading.zips}
                onValueChange={setZipId}
                createLabel="+ New Zip Code"
                createButtonPlacement="below"
                onCreateNew={() => openModal("add-zip")}
              />
              <LimitNote
                text={
                  cityId
                    ? zips.length
                      ? `${zips.length} Zip Codes available under ${selectedCity?.name ?? "selected city"}. Unlimited allowed.`
                      : `No Zip Code saved under ${selectedCity?.name ?? "selected city"} yet. Click + New Zip Code.`
                    : "Unlimited Zip Codes per City"
                }
              />
            </PickerCard>
          </CardContent>
        </Card>

        <Card className="xl:sticky xl:top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Complete Hierarchy</div>
              <div className="rounded-lg border bg-background px-3 py-2 text-sm font-semibold">{path || "Country to State to District to City to Zip Code"}</div>
            </div>
            <div className="rounded-xl border p-3">
              <DetailLine label="Country" value={selectedCountry?.name ?? ""} />
              <DetailLine label="Country Code" value={selectedCountry?.iso2 ?? ""} />
              <DetailLine label="Total States" value={countryId ? `${states.length} (Max ${MAX_STATES_PER_COUNTRY})` : `Max ${MAX_STATES_PER_COUNTRY}`} />
              <DetailLine label="Total Districts" value={stateId ? `${districts.length} (Max ${MAX_DISTRICTS_PER_STATE})` : `Max ${MAX_DISTRICTS_PER_STATE}`} />
              <DetailLine label="Total Cities (Per District)" value={districtId ? `${cities.length} (Max ${MAX_CITIES_PER_DISTRICT})` : `Max ${MAX_CITIES_PER_DISTRICT}`} />
              <DetailLine label="Total Zip Codes (Per City)" value={cityId ? `${zips.length} (Unlimited)` : "Unlimited"} />
              <DetailLine label="State" value={selectedState?.name ?? ""} />
              <DetailLine label="State Code" value={selectedState?.code ?? ""} />
              <DetailLine label="District" value={selectedDistrict?.name ?? ""} />
              <DetailLine label="District Code" value={selectedDistrict?.code ?? ""} />
              <DetailLine label="City" value={selectedCity?.name ?? ""} />
              <DetailLine label="City Code" value={selectedCity?.code ?? ""} />
              <DetailLine label="Zip Code" value={selectedZip?.code ?? selectedCity?.zip_code ?? ""} />
              <DetailLine label="Area Name" value={selectedZip?.name ?? ""} />
            </div>
            <div className="space-y-2 rounded-xl border bg-primary/5 p-3 text-xs font-semibold text-primary">
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5" />
                <span>Maximum {MAX_STATES_PER_COUNTRY} States / Provinces per Country.</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5" />
                <span>Maximum {MAX_DISTRICTS_PER_STATE} Districts per State / Province.</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5" />
                <span>Maximum {MAX_CITIES_PER_DISTRICT} Cities per District.</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5" />
                <span>Unlimited Zip / Postal Codes per City.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/25">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-primary" /> Product Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <SpecGroup
              items={[
                "6-Level Hierarchy: Country to State to District to City to Tehsil to Postal Code",
                `Maximum ${MAX_STATES_PER_COUNTRY} States / Provinces per Country`,
                `Maximum ${MAX_DISTRICTS_PER_STATE} Districts per State / Province`,
                `Maximum ${MAX_CITIES_PER_DISTRICT} Cities per District`
              ]}
            />
            <SpecGroup
              items={[
                "Easy Add / Edit / Manage functionality",
                "Real-time Live Preview of hierarchy",
                "Active / Inactive status management",
                "Centralized ERP location management"
              ]}
            />
            <SpecGroup
              items={[
                "Multi-country support (Pakistan +92, Afghanistan +93, UAE +971)",
                "Multi-branch support",
                "Role-based permissions",
                "Reusable across Branches, Accounts, Ledgers, Roznamcha and Reports"
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {modal ? (
        <LocationModal
          mode={modal}
          draft={draft}
          saving={saving}
          selectedCountry={selectedCountry}
          selectedState={selectedState}
          selectedDistrict={selectedDistrict}
          selectedCity={selectedCity}
          onChange={updateDraft}
          onClose={() => setModal(null)}
          onSave={saveModal}
        />
      ) : null}
    </div>
  );
}

function PickerCard({
  icon: Icon,
  title,
  selected,
  meta,
  active,
  canEdit,
  onEdit,
  children
}: {
  icon: typeof Globe2;
  title: string;
  selected: string;
  meta: string;
  active?: boolean;
  canEdit: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{selected || meta}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selected ? <StatusPill active={active} /> : null}
          <Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={!canEdit} onClick={onEdit}>
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function LocationModal({
  mode,
  draft,
  saving,
  selectedCountry,
  selectedState,
  selectedDistrict,
  selectedCity,
  onChange,
  onClose,
  onSave
}: {
  mode: ModalMode;
  draft: {
    countryName: string;
    countryCode: string;
    countryIso3: string;
    currency: string;
    language: string;
    stateName: string;
    stateCode: string;
    districtName: string;
    districtCode: string;
    cityName: string;
    cityCode: string;
    cityZip: string;
    zipCode: string;
    areaName: string;
    isActive: boolean;
    officialEmail: string;
    adminEmail: string;
    whatsappNumber: string;
  };
  saving: boolean;
  selectedCountry: CountryRow | null;
  selectedState: StateRow | null;
  selectedDistrict: DistrictRow | null;
  selectedCity: CityRow | null;
  onChange: (key: keyof typeof draft, value: string | boolean) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isCountry = mode.includes("country");
  const isState = mode.includes("state");
  const isDistrict = mode.includes("district");
  const isCity = mode.includes("city");
  const isZip = mode.includes("zip");
  const isEdit = mode.startsWith("edit");

  const title =
    mode === "add-country"
      ? "Add New Country"
      : mode === "edit-country"
        ? "Edit Country"
        : mode === "add-state"
          ? "Add New State / Province"
          : mode === "edit-state"
            ? "Edit State / Province"
            : mode === "add-district"
              ? "Add New District"
              : mode === "edit-district"
                ? "Edit District"
                : mode === "add-city"
                  ? "Add New City"
                  : mode === "edit-city"
                    ? "Edit City"
                    : mode === "add-zip"
                      ? "Add New Zip Code"
                      : "Edit Zip Code";

  return (
    <SimpleModal title={title} onClose={onClose} className="max-w-xl">
      <div className="space-y-3">
        {isCountry ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Country Name" value={draft.countryName} onChange={(v) => onChange("countryName", v)} placeholder="Pakistan" />
            <Field label="Country Code" value={draft.countryCode} onChange={(v) => onChange("countryCode", v)} placeholder="PK" />
            <Field label="ISO3" value={draft.countryIso3} onChange={(v) => onChange("countryIso3", v)} placeholder="PAK" />
            <Field label="Currency" value={draft.currency} onChange={(v) => onChange("currency", v)} placeholder="PKR" />
            <Field label="Default Language" value={draft.language} onChange={(v) => onChange("language", v)} placeholder="en / ur / ps / ar / fa" />
            <Field label="Official Email" value={draft.officialEmail} onChange={(v) => onChange("officialEmail", v)} placeholder="country@dgt.llc" />
            <Field label="Admin Email" value={draft.adminEmail} onChange={(v) => onChange("adminEmail", v)} placeholder="admin.country@dgt.llc" />
            <Field label="WhatsApp Number (Optional)" value={draft.whatsappNumber} onChange={(v) => onChange("whatsappNumber", v)} placeholder="+923001234567" />
          </div>
        ) : null}

        {isState ? (
          <div className="space-y-3">
            <ReadOnly label="Parent Country" value={selectedCountry?.name ?? ""} />
            <Field label="State / Province Name" value={draft.stateName} onChange={(v) => onChange("stateName", v)} placeholder="Balochistan" />
            <Field label="State Code" value={draft.stateCode} onChange={(v) => onChange("stateCode", v)} placeholder="BAL" />
          </div>
        ) : null}

        {isDistrict ? (
          <div className="space-y-3">
            <ReadOnly label="Parent State / Province" value={selectedState?.name ?? ""} />
            <Field label="District Name" value={draft.districtName} onChange={(v) => onChange("districtName", v)} placeholder="Quetta District" />
            <Field label="District Code (optional)" value={draft.districtCode} onChange={(v) => onChange("districtCode", v)} placeholder="QTA" />
          </div>
        ) : null}

        {isCity ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <ReadOnly label="Parent State / Province" value={selectedState?.name ?? ""} />
              <ReadOnly label="Parent District" value={selectedDistrict?.name ?? ""} />
            </div>
            <Field label="City Name" value={draft.cityName} onChange={(v) => onChange("cityName", v)} placeholder="Chaman" />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="City Code (optional)" value={draft.cityCode} onChange={(v) => onChange("cityCode", v)} placeholder="CHM" />
              <Field label="Default Zip Code (optional)" value={draft.cityZip} onChange={(v) => onChange("cityZip", v)} placeholder="86000" />
            </div>
          </div>
        ) : null}

        {isZip ? (
          <div className="space-y-3">
            <ReadOnly label="Parent City" value={selectedCity?.name ?? ""} />
            <Field label="Zip / Postal Code" value={draft.zipCode} onChange={(v) => onChange("zipCode", v)} placeholder="87300" />
            <Field label="Area / Tehsil Name" value={draft.areaName} onChange={(v) => onChange("areaName", v)} placeholder="Quetta Cantt" />
          </div>
        ) : null}

        {isEdit ? (
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => onChange("isActive", e.target.checked)} />
            Active
          </label>
        ) : null}

        <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          Multilingual labels are supported by the global language system; these master records are saved by ID and reused across ERP forms.
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </SimpleModal>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value || "-"} readOnly className="bg-muted/50" />
    </div>
  );
}
