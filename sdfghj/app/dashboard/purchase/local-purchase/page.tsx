import type { Route } from "next";
import { redirect } from "next/navigation";

export default function LocalPurchaseRedirect() {
  redirect("/dashboard/purchases" as Route);
}

