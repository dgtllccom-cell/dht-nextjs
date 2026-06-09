import type { Route } from "next";
import { redirect } from "next/navigation";

export default function CompanySettingsRedirect() {
  redirect("/dashboard/settings/company-setup" as Route);
}

