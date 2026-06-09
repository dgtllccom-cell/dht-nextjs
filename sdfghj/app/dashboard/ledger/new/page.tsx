import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";

export default async function NewLedgerPage() {
  const lang = await getRequestLanguage();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "nav.new_ledger")}</h1>
        <p className="text-sm text-muted-foreground">{t(lang, "common.coming_soon")}</p>
      </div>
      <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">{t(lang, "common.coming_soon")}</section>
    </div>
  );
}

