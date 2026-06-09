import type { Route } from "next";
import { redirect } from "next/navigation";

export default function SalesConfirmRedirect() {
  redirect("/dashboard/sales" as Route);
}

