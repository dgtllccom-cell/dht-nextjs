import { LoginForm } from "@/features/auth/components/login-form";
import { AuthTopControls } from "@/components/layout/auth-top-controls";
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
    <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[#06122d] px-10 py-8 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl font-black text-blue-700 shadow-lg">
                D
              </div>
              <div>
                <div className="text-xl font-black tracking-[0.22em]">DAMAAN</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.42em] text-blue-100">Business Group ERP</div>
              </div>
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-blue-50">
              Enterprise ERP / FMS
            </div>
          </div>

          <div className="relative z-10 mt-auto max-w-2xl pb-10">
            <div className="mb-5 inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-cyan-100">
              Secure Multi-Country Platform
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight">
              Accounting, branches, ledgers and reports in one control system.
            </h1>
            <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-slate-300">
              Login to manage country branches, city branches, accounts, roznamcha, ledger reports, purchase workflow, sales, stock, and permissions from the same ERP identity.
            </p>

            <div className="mt-9 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["5", "Languages"],
                ["24/7", "Audit Trail"],
                ["ERP", "RBAC Security"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-2xl">
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-xs font-semibold text-slate-300">
            <span>ACCOUNTS.DGT.LLC</span>
            <span>Super Admin Access Gateway</span>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="absolute right-6 top-5 z-20 rounded-full bg-slate-950/80 px-2 py-1 shadow-xl shadow-slate-300/40 backdrop-blur dark:bg-white/10 dark:shadow-black/30">
            <AuthTopControls lang={lang} />
          </div>

          <div className="w-full max-w-[470px]">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-700 text-lg font-black text-white shadow-lg">
                D
              </div>
              <div>
                <div className="text-lg font-black tracking-[0.22em] text-blue-700 dark:text-blue-300">DAMAAN</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-500">Business Group ERP</div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
              <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-7 dark:border-slate-800 dark:bg-slate-950/60 sm:p-8">
                <div className="mb-7">
                  <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
                    ERP Login Portal
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    {t(lang, "auth.welcome_back")}
                  </h1>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    {t(lang, "auth.sign_in_continue")}
                  </p>
                </div>

                {params.error ? (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                    {decodeURIComponent(params.error)}
                  </div>
                ) : null}

                <LoginForm lang={lang} />

                <div className="mt-7 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  &copy; 2026 DAMAAN BUSINESS GROUP
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
