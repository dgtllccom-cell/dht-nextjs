"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleModal } from "@/components/ui/simple-modal";
import { cn } from "@/lib/utils";

export type SearchSelectOption = {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
};

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyScore(haystack: string, query: string) {
  if (!query) return 0;
  const hay = normalizeForSearch(haystack);
  const q = normalizeForSearch(query);
  if (!q) return 0;

  const exactIndex = hay.indexOf(q);
  if (exactIndex >= 0) return 1000 - exactIndex;

  // token contains
  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => hay.includes(t))) return 700;

  // subsequence score (typo-tolerant-ish)
  let h = 0;
  let matched = 0;
  for (let i = 0; i < q.length && h < hay.length; i += 1) {
    const ch = q[i];
    while (h < hay.length && hay[h] !== ch) h += 1;
    if (h < hay.length && hay[h] === ch) {
      matched += 1;
      h += 1;
    }
  }
  const ratio = matched / Math.max(1, q.length);
  if (ratio >= 0.65) return 300 + Math.floor(ratio * 200);

  return -1;
}

export function SearchSelect({
  label,
  value,
  placeholder = "Select...",
  options,
  disabled,
  onValueChange,
  onOpenChange,
  createLabel = "+ New",
  onCreateNew,
  createButtonPlacement = "modal"
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: SearchSelectOption[];
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  createLabel?: string;
  onCreateNew?: () => void | Promise<void>;
  createButtonPlacement?: "modal" | "trigger" | "both" | "below";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedLabel = useMemo(() => {
    const match = options.find((opt) => opt.value === value);
    return match?.label ?? "";
  }, [options, value]);

  const filtered = useMemo(() => {
    const query = q.trim();
    if (!query) return options;

    const ranked = options
      .map((opt) => {
        const hay = `${opt.label} ${opt.keywords ?? ""}`;
        return { opt, score: fuzzyScore(hay, query) };
      })
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.opt);

    // Keep the list bounded for performance.
    return ranked.slice(0, 250);
  }, [options, q]);

  function setOpenSafe(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) setQ("");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 justify-between rounded-lg px-3 text-sm"
          disabled={disabled}
          onClick={() => setOpenSafe(true)}
        >
          <span className={cn("truncate text-left", selectedLabel ? "" : "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
        </Button>

        {onCreateNew && (createButtonPlacement === "trigger" || createButtonPlacement === "both") ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 rounded-lg px-3 text-sm"
            disabled={disabled}
            onClick={async () => {
              await onCreateNew();
            }}
          >
            {createLabel}
          </Button>
        ) : null}
      </div>

      {onCreateNew && createButtonPlacement === "below" ? (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-center rounded-lg px-3 text-sm"
            disabled={disabled}
            onClick={async () => {
              await onCreateNew();
            }}
          >
            {createLabel}
          </Button>
        </div>
      ) : null}

      {open ? (
        <SimpleModal title={label} onClose={() => setOpenSafe(false)} className="max-w-xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
            {onCreateNew && (createButtonPlacement === "modal" || createButtonPlacement === "both") ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 rounded-lg px-3 text-sm"
                onClick={async () => {
                  setOpenSafe(false);
                  await onCreateNew();
                }}
              >
                {createLabel}
              </Button>
            ) : null}
          </div>

          <div className="max-h-[52vh] overflow-y-auto rounded-lg border">
            {filtered.length ? (
              <div className="divide-y">
                {filtered.map((opt) => {
                  const active = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        onValueChange(opt.value);
                        setOpenSafe(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                        active ? "bg-muted" : ""
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">No results.</div>
            )}
          </div>
        </SimpleModal>
      ) : null}
    </div>
  );
}
