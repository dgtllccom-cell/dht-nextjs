"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Globe,
  Landmark,
  Minus,
  Plus,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LocationHierarchySelect,
  type LocationHierarchyMeta,
  type LocationHierarchyValue
} from "@/features/locations/components/location-hierarchy-select";
import { createBank, type BankRecord } from "@/features/banks/bank-api";

const BANK_TYPES = [
  "Commercial Bank",
  "Islamic Bank",
  "Central Bank",
  "Investment Bank",
  "Microfinance Bank",
  "Development Bank",
  "Cooperative Bank",
  "Foreign Bank Branch",
  "Exchange Company",
  "Mobile Money Operator"
];

const ACCOUNT_TYPES = [
  "Current Account",
  "Savings Account",
  "Fixed Deposit",
  "Loan Account",
  "Trade Finance Account",
  "USD Account",
  "Multi-Currency Account",
  "Payroll Account"
];

const BRANCH_CODE_TYPES = [
  "SWIFT Code",
  "Routing Number",
  "IFSC Code",
  "Sort Code",
  "BSB Number",
  "Branch Code",
  "IBAN Prefix"
];

const CURRENCIES = [
  "USD", "PKR", "AED", "AFN", "EUR", "GBP", "SAR", "INR",
  "CNY", "TRY", "IRR", "OMR", "KWD", "QAR", "BHD"
];

const STATUS_OPTIONS = ["Active", "Inactive", "Frozen", "Closed"];

type BankFormState = {
  bankType: string;
  accountType: string;
  bankName: string;
  branchName: string;
  branchCodeType: string;
  branchCode: string;
  shortName: string;
  accountTitle: string;
  accountNumber: string;
  ibanNumber: string;
  currency: string;
  accountStatus: string;
  countryId: string;
  stateProvinceId: string;
  cityId: string;
  fullAddress: string;
  phone: string;
  email: string;
  swiftBic: string;
  website: string;
  remarks: string;
};

const emptyForm: BankFormState = {
  bankType: "",
  accountType: "",
  bankName: "",
  branchName: "",
  branchCodeType: "SWIFT Code",
  branchCode: "",
  shortName: "",
  accountTitle: "",
  accountNumber: "",
  ibanNumber: "",
  currency: "USD",
  accountStatus: "Active",
  countryId: "",
  stateProvinceId: "",
  cityId: "",
  fullAddress: "",
  phone: "",
  email: "",
  swiftBic: "",
  website: "",
  remarks: ""
};

export type BankFormProps = {
  /** "standalone" = full settings page, "embedded" = inside a modal from BankPicker */
  mode?: "standalone" | "embedded";
  initialBankId?: string;
  onSave?: (bankId: string, bank: BankRecord) => void;
  onCancel?: () => void;
};

