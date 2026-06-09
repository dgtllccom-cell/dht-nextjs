"use client";

import { useState } from "react";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { SuperAdminRoznamchaReportView } from "@/features/roznamcha/components/super-admin-roznamcha-report-view";
import type { RoznamchaType } from "@/features/roznamcha/roznamcha-api";

export function AllRoznamchaReportView({
  lang
}: {
  lang: SupportedLanguage;
}) {
  const [typeFilter, setTypeFilter] = useState<RoznamchaType>("super_admin");
  const activeTitle =
    typeFilter === "super_admin"
      ? "Super Admin Roznamcha Report"
      : typeFilter === "country"
        ? "Country Roznamcha Report"
        : "City Roznamcha Report";

  return (
    <SuperAdminRoznamchaReportView
      lang={lang}
      pageTitle={activeTitle}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
    />
  );
}
