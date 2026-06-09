"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { apiDelete, apiPatch, apiPost } from "@/lib/api/client";
import { listCountries } from "@/features/locations/location-api";
import { listGoods, type GoodsListRow } from "@/features/inventory/goods-api";

export default function GoodsManagementClient({ session }: { session: any }) {
  const [countries, setCountries] = useState<Array<{ id: string; name: string; currency_code: string }>>([]);
  const [countryId, setCountryId] = useState("");
  const [rows, setRows] = useState<GoodsListRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<GoodsListRow | null>(null);
  const [editRow, setEditRow] = useState<GoodsListRow | null>(null);

  const [form, setForm] = useState({
    goodsName: "",
    productCode: "",
    size: "",
    brand: "",
    originCountryId: ""
  });

  const scopedCountryId: string | null = session?.countryIds?.length === 1 ? session.countryIds[0] : null;
  const isCountryLocked = Boolean(scopedCountryId);
  const originOptions = useMemo(() => countries.map((c) => ({ value: c.id, label: c.name })), [countries]);

  useEffect(() => {
    listCountries()
      .then((res) => setCountries(res))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (scopedCountryId && !countryId) setCountryId(scopedCountryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedCountryId]);

  async function refresh(input?: { q?: string }) {
    if (!countryId) return;
    const res = await listGoods({ countryId, q: input?.q, limit: 200 });
    setRows(res.goods ?? []);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh({ q }).catch(() => null);
    }, 180);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId, q]);

  const countryOptions: SearchSelectOption[] = useMemo(
    () => countries.map((c) => ({ value: c.id, label: c.name, keywords: c.currency_code })),
    [countries]
  );

  async function createGoods() {
    if (!countryId || !form.goodsName.trim()) {
      setBanner("Country and Goods Name are required.");
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      await apiPost("/api/erp/goods", {
        countryId,
        goodsName: form.goodsName,
        productCode: form.productCode || null,
        size: form.size || null,
        brand: form.brand || null,
        originCountryId: form.originCountryId || null,
        hsCode: null,
        imageUrl: null,
        originalLanguage: "en",
        countryBranchId: null,
        cityBranchId: null
      });

      setForm({
        goodsName: "",
        productCode: "",
        size: "",
        brand: "",
        originCountryId: ""
      });
      await refresh({ q });
      setBanner("Saved.");
    } catch (e: any) {
      setBanner(e?.message ?? "Failed to save goods.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(next: { goodsName: string; productCode: string; size: string; brand: string; originCountryId: string }) {
    if (!editRow) return;
    if (!countryId) return;
    if (!next.goodsName.trim()) {
      setBanner("Goods Name is required.");
      return;
    }

    setBusy(true);
    setBanner(null);
    try {
      await apiPatch(`/api/erp/goods/${editRow.id}`, {
        countryId,
        goodsName: next.goodsName,
        productCode: next.productCode || null,
        size: next.size || null,
        brand: next.brand || null,
        originCountryId: next.originCountryId || null,
        hsCode: null,
        imageUrl: null,
        originalLanguage: "en",
        countryBranchId: null,
        cityBranchId: null
      });
      setEditRow(null);
      await refresh({ q });
      setBanner("Updated.");
    } catch (e: any) {
      setBanner(e?.message ?? "Failed to update goods.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow(row: GoodsListRow) {
    if (!countryId) return;
    const ok = window.confirm(`Delete goods: ${row.goods_name}?`);
    if (!ok) return;
    setBusy(true);
    setBanner(null);
    try {
      await apiDelete(`/api/erp/goods/${row.id}?countryId=${countryId}`);
      await refresh({ q });
      setBanner("Deleted.");
    } catch (e: any) {
      setBanner(e?.message ?? "Failed to delete goods.");
    } finally {
      setBusy(false);
    }
  }

  async function insertExamples() {
    if (!countryId) {
      setBanner("Select a country first.");
      return;
    }
    setBusy(true);
    setBanner(null);
    const examples = [
      { goodsName: "Afghan Walnut", productCode: "AW-001", originCountryId: "", size: "", brand: "" },
      { goodsName: "Afghan Raisins", productCode: "AR-001", originCountryId: "", size: "", brand: "" },
      { goodsName: "Pistachio Kernel", productCode: "PK-001", originCountryId: "", size: "Large", brand: "Premium" },
      { goodsName: "Almond Premium", productCode: "AP-001", originCountryId: "", size: "", brand: "Premium" }
    ];
    try {
      for (const ex of examples) {
        await apiPost("/api/erp/goods", {
          countryId,
          goodsName: ex.goodsName,
          productCode: ex.productCode || null,
          size: ex.size || null,
          brand: ex.brand || null,
          originCountryId: ex.originCountryId || null,
          hsCode: null,
          imageUrl: null,
          originalLanguage: "en",
          countryBranchId: null,
          cityBranchId: null
        });
      }
      await refresh({ q });
      setBanner("Example goods added.");
    } catch (e: any) {
      setBanner(e?.message ?? "Failed to add examples.");
    } finally {
      setBusy(false);
    }
  }

  const originNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of countries) map.set(c.id, c.name);
    return map;
  }, [countries]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Settings / Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Goods Master</h1>
          <p className="text-sm text-muted-foreground">Centralized goods registry used across Purchase, Sales, and Inventory.</p>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">Master Data</span>
      </div>

      {banner ? <div className="rounded-lg border border-border bg-card p-3 text-sm">{banner}</div> : null}

      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-2">
              {isCountryLocked ? (
                <div className="grid gap-1 px-1 py-1.5">
                  <div className="text-xs text-muted-foreground">Country</div>
                  <div className="truncate text-sm font-semibold text-foreground">{countryOptions.find((x) => x.value === countryId)?.label ?? "—"}</div>
                </div>
              ) : (
                <SearchSelect label="Country" value={countryId} options={countryOptions} onValueChange={setCountryId} placeholder="Select country" />
              )}
            </div>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Goods Name</span>
              <input
                value={form.goodsName}
                onChange={(e) => setForm((s) => ({ ...s, goodsName: e.target.value }))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                placeholder="Pistachio Kernel"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Goods Code</span>
              <input
                value={form.productCode}
                onChange={(e) => setForm((s) => ({ ...s, productCode: e.target.value }))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                placeholder="PRD-001"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Size</span>
              <input
                value={form.size}
                onChange={(e) => setForm((s) => ({ ...s, size: e.target.value }))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                placeholder="Large"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Brand</span>
              <input
                value={form.brand}
                onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                placeholder="Premium"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Origin</span>
              <select
                value={form.originCountryId}
                onChange={(e) => setForm((s) => ({ ...s, originCountryId: e.target.value }))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              >
                <option value="">Select origin country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Keep the goods master simple: Name, Code, Origin, Size, Brand.
            </div>
            <Button type="button" className="h-10 rounded-lg" onClick={createGoods} disabled={busy}>
              {busy ? <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" aria-hidden />Saving...</span> : <span className="inline-flex items-center gap-2"><Save className="h-4 w-4" aria-hidden />Save Goods</span>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Goods Registry</div>
              <div className="text-xs text-muted-foreground">Search, inspect, edit, or delete goods records.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-56 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Search goods name / code / brand"
                />
              </div>
              {!rows.length ? (
                <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={insertExamples} disabled={busy || !countryId}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add Examples
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">Goods Name</th>
                  <th className="px-3 py-2 text-start font-semibold">Goods Code</th>
                  <th className="px-3 py-2 text-start font-semibold">Origin</th>
                  <th className="px-3 py-2 text-start font-semibold">Size</th>
                  <th className="px-3 py-2 text-start font-semibold">Brand</th>
                  <th className="px-3 py-2 text-end font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="truncate font-semibold text-foreground">{r.goods_name}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate text-muted-foreground">{r.product_code ?? "-"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate text-muted-foreground">{r.origin_country_id ? originNameById.get(r.origin_country_id) ?? "-" : "-"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate text-muted-foreground">{r.size ?? "-"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate text-muted-foreground">{r.brand ?? "-"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewRow(r)} aria-label="View details">
                            <Eye className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditRow(r)} aria-label="Edit">
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => void deleteRow(r)} disabled={busy} aria-label="Delete">
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      No goods found yet. Examples: Afghan Walnut, Afghan Raisins, Pistachio Kernel, Almond Premium.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {viewRow ? (
        <SimpleModal title="Goods Details" onClose={() => setViewRow(null)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">Goods Name</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{viewRow.goods_name}</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">Goods Code</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{viewRow.product_code ?? "-"}</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">Origin</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {viewRow.origin_country_id ? originNameById.get(viewRow.origin_country_id) ?? "-" : "-"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">Size</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{viewRow.size ?? "-"}</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 md:col-span-2">
              <div className="text-xs text-muted-foreground">Brand</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{viewRow.brand ?? "-"}</div>
            </div>
          </div>
        </SimpleModal>
      ) : null}

      {editRow ? (
        <EditGoodsModal
          row={editRow}
          originOptions={originOptions}
          originNameById={originNameById}
          onClose={() => setEditRow(null)}
          onSave={saveEdit}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

function EditGoodsModal({
  row,
  originOptions,
  onClose,
  onSave,
  busy
}: {
  row: GoodsListRow;
  originOptions: Array<{ value: string; label: string }>;
  originNameById: Map<string, string>;
  onClose: () => void;
  onSave: (next: { goodsName: string; productCode: string; size: string; brand: string; originCountryId: string }) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState({
    goodsName: row.goods_name ?? "",
    productCode: row.product_code ?? "",
    size: row.size ?? "",
    brand: row.brand ?? "",
    originCountryId: row.origin_country_id ?? ""
  });

  return (
    <SimpleModal title="Edit Goods" onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs text-muted-foreground">Goods Name</span>
          <input
            value={draft.goodsName}
            onChange={(e) => setDraft((s) => ({ ...s, goodsName: e.target.value }))}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Goods Code</span>
          <input
            value={draft.productCode}
            onChange={(e) => setDraft((s) => ({ ...s, productCode: e.target.value }))}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Origin</span>
          <select
            value={draft.originCountryId}
            onChange={(e) => setDraft((s) => ({ ...s, originCountryId: e.target.value }))}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
          >
            <option value="">Select origin country</option>
            {originOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Size</span>
          <input
            value={draft.size}
            onChange={(e) => setDraft((s) => ({ ...s, size: e.target.value }))}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Brand</span>
          <input
            value={draft.brand}
            onChange={(e) => setDraft((s) => ({ ...s, brand: e.target.value }))}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" className="h-9 rounded-lg" onClick={() => onSave(draft)} disabled={busy}>
          <Save className="h-4 w-4" aria-hidden />
          Save Changes
        </Button>
      </div>
    </SimpleModal>
  );
}
