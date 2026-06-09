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
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] h-80 w-80 rounded-full bg-primary/10 blur-[80px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-80 w-80 rounded-full bg-primary/5 blur-[80px]" />

      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl relative z-10">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white font-black text-xl shadow-lg shadow-primary/20 mb-4 select-none">
            D
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {t(lang, "auth.welcome_back")}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t(lang, "auth.sign_in_continue")}
          </p>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-950/20 dark:text-red-300 shadow-sm">
            {decodeURIComponent(params.error)}
          </div>
        ) : null}

        <LoginForm lang={lang} />

        <div className="mt-8 text-center text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          &copy; 2026 DAMAAN BUSINESS GROUP
        </div>
      </div>
    </main>
  );
}


