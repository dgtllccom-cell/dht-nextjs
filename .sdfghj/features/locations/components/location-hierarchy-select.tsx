"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { Button } from "@/components/ui/button";
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
    </div>
  );
}
