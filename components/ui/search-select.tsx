"use client";

import { useEffect, useMemo, useState } from "react";
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
  triggerClassName,
  className
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
  triggerClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const containerRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);

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

    return ranked.slice(0, 250);
  }, [options, q]);

  function setOpenSafe(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) setQ("");
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenSafe(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, containerRef]);

  return (
    <div className={cn("relative", label && "space-y-1.5", className)} ref={(el) => { containerRef.current = el; }}>
      {label && <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpenSafe(!open)}
          className={cn(
            "w-full h-10 flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-xs text-left shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 bg-white",
            selectedLabel ? "" : "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 mt-1 w-full min-w-[240px] max-w-sm rounded-xl bg-card border border-border shadow-2xl z-[80] p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 bg-white text-slate-900">
          <div className="p-1 border-b border-border/40 mb-1">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground opacity-50" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
                className="w-full bg-background border border-input rounded-md pl-8 pr-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring text-foreground h-8 bg-white text-slate-900"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length ? (
              filtered.map((opt) => {
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
                      "w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left text-xs transition",
                      active ? "bg-muted font-semibold" : ""
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-center text-muted-foreground text-xs italic">
                No matches found.
              </div>
            )}
          </div>
          {onCreateNew && (
            <div className="border-t border-border/40 pt-1 mt-1">
              <button
                type="button"
                onClick={async () => {
                  setOpenSafe(false);
                  await onCreateNew();
                }}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/5 transition text-left"
              >
                <span className="text-sm font-bold">+</span>
                <span>{createLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

