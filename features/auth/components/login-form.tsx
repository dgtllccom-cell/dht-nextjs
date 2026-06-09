"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Eye, EyeOff, Globe2, LockKeyhole, Mail, UserRoundCheck } from "lucide-react";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { supportedLanguages, rtlLanguages } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import { TemplateColorPicker } from "@/components/layout/template-color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LoginForm({ lang }: { lang: SupportedLanguage }) {
  const [showPassword, setShowPassword] = useState(false);
  const [idFocused, setIdFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  return (
    <div className="space-y-5">
      {/* Use a Route Handler for login to avoid Server Actions Origin/forwarded-host issues in some environments. */}
      <form id="erp-login-form" method="post" action="/api/erp/auth/login?temp=1" className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="identifier" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider pl-1">
            {t(lang, "auth.user_id_or_email")}
          </label>
          <div className="relative">
            <Mail className={cn("pointer-events-none absolute left-4 top-3.5 h-4 w-4 transition-colors duration-300", idFocused ? "text-primary" : "text-slate-400")} aria-hidden />
            <Input
              id="identifier"
              name="identifier"
              type="text"
              onFocus={() => setIdFocused(true)}
              onBlur={() => setIdFocused(false)}
              className="h-12 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 pl-11 shadow-none transition-all duration-300 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-white dark:focus-visible:bg-slate-950"
              placeholder="Enter your user ID or email"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between pl-1">
            <label htmlFor="password" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {t(lang, "auth.password")}
            </label>
            <Link href={"/auth/forgot-password" as Route} className="text-xs font-bold text-primary hover:underline transition-all">
              {t(lang, "auth.forgot_password")}
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole className={cn("pointer-events-none absolute left-4 top-3.5 h-4 w-4 transition-colors duration-300", pwFocused ? "text-primary" : "text-slate-400")} aria-hidden />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              className="h-12 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 pl-11 pr-11 shadow-none transition-all duration-300 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-white dark:focus-visible:bg-slate-950"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all duration-300 hover:shadow-lg hover:shadow-primary/15 active:scale-[0.99] mt-2 flex items-center justify-center gap-2"
        >
          {t(lang, "auth.sign_in")} <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
