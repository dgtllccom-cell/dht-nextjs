"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { apiGet, apiPost } from "@/lib/api/client";

type CompanyRow = {
  id: string;
  name: string;
  legal_name: string | null;
  base_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toOption(row: CompanyRow): SearchSelectOption {
  const label = row.legal_name ? `${row.name} (${row.legal_name})` : row.name;
  const keywords = [row.name, row.legal_name, row.base_currency].filter(Boolean).join(" ");
  return { value: row.id, label, keywords };
}

function guessOriginalLanguage(): "en" | "ar" | "ur" | "fa" | "ps" {
  const lang = (typeof document !== "undefined" ? document.documentElement.lang : "en") || "en";
  if (lang === "ar" || lang === "ur" || lang === "fa" || lang === "ps") return lang;
  return "en";
}

export function CompanyPicker({
  label,
  value,
  onValueChange,
  disabled,
  placeholder,
  createButtonPlacement = "below"
}: {
  label: string;
  value: string;
  onValueChange: (companyId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  createButtonPlacement?: "modal" | "trigger" | "both" | "below";
}) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  async function loadList() {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set("limit", "50");
      const res = await apiGet<{ companies: CompanyRow[] }>(`/api/erp/companies?${qp.toString()}`);
      setCompanies(res.companies ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value) return;
    if (companies.some((c) => c.id === value)) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<{ company: CompanyRow }>(`/api/erp/companies/${encodeURIComponent(value)}`);
        if (cancelled) return;
        if (res.company) {
          setCompanies((current) => {
            if (current.some((c) => c.id === res.company.id)) return current;
            return [...current, res.company];
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const options: SearchSelectOption[] = useMemo(() => companies.map(toOption), [companies]);

  return (
    <>
      <SearchSelect
        label={label}
        value={value}
        placeholder={placeholder ?? (loading ? "Loading..." : "Search company")}
        disabled={disabled || loading}
        options={options}
        onValueChange={onValueChange}
        createLabel="+ New"
        createButtonPlacement={createButtonPlacement}
        onCreateNew={async () => setOpenCreate(true)}
      />

      {openCreate ? (
        <CompanyQuickCreateModal
          onClose={() => setOpenCreate(false)}
          onCreated={(companyId, row) => {
            setCompanies((current) => {
              if (current.some((c) => c.id === row.id)) return current;
              return [row, ...current];
            });
            onValueChange(companyId);
            setOpenCreate(false);
          }}
        />
      ) : null}
    </>
  );
}

function CompanyQuickCreateModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (companyId: string, row: CompanyRow) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");

  const canSave = name.trim().length >= 2 && baseCurrency.trim().length === 3;

  async function save() {
    setMessage(null);
    if (!canSave) {
      setMessage("Enter Company Name (min 2 chars) and a 3-letter base currency.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        legalName: legalName.trim() ? legalName.trim() : undefined,
        baseCurrency: baseCurrency.trim().toUpperCase(),
        originalLanguage: guessOriginalLanguage()
      };

      const res = await apiPost<{ companyId: string }>("/api/erp/companies", payload);

      const row: CompanyRow = {
        id: res.companyId,
        name: payload.name,
        legal_name: payload.legalName ?? null,
        base_currency: payload.baseCurrency,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onCreated(res.companyId, row);
    } catch (e: any) {
      setMessage(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimpleModal title="New Company" onClose={onClose} className="max-w-2xl">
      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
          </div>
          <div className="space-y-2">
            <Label>Legal Name</Label>
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Legal name (optional)" />
          </div>
          <div className="space-y-2">
            <Label>Base Currency</Label>
            <Input value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} placeholder="USD" />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <div className="space-y-2 text-sm">
            <div>
              <b>Company:</b> <span className="text-muted-foreground">{name.trim() || "-"}</span>
            </div>
            <div>
              <b>Legal Name:</b> <span className="text-muted-foreground">{legalName.trim() || "-"}</span>
            </div>
            <div>
              <b>Base Currency:</b> <span className="text-muted-foreground">{baseCurrency.trim().toUpperCase() || "-"}</span>
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
