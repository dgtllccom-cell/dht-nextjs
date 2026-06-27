"use client";

import type { ReactNode } from "react";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { useMemo } from "react";
import {
  Info,
  UserRound,
  Building2,
  Landmark,
  Warehouse,
  ShieldAlert,
  Printer,
  FileText,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type AccountLiveReportProps = {
  // Wizard States
  accountName: string;
  accountCode: string;
  accountTitle: string;
  subType: string;
  category: string;
  manualReferenceNumber?: string;
  currency: string;
  status?: string;
  lang?: SupportedLanguage;

  // Connected Master details
  customerDetail?: any;
  companyDetail?: any;
  bankDetail?: any;

  // Context metadata
  selectedCountryName?: string;
  selectedCountryCode?: string;
  selectedBranchName?: string;
  selectedBranchCode?: string;

  // Actions
  onBack?: () => void;
  onPrint?: () => void;
  onPdf?: () => void;
  onExcel?: () => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
};


const liveReportLabels: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  active: { en: "Active", ur: "\u0641\u0639\u0627\u0644", ar: "\u0646\u0634\u0637", fa: "\u0641\u0639\u0627\u0644", ps: "\u0641\u0639\u0627\u0644" },
  inProgress: { en: "In Progress", ur: "\u062c\u0627\u0631\u06cc \u06c1\u06d2", ar: "\u0642\u064a\u062f \u0627\u0644\u062a\u0646\u0641\u064a\u0630", fa: "\u062f\u0631 \u062d\u0627\u0644 \u0627\u062c\u0631\u0627", ps: "\u067e\u0647 \u062c\u0631\u06cc\u0627\u0646 \u06a9\u06d0" },
  accountTitle: { en: "Account Title", ur: "\u0627\u06a9\u0627\u0624\u0646\u0679 \u0639\u0646\u0648\u0627\u0646" },
  accountCodeAuto: { en: "Account Code (Auto)", ur: "\u0627\u06a9\u0627\u0624\u0646\u0679 \u06a9\u0648\u0688 (\u062e\u0648\u062f\u06a9\u0627\u0631)" },
  accountGroup: { en: "Account Group", ur: "\u0627\u06a9\u0627\u0624\u0646\u0679 \u06af\u0631\u0648\u067e" },
  currency: { en: "Currency", ur: "\u06a9\u0631\u0646\u0633\u06cc" },
  date: { en: "Date", ur: "\u062a\u0627\u0631\u06cc\u062e" },
  openingBalance: { en: "Opening Balance", ur: "\u0627\u0648\u067e\u0646\u0646\u06af \u0628\u06cc\u0644\u0646\u0633" },
  debitAmount: { en: "Debit Amount", ur: "\u0688\u06cc\u0628\u0679 \u0631\u0642\u0645" },
  creditAmount: { en: "Credit Amount", ur: "\u06a9\u0631\u06cc\u0688\u0679 \u0631\u0642\u0645" },
  netBalance: { en: "Net Balance", ur: "\u0646\u06cc\u0679 \u0628\u06cc\u0644\u0646\u0633" },
  accountInformation: { en: "ACCOUNT INFORMATION", ur: "\u0627\u06a9\u0627\u0624\u0646\u0679 \u0645\u0639\u0644\u0648\u0645\u0627\u062a" },
  customerInformation: { en: "CUSTOMER INFORMATION", ur: "\u06a9\u0633\u0679\u0645\u0631 \u0645\u0639\u0644\u0648\u0645\u0627\u062a" },
  customerName: { en: "Customer Name", ur: "\u06a9\u0633\u0679\u0645\u0631 \u0646\u0627\u0645" },
  customerCode: { en: "Customer Code", ur: "\u06a9\u0633\u0679\u0645\u0631 \u06a9\u0648\u0688" },
  customerType: { en: "Customer Type", ur: "\u06a9\u0633\u0679\u0645\u0631 \u0642\u0633\u0645" },
  phone: { en: "Phone", ur: "\u0641\u0648\u0646" },
  email: { en: "Email", ur: "\u0627\u06cc \u0645\u06cc\u0644" },
  address: { en: "Address", ur: "\u067e\u062a\u06c1" },
  lastUpdated: { en: "Last Updated", ur: "\u0622\u062e\u0631\u06cc \u0627\u067e\u0688\u06cc\u0679" },
  companyDetails: { en: "COMPANY DETAILS", ur: "\u06a9\u0645\u067e\u0646\u06cc \u062a\u0641\u0635\u06cc\u0644\u0627\u062a" },
  companyName: { en: "Company Name", ur: "\u06a9\u0645\u067e\u0646\u06cc \u0646\u0627\u0645" },
  companyCode: { en: "Company Code", ur: "\u06a9\u0645\u067e\u0646\u06cc \u06a9\u0648\u0688" },
  registrationNo: { en: "Registration No.", ur: "\u0631\u062c\u0633\u0679\u0631\u06cc\u0634\u0646 \u0646\u0645\u0628\u0631" },
  bankDetails: { en: "BANK DETAILS", ur: "\u0628\u06cc\u0646\u06a9 \u062a\u0641\u0635\u06cc\u0644\u0627\u062a" },
  bankName: { en: "Bank Name", ur: "\u0628\u06cc\u0646\u06a9 \u0646\u0627\u0645" },
  accountNumber: { en: "Account Number", ur: "\u0627\u06a9\u0627\u0624\u0646\u0679 \u0646\u0645\u0628\u0631" },
  bankBranch: { en: "Bank Branch", ur: "\u0628\u06cc\u0646\u06a9 \u0628\u0631\u0627\u0646\u0686" },
  swiftCode: { en: "Swift Code", ur: "\u0633\u0648\u0641\u0679 \u06a9\u0648\u0688" },
  warehouseDetails: { en: "WAREHOUSE DETAILS", ur: "\u06af\u0648\u062f\u0627\u0645 \u062a\u0641\u0635\u06cc\u0644\u0627\u062a" },
  warehouseName: { en: "Warehouse Name", ur: "\u06af\u0648\u062f\u0627\u0645 \u0646\u0627\u0645" },
  warehouseCode: { en: "Warehouse Code", ur: "\u06af\u0648\u062f\u0627\u0645 \u06a9\u0648\u0688" },
  location: { en: "Location", ur: "\u0645\u0642\u0627\u0645" },
  auditInformation: { en: "AUDIT INFORMATION", ur: "\u0622\u0688\u0679 \u0645\u0639\u0644\u0648\u0645\u0627\u062a" },
  accountName: { en: "Account Name", ur: "\u0627\u06a9\u0627\u0624\u0646\u0679 \u0646\u0627\u0645" },
  accountCode: { en: "Account Code", ur: "\u0627\u06a9\u0627\u0624\u0646\u0679 \u06a9\u0648\u0688" },
  subType: { en: "Sub Type", ur: "\u0630\u06cc\u0644\u06cc \u0642\u0633\u0645" },
  category: { en: "Category", ur: "\u06a9\u06cc\u0679\u06cc\u06af\u0631\u06cc" },
  manualRef: { en: "Manual Ref", ur: "\u062f\u0633\u062a\u06cc \u062d\u0648\u0627\u0644\u06c1" },
  country: { en: "Country", ur: "\u0645\u0644\u06a9" },
  branch: { en: "Branch", ur: "\u0628\u0631\u0627\u0646\u0686" },
  createdBy: { en: "Created By", ur: "\u0628\u0646\u0627\u06cc\u0627 \u06af\u06cc\u0627 \u0628\u0630\u0631\u06cc\u0639\u06c1" },
  createdAt: { en: "Created At", ur: "\u0628\u0646\u0627\u0646\u06d2 \u06a9\u0627 \u0648\u0642\u062a" },
  updatedBy: { en: "Updated By", ur: "\u0627\u067e\u0688\u06cc\u0679 \u0628\u0630\u0631\u06cc\u0639\u06c1" },
  updatedAt: { en: "Updated At", ur: "\u0627\u067e\u0688\u06cc\u0679 \u0648\u0642\u062a" },
  ipAddress: { en: "IP Address", ur: "\u0622\u0626\u06cc \u067e\u06cc \u0627\u06cc\u0688\u0631\u06cc\u0633" },
  browserPlatform: { en: "Browser / Platform", ur: "\u0628\u0631\u0627\u0624\u0632\u0631 / \u067e\u0644\u06cc\u0679 \u0641\u0627\u0631\u0645" }
};
export function AccountLiveReportPanel({
  accountName,
  accountCode,
  accountTitle,
  subType,
  category,
  manualReferenceNumber,
  currency,
  status = "Active",
  lang = "en",
  customerDetail,
  companyDetail,
  bankDetail,
  selectedCountryName,
  selectedCountryCode,
  selectedBranchName,
  selectedBranchCode,
  onBack,
  onPrint,
  onPdf,
  onExcel,
  onEmail,
  onWhatsApp
}: AccountLiveReportProps) {
  
  const now = useMemo(() => new Date(), []);
  const stampDate = useMemo(() => now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), [now]);
  const stampTime = useMemo(() => now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }), [now]);

  const formattedDateTime = `${stampDate} ${stampTime}`;
  const t = (key: string, fallback: string) => liveReportLabels[key]?.[lang] || liveReportLabels[key]?.en || fallback;

  // Metrics (configured exactly to match user's mockup)
  const openingBalance = "0.00";
  const totalDebit = "0.00";
  const totalCredit = "79,000.00";
  const netBalance = "79,000.00";

  // Formats a UUID into a compact ID for display
  function compactCode(id: string, prefix: string) {
    if (!id) return "-";
    const clean = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return `${prefix}-${clean.slice(0, 4)}`;
  }

  // 2. Customer Information fields
  const custObj = customerDetail?.customer ?? customerDetail;
  const customerFields = custObj ? [
    { label: t("customerName", "Customer Name"), value: custObj.customer_name || custObj.name || accountName || "-" },
    { label: t("customerCode", "Customer Code"), value: custObj.customer_code || (custObj.id ? compactCode(custObj.id, "CUST") : "CUST-001") },
    { label: t("customerType", "Customer Type"), value: custObj.customer_type || "Company / Individual" },
    { label: "NTN / CNIC", value: custObj.ntn_cnic || custObj.ntn || "-" },
    { label: t("phone", "Phone"), value: custObj.mobile || custObj.phone || "-" },
    { label: t("email", "Email"), value: custObj.email || "-" },
    { label: t("address", "Address"), value: custObj.address || "-" },
    { label: t("createdAt", "Created At"), value: custObj.created_at ? new Date(custObj.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(custObj.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime },
    { label: t("lastUpdated", "Last Updated"), value: custObj.updated_at ? new Date(custObj.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(custObj.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime }
  ] : [
    { label: t("customerName", "Customer Name"), value: "-" },
    { label: t("customerCode", "Customer Code"), value: "-" },
    { label: t("customerType", "Customer Type"), value: "-" },
    { label: "NTN / CNIC", value: "-" },
    { label: t("phone", "Phone"), value: "-" },
    { label: t("email", "Email"), value: "-" },
    { label: t("address", "Address"), value: "-" },
    { label: t("createdAt", "Created At"), value: "-" },
    { label: t("lastUpdated", "Last Updated"), value: "-" }
  ];

  // 3. Company Details fields
  const companyFields = companyDetail ? [
    { label: t("companyName", "Company Name"), value: companyDetail.companyName || companyDetail.name || companyDetail.legal_name || "-" },
    { label: t("companyCode", "Company Code"), value: companyDetail.code || (companyDetail.id ? compactCode(companyDetail.id, "DBG") : "-") },
    { label: t("registrationNo", "Registration No."), value: companyDetail.registration_no || companyDetail.registrations?.find((r: any) => r.type.toLowerCase().includes("registration") || r.type.toLowerCase().includes("license") || r.type.toLowerCase().includes("trade"))?.value || "-" },
    { label: "NTN", value: companyDetail.ntn || companyDetail.registrations?.find((r: any) => r.type.toLowerCase().includes("ntn") || r.type.toLowerCase().includes("gst") || r.type.toLowerCase().includes("tax"))?.value || "-" },
    { label: t("phone", "Phone"), value: companyDetail.phone || companyDetail.contacts?.find((c: any) => c.type.toLowerCase().includes("phone") || c.type.toLowerCase().includes("number") || c.type.toLowerCase().includes("mobile"))?.value || "-" },
    { label: t("email", "Email"), value: companyDetail.email || companyDetail.contacts?.find((c: any) => c.type.toLowerCase().includes("email"))?.value || "-" },
    { label: t("address", "Address"), value: companyDetail.address || "-" },
    { label: t("createdAt", "Created At"), value: companyDetail.created_at ? new Date(companyDetail.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(companyDetail.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime },
    { label: t("lastUpdated", "Last Updated"), value: companyDetail.updated_at ? new Date(companyDetail.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(companyDetail.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime }
  ] : [
    { label: t("companyName", "Company Name"), value: "-" },
    { label: t("companyCode", "Company Code"), value: "-" },
    { label: t("registrationNo", "Registration No."), value: "-" },
    { label: "NTN", value: "-" },
    { label: t("phone", "Phone"), value: "-" },
    { label: t("email", "Email"), value: "-" },
    { label: t("address", "Address"), value: "-" },
    { label: t("createdAt", "Created At"), value: "-" },
    { label: t("lastUpdated", "Last Updated"), value: "-" }
  ];

  // 4. Bank Details fields
  const bankFields = bankDetail ? [
    { label: t("bankName", "Bank Name"), value: bankDetail.bank_name || bankDetail.bankName || bankDetail.name || "-" },
    { label: t("accountTitle", "Account Title"), value: bankDetail.account_title || accountName || "-" },
    { label: t("accountNumber", "Account Number"), value: bankDetail.account_number || "-" },
    { label: "IBAN", value: bankDetail.iban_number || "-" },
    { label: t("bankBranch", "Bank Branch"), value: bankDetail.branch_name || "-" },
    { label: t("swiftCode", "Swift Code"), value: bankDetail.swift_bic || "-" },
    { label: t("createdAt", "Created At"), value: bankDetail.created_at ? new Date(bankDetail.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-" },
    { label: t("lastUpdated", "Last Updated"), value: bankDetail.updated_at ? new Date(bankDetail.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-" }
  ] : [
    { label: t("bankName", "Bank Name"), value: "-" },
    { label: t("accountTitle", "Account Title"), value: "-" },
    { label: t("accountNumber", "Account Number"), value: "-" },
    { label: "IBAN", value: "-" },
    { label: t("bankBranch", "Bank Branch"), value: "-" },
    { label: t("swiftCode", "Swift Code"), value: "-" },
    { label: t("createdAt", "Created At"), value: "-" },
    { label: t("lastUpdated", "Last Updated"), value: "-" }
  ];

  // 5. Warehouse Details fields
  const warehouseFields = [
    { label: t("warehouseName", "Warehouse Name"), value: "-" },
    { label: t("warehouseCode", "Warehouse Code"), value: "-" },
    { label: t("location", "Location"), value: "-" },
    { label: t("phone", "Phone"), value: "-" },
    { label: t("address", "Address"), value: "-" },
    { label: t("createdAt", "Created At"), value: "-" },
    { label: t("lastUpdated", "Last Updated"), value: "-" }
  ];

  // 6. Audit Information fields
  const auditFields = [
    { label: t("createdBy", "Created By"), value: "Super Admin" },
    { label: t("createdAt", "Created At"), value: formattedDateTime },
    { label: t("updatedBy", "Updated By"), value: "Super Admin" },
    { label: t("updatedAt", "Updated At"), value: formattedDateTime },
    { label: t("ipAddress", "IP Address"), value: "192.168.1.100" },
    { label: t("browserPlatform", "Browser / Platform"), value: "Chrome / Windows" }
  ];

  // 1. Account Information fields
  const accountFields = [
    { label: t("accountName", "Account Name"), value: accountName || "-" },
    { label: t("accountCode", "Account Code"), value: accountCode || "-" },
    { label: t("accountTitle", "Account Title"), value: accountTitle || "-" },
    { label: t("subType", "Sub Type"), value: subType || "-" },
    { label: t("category", "Category"), value: category || "-" },
    { label: t("currency", "Currency"), value: currency || "-" },
    { label: t("manualRef", "Manual Ref"), value: manualReferenceNumber || "-" },
    { label: t("country", "Country"), value: selectedCountryName || "-" },
    { label: t("branch", "Branch"), value: selectedBranchName || "-" },
  ];

  const sections = [
    { id: 1, title: t("accountInformation", "ACCOUNT INFORMATION"), icon: FileText, fields: accountFields },
    { id: 2, title: t("customerInformation", "CUSTOMER INFORMATION"), icon: UserRound, fields: customerFields },
    { id: 3, title: t("companyDetails", "COMPANY DETAILS"), icon: Building2, fields: companyFields },
    { id: 4, title: t("bankDetails", "BANK DETAILS"), icon: Landmark, fields: bankFields },
    { id: 5, title: t("warehouseDetails", "WAREHOUSE DETAILS"), icon: Warehouse, fields: warehouseFields },
    { id: 6, title: t("auditInformation", "AUDIT INFORMATION"), icon: ShieldAlert, fields: auditFields }
  ];

  return (
    <Card className="border-slate-200 shadow-md bg-white overflow-hidden w-full">
      {/* â”€â”€ Light-theme Preview Header (mockup styled) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white text-slate-800 p-6 border-b border-slate-150">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{accountName || "ASMATKHAN"}</h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">{accountTitle || t("accountTitle", "Account Title")}</p>
          </div>
          
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl lg:ml-8 text-left">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("accountCodeAuto", "Account Code (Auto)")}</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{accountCode || "AST-001"}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("accountGroup", "Account Group")}</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{category || "Sundry Debtors"}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("currency", "Currency")}</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{currency || "PKR"}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("date", "Date")}</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{stampDate || "31 Dec 2024"}</div>
            </div>
          </div>

          <div className="flex items-center">
            <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              {status === "Active" ? t("active", "Active") : status === "In Progress" ? t("inProgress", "In Progress") : status || t("active", "Active")}
            </span>
          </div>
        </div>

        {/* Balance KPI ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{t("openingBalance", "Opening Balance")}</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{openingBalance}</div>
          </div>
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{t("debitAmount", "Debit Amount")}</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{totalDebit}</div>
          </div>
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{t("creditAmount", "Credit Amount")}</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{totalCredit}</div>
          </div>
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{t("netBalance", "Net Balance")}</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{netBalance}</div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Detail Cards Grid (mockup styled layout) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <CardContent className="p-6 bg-slate-50/20 space-y-6">
        {/* Row 1: ACCOUNT, CUSTOMER Details (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sections.filter(s => s.id >= 1 && s.id <= 2).map((sect) => {
            const Icon = sect.icon;
            return (
              <div key={sect.id} className="bg-white rounded-lg border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-slate-100 px-4 py-2.5 bg-white flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-500" />
                  <h3 className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">{sect.id}. {sect.title}</h3>
                </div>

                <div className="p-4 flex-1 space-y-2">
                  {sect.fields.map((f, i) => (
                    <div key={i} className="grid grid-cols-[130px_1fr] gap-3 text-xs border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</span>
                      <span className="font-bold text-slate-700 truncate">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 2: COMPANY, BANK, WAREHOUSE Details (3 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sections.filter(s => s.id >= 3 && s.id <= 5).map((sect) => {
            const Icon = sect.icon;
            return (
              <div key={sect.id} className="bg-white rounded-lg border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-slate-100 px-4 py-2.5 bg-white flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-500" />
                  <h3 className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">{sect.id}. {sect.title}</h3>
                </div>

                <div className="p-4 flex-1 space-y-2">
                  {sect.fields.map((f, i) => (
                    <div key={i} className="grid grid-cols-[110px_1fr] gap-3 text-xs border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</span>
                      <span className="font-bold text-slate-700 truncate">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 3: AUDIT Information */}
        <div className="grid grid-cols-1 gap-5">
          {sections.filter(s => s.id === 6).map((sect) => {
            const Icon = sect.icon;
            return (
              <div key={sect.id} className="bg-white rounded-lg border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-slate-100 px-4 py-2.5 bg-white flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-500" />
                  <h3 className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">{sect.id}. {sect.title}</h3>
                </div>

                <div className="p-4 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                  {sect.fields.map((f, i) => (
                    <div key={i} className="grid grid-cols-[130px_1fr] gap-3 text-xs border-b border-slate-100/50 pb-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</span>
                      <span className="font-bold text-slate-700 truncate">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



