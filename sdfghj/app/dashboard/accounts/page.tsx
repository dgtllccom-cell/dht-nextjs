import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AccountCreateForm } from "@/features/accounts/components/account-create-form";
import { AccountsTable } from "@/features/accounts/components/accounts-table";
import { Button } from "@/components/ui/button";

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts / Khaata</h1>
          <p className="text-sm text-muted-foreground">
            Company chart of accounts with branch-aware access and ledger posting controls.
          </p>
        </div>
        <Button asChild className="rounded-lg">
          <Link href="/dashboard/accounts/setup">
            <PlusCircle className="h-4 w-4" aria-hidden />
            New Account
          </Link>
        </Button>
      </div>
      <AccountCreateForm />
      <AccountsTable />
    </div>
  );
}
