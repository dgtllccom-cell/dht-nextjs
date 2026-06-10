import type { Route } from "next";
import { redirect } from "next/navigation";

export default function LocationSettingsRedirect() {
  redirect("/dashboard/settings/location-setup" as Route);
}

