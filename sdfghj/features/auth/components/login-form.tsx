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

export function LoginForm({ lang }: { lang: SupportedLanguage }) {
  const [showPassword, setShowPassword] = useState(false);

  const languageOptions = useMemo(() => supportedLanguages, []);
  const demoAccounts = useMemo(
    () => [
      {
        label: "Super Admin",
        scope: "Global access",
        identifier: "superadmin@damaan.com",
        password: "admin123",
        action: "/api/erp/auth/login?temp=1"
      },
      {
        label: "Pakistan Country",
        scope: "Pakistan country scope",
        identifier: "PK-COUNTRY-0531",
        password: "Test@12345",
        action: "/api/erp/auth/login?temp=1"
      },
      {
        label: "Quetta City",
        scope: "Pakistan / Quetta branch scope",
        identifier: "PK-QUETTA-0531",
        password: "Test@12345",
        action: "/api/erp/auth/login?temp=1"
      }
    ],
    []
  );

  function changeLanguage(next: SupportedLanguage) {
    document.documentElement.lang = next;
    document.documentElement.dir = rtlLanguages.includes(next) ? "rtl" : "ltr";
    localStorage.setItem("erp_lang", next);
    document.cookie = `erp_lang=${encodeURIComponent(next)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }

  function fillDemoLogin(identifier: string, password: string, action: string) {
    const form = document.getElementById("erp-login-form") as HTMLFormElement | null;
    const identifierInput = document.getElementById("identifier") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;

    if (form) form.action = action;
    if (identifierInput) {
      identifierInput.value = identifier;
      identifierInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  return (
    <div className="space-y-5">
      {/* Use a Route Handler for login to avoid Server Actions Origin/forwarded-host issues in some environments. */}
      <form id="erp-login-form" method="post" action="/api/erp/auth/login" className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="identifier" className="text-sm font-semibold text-slate-700">
            {t(lang, "auth.user_id_or_email")}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              id="identifier"
              name="identifier"
              type="text"
              className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 shadow-none focus-visible:ring-primary"
              placeholder="Enter your user ID or email"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-semibold text-slate-700">
            {t(lang, "auth.password")}
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 pr-11 shadow-none focus-visible:ring-primary"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
            />
            <span>{t(lang, "auth.remember_me")}</span>
          </label>

          <Link href={"/auth/forgot-password" as Route} className="text-sm font-semibold text-primary hover:underline">
            {t(lang, "auth.forgot_password")}
          </Link>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t(lang, "auth.sign_in")} <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <UserRoundCheck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">Test Access</p>
              <p className="text-[11px] text-slate-500">Click to load ERP demo login.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          {demoAccounts.map((account) => (
            <button
              key={account.identifier}
              type="button"
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
              onClick={() => fillDemoLogin(account.identifier, account.password, account.action)}
            >
              <span>
                <span className="block text-xs font-bold text-slate-800">{account.label}</span>
                <span className="block text-[11px] text-slate-500">{account.scope}</span>
              </span>
              <span className="text-[11px] font-semibold text-primary">{account.identifier}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.22em] text-slate-400">
          <span className="bg-white px-3">{t(lang, "auth.or_continue_with")}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl border-slate-200 bg-white text-base font-semibold text-slate-800 hover:bg-slate-50"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white">
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303C33.927 32.659 29.336 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691 12.88 19.51C14.655 15.108 18.955 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.681 0-14.35 4.338-17.694 10.691Z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.312 0-9.892-3.317-11.279-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.07 12.07 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
            />
          </svg>
        </span>
        {t(lang, "auth.sign_in_google")}
      </Button>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t(lang, "auth.choose_theme")}</p>
          <TemplateColorPicker lang={lang} size="sm" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Globe2 className="h-4 w-4" aria-hidden />
            <span className="font-semibold">Language</span>
          </div>
          <select
            className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
            value={lang}
            onChange={(event) => changeLanguage(event.target.value as SupportedLanguage)}
            aria-label="Language"
          >
            {languageOptions.map((l) => (
              <option key={l.code} value={l.code}>
                {l.englishName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form method="post" action="/api/erp/auth/preview">
        <Button type="submit" variant="ghost" className="h-10 w-full rounded-xl text-sm text-slate-500 hover:bg-slate-50">
          Open Dashboard Template
        </Button>
      </form>
    </div>
  );
}
