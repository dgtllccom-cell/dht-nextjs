import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";
import { SuperAdminRoznamchaReportView } from "@/features/roznamcha/components/super-admin-roznamcha-report-view";

export default async function SuperAdminRoznamchaPage() {
  const lang = await getRequestLanguage();
  return (
    <SuperAdminRoznamchaReportView
      lang={lang}
      pageTitle={t(lang, "nav.super_admin_roznamcha")}
      typeFilter="super_admin"
    />
  );
}
