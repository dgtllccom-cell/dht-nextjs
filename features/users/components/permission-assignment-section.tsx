"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Search, ShieldCheck } from "lucide-react";
import {
  getPermissionKeysForTemplate,
  groupPermissionCatalog,
  permissionTemplates,
  type PermissionDefinition,
  type PermissionLevel
} from "@/lib/permissions/catalog";
import { cn } from "@/lib/utils";

type PermissionAssignmentSectionProps = {
  title?: string;
  level: PermissionLevel;
  template: string;
  selected: string[];
  onTemplateChange: (template: string) => void;
  onSelectedChange: (permissions: string[]) => void;
  parentPermissions?: string[];
  required?: boolean;
  note?: string;
};

export function PermissionAssignmentSection({
  title = "Roles & Permissions",
  level,
  template,
  selected,
  onTemplateChange,
  onSelectedChange,
  parentPermissions,
  required = false,
  note
}: PermissionAssignmentSectionProps) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const grouped = useMemo(() => groupPermissionCatalog(), []);
  const availableTemplates = useMemo(
    () => permissionTemplates.filter((item) => item.level === level || item.level === "user"),
    [level]
  );
  const allowedByParent = useMemo(() => new Set(parentPermissions ?? []), [parentPermissions]);
  const hasParentLimit = Boolean(parentPermissions?.length);
  const filteredGroups = useMemo<Record<string, PermissionDefinition[]>>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grouped;
    return Object.fromEntries(
      Object.entries(grouped)
        .map(([group, permissions]) => [
          group,
          permissions.filter((permission) =>
            [group, permission.label, permission.description, permission.key].join(" ").toLowerCase().includes(q)
          )
        ])
        .filter(([, permissions]) => permissions.length)
    ) as Record<string, PermissionDefinition[]>;
  }, [grouped, query]);
  const allowedPermissionKeys = useMemo(() => {
    const keys = Object.values(grouped).flatMap((permissions) => permissions.map((permission) => permission.key));
    return hasParentLimit ? keys.filter((permission) => allowedByParent.has(permission)) : keys;
  }, [allowedByParent, grouped, hasParentLimit]);
  const selectedAllowedCount = selected.filter((permission) => allowedPermissionKeys.includes(permission)).length;

  function setTemplate(nextTemplate: string) {
    onTemplateChange(nextTemplate);
    const nextPermissions = getPermissionKeysForTemplate(nextTemplate);
    onSelectedChange(hasParentLimit ? nextPermissions.filter((permission) => allowedByParent.has(permission)) : nextPermissions);
  }

  function togglePermission(permission: string) {
    if (hasParentLimit && !allowedByParent.has(permission)) return;
    const next = selected.includes(permission)
      ? selected.filter((item) => item !== permission)
      : [...selected, permission];
    onSelectedChange(next);
  }

  function toggleGroup(group: string) {
    setOpenGroups((current) => (current.includes(group) ? current.filter((item) => item !== group) : [...current, group]));
  }

  function toggleGroupPermissions(permissionKeys: string[]) {
    const allowedKeys = hasParentLimit ? permissionKeys.filter((permission) => allowedByParent.has(permission)) : permissionKeys;
    const allSelected = allowedKeys.every((permission) => selected.includes(permission));
    const next = allSelected
      ? selected.filter((permission) => !allowedKeys.includes(permission))
      : [...new Set([...selected, ...allowedKeys])];
    onSelectedChange(next);
  }

  function selectAllAllowed() {
    onSelectedChange([...new Set([...selected, ...allowedPermissionKeys])]);
  }

  function clearAllSelected() {
    onSelectedChange([]);
  }

  return (
    <section className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Assign permissions for this {level.replace("_", " ")}. Child levels can only receive permissions granted by the parent level.
          </p>
          {note ? <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-300">{note}</p> : null}
        </div>
        <label className="min-w-[240px]">
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
            {level === "country" ? "Role Template" : "Permissions Template"} {required ? "*" : ""}
          </span>
          <select
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            <option value="">Select template...</option>
            {availableTemplates.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 rounded-lg border bg-background p-2">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search permissions, modules, actions..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2 text-xs font-bold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Draft: {selectedAllowedCount}/{allowedPermissionKeys.length}
            </span>
            <button
              type="button"
              className="h-8 rounded-md border px-2 text-xs font-semibold hover:bg-muted"
              onClick={selectAllAllowed}
            >
              Select All Allowed
            </button>
            <button
              type="button"
              className="h-8 rounded-md border px-2 text-xs font-semibold hover:bg-muted"
              onClick={clearAllSelected}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {Object.entries(filteredGroups).map(([group, permissions]) => {
          const permissionKeys = permissions.map((permission) => permission.key);
          const allowedKeys = hasParentLimit ? permissionKeys.filter((permission) => allowedByParent.has(permission)) : permissionKeys;
          const selectedCount = allowedKeys.filter((permission) => selected.includes(permission)).length;
          const open = openGroups.includes(group) || Boolean(query.trim());
          return (
          <div key={group} className="overflow-hidden rounded-lg border bg-background">
            <div className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40" onClick={() => toggleGroup(group)}>
              <div>
                <div className="text-sm font-bold text-foreground">{group}</div>
                <div className="text-[11px] font-medium text-muted-foreground">{selectedCount}/{allowedKeys.length} selected</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGroupPermissions(permissionKeys);
                  }}
                >
                  {selectedCount === allowedKeys.length && allowedKeys.length ? "Clear Module" : "Select Module"}
                </button>
                <ChevronDown className={cn("h-4 w-4 transition", open ? "rotate-180" : "")} />
              </div>
            </div>
            {open ? (
            <div className="grid gap-2 border-t p-2 md:grid-cols-2">
              {permissions.map((permission) => {
                const disabled = hasParentLimit && !allowedByParent.has(permission.key);
                const checked = selected.includes(permission.key);
                return (
                  <label
                    key={permission.key}
                    className={cn(
                      "flex gap-2 rounded-md border p-2 text-xs transition",
                      checked ? "border-primary bg-primary/5" : "border-border",
                      disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => togglePermission(permission.key)}
                    />
                    <span>
                      <span className="block font-semibold">{permission.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{permission.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            ) : null}
          </div>
        );})}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Selected:
        </span>
        {selected.length ? (
          selected.slice(0, 12).map((permission) => (
            <span key={permission} className="rounded-full border bg-muted px-2 py-1 font-semibold">
              {permission}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">No permissions selected.</span>
        )}
        {selected.length > 12 ? <span className="rounded-full border bg-muted px-2 py-1 font-semibold">+{selected.length - 12} more</span> : null}
      </div>
    </section>
  );
}
