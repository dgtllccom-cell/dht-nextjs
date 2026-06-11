"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { apiGet } from "@/lib/api/client";
import { CustomerForm } from "@/features/customers/components/customer-form";

type OwnerCustomerRow = {
  id: string;
  customer_name: string;
  company_name: string | null;
  contact_person: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
  address?: string | null;
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

function guessOriginalLanguage(): "en" | "ar" | "ur" | "fa" | "ps" {
  const lang = (typeof document !== "undefined" ? document.documentElement.lang : "en") || "en";
  if (lang === "ar" || lang === "ur" || lang === "fa" || lang === "ps") return lang;
  return "en";
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

  const finalOptions = useMemo(() => {
    if (value && !options.some((opt) => opt.value === value)) {
      return [...options, { value, label: value }];
    }
    return options;
  }, [options, value]);

  return (
    <>
      <SearchSelect
        label="Owner Name"
        value={value}
        placeholder={placeholder ?? (loading ? "Loading..." : "Search owner")}
        disabled={disabled || loading}
        options={finalOptions}
        onValueChange={onValueChange}
        createLabel="+ New Owner"
        createButtonPlacement={createButtonPlacement}
        onCreateNew={async () => setOpenCreate(true)}
      />

      {openCreate ? (
        <SimpleModal
          title="New Owner — Customer Master"
          onClose={() => setOpenCreate(false)}
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <CustomerForm
            lang={guessOriginalLanguage()}
            mode="embedded"
            onSave={(newCustomerId) => {
              (async () => {
                try {
                  const res = await apiGet<{ customer: OwnerCustomerRow }>(`/api/erp/customers/${encodeURIComponent(newCustomerId)}`);
                  if (res.customer) {
                    const label = res.customer.company_name
                      ? `${res.customer.customer_name} (${res.customer.company_name})`
                      : res.customer.customer_name;
                    const option = toOwnerOption(
                      label,
                      [
                        res.customer.customer_name,
                        res.customer.company_name,
                        res.customer.contact_person,
                        res.customer.mobile,
                        res.customer.whatsapp,
                        res.customer.email
                      ]
                        .filter(Boolean)
                        .join(" ")
                    );
                    setOptions((current) => {
                      if (current.some((item) => normalize(item.value) === normalize(option.value))) return current;
                      return [option, ...current];
                    });
                    onValueChange(label);
                  }
                } catch {
                  // Fallback: reload list
                  loadList().catch(() => null);
                } finally {
                  setOpenCreate(false);
                }
              })();
            }}
          />
        </SimpleModal>
      ) : null}
    </>
  );
}

