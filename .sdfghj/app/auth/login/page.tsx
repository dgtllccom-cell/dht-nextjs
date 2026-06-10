import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";
import { AuthTopControls } from "@/components/layout/auth-top-controls";
import { LoginForm } from "@/features/auth/components/login-form";
import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const lang = await getRequestLanguage();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[480px_1fr]">
        {/* Left: Login */}
        <section className="relative flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,hsl(var(--primary)/0.12),transparent_44%),radial-gradient(circle_at_86%_24%,hsl(var(--accent)/0.10),transparent_48%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)))]" />

          <div className="w-full max-w-[440px] rounded-2xl border bg-card p-7 shadow-xl">
            <div className="mb-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#fbbf24,#d97706)] shadow-lg shadow-amber-500/20">
                    <span className="text-2xl font-black text-white">D</span>
                  </div>
                  <div>
                    <p className="text-2xl font-black tracking-wide">DAMAAN</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                      Business Group ERP
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h1 className="text-3xl font-extrabold tracking-tight">{t(lang, "auth.welcome_back")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t(lang, "auth.sign_in_continue")}</p>
              </div>
            </div>

            {params.error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
                {decodeURIComponent(params.error)}
              </div>
            ) : null}

            <LoginForm lang={lang} />

            <div className="mt-6 text-center text-xs text-muted-foreground">(c) 2026 DAMAAN BUSINESS GROUP</div>
          </div>
        </section>

        {/* Right: Premium Hero */}
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#120a2f] to-slate-950" />
          <div className="absolute inset-0 opacity-25">
            <Image src="/auth/login-reference-1.png" alt="" fill className="object-cover object-center" priority />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,hsl(var(--primary)/0.42),transparent_42%),radial-gradient(circle_at_82%_70%,hsl(var(--accent)/0.22),transparent_48%)]" />

          <div className="relative mx-auto flex h-full max-w-[980px] flex-col px-10 py-10 text-white">
            <div className="flex items-center justify-end">
              <AuthTopControls lang={lang} />
            </div>

            <div className="mt-8 max-w-[720px]">
              <p className="text-5xl font-black tracking-tight">ERP / FMS</p>
              <p className="mt-2 max-w-xl text-lg text-white/80">
                Enterprise Resource Planning
                <br />
                & Financial Management System
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {(
                  [
                    { label: "Smart", Icon: Sparkles },
                    { label: "Secure", Icon: ShieldCheck },
                    { label: "Scalable", Icon: TrendingUp },
                    { label: "Reliable", Icon: Star }
                  ] as Array<{ label: string; Icon: LucideIcon }>
                ).map(({ label, Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90"
                  >
                    <Icon className="h-4 w-4 text-white/85" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-10 grid flex-1 grid-cols-12 gap-6">
              {/* Main monitor */}
              <div className="group relative col-span-8 overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-2xl shadow-black/35 transition-transform duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/90">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 font-black">D</span>
                      <div>
                        <p className="text-sm font-bold">Dashboard</p>
                        <p className="text-xs text-white/65">Live ERP overview</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    </div>
                  </div>

                  <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                    <div className="relative aspect-[16/10]">
                      <Image
                        src="/auth/dashboard-reference-2.png"
                        alt=""
                        fill
                        className="object-cover object-left-top opacity-[0.96]"
                        priority
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tablet + phone previews */}
              <div className="col-span-4 flex flex-col gap-6">
                <div className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-xl shadow-black/30 transition-transform duration-300 hover:-translate-y-1">
                  <div className="relative p-5">
                    <p className="text-sm font-semibold text-white/90">Branch Snapshot</p>
                    <p className="mt-1 text-xs text-white/65">KPI cards and approvals</p>
                    <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                      <div className="relative aspect-[10/12]">
                        <Image src="/auth/dashboard-reference-2.png" alt="" fill className="object-cover object-top" priority />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-xl shadow-black/30 transition-transform duration-300 hover:-translate-y-1">
                  <div className="relative p-5">
                    <p className="text-sm font-semibold text-white/90">Mobile Ready</p>
                    <p className="mt-1 text-xs text-white/65">Fast entry, clean reports</p>
                    <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                      <div className="relative aspect-[9/16]">
                        <Image src="/auth/dashboard-reference-2.png" alt="" fill className="object-cover object-right-top" priority />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between text-white/70">
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/50" aria-hidden />
                  Multi Language Support
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/50" aria-hidden />
                  RTL Ready
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/50" aria-hidden />
                  Modular ERP
                </span>
              </div>

              <div className="hidden items-center gap-2 text-xs xl:flex">
                <span className="opacity-70">Connected</span>
                <span className="font-semibold">Supabase</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

