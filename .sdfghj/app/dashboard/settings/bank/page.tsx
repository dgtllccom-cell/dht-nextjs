import type { Route } from "next";
import { redirect } from "next/navigation";

export default function BankSettingsRedirect() {
  redirect("/dashboard/settings/management" as Route);
}

