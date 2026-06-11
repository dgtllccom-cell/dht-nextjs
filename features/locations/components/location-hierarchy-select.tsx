"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { Button } from "@/components/ui/button";
import { SimpleModal } from "@/components/ui/simple-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api/client";
import {
  listAreas,
  listCities,
  listCountries,
  listStates,
  type LocationArea,
  type LocationCity,
  type LocationCountry,
  type LocationState
} from "@/features/locations/location-api";

export type LocationHierarchyValue = {
  countryId: string;
  stateProvinceId: string;
  cityId: string;
  areaId?: string;
};

export type LocationHierarchyMeta = {
  country: LocationCountry | null;
  state: LocationState | null;
  city: LocationCity | null;
  area: LocationArea | null;
};

function toOptions<T extends { id: string; name: string }>(rows: T[]): SearchSelectOption[] {
  return rows.map((row) => {
    const anyRow = row as any;
    const keywords = [
      anyRow.code,
      anyRow.iso2,
      anyRow.iso3,
      anyRow.currency_code,
      anyRow.zip_code
    ]
      .filter(Boolean)
      .join(" ");
    return { value: row.id, label: row.name, keywords };
  });
}

export function LocationHierarchySelect({
  value,
  onChange,
  showArea = false,
  showCountry = true,
  showState = true,
  showCity = true,
  allowManageLink = true,
  disabled = false
}: {
  value: LocationHierarchyValue;
  onChange: (next: LocationHierarchyValue, meta: LocationHierarchyMeta) => void;
  showArea?: boolean;
  showCountry?: boolean;
  showState?: boolean;
  showCity?: boolean;
  allowManageLink?: boolean;
  disabled?: boolean;
}) {
  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [states, setStates] = useState<LocationState[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);
  const [areas, setAreas] = useState<LocationArea[]>([]);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  const [openCreateType, setOpenCreateType] = useState<"country" | "state" | "city" | null>(null);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === value.countryId) ?? null,
    [countries, value.countryId]
  );
  const selectedState = useMemo(
    () => states.find((s) => s.id === value.stateProvinceId) ?? null,
    [states, value.stateProvinceId]
  );
  const selectedCity = useMemo(
    () => cities.find((c) => c.id === value.cityId) ?? null,
    [cities, value.cityId]
  );
  const selectedArea = useMemo(
    () => (value.areaId ? areas.find((a) => a.id === value.areaId) ?? null : null),
    [areas, value.areaId]
  );

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
    let cancelled = false;
    setStates([]);
    setCities([]);
    setAreas([]);
    if (!value.countryId) return;

    (async () => {
      setLoadingStates(true);
      try {
        const rows = await listStates({ countryId: value.countryId });
        if (!cancelled) setStates(rows);
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value.countryId]);

  useEffect(() => {
    let cancelled = false;
    setCities([]);
    setAreas([]);
    if (!value.countryId) return;
    if (!value.stateProvinceId) return;

    (async () => {
      setLoadingCities(true);
      try {
        const rows = await listCities({ countryId: value.countryId, stateProvinceId: value.stateProvinceId });
        if (!cancelled) setCities(rows);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value.countryId, value.stateProvinceId]);

  useEffect(() => {
    let cancelled = false;
    setAreas([]);
    if (!showArea) return;
    if (!value.cityId) return;

    (async () => {
      setLoadingAreas(true);
      try {
        const rows = await listAreas({ cityId: value.cityId });
        if (!cancelled) setAreas(rows);
      } finally {
        if (!cancelled) setLoadingAreas(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showArea, value.cityId]);

  const meta: LocationHierarchyMeta = {
    country: selectedCountry,
    state: selectedState,
    city: selectedCity,
    area: selectedArea
  };

  useEffect(() => {
    if (!value.countryId && !value.stateProvinceId && !value.cityId && !value.areaId) return;
    onChange(value, meta);
    // Parent forms need the resolved labels after async option loading, especially in edit mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, selectedState, selectedCity, selectedArea]);

  const row1Cols = Number(Boolean(showCountry)) + Number(Boolean(showState));
  const row2Cols = Number(Boolean(showCity)) + Number(Boolean(showArea));

  return (
    <div className="space-y-3">
      {row1Cols ? (
        <div className={row1Cols === 1 ? "grid gap-3 md:grid-cols-1" : "grid gap-3 md:grid-cols-2"}>
          {showCountry ? (
            <div className="space-y-2">
              <SearchSelect
                label={loadingCountries ? "Country (Loading...)" : "Country"}
                value={value.countryId}
                placeholder="Select country"
                disabled={disabled || loadingCountries}
                options={toOptions(countries)}
                onValueChange={(countryId) => {
                  const next: LocationHierarchyValue = { countryId, stateProvinceId: "", cityId: "", areaId: "" };
                  onChange(next, {
                    country: countries.find((c) => c.id === countryId) ?? null,
                    state: null,
                    city: null,
                    area: null
                  });
                }}
                createLabel="+ New Country"
                createButtonPlacement="both"
                onCreateNew={async () => setOpenCreateType("country")}
              />

              {allowManageLink ? (
                <div className="flex justify-end">
                  <Button asChild type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <Link href="/dashboard/settings/location-setup">
                      Manage Locations <ExternalLink className="ms-1 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {showState ? (
            <SearchSelect
              label={loadingStates ? "State / Province (Loading...)" : "State / Province"}
              value={value.stateProvinceId}
              placeholder={value.countryId ? "Select state" : "Select country first"}
              disabled={disabled || !value.countryId || loadingStates}
              options={toOptions(states)}
              onValueChange={(stateProvinceId) => {
                const next: LocationHierarchyValue = { ...value, stateProvinceId, cityId: "", areaId: "" };
                onChange(next, {
                  ...meta,
                  state: states.find((s) => s.id === stateProvinceId) ?? null,
                  city: null,
                  area: null
                });
              }}
              createLabel="+ New State"
              createButtonPlacement="both"
              onCreateNew={async () => setOpenCreateType("state")}
            />
          ) : null}
        </div>
      ) : null}

      {row2Cols ? (
        <div className={row2Cols === 1 ? "grid gap-3 md:grid-cols-1" : "grid gap-3 md:grid-cols-2"}>
          {showCity ? (
            <SearchSelect
              label={loadingCities ? "City (Loading...)" : "City"}
              value={value.cityId}
              placeholder={value.stateProvinceId ? "Select city" : "Select state first"}
              disabled={disabled || !value.countryId || !value.stateProvinceId || loadingCities}
              options={toOptions(cities)}
              onValueChange={(cityId) => {
                const next: LocationHierarchyValue = { ...value, cityId, areaId: "" };
                onChange(next, { ...meta, city: cities.find((c) => c.id === cityId) ?? null, area: null });
              }}
              createLabel="+ New City"
              createButtonPlacement="both"
              onCreateNew={async () => setOpenCreateType("city")}
            />
          ) : null}

          {showArea ? (
            <SearchSelect
              label={loadingAreas ? "Area / Location (Loading...)" : "Area / Location"}
              value={value.areaId ?? ""}
              placeholder={value.cityId ? "Select area" : "Select city first"}
              disabled={disabled || !value.cityId || loadingAreas}
              options={toOptions(areas)}
              onValueChange={(areaId) => {
                const next: LocationHierarchyValue = { ...value, areaId };
                onChange(next, { ...meta, area: areas.find((a) => a.id === areaId) ?? null });
              }}
            />
          ) : null}
        </div>
      ) : null}

      {openCreateType ? (
        <LocationQuickCreateModal
          type={openCreateType}
          countryId={value.countryId}
          stateProvinceId={value.stateProvinceId}
          onClose={() => setOpenCreateType(null)}
          onCreated={(newId, item) => {
            if (openCreateType === "country") {
              setCountries((cur) => {
                if (cur.some((c) => c.id === item.id)) return cur;
                return [item, ...cur];
              });
              const next: LocationHierarchyValue = { countryId: newId, stateProvinceId: "", cityId: "", areaId: "" };
              onChange(next, {
                country: item,
                state: null,
                city: null,
                area: null
              });
            } else if (openCreateType === "state") {
              setStates((cur) => {
                if (cur.some((s) => s.id === item.id)) return cur;
                return [item, ...cur];
              });
              const next: LocationHierarchyValue = { ...value, stateProvinceId: newId, cityId: "", areaId: "" };
              onChange(next, {
                ...meta,
                state: item,
                city: null,
                area: null
              });
            } else if (openCreateType === "city") {
              setCities((cur) => {
                if (cur.some((c) => c.id === item.id)) return cur;
                return [item, ...cur];
              });
              const next: LocationHierarchyValue = { ...value, cityId: newId, areaId: "" };
              onChange(next, {
                ...meta,
                city: item,
                area: null
              });
            }
            setOpenCreateType(null);
          }}
        />
      ) : null}
    </div>
  );
}

function LocationQuickCreateModal({
  type,
  countryId,
  stateProvinceId,
  onClose,
  onCreated
}: {
  type: "country" | "state" | "city";
  countryId?: string;
  stateProvinceId?: string;
  onClose: () => void;
  onCreated: (newId: string, item: any) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Country-specific fields
  const [iso2, setIso2] = useState("");
  const [iso3, setIso3] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [defaultLanguageCode, setDefaultLanguageCode] = useState("en");
  const [officialEmail, setOfficialEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // State/City-specific fields
  const [code, setCode] = useState("");
  const [zipCode, setZipCode] = useState("");

  const canSave = useMemo(() => {
    if (type === "country") {
      return Boolean(name.trim() && currencyCode.trim() && officialEmail.trim() && adminEmail.trim());
    }
    return Boolean(name.trim());
  }, [type, name, currencyCode, officialEmail, adminEmail]);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (type === "country") {
        const res = await apiPost<{ country: LocationCountry }>("/api/erp/locations/countries", {
          name: name.trim(),
          iso2: iso2.trim() || null,
          iso3: iso3.trim() || null,
          currencyCode: currencyCode.trim(),
          defaultLanguageCode: defaultLanguageCode.trim() || null,
          officialEmail: officialEmail.trim(),
          adminEmail: adminEmail.trim(),
          whatsappNumber: whatsappNumber.trim() || null
        });
        onCreated(res.country.id, res.country);
      } else if (type === "state") {
        const res = await apiPost<{ state: LocationState }>("/api/erp/locations/states", {
          countryId,
          name: name.trim(),
          code: code.trim() || null
        });
        onCreated(res.state.id, res.state);
      } else if (type === "city") {
        const res = await apiPost<{ city: LocationCity }>("/api/erp/locations/cities", {
          countryId,
          stateProvinceId,
          name: name.trim(),
          code: code.trim() || null,
          zipCode: zipCode.trim() || null
        });
        onCreated(res.city.id, res.city);
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  const title = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;

  return (
    <SimpleModal title={title} onClose={onClose} className="max-w-md">
      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{type.charAt(0).toUpperCase() + type.slice(1)} Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter ${type} name`}
          />
        </div>

        {type === "country" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ISO2 (2 chars)</Label>
                <Input
                  maxLength={2}
                  value={iso2}
                  onChange={(e) => setIso2(e.target.value.toUpperCase())}
                  placeholder="US"
                />
              </div>
              <div className="space-y-2">
                <Label>ISO3 (3 chars)</Label>
                <Input
                  maxLength={3}
                  value={iso3}
                  onChange={(e) => setIso3(e.target.value.toUpperCase())}
                  placeholder="USA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Currency Code *</Label>
                <Input
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  placeholder="USD"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Input
                  value={defaultLanguageCode}
                  onChange={(e) => setDefaultLanguageCode(e.target.value)}
                  placeholder="en"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Official Email *</Label>
              <Input
                type="email"
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
                placeholder="official@domain.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Admin Email *</Label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@domain.com"
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+123456789"
              />
            </div>
          </>
        )}

        {(type === "state" || type === "city") && (
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
            />
          </div>
        )}

        {type === "city" && (
          <div className="space-y-2">
            <Label>Zip Code</Label>
            <Input
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Enter zip code"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !canSave}>
            <Plus className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}

