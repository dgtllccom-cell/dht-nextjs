"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import type { SidebarNode } from "@/lib/navigation/sidebar";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { filterSidebarTree } from "@/lib/navigation/sidebar";
import { enterpriseRoles, type EnterpriseRole } from "@/lib/permissions/enterprise-roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { PreferencesControls } from "@/components/layout/preferences-controls";

export function DashboardFrame({
  children,
  nodes,
  lang,
  roles,
  permissions,
  userEmail,
  userName
}: {
  children: React.ReactNode;
  nodes: SidebarNode[];
  lang: SupportedLanguage;
  roles: EnterpriseRole[] | null;
  permissions?: string[] | null;
  userEmail: string;
  userName?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNodes = useMemo(() => filterSidebarTree(nodes, roles, permissions ?? null), [nodes, roles, permissions]);
  const roleLabel = useMemo(() => {
    if (!roles || roles.length === 0) return null;

    const labels: Record<EnterpriseRole, string> = {
      super_admin: "Super Admin",
      country_admin: "Country Admin",
      main_branch_admin: "Main Branch Admin",
      city_branch_admin: "City Branch Admin",
      accountant: "Accountant",
      cashier: "Cashier",
      agent_user: "Agent User",
      staff_user: "Staff User",
      auditor_viewer: "Auditor / Viewer"
    };

    for (const role of enterpriseRoles) {
      if (roles.includes(role)) return labels[role];
    }

    return labels[roles[0]] ?? null;
  }, [roles]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 inset-s-0 hidden w-60 border-e bg-card lg:flex lg:flex-col">
        <div className="border-b px-5 py-5">
          <Link href="/dashboard" className="block">
            <p className="text-2xl font-semibold tracking-tight text-primary">DAMAAN</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Business Group ERP
            </p>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav nodes={filteredNodes} lang={lang} />
        </div>
        <div className="border-t p-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-semibold">ERP Foundation</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Multi-country, multi-currency, multi-branch accounting platform.
            </p>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 inset-s-0 w-60 border-e bg-card shadow-xl">
            <div className="border-b px-5 py-5">
              <Link href="/dashboard" className="block" onClick={() => setMobileOpen(false)}>
                <p className="text-2xl font-semibold tracking-tight text-primary">DAMAAN</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Business Group ERP
                </p>
              </Link>
            </div>
            <div className="h-[calc(100vh-82px)] overflow-y-auto p-3">
              <SidebarNav nodes={filteredNodes} lang={lang} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="lg:ps-60">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="flex h-11 items-center gap-3 px-4 lg:px-6">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" aria-hidden />
            </Button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Enterprise ERP / FMS</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Multi-country branch management & accounting
              </p>
            </div>

            <div className="ms-auto flex items-center gap-3">
              <PreferencesControls />
              <div className={cn("hidden text-end text-sm sm:block")}>
                <p className="font-medium">{userName || "User"}</p>
                <div className="mt-0.5 flex items-center justify-end gap-2 text-xs">
                  {roleLabel ? (
                    <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 font-semibold text-foreground">
                      {roleLabel}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">{userEmail}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] p-4 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
