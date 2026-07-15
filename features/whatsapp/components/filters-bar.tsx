"use client";

import type { ConversationFilters } from "../types";
import type { ErpSession } from "@/lib/auth/session";

type Props = {
  filters: ConversationFilters;
  onFilterChange: (f: Partial<ConversationFilters>) => void;
  session: ErpSession;
};

export function FiltersBar({ filters, onFilterChange, session }: Props) {
  return (
    <div className="border-b border-border/40 bg-muted/30 px-3 py-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Advanced Filters</p>

      {/* Assigned user filter */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-muted-foreground w-16 flex-shrink-0">Assigned</label>
        <select
          value={filters.assignedUserId ?? ""}
          onChange={(e) => onFilterChange({ assignedUserId: e.target.value || undefined })}
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#25D366]/50"
        >
          <option value="">Any</option>
          <option value={session.userId}>Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {/* Country filter — only visible to super_admin or country-level users */}
      {session.isSuperAdmin && (
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-muted-foreground w-16 flex-shrink-0">Country</label>
          <input
            type="text"
            placeholder="Country ID"
            value={filters.countryId ?? ""}
            onChange={(e) => onFilterChange({ countryId: e.target.value || undefined })}
            className="flex-1 rounded border border-input bg-background px-2 py-1 text-[10px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#25D366]/50"
          />
        </div>
      )}

      {/* Reset */}
      <button
        onClick={() => onFilterChange({ assignedUserId: undefined, countryId: undefined, cityBranchId: undefined })}
        className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Reset filters
      </button>
    </div>
  );
}
