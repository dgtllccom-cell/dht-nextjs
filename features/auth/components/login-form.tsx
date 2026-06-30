"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LoginForm({ lang }: { lang: SupportedLanguage }) {
  const [showPassword, setShowPassword] = useState(false);
  const [idFocused, setIdFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [selectedRole, setSelectedRole] = useState("super_admin");
  const securityItems = useMemo(() => ["ERP Session", "Role Based Access", "Audit Trail"], []);
  const roleOptions = useMemo(
    () => [
      { key: "super_admin", title: "Super Admin", caption: "Global command center" },
      { key: "country_admin", title: "Country Admin", caption: "Country branches and reports" },
      { key: "city_admin", title: "City / Branch Admin", caption: "Branch operations" },
      { key: "loading_agent", title: "Loading Agent", caption: "Shipment and loading desk" },
      { key: "authorized_user", title: "Authorized User", caption: "Assigned ERP access" }
    ],
    []
  );
  const activeRole = roleOptions.find((role) => role.key === selectedRole) ?? roleOptions[0]!;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <UserRound className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Login Experience</p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{activeRole.caption}</p>
            </div>
          </div>
          <Building2 className="h-4 w-4 text-slate-400" aria-hidden />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {roleOptions.map((role) => (
            <button
              key={role.key}
              type="button"
              onClick={() => setSelectedRole(role.key)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-all",
                selectedRole === role.key
                  ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-350 dark:hover:border-blue-900"
              )}
              aria-pressed={selectedRole === role.key}
            >
              <span className="block text-[11px] font-black">{role.title}</span>
              <span className="mt-0.5 block text-[10px] font-semibold opacity-70">{role.caption}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Use a Route Handler for login to avoid Server Actions Origin/forwarded-host issues in some environments. */}
      <form id="erp-login-form" method="post" action="/api/erp/auth/login?temp=1" className="space-y-4">
        <input type="hidden" name="loginExperience" value={selectedRole} />
        <div className="space-y-2">
          <label htmlFor="identifier" className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-350">
            {t(lang, "auth.user_id_or_email")}
          </label>
          <div className="relative">
            <Mail className={cn("pointer-events-none absolute left-4 top-4 h-4 w-4 transition-colors duration-300", idFocused ? "text-blue-700 dark:text-blue-300" : "text-slate-400")} aria-hidden />
            <Input
              id="identifier"
              name="identifier"
              type="text"
              onFocus={() => setIdFocused(true)}
              onBlur={() => setIdFocused(false)}
              className="h-[52px] rounded-2xl border border-slate-200 bg-white pl-11 text-sm font-bold shadow-sm transition-all duration-300 placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-950"
              placeholder="Enter your user ID or email"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-350">
              {t(lang, "auth.password")}
            </label>
            <Link href={"/auth/forgot-password" as Route} className="text-xs font-black text-blue-700 transition-all hover:underline dark:text-blue-300">
              {t(lang, "auth.forgot_password")}
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole className={cn("pointer-events-none absolute left-4 top-4 h-4 w-4 transition-colors duration-300", pwFocused ? "text-blue-700 dark:text-blue-300" : "text-slate-400")} aria-hidden />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              className="h-[52px] rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm font-bold shadow-sm transition-all duration-300 placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-950"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-350">
            <input
              type="checkbox"
              name="remember"
              value="1"
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 dark:border-slate-700"
            />
            Remember me
          </label>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Secure
          </div>
        </div>

        <Button
          type="submit"
          className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition-all duration-300 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-700/25 active:scale-[0.99] dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {t(lang, "auth.sign_in")} <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </form>

      <div className="grid grid-cols-3 gap-2">
        {securityItems.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
