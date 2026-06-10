import type { Route } from "next";
import { redirect } from "next/navigation";

export default function PurchaseConfirmRedirect() {
  redirect("/dashboard/purchases" as Route);
}

