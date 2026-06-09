"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Hash,
  Landmark,
  Save,
  UserRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BranchType = "Main" | "City";
type AccountTitle = "Customer" | "Bank" | "Employee";

type BranchInfo = {
  company: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  opening: string;
  currency: string;
};

type SavedEntry = {
  id: string;
  journalCode: string;
  accountCode: string;
  accountName: string;
  branchName: string;
  branchCode: string;
  savedAt: string;
};

const branchData: Record<string, Record<BranchType, string[]>> = {
  Pakistan: {
    Main: ["Pakistan Main Branch", "Karachi Main Branch", "Lahore Main Branch"],
    City: ["Quetta City Branch", "Chaman City Branch", "Faisalabad City Branch"]
  },
  Bangladesh: {
    Main: ["Bangladesh Main Branch", "Dhaka Main Branch"],
    City: ["Chittagong City Branch", "Sylhet City Branch"]
  },
  UAE: {
    Main: ["UAE Main Branch", "Dubai Main Branch"],
    City: ["Sharjah City Branch", "Abu Dhabi City Branch"]
  },
  Afghanistan: {
    Main: ["Afghanistan Main Branch", "Kabul Main Branch"],
    City: ["Herat City Branch", "Mazar City Branch"]
  },
  Iran: {
    Main: ["Iran Main Branch", "Tehran Main Branch"],
    City: ["Mashhad City Branch"]
  }
};

const branchDetails: Record<string, BranchInfo> = {
  "Pakistan|Main|Pakistan Main Branch": {
    company: "Damaan Pakistan Pvt Ltd",
    code: "PK-MAIN-001",
    city: "Karachi",
    address: "I.I. Chundrigar Road, Karachi",
    phone: "+92 21 111 222 333",
    email: "pakistan.main@damaan.test",
    manager: "Ali Khan",
    opening: "2012-03-01",
    currency: "PKR"
  },
  "Pakistan|City|Quetta City Branch": {
    company: "Damaan Pakistan Pvt Ltd",
    code: "PK-CITY-101",
    city: "Quetta",
    address: "Zarghoon Road, Quetta",
    phone: "+92 81 123 4567",
    email: "quetta.city@damaan.test",
    manager: "Sana Baloch",
    opening: "2016-07-15",
    currency: "PKR"
  },
  "Bangladesh|Main|Bangladesh Main Branch": {
    company: "Damaan Bangladesh Ltd",
    code: "BD-MAIN-001",
    city: "Dhaka",
    address: "Motijheel Commercial Area, Dhaka",
    phone: "+880 2 0000 0000",
    email: "bangladesh.main@damaan.test",
    manager: "Rahman Ahmed",
    opening: "2018-02-10",
    currency: "BDT"
  },
  "UAE|Main|UAE Main Branch": {
    company: "Damaan UAE LLC",
    code: "AE-MAIN-001",
    city: "Dubai",
    address: "Business Bay, Dubai",
    phone: "+971 4 000 0000",
    email: "uae.main@damaan.test",
    manager: "Omar Saeed",
    opening: "2021-01-08",
    currency: "AED"
  },
  "Afghanistan|Main|Afghanistan Main Branch": {
    company: "Damaan Afghanistan Ltd",
    code: "AF-MAIN-001",
    city: "Kabul",
    address: "Shahr-e-Naw, Kabul",
    phone: "+93 20 555 1212",
    email: "afghanistan.main@damaan.test",
    manager: "Ahmad Rahimi",
    opening: "2014-04-10",
    currency: "AFN"
  }
};

const subTypes: Record<AccountTitle, string[]> = {
  Customer: ["Company Account", "Business Account", "Personal Account"],
  Bank: ["Company Bank Account", "Branch Bank Account", "Cash Control Account"],
  Employee: ["Employee Position: Manager", "Employee Position: Cashier", "Employee Position: Clerk"]
};

const categories = ["Expenses", "Purchase", "Sales", "Revenue"];

function deriveBranchInfo(country: string, branchType: BranchType, branch: string): BranchInfo {
  const city = branch.split(" ")[0] || "-";
  const prefix =
    country === "UAE" ? "AE" : country === "Bangladesh" ? "BD" : country.slice(0, 2).toUpperCase();
  const branchKind = branchType === "Main" ? "MAIN" : "CITY";

  return {
    company: `Damaan ${country} Ltd`,
    code: `${prefix}-${branchKind}-${String(branch.length).padStart(3, "0")}`,
    city,
    address: `${city} Central Road`,
    phone: "+00 000 000 000",
    email: `${city.toLowerCase()}.${branchType.toLowerCase()}@damaan.test`,
    manager: "-",
    opening: "-",
    currency:
      country === "Pakistan"
        ? "PKR"
        : country === "Bangladesh"
          ? "BDT"
          : country === "UAE"
            ? "AED"
            : country === "Afghanistan"
              ? "AFN"
              : country === "Iran"
                ? "IRR"
                : "-"
  };
}

function nextNumber(current: number) {
  return String(current + 1).padStart(3, "0");
}

function selectClass() {
  return "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
}

