"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { apiGet, apiPost } from "@/lib/api/client";
import { ContactNumberInput } from "@/components/ui/contact-number-input";
import {
  LocationHierarchySelect,
  type LocationHierarchyMeta,
  type LocationHierarchyValue
} from "@/features/locations/components/location-hierarchy-select";

type CustomerRow = {
  id: string;
  country_id: string;
  state_province_id: string | null;
  city_id: string | null;
  area_location_id: string | null;
  customer_name: string;
  company_name: string | null;
  contact_person: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  original_language_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toOption(row: CustomerRow): SearchSelectOption {
  const label = row.company_name
    ? `${row.customer_name} (${row.company_name})`
    : row.customer_name;
  const keywords = [
    row.customer_name,
    row.company_name,
    row.contact_person,
    row.mobile,
    row.whatsapp,
    row.email
  ]
    .filter(Boolean)
    .join(" ");
  return { value: row.id, label, keywords };
}

function guessOriginalLanguage(): "en" | "ar" | "ur" | "fa" | "ps" {
  const lang = (typeof document !== "undefined" ? document.documentElement.lang : "en") || "en";
  if (lang === "ar" || lang === "ur" || lang === "fa" || lang === "ps") return lang;
  return "en";
}

export function CustomerPicker({
  label,
  value,
  onValueChange,
  countryId,
  disabled,
  placeholder
}: {
  label: string;
  value: string;
  onValueChange: (customerId: string) => void;
  countryId?: string | null;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  async function loadList() {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (countryId) qp.set("countryId", countryId);
      qp.set("limit", "50");
      const res = await apiGet<{ customers: CustomerRow[] }>(`/api/erp/customers?${qp.toString()}`);
      setCustomers(res.customers ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  const options: SearchSelectOption[] = useMemo(() => customers.map(toOption), [customers]);

  return (
    <>
      <SearchSelect
        label={label}
        value={value}
        placeholder={placeholder ?? (loading ? "Loading..." : "Search customer")}
        disabled={disabled || loading}
        options={options}
        onValueChange={onValueChange}
        createLabel="+ New"
        createButtonPlacement="both"
        onCreateNew={async () => {
          setOpenCreate(true);
        }}
      />

      {openCreate ? (
        <CustomerQuickCreateModal
          initialCountryId={countryId ?? null}
          onClose={() => setOpenCreate(false)}
          onCreated={(customerId, row) => {
            setCustomers((current) => {
              if (current.some((c) => c.id === row.id)) return current;
              return [row, ...current];
            });
            onValueChange(customerId);
            setOpenCreate(false);
          }}
        />
      ) : null}
    </>
  );
}

function CustomerQuickCreateModal({
  initialCountryId,
  onClose,
  onCreated
}: {
  initialCountryId: string | null;
  onClose: () => void;
  onCreated: (customerId: string, row: CustomerRow) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [location, setLocation] = useState<LocationHierarchyValue>({
    countryId: initialCountryId ?? "",
    stateProvinceId: "",
    cityId: "",
    areaId: ""
  });
  const [locationMeta, setLocationMeta] = useState<LocationHierarchyMeta>({
    country: null,
    state: null,
    city: null,
    area: null
  });

  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const canSave = Boolean(location.countryId && customerName.trim().length >= 2);

  async function save() {
    setMessage(null);
    if (!canSave) {
      setMessage("Select a country and enter Customer Name (min 2 chars).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        countryId: location.countryId,
        countryBranchId: null,
        cityBranchId: null,
        stateProvinceId: location.stateProvinceId || null,
        cityId: location.cityId || null,
        areaLocationId: location.areaId || null,
        customerName: customerName.trim(),
        companyName: companyName.trim() || null,
        contactPerson: contactPerson.trim() || null,
        mobile: mobile.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        originalLanguage: guessOriginalLanguage(),
        contacts: [],
        registrations: []
      };

      const res = await apiPost<{ customerId: string }>("/api/erp/customers", payload);
      const row: CustomerRow = {
        id: res.customerId,
        country_id: location.countryId,
        state_province_id: location.stateProvinceId || null,
        city_id: location.cityId || null,
        area_location_id: location.areaId || null,
        customer_name: payload.customerName,
        company_name: payload.companyName,
        contact_person: payload.contactPerson,
        mobile: payload.mobile,
        whatsapp: payload.whatsapp,
        email: payload.email,
        address: payload.address,
        notes: payload.notes,
        original_language_code: payload.originalLanguage,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      onCreated(res.customerId, row);
    } catch (e: any) {
      setMessage(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimpleModal title="New Customer" onClose={onClose} className="max-w-3xl">
      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
            <LocationHierarchySelect
              value={location}
              showArea
              onChange={(next, meta) => {
                setLocation(next);
                setLocationMeta(meta);
              }}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name (optional)" />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person" />
            </div>
            <div className="space-y-2">
              <ContactNumberInput
                label="Mobile"
                countryId={location.countryId || null}
                contactTypeKey="mobile"
                value={mobile}
                onValueChange={setMobile}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2">
              <ContactNumberInput
                label="WhatsApp"
                countryId={location.countryId || null}
                contactTypeKey="whatsapp"
                value={whatsapp}
                onValueChange={setWhatsapp}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <div className="space-y-2 text-sm">
            <div>
              <b>Customer:</b> <span className="text-muted-foreground">{customerName.trim() || "-"}</span>
            </div>
            <div>
              <b>Company:</b> <span className="text-muted-foreground">{companyName.trim() || "-"}</span>
            </div>
            <div>
              <b>Location:</b>{" "}
              <span className="text-muted-foreground">
                {[locationMeta.area?.name, locationMeta.city?.name, locationMeta.state?.name, locationMeta.country?.name]
                  .filter(Boolean)
                  .join(" / ") || "-"}
              </span>
            </div>
            <div>
              <b>Mobile:</b> <span className="text-muted-foreground">{mobile.trim() || "-"}</span>
            </div>
            <div>
              <b>Email:</b> <span className="text-muted-foreground">{email.trim() || "-"}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving || !canSave}>
              <Plus className="h-4 w-4" aria-hidden />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </SimpleModal>
  );
}
