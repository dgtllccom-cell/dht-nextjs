"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactNumberInput } from "@/components/ui/contact-number-input";
import {
  LocationHierarchySelect,
  type LocationHierarchyMeta,
  type LocationHierarchyValue
} from "@/features/locations/components/location-hierarchy-select";
import type { ContactTypeKey } from "@/features/contact-types/contact-type-api";

type DynamicList = "contacts" | "registrations" | "ownerIds";
type DynamicRow = {
  id: string;
  type: string;
  value: string;
};

export type CompanyIncorporationData = {
  ownerName: string;
  companyName: string;
  businessName: string;
  countryId?: string;
  stateProvinceId?: string;
  cityId?: string;
  areaLocationId?: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  address: string;
  contacts: DynamicRow[];
  registrations: DynamicRow[];
  ownerIds: DynamicRow[];
};

const defaultTypes: Record<DynamicList, string[]> = {
  contacts: ["Mobile Number", "Office Number", "WhatsApp Number", "Email Address"],
  registrations: ["Sales Tax No", "GST No", "PSI No", "NTN No", "Trade License No"],
  ownerIds: ["CNIC No", "Passport No", "National ID", "Residence Permit"]
};

function newRow(): DynamicRow {
  return { id: crypto.randomUUID(), type: "", value: "" };
}

function selectClass() {
  return "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-700">{children}</h2>;
}

function toContactTypeKey(label: string): ContactTypeKey | null {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("mobile")) return "mobile";
  if (normalized.includes("whatsapp")) return "whatsapp";
  if (normalized.includes("fax")) return "fax";
  if (normalized.includes("office")) return "phone";
  if (normalized.includes("phone")) return "phone";
  if (normalized.includes("extension")) return "extension";
  return null;
}

