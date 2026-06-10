"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { apiGet } from "@/lib/api/client";

type OwnerCustomerRow = {
  id: string;
  customer_name: string;
  company_name: string | null;
  contact_person: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
};

type OwnerProfileRow = {
  userId: string;
  userCode: string;
  fullName: string;
  countryName: string;
  branchName: string;
  branchType: string;
  role: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toOwnerOption(label: string, keywords?: string): SearchSelectOption {
  return { value: label, label, keywords };
}

export function BranchOwnerPicker({
  value,
  onValueChange,
  disabled,
  placeholder = "Search owner",
  createButtonPlacement = "below"
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  createButtonPlacement?: "modal" | "trigger" | "both" | "below";
}) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SearchSelectOption[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  async function loadList() {
    setLoading(true);
    try {
      const [customersRes, usersRes] = await Promise.all([
        apiGet<{ customers: OwnerCustomerRow[] }>("/api/erp/customers?limit=50"),
        apiGet<{ rows: OwnerProfileRow[] }>("/api/erp/users/journal-report?limit=50")
      ]);

      const next: SearchSelectOption[] = [];
      for (const row of customersRes.customers ?? []) {
        const label = row.company_name ? `${row.customer_name} (${row.company_name})` : row.customer_name;
        next.push(
          toOwnerOption(
            label,
            [row.customer_name, row.company_name, row.contact_person, row.mobile, row.whatsapp, row.email].filter(Boolean).join(" ")
          )
        );
      }
      for (const row of usersRes.rows ?? []) {
        const label = [row.fullName, row.role, row.branchName].filter(Boolean).join(" · ");
        next.push(toOwnerOption(label, [row.userCode, row.fullName, row.countryName, row.branchName, row.role].join(" ")));
      }

      const unique = new Map<string, SearchSelectOption>();
      for (const item of next) {
        if (!unique.has(normalize(item.value))) unique.set(normalize(item.value), item);
      }
      setOptions(Array.from(unique.values()));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SearchSelect
        label="Owner Name"
        value={value}
        placeholder={placeholder ?? (loading ? "Loading..." : "Search owner")}
        disabled={disabled || loading}
        options={options}
        onValueChange={onValueChange}
        createLabel="+ New Owner"
        createButtonPlacement={createButtonPlacement}
        onCreateNew={async () => setOpenCreate(true)}
      />

      {openCreate ? (
        <OwnerQuickCreateModal
          onClose={() => setOpenCreate(false)}
          onCreated={(ownerName) => {
            const option = toOwnerOption(ownerName, ownerName);
            setOptions((current) => {
              if (current.some((item) => normalize(item.value) === normalize(option.value))) return current;
              return [option, ...current];
            });
            onValueChange(ownerName);
            setOpenCreate(false);
          }}
        />
      ) : null}
    </>
  );
}

function OwnerQuickCreateModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (ownerName: string) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    const cleaned = name.trim();
    if (cleaned.length < 2) {
      setMessage("Enter an Owner name (min 2 chars).");
      return;
    }
    setSaving(true);
    try {
      onCreated(cleaned);
    } catch (e: any) {
      setMessage(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimpleModal title="New Owner" onClose={onClose} className="max-w-lg">
      {message ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{message}</div> : null}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Owner Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Owner name" />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || name.trim().length < 2}>
            <Plus className="h-4 w-4" aria-hidden />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </SimpleModal>
  );
}