function StatusBadge({ ready, saved }: { ready: boolean; saved: boolean }) {
  if (saved) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Entry saved
      </span>
    );
  }

  return (
    <span
      className={
        ready
          ? "inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
          : "inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
      }
    >
      {ready ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <AlertCircle className="h-4 w-4" aria-hidden />}
      {ready ? "Ready to save" : "Draft entry"}
    </span>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  const blank = !value || value === "-";

  return (
    <div className="grid grid-cols-[132px_1fr] gap-3 text-sm">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={blank ? "font-semibold text-slate-400" : "font-semibold text-slate-950"}>
        {value || "-"}
      </span>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={done ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-slate-300"} aria-hidden />
      <span className={done ? "font-medium text-slate-900" : "text-slate-500"}>{label}</span>
    </div>
  );
}

export function NewAccountSetup() {
  const [country, setCountry] = useState("");
  const [branchType, setBranchType] = useState<BranchType | "">("");
  const [branch, setBranch] = useState("");
  const [accountTitle, setAccountTitle] = useState<AccountTitle | "">("");
  const [subType, setSubType] = useState("");
  const [category, setCategory] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [journalCounter, setJournalCounter] = useState(0);
  const [accountCounters, setAccountCounters] = useState<Record<string, number>>({});
  const [lastBranchCode, setLastBranchCode] = useState("");
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [message, setMessage] = useState("");

  const branchOptions = country && branchType ? branchData[country]?.[branchType] ?? [] : [];

  const branchInfo = useMemo(() => {
    if (!country || !branchType || !branch) return null;
    const key = `${country}|${branchType}|${branch}`;
    return branchDetails[key] ?? deriveBranchInfo(country, branchType, branch);
  }, [branch, branchType, country]);

  const journalPreview = `SUPER-${nextNumber(journalCounter)}`;
  const branchCode = branchInfo?.code ?? "";
  const accountPreview = accountCode || (branchCode ? nextNumber(accountCounters[branchCode] ?? 0) : "");
  const readyToSave = Boolean(
    country && branchType && branch && accountTitle && subType && category && accountPreview && accountName
  );
  const saved = message.startsWith("Saved");

  useEffect(() => {
    if (!branchCode || branchCode === lastBranchCode) return;
    setLastBranchCode(branchCode);
    if (!accountCode) {
      setAccountCode(nextNumber(accountCounters[branchCode] ?? 0));
    }
  }, [accountCode, accountCounters, branchCode, lastBranchCode]);

  function handleCountryChange(value: string) {
    setCountry(value);
    setBranchType("");
    setBranch("");
    setLastBranchCode("");
    setMessage("");
  }

  function handleBranchTypeChange(value: BranchType) {
    setBranchType(value);
    setBranch("");
    setLastBranchCode("");
    setMessage("");
  }

  function saveEntry() {
    if (!readyToSave || !branchInfo || !accountTitle || !branchType) {
      setMessage("Complete branch and account fields first.");
      return;
    }

    const issuedJournal = `SUPER-${nextNumber(journalCounter)}`;
    const issuedAccountCode = accountPreview;
    const numericAccount = Number.parseInt(issuedAccountCode, 10);

    setJournalCounter((current) => current + 1);
    setAccountCounters((current) => ({
      ...current,
      [branchInfo.code]: Number.isFinite(numericAccount)
        ? Math.max(current[branchInfo.code] ?? 0, numericAccount)
        : current[branchInfo.code] ?? 0
    }));
    setSavedEntries((current) => [
      {
        id: `${issuedJournal}-${issuedAccountCode}`,
        journalCode: issuedJournal,
        accountCode: issuedAccountCode,
        accountName,
        branchName: branch,
        branchCode: branchInfo.code,
        savedAt: new Date().toLocaleTimeString()
      },
      ...current
    ]);
    setMessage(`Saved demo entry. Journal ${issuedJournal}, Account ${issuedAccountCode}.`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Template</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">New Account</h1>
          <p className="text-sm text-muted-foreground">
            Branch select karein, account details enter karein, report live update hogi.
          </p>
        </div>
        <StatusBadge ready={readyToSave} saved={saved} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-semibold">Step 1 - Branch Selection</h2>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select id="country" value={country} onChange={(event) => handleCountryChange(event.target.value)} className={selectClass()}>
                  <option value="">Select Country</option>
                  {Object.keys(branchData).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchType">Branch Type</Label>
                <select
                  id="branchType"
                  value={branchType}
                  onChange={(event) => handleBranchTypeChange(event.target.value as BranchType)}
                  disabled={!country}
                  className={selectClass()}
                >
                  <option value="">Select Branch Type</option>
                  <option value="Main">Main Branch</option>
                  <option value="City">City Branch</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Select Branch</Label>
                <select
                  id="branch"
                  value={branch}
                  onChange={(event) => {
                    setBranch(event.target.value);
                    setMessage("");
                  }}
                  disabled={!country || !branchType}
                  className={selectClass()}
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t pt-5">
              <div className="mb-4 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-semibold">Step 2 - Account Entry</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="accountTitle">Account Title</Label>
                  <select
                    id="accountTitle"
                    value={accountTitle}
                    onChange={(event) => {
                      setAccountTitle(event.target.value as AccountTitle);
                      setSubType("");
                      setMessage("");
                    }}
                    className={selectClass()}
                  >
                    <option value="">Select Account Title</option>
                    <option value="Customer">Customer</option>
                    <option value="Bank">Bank</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subType">Sub Type</Label>
                  <select
                    id="subType"
                    value={subType}
                    onChange={(event) => {
                      setSubType(event.target.value);
                      setMessage("");
                    }}
                    disabled={!accountTitle}
                    className={selectClass()}
                  >
                    <option value="">Select Sub Type</option>
                    {accountTitle
                      ? subTypes[accountTitle].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))
                      : null}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setMessage("");
                    }}
                    className={selectClass()}
                  >
                    <option value="">Select Category</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="accountCode">Account Code (Auto)</Label>
                  <Input
                    id="accountCode"
                    value={accountCode}
                    readOnly
                    aria-readonly="true"
                    placeholder="Auto generated from selected branch"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Account code branch/country sequence se auto issue hota hai. User manual code enter nahi karega.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(event) => {
                      setAccountName(event.target.value);
                      setMessage("");
                    }}
                    placeholder="e.g. Sales Account"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Demo save journal aur account code ko next number par le jata hai.
                </p>
                <Button type="button" onClick={saveEntry} className="rounded-lg">
                  <Save className="h-4 w-4" aria-hidden />
                  Save Entry
                </Button>
              </div>

              {message ? (
                <div
                  className={
                    saved
                      ? "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                      : "mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
                  }
                >
                  {message}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-lg border bg-card xl:sticky xl:top-24">
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-semibold">New Account Report</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Yahan har selected field live show hoti hai.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="rounded-lg border bg-white p-3">
              <p className="text-xs font-medium text-slate-500">Full Branch Header</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">
                {branchInfo
                  ? `${branchInfo.company} - ${branchInfo.code} - ${country} - ${branchInfo.city} - ${branchType} - ${branch}`
                  : "- - - - - -"}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Building2 className="h-4 w-4 text-primary" aria-hidden />
                Branch Details
              </h3>
              <ReportRow label="Company" value={branchInfo?.company ?? "-"} />
              <ReportRow label="Branch Code" value={branchInfo?.code ?? "-"} />
              <ReportRow label="Country" value={country || "-"} />
              <ReportRow label="City" value={branchInfo?.city ?? "-"} />
              <ReportRow label="Branch Type" value={branchType || "-"} />
              <ReportRow label="Branch Name" value={branch || "-"} />
              <ReportRow label="Address" value={branchInfo?.address ?? "-"} />
              <ReportRow label="Phone" value={branchInfo?.phone ?? "-"} />
              <ReportRow label="Email" value={branchInfo?.email ?? "-"} />
              <ReportRow label="Manager" value={branchInfo?.manager ?? "-"} />
              <ReportRow label="Opening Date" value={branchInfo?.opening ?? "-"} />
              <ReportRow label="Currency" value={branchInfo?.currency ?? "-"} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Landmark className="h-4 w-4 text-primary" aria-hidden />
                Account Details
              </h3>
              <ReportRow label="Account Title" value={accountTitle || "-"} />
              <ReportRow label="Sub Type" value={subType || "-"} />
              <ReportRow label="Category" value={category || "-"} />
              <ReportRow label="Account Code" value={accountPreview || "-"} />
              <ReportRow label="Account Name" value={accountName || "-"} />
              <ReportRow label="Journal Preview" value={journalPreview} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Hash className="h-4 w-4 text-primary" aria-hidden />
                Entry Check
              </h3>
              <ChecklistItem done={Boolean(country)} label="Country selected" />
              <ChecklistItem done={Boolean(branchType)} label="Branch type selected" />
              <ChecklistItem done={Boolean(branch)} label="Branch selected" />
              <ChecklistItem done={Boolean(accountTitle)} label="Account title selected" />
              <ChecklistItem done={Boolean(subType)} label="Sub type selected" />
              <ChecklistItem done={Boolean(category)} label="Category selected" />
              <ChecklistItem done={Boolean(accountPreview)} label="Account code ready" />
              <ChecklistItem done={Boolean(accountName)} label="Account name entered" />
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <UserRound className="h-4 w-4 text-primary" aria-hidden />
                Saved Demo Entries
              </h3>
              {savedEntries.length ? (
                <div className="space-y-2">
                  {savedEntries.slice(0, 4).map((entry) => (
                    <div key={entry.id} className="rounded-lg border bg-white p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-950">{entry.accountName}</span>
                        <span className="text-slate-500">{entry.savedAt}</span>
                      </div>
                      <p className="mt-1 text-slate-600">
                        {entry.accountCode} - {entry.journalCode}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {entry.branchName} ({entry.branchCode})
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed bg-white p-3 text-sm text-slate-500">
                  No entry has been saved yet. Saved account entries will show here.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
