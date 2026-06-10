import type { Route } from "next";
import { redirect } from "next/navigation";

export default function SalesOrderRedirect() {
  redirect("/dashboard/sales" as Route);
}

