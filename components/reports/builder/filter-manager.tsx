"use client";
import { useState } from "react";
import { type ReportFilterRule, type ReportFieldDefinition } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterManagerProps = {
  fields: ReportFieldDefinition[];
  filters: ReportFilterRule[];
  onChange: (filters: ReportFilterRule[]) => void;
};

export function FilterManager({ fields, filters, onChange }: FilterManagerProps) {
  const addFilter = () => {
    if (fields.length === 0) return;
    const newFilter: ReportFilterRule = {
      id: Math.random().toString(36).substr(2, 9),
      fieldId: fields[0].id,
      operator: "contains",
      value: "",
    };
    onChange([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<ReportFilterRule>) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const clearFilters = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Active Filters ({filters.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={filters.length === 0} className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50">
            Clear All
          </Button>
          <Button variant="outline" size="sm" onClick={addFilter} className="text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add Filter
          </Button>
        </div>
      </div>

      {filters.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-500 italic border rounded bg-slate-50 dark:bg-slate-900 border-dashed">
          No filters applied. Click "Add Filter" to refine results.
        </div>
      ) : (
        <div className="space-y-3">
          {filters.map((filter) => {
            const fieldDef = fields.find((f) => f.id === filter.fieldId);
            return (
              <div key={filter.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border">
                <Select
                  value={filter.fieldId}
                  onValueChange={(val) => updateFilter(filter.id, { fieldId: val, value: "" })}
                >
                  <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filter.operator}
                  onValueChange={(val: any) => updateFilter(filter.id, { operator: val })}
                >
                  <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains" className="text-xs">Contains</SelectItem>
                    <SelectItem value="equals" className="text-xs">Equals (=)</SelectItem>
                    <SelectItem value="not_equals" className="text-xs">Not Equals (!=)</SelectItem>
                    {fieldDef?.type === "number" || fieldDef?.type === "date" || fieldDef?.type === "currency" ? (
                      <>
                        <SelectItem value="greater_than" className="text-xs">Greater Than (&gt;)</SelectItem>
                        <SelectItem value="less_than" className="text-xs">Less Than (&lt;)</SelectItem>
                      </>
                    ) : null}
                  </SelectContent>
                </Select>

                <div className="flex-1 w-full flex items-center gap-2">
                  {fieldDef?.options ? (
                    <Select
                      value={filter.value as string}
                      onValueChange={(val) => updateFilter(filter.id, { value: val })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950 w-full">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldDef.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={fieldDef?.type === "number" || fieldDef?.type === "currency" ? "number" : fieldDef?.type === "date" ? "date" : "text"}
                      value={filter.value as string}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      placeholder="Enter value..."
                      className="h-8 text-xs bg-white dark:bg-slate-950"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(filter.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