function DynamicRows({
  label,
  helper,
  list,
  rows,
  types,
  countryId,
  onChange,
  onRemove,
  onAdd,
  onNewType
}: {
  label: string;
  helper?: string;
  list: DynamicList;
  rows: DynamicRow[];
  types: string[];
  countryId?: string;
  onChange: (id: string, patch: Partial<DynamicRow>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onNewType: (list: DynamicList) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label>{label}</Label>
          {helper ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 md:grid-cols-[minmax(180px,0.8fr)_1fr_auto]">
            <select
              value={row.type}
              onChange={(event) => {
                if (event.target.value === "__new__") {
                  onNewType(list);
                  return;
                }
                onChange(row.id, { type: event.target.value });
              }}
              className={selectClass()}
            >
              <option value="">Select Type</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="__new__">+ Add New Type</option>
            </select>
            {list === "contacts" && toContactTypeKey(row.type) ? (
              <ContactNumberInput
                label=""
                hideLabel
                showHelp={false}
                countryId={countryId ?? null}
                contactTypeKey={toContactTypeKey(row.type) as ContactTypeKey}
                value={row.value}
                disabled={!countryId}
                onValueChange={(next) => onChange(row.id, { value: next })}
              />
            ) : (
              <Input
                value={row.value}
                onChange={(event) => onChange(row.id, { value: event.target.value })}
                placeholder="Enter value"
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onRemove(row.id)}
              aria-label={`Remove ${label} row`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompanyIncorporationForm({
  mode = "standalone",
  onSave
}: {
  mode?: "standalone" | "embedded";
  onSave?: (data: CompanyIncorporationData) => void;
}) {
  const [ownerName, setOwnerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState<LocationHierarchyValue>({
    countryId: "",
    stateProvinceId: "",
    cityId: ""
  });
  const [locationMeta, setLocationMeta] = useState<LocationHierarchyMeta>({
    country: null,
    state: null,
    city: null,
    area: null
  });
  const [address, setAddress] = useState("");
  const [contacts, setContacts] = useState<DynamicRow[]>([newRow()]);
  const [registrations, setRegistrations] = useState<DynamicRow[]>([newRow()]);
  const [ownerIds, setOwnerIds] = useState<DynamicRow[]>([newRow()]);
  const [types, setTypes] = useState(defaultTypes);
  const [typeModal, setTypeModal] = useState<DynamicList | null>(null);
  const [newType, setNewType] = useState("");
  const [message, setMessage] = useState("");

  const country = locationMeta.country?.name ?? "";
  const stateName = locationMeta.state?.name ?? "";
  const city = locationMeta.city?.name ?? "";
  const zipCode = locationMeta.city?.zip_code ?? "";

  const ready = Boolean(ownerName && companyName && businessName && country && stateName && city && zipCode && address);
  const summary = useMemo(
    () => ({
      companyName: companyName || "-",
      ownerName: ownerName || "-",
      location: [city, stateName, country].filter(Boolean).join(", ") || "-",
      contacts: contacts.filter((row) => row.type && row.value).length,
      registrations: registrations.filter((row) => row.type && row.value).length,
      ownerIds: ownerIds.filter((row) => row.type && row.value).length
    }),
    [city, companyName, contacts, country, ownerIds, ownerName, registrations, stateName]
  );

  function patchRow(list: DynamicList, id: string, patch: Partial<DynamicRow>) {
    const update = (rows: DynamicRow[]) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row));

    if (list === "contacts") setContacts(update);
    if (list === "registrations") setRegistrations(update);
    if (list === "ownerIds") setOwnerIds(update);
  }

  function removeRow(list: DynamicList, id: string) {
    const remove = (rows: DynamicRow[]) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);

    if (list === "contacts") setContacts(remove);
    if (list === "registrations") setRegistrations(remove);
    if (list === "ownerIds") setOwnerIds(remove);
  }

  function addRow(list: DynamicList) {
    if (list === "contacts") setContacts((rows) => [...rows, newRow()]);
    if (list === "registrations") setRegistrations((rows) => [...rows, newRow()]);
    if (list === "ownerIds") setOwnerIds((rows) => [...rows, newRow()]);
  }

  function saveType() {
    const value = newType.trim();
    if (!typeModal || !value) return;

    setTypes((current) => ({ ...current, [typeModal]: [...current[typeModal], value] }));
    setNewType("");
    setTypeModal(null);
  }

  function submitForm() {
    if (!ready) {
      setMessage("Complete owner, company, business, location, zip code, and address first.");
      return;
    }

    const data: CompanyIncorporationData = {
      ownerName,
      companyName,
      businessName,
      countryId: location.countryId || undefined,
      stateProvinceId: location.stateProvinceId || undefined,
      cityId: location.cityId || undefined,
      areaLocationId: location.areaId || undefined,
      country,
      state: stateName,
      city,
      zipCode,
      address,
      contacts: contacts.filter((row) => row.type && row.value),
      registrations: registrations.filter((row) => row.type && row.value),
      ownerIds: ownerIds.filter((row) => row.type && row.value)
    };

    onSave?.(data);
    setMessage(`Saved demo company ${companyName}.`);
  }

  return (
    <div className={mode === "standalone" ? "space-y-5" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Settings / Company</p>
          <h1 className={mode === "standalone" ? "mt-1 text-2xl font-semibold tracking-tight" : "text-lg font-semibold"}>
            Company Incorporation Form
          </h1>
          <p className="text-sm text-muted-foreground">
            Owner, company, business, contacts, registrations, and owner IDs.
          </p>
        </div>
        <span
          className={
            ready
              ? "inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
              : "inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
          }
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {ready ? "Ready" : "Draft"}
        </span>
      </div>

      <div className={mode === "standalone" ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" : "space-y-4"}>
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <SectionTitle>Company Details</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Company Owner Name</Label>
              <Input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Enter owner name" />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Enter company name" />
            </div>
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Enter business name" />
            </div>
          </div>

          <SectionTitle>Location</SectionTitle>
          <LocationHierarchySelect
            value={location}
            onChange={(next, meta) => {
              setLocation(next);
              setLocationMeta(meta);
            }}
            showArea={false}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input value={zipCode} readOnly className="bg-muted/50 font-semibold" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Full Address</Label>
            <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Enter full address" />
          </div>

          <DynamicRows
            label="Contacts"
            list="contacts"
            rows={contacts}
            types={types.contacts}
            countryId={location.countryId}
            onChange={(id, patch) => patchRow("contacts", id, patch)}
            onRemove={(id) => removeRow("contacts", id)}
            onAdd={() => addRow("contacts")}
            onNewType={setTypeModal}
          />
          <DynamicRows
            label="Company Registrations"
            helper="Select type, for example VAT/NTN, and enter number."
            list="registrations"
            rows={registrations}
            types={types.registrations}
            onChange={(id, patch) => patchRow("registrations", id, patch)}
            onRemove={(id) => removeRow("registrations", id)}
            onAdd={() => addRow("registrations")}
            onNewType={setTypeModal}
          />
          <DynamicRows
            label="Company Owner Identification"
            helper="CNIC / Passport / National ID etc. Multiple IDs can be added."
            list="ownerIds"
            rows={ownerIds}
            types={types.ownerIds}
            onChange={(id, patch) => patchRow("ownerIds", id, patch)}
            onRemove={(id) => removeRow("ownerIds", id)}
            onAdd={() => addRow("ownerIds")}
            onNewType={setTypeModal}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Saved company will become selectable in Super Admin Branch company dropdown.
            </p>
            <Button type="button" onClick={submitForm} className="rounded-lg">
              <Save className="h-4 w-4" aria-hidden />
              Submit
            </Button>
          </div>

          {message ? (
            <div
              className={
                message.startsWith("Saved")
                  ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                  : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
              }
            >
              {message}
            </div>
          ) : null}
        </section>

        {mode === "standalone" ? (
          <aside className="h-fit rounded-lg border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-semibold">Company Preview</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Company</p>
                <p className="font-semibold text-slate-950">{summary.companyName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Owner</p>
                <p className="font-semibold text-slate-950">{summary.ownerName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Location</p>
                <p className="font-semibold text-slate-950">{summary.location}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-lg font-bold">{summary.contacts}</p>
                  <p className="text-xs text-slate-500">Contacts</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-lg font-bold">{summary.registrations}</p>
                  <p className="text-xs text-slate-500">Regs</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-lg font-bold">{summary.ownerIds}</p>
                  <p className="text-xs text-slate-500">IDs</p>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {typeModal ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-white p-5 shadow-2xl">
            <h2 className="font-semibold text-slate-950">Add New Type</h2>
            <div className="mt-4 space-y-3">
              <Input value={newType} onChange={(event) => setNewType(event.target.value)} placeholder="Enter type name" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setTypeModal(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveType}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
