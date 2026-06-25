"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import type { SidebarNode } from "@/lib/navigation/sidebar";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { filterSidebarTree } from "@/lib/navigation/sidebar";
import { enterpriseRoles, type EnterpriseRole } from "@/lib/permissions/enterprise-roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { PreferencesControls } from "@/components/layout/preferences-controls";
import { ErpPageActions } from "@/components/layout/erp-page-actions";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const isWizardPath = useMemo(() => {
    return pathname === "/dashboard/purchase/new-purchase-booking-order" ||
           pathname === "/dashboard/purchase/purchase-confirm";
  }, [pathname]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredNodes = useMemo(() => filterSidebarTree(nodes, roles, permissions ?? null), [nodes, roles, permissions]);
  const roleLabel = useMemo(() => {
    if (!roles || roles.length === 0) return null;

    const labels: Record<EnterpriseRole, string> = {
      super_admin: "Super Admin",
      country_admin: "Country Admin",
      country_user: "Country User",
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

  // Command palette search database
  const searchItems = useMemo(() => {
    return [
      { title: "Dashboard Overview", category: "Navigation", href: "/dashboard", keywords: "home main landing dashboard overview" },
      { title: "Super Admin Dashboard", category: "Navigation", href: "/dashboard/super-admin", keywords: "super admin dashboard summary stats" },
      { title: "Country Admin Dashboard", category: "Navigation", href: "/dashboard/country", keywords: "country admin dashboard summary stats" },
      { title: "City Branch Dashboard", category: "Navigation", href: "/dashboard/city", keywords: "city branch dashboard summary stats" },
      
      { title: "Customers Directory List", category: "Modules", href: "/dashboard/settings/customers", keywords: "customers directory clients list accounts" },
      { title: "Add New Customer Profile", category: "Actions", href: "/dashboard/settings/customers/setup", keywords: "create add new customer account client profile" },
      
      { title: "Country Branch Setup", category: "Modules", href: "/dashboard/new-entry/branch-entry/country-branch", keywords: "country branch office setup creation edit" },
      { title: "City Branch Setup", category: "Modules", href: "/dashboard/new-entry/branch-entry/city-branch", keywords: "city branch office setup creation edit" },
      { title: "Super Admin Branch Registry", category: "Modules", href: "/dashboard/new-entry/branches/super-admin", keywords: "super admin branch registry setup" },
      
      { title: "User Registration / Management", category: "Modules", href: "/dashboard/new-entry/users/registration", keywords: "register user employee create edit staff role assignment" },
      { title: "User Journal Log Report", category: "Modules", href: "/dashboard/new-entry/users/journal-report", keywords: "user journal log activity report auditing" },
      
      { title: "Daily Exchange Rate Manager", category: "Modules", href: "/dashboard/reports/exchange-rate", keywords: "daily exchange rate usd foreign currency update converter settings" },
      { title: "Credit & Debit Entries (Cash Entry)", category: "Modules", href: "/dashboard/roznamcha/cash-entry", keywords: "cash entry debit credit roznamcha entries post transaction" },
      { title: "Expenses Bill (Bill Entry)", category: "Modules", href: "/dashboard/roznamcha/expenses-bill", keywords: "expenses bill entry roznamcha tax invoice" },
      { title: "Roznamcha All Report Ledger", category: "Modules", href: "/dashboard/roznamcha/all", keywords: "roznamcha all report transaction logs ledger postings" },
      
      { title: "Accounts Master General Report", category: "Modules", href: "/dashboard/accounts", keywords: "accounts master general report setup balance" },
      { title: "Create New Account Item", category: "Actions", href: "/dashboard/accounts/setup", keywords: "create add account category chart of accounts asset liability equity" },
      { title: "Ledger Statement General Report", category: "Modules", href: "/dashboard/ledger/general-report", keywords: "ledger general statement report balance credit debit logs" },
      
      { title: "Purchase Order Advance Payment", category: "Modules", href: "/dashboard/journal/purchase-order-payment/advance", keywords: "purchase order advance payment entries history" },
      { title: "Purchase Order Remaining Payment", category: "Modules", href: "/dashboard/journal/purchase-order-payment/remaining", keywords: "purchase order remaining payment balance entries history" },
      
      { title: "Settings - Location Nodes Setup", category: "Settings", href: "/dashboard/settings/location", keywords: "settings location setup country state city area" },
      { title: "Settings - Enterprise Company Profile", category: "Settings", href: "/dashboard/settings/company", keywords: "settings company setup legal profile tax registry" }
    ];
  }, []);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchItems.slice(0, 7);
    return searchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [searchQuery, searchItems]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-foreground dark:bg-slate-950">
      {/* Premium Desktop Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 inset-s-0 hidden w-64 border-e border-slate-200/80 bg-white/95 backdrop-blur-md lg:flex lg:flex-col transition-all duration-300 shadow-sm z-30 dark:border-slate-800/80 dark:bg-slate-900/95",
        sidebarCollapsed && "lg:hidden"
      )}>
        <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between gap-2 dark:border-slate-800">
          <Link href="/dashboard" className="block flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-white text-sm shadow-md shadow-primary/20">
                D
              </span>
              <p className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">DAMAAN</p>
            </div>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 truncate">
              Business Group ERP
            </p>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(true)}
            className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 shrink-0 rounded-lg"
            aria-label="Collapse sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          <SidebarNav nodes={filteredNodes} lang={lang} />
        </div>
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50/70 p-3.5 border border-slate-100 dark:bg-slate-950/40 dark:border-slate-800/50">
            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ERP Core Engine
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              Multi-country branches, accounts & exchange matrices are active.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Menu */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 inset-s-0 w-64 border-e border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="border-b px-6 py-5 flex items-center justify-between dark:border-slate-800">
              <Link href="/dashboard" className="block" onClick={() => setMobileOpen(false)}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-white text-sm">
                    D
                  </span>
                  <p className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">DAMAAN</p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 text-slate-400"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SidebarNav nodes={filteredNodes} lang={lang} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn("transition-all duration-300 min-h-screen flex flex-col", sidebarCollapsed ? "lg:ps-0" : "lg:ps-64")}>
        {/* Sticky Premium Layout Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
          <div className={cn("flex items-center gap-4 px-4 lg:px-6 transition-all duration-200", isWizardPath ? "h-16" : "h-14")}>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden h-9 w-9 rounded-lg"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" aria-hidden />
            </Button>

            {sidebarCollapsed && (
              <Button
                variant="outline"
                size="icon"
                className="hidden lg:flex h-9 w-9 rounded-lg"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
              >
                <Menu className="h-4 w-4" aria-hidden />
              </Button>
            )}

            {/* Smart Search trigger */}
            <div className="hidden md:block w-72">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  <span>Search modules, actions...</span>
                </span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 font-mono text-[9px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                  Ctrl K
                </kbd>
              </button>
            </div>

            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <div className="ms-auto flex items-center gap-4 relative" ref={profileMenuRef}>
              <PreferencesControls />
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <button 
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={cn("hidden text-end text-xs sm:block hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none")}
              >
                <p className="font-bold text-slate-800 dark:text-slate-200">{userName || "User"}</p>
                <div className="mt-0.5 flex items-center justify-end gap-1.5">
                  {roleLabel ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary dark:bg-primary/20">
                      {roleLabel}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-slate-400 font-mono font-medium">{userEmail}</span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{userName || "User"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{userEmail}</p>
                  </div>
                  
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Assigned Permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roles?.map((r, i) => (
                        <span key={i} className="inline-flex items-center rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                          {r.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {(!roles || roles.length === 0) && (
                        <span className="text-xs text-slate-500 italic">No specific role assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 flex flex-col gap-1">
                    <Link href="/dashboard/new-entry/users/registration" onClick={() => setProfileMenuOpen(false)} className="px-3 py-2.5 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                      </span>
                      Sign Up New User
                    </Link>
                    
                    <Link href="/dashboard/settings/profile" onClick={() => setProfileMenuOpen(false)} className="px-3 py-2.5 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                      </span>
                      Reset Password
                    </Link>

                    <button 
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        fetch("/api/erp/auth/logout", { method: "POST" }).then(() => {
                          window.location.href = "/";
                        });
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center gap-3 transition-colors"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                      </span>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Work Area */}
        <main className="w-full flex-1 p-4 lg:p-6 bg-slate-50/30 dark:bg-slate-950/20">
          <ErpPageActions />
          {children}
        </main>
      </div>

      {/* Global Command Palette search Modal Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 backdrop-blur-sm p-4 sm:p-10 pt-16">
          <div
            className="absolute inset-0 bg-transparent"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative w-full max-w-xl rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input */}
            <div className="flex items-center border-b px-4 py-3 dark:border-slate-800">
              <Search className="h-4 w-4 text-slate-400 mr-3 shrink-0" />
              <input
                type="text"
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
                placeholder="Type to search modules, reports or actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto p-2">
              <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                {searchQuery ? "Matching Results" : "Quick Actions / Navigation"}
              </div>
              <div className="space-y-0.5">
                {filteredSearchItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold",
                        item.category === "Actions"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-emerald-400"
                          : item.category === "Settings"
                            ? "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            : "bg-primary/5 border-primary/10 text-primary dark:bg-primary/15"
                      )}>
                        {item.category === "Actions" ? "+" : item.title.substring(0, 1)}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.category}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ltr:mr-2 rtl:ml-2">
                      Jump to &rarr;
                    </span>
                  </Link>
                ))}

                {filteredSearchItems.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    No matching modules or actions found. Try another term.
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-slate-100/80 px-4 py-2 text-[10px] text-slate-400 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-900/30 flex justify-between font-medium">
              <span>Use &uarr;&darr; keys to navigate</span>
              <span>Press enter to select</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
