import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";
import { CashEntryForm } from "@/features/roznamcha/components/cash-entry-form";

export default async function CashEntryPage() {
  const lang = await getRequestLanguage();

  return (
    <div className="relative left-1/2 w-full -translate-x-1/2 lg:w-[calc(100vw-15rem-3rem)]">
      <CashEntryForm
        lang={lang}
        pageTitle={t(lang, "nav.cash_entry")}
        scopeMode="auto"
        postingType="branch"
      />
    </div>
  );
}
