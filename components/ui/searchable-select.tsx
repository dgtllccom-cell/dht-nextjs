"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string; }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  addOptionLabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
  addOptionLabel
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find(o => o.value === value)?.label || value || placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-background border border-input rounded px-2 py-1 text-foreground text-[10px] outline-none focus:border-primary disabled:opacity-50"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="h-3 w-3 opacity-50 ml-1 shrink-0" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-slate-950 border border-border rounded-md shadow-md overflow-hidden">
          <div className="flex items-center px-2 py-1.5 border-b border-border">
            <Search className="h-3 w-3 text-muted-foreground mr-1.5 opacity-50 shrink-0" />
            <input
              type="text"
              className="flex-1 bg-transparent outline-none text-[10px] min-w-0"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {search && (
              <X 
                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground shrink-0" 
                onClick={() => setSearch("")}
              />
            )}
          </div>
          <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {value && !options.some(o => o.value === value) && (
              <div
                className="px-2 py-1.5 text-[10px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-900 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {value} (Current)
              </div>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-2 py-1.5 text-[10px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${value === opt.value ? "bg-slate-100 dark:bg-slate-800 font-semibold" : ""}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-2 py-2 text-[10px] text-muted-foreground text-center">
                No results found.
              </div>
            )}
            {addOptionLabel && (
              <div
                className="px-2 py-1.5 text-[10px] cursor-pointer text-primary font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 border-t border-border mt-1"
                onClick={() => {
                  onChange("__ADD_NEW__");
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                + {addOptionLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