export function BankForm({
  mode = "standalone",
  onSave,
  onCancel
}: BankFormProps) {
  const [form, setForm] = useState<BankFormState>(emptyForm);
  const [location, setLocation] = useState<LocationHierarchyValue>({
    countryId: "",
    stateProvinceId: "",
    cityId: ""
  });
  const [saving, setSaving] = useState(false);
  const [savedBank, setSavedBank] = useState<BankRecord | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function set(field: keyof BankFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLocationChange(next: LocationHierarchyValue, _meta: LocationHierarchyMeta) {
    setLocation(next);
    setForm((prev) => ({
      ...prev,
      countryId: next.countryId,
      stateProvinceId: next.stateProvinceId,
      cityId: next.cityId
    }));
  }

  const isReady =
    form.bankType &&
    form.accountType &&
    form.bankName &&
    form.branchName &&
    form.branchCode &&
    form.shortName &&
    form.accountTitle &&
    form.accountNumber &&
    form.currency;

  async function handleSave() {
    if (!isReady) {
      setMessage({ type: "error", text: "Please fill all required fields marked with *" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const bankId = await createBank({
        bankType: form.bankType,
        accountType: form.accountType,
        bankName: form.bankName,
        branchName: form.branchName,
        branchCode: form.branchCode,
        branchCodeType: form.branchCodeType,
        shortName: form.shortName,
        accountTitle: form.accountTitle,
        accountNumber: form.accountNumber,
        ibanNumber: form.ibanNumber || null,
        currency: form.currency,
        accountStatus: form.accountStatus,
        countryId: form.countryId || null,
        stateProvinceId: form.stateProvinceId || null,
        cityId: form.cityId || null,
        fullAddress: form.fullAddress || null,
        phone: form.phone || null,
        email: form.email || null,
        swiftBic: form.swiftBic || null,
        website: form.website || null,
        remarks: form.remarks || null
      });

      const saved: BankRecord = {
        id: bankId,
        bank_type: form.bankType,
        account_type: form.accountType,
        bank_name: form.bankName,
        branch_name: form.branchName,
        branch_code: form.branchCode,
        branch_code_type: form.branchCodeType,
        short_name: form.shortName,
        account_title: form.accountTitle,
        account_number: form.accountNumber,
        iban_number: form.ibanNumber || null,
        currency: form.currency,
        account_status: form.accountStatus,
        country_id: form.countryId || null,
        state_province_id: form.stateProvinceId || null,
        city_id: form.cityId || null,
        full_address: form.fullAddress || null,
        phone: form.phone || null,
        email: form.email || null,
        swift_bic: form.swiftBic || null,
        website: form.website || null,
        remarks: form.remarks || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSavedBank(saved);
      setMessage({ type: "success", text: `Bank "${form.bankName}" saved successfully!` });
      onSave?.(bankId, saved);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message ?? "Failed to save bank." });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(emptyForm);
    setLocation({ countryId: "", stateProvinceId: "", cityId: "" });
    setSavedBank(null);
    setMessage(null);
  }

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className={mode === "standalone" ? "space-y-6" : "space-y-4"}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Landmark className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {mode === "standalone" ? "Settings / Master Forms" : "Bank Master Form"}
            </p>
            <h1 className={mode === "standalone" ? "mt-0.5 text-2xl font-bold tracking-tight" : "text-lg font-bold"}>
              Bank Master Form
            </h1>
            {mode === "standalone" && (
              <p className="text-sm text-muted-foreground">
                Create and manage bank information for personal or business use
              </p>
            )}
          </div>
        </div>
        <span
          className={
            isReady
              ? "inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"
              : "inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200"
          }
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {isReady ? "Ready to Save" : "Draft"}
        </span>
      </div>

      <div className={mode === "standalone" ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]" : "space-y-5"}>
        <div className="space-y-6">

          {/* Section 1: Bank Information */}
          <section className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-3">
              <Landmark className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Bank Information</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Bank Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bank Type *</Label>
                <select value={form.bankType} onChange={(e) => set("bankType", e.target.value)} className={selectClass}>
                  <option value="">Select Bank Type</option>
                  {BANK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Account Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Type *</Label>
                <select value={form.accountType} onChange={(e) => set("accountType", e.target.value)} className={selectClass}>
                  <option value="">Select Account Type</option>
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Bank Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bank Name *</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>
            </div>

            {/* Branch Name + Branch Code */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Name / SWIFT Name *</Label>
                <Input
                  value={form.branchName}
                  onChange={(e) => set("branchName", e.target.value)}
                  placeholder="Enter branch name / SWIFT name"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Code / Branch Number *</Label>
                <div className="flex gap-1.5">
                  <select
                    value={form.branchCodeType}
                    onChange={(e) => set("branchCodeType", e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
                  >
                    {BRANCH_CODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Input
                    value={form.branchCode}
                    onChange={(e) => set("branchCode", e.target.value)}
                    placeholder="Enter code / number"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Short Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Short Name / Code *</Label>
                <Input
                  value={form.shortName}
                  onChange={(e) => set("shortName", e.target.value)}
                  placeholder="e.g. SCB, HBL, UBL"
                  maxLength={20}
                />
                <p className="text-[10px] text-muted-foreground">Short code for bank</p>
              </div>
            </div>

            {/* Account Title + Account Number */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Title / Name *</Label>
                <Input
                  value={form.accountTitle}
                  onChange={(e) => set("accountTitle", e.target.value)}
                  placeholder="Enter account title / name"
                />
                <p className="text-[10px] text-muted-foreground">Account holder name (Personal or Company)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Number *</Label>
                <Input
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                  placeholder="Enter account number"
                  className="font-mono text-lg h-14 tracking-widest"
                />
              </div>
            </div>

            {/* IBAN */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">IBAN Number (Optional)</Label>
              <Input
                value={form.ibanNumber}
                onChange={(e) => set("ibanNumber", e.target.value)}
                placeholder="Enter IBAN number"
                maxLength={34}
                className="font-mono"
              />
            </div>

            {/* Currency + Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Currency of Account *</Label>
                <div className="flex gap-3">
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                    className={selectClass}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 shrink-0">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {form.currency ? form.currency.charAt(0) : "$"}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-primary">
                        {form.currency || "Not selected"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Currency Selected</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Status *</Label>
                <select
                  value={form.accountStatus}
                  onChange={(e) => set("accountStatus", e.target.value)}
                  className={selectClass}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Contact & Address */}
          <section className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-3">
              <Globe className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Contact & Address Information</h2>
            </div>

            <LocationHierarchySelect
              value={location}
              onChange={handleLocationChange}
              showArea={false}
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Address</Label>
              <Input
                value={form.fullAddress}
                onChange={(e) => set("fullAddress", e.target.value)}
                placeholder="Enter full address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="Enter phone number (optional)"
                  type="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Enter email address (optional)"
                  type="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SWIFT / BIC Code (Optional)</Label>
                <Input
                  value={form.swiftBic}
                  onChange={(e) => set("swiftBic", e.target.value)}
                  placeholder="Enter SWIFT / BIC code"
                  className="font-mono uppercase"
                  maxLength={11}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Website (Optional)</Label>
                <Input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="Enter website"
                  type="url"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks (Optional)</Label>
              <textarea
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                placeholder="Enter any additional remarks"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className={
                  message.type === "success"
                    ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                    : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                }
              >
                {message.text}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel ?? handleReset}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !isReady}
                className="gap-2"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving ? "Saving..." : "Save Bank"}
              </Button>
            </div>
          </section>
        </div>

        {/* Right Panel: Bank Summary Preview */}
        <aside className="h-fit rounded-lg border bg-card p-5 shadow-sm xl:sticky xl:top-24">
          <div className="flex items-center gap-2 border-b pb-3 mb-4">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-semibold text-sm">Bank Summary</h2>
          </div>

          {savedBank ? (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-emerald-700 font-semibold text-xs">Saved Successfully</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bank Name</p>
                <p className="font-bold text-sm mt-0.5">{savedBank.bank_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Account Title</p>
                <p className="font-semibold mt-0.5">{savedBank.account_title}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Account Number</p>
                <p className="font-mono font-bold mt-0.5">{savedBank.account_number}</p>
              </div>
              {savedBank.iban_number && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">IBAN</p>
                  <p className="font-mono mt-0.5 break-all">{savedBank.iban_number}</p>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-bold font-mono">{savedBank.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-semibold">{savedBank.branch_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-bold ${savedBank.account_status === "Active" ? "text-emerald-600" : "text-amber-600"}`}>
                  {savedBank.account_status}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs mt-2"
                onClick={handleReset}
              >
                + Add Another Bank
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <div className="mb-3 rounded-lg border-2 border-dashed border-border p-6">
                <Landmark className="h-8 w-8 mx-auto text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold">Select or save a bank</p>
              <p className="text-xs mt-1">Bank details will appear here</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
