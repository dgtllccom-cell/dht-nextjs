"use client";

import type { ReactNode } from "react";
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

export function AccountLiveReportPanel({
  accountName,
  accountCode,
  accountTitle,
  subType,
  category,
  manualReferenceNumber,
  currency,
  status = "Active",
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
    { label: "Customer Name", value: custObj.customer_name || custObj.name || accountName || "-" },
    { label: "Customer Code", value: custObj.customer_code || (custObj.id ? compactCode(custObj.id, "CUST") : "CUST-001") },
    { label: "Customer Type", value: custObj.customer_type || "Company / Individual" },
    { label: "NTN / CNIC", value: custObj.ntn_cnic || custObj.ntn || "-" },
    { label: "Phone", value: custObj.mobile || custObj.phone || "-" },
    { label: "Email", value: custObj.email || "-" },
    { label: "Address", value: custObj.address || "-" },
    { label: "Created At", value: custObj.created_at ? new Date(custObj.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(custObj.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime },
    { label: "Last Updated", value: custObj.updated_at ? new Date(custObj.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(custObj.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime }
  ] : [
    { label: "Customer Name", value: "-" },
    { label: "Customer Code", value: "-" },
    { label: "Customer Type", value: "-" },
    { label: "NTN / CNIC", value: "-" },
    { label: "Phone", value: "-" },
    { label: "Email", value: "-" },
    { label: "Address", value: "-" },
    { label: "Created At", value: "-" },
    { label: "Last Updated", value: "-" }
  ];

  // 3. Company Details fields
  const companyFields = companyDetail ? [
    { label: "Company Name", value: companyDetail.companyName || companyDetail.name || companyDetail.legal_name || "-" },
    { label: "Company Code", value: companyDetail.code || (companyDetail.id ? compactCode(companyDetail.id, "DBG") : "-") },
    { label: "Registration No.", value: companyDetail.registration_no || companyDetail.registrations?.find((r: any) => r.type.toLowerCase().includes("registration") || r.type.toLowerCase().includes("license") || r.type.toLowerCase().includes("trade"))?.value || "-" },
    { label: "NTN", value: companyDetail.ntn || companyDetail.registrations?.find((r: any) => r.type.toLowerCase().includes("ntn") || r.type.toLowerCase().includes("gst") || r.type.toLowerCase().includes("tax"))?.value || "-" },
    { label: "Phone", value: companyDetail.phone || companyDetail.contacts?.find((c: any) => c.type.toLowerCase().includes("phone") || c.type.toLowerCase().includes("number") || c.type.toLowerCase().includes("mobile"))?.value || "-" },
    { label: "Email", value: companyDetail.email || companyDetail.contacts?.find((c: any) => c.type.toLowerCase().includes("email"))?.value || "-" },
    { label: "Address", value: companyDetail.address || "-" },
    { label: "Created At", value: companyDetail.created_at ? new Date(companyDetail.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(companyDetail.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime },
    { label: "Last Updated", value: companyDetail.updated_at ? new Date(companyDetail.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(companyDetail.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : formattedDateTime }
  ] : [
    { label: "Company Name", value: "-" },
    { label: "Company Code", value: "-" },
    { label: "Registration No.", value: "-" },
    { label: "NTN", value: "-" },
    { label: "Phone", value: "-" },
    { label: "Email", value: "-" },
    { label: "Address", value: "-" },
    { label: "Created At", value: "-" },
    { label: "Last Updated", value: "-" }
  ];

  // 4. Bank Details fields
  const bankFields = bankDetail ? [
    { label: "Bank Name", value: bankDetail.bank_name || bankDetail.bankName || bankDetail.name || "-" },
    { label: "Account Title", value: bankDetail.account_title || accountName || "-" },
    { label: "Account Number", value: bankDetail.account_number || "-" },
    { label: "IBAN", value: bankDetail.iban_number || "-" },
    { label: "Bank Branch", value: bankDetail.branch_name || "-" },
    { label: "Swift Code", value: bankDetail.swift_bic || "-" },
    { label: "Created At", value: bankDetail.created_at ? new Date(bankDetail.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-" },
    { label: "Last Updated", value: bankDetail.updated_at ? new Date(bankDetail.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-" }
  ] : [
    { label: "Bank Name", value: "-" },
    { label: "Account Title", value: "-" },
    { label: "Account Number", value: "-" },
    { label: "IBAN", value: "-" },
    { label: "Bank Branch", value: "-" },
    { label: "Swift Code", value: "-" },
    { label: "Created At", value: "-" },
    { label: "Last Updated", value: "-" }
  ];

  // 5. Warehouse Details fields
  const warehouseFields = [
    { label: "Warehouse Name", value: "-" },
    { label: "Warehouse Code", value: "-" },
    { label: "Location", value: "-" },
    { label: "Phone", value: "-" },
    { label: "Address", value: "-" },
    { label: "Created At", value: "-" },
    { label: "Last Updated", value: "-" }
  ];

  // 6. Audit Information fields
  const auditFields = [
    { label: "Created By", value: "Super Admin" },
    { label: "Created At", value: formattedDateTime },
    { label: "Updated By", value: "Super Admin" },
    { label: "Updated At", value: formattedDateTime },
    { label: "IP Address", value: "192.168.1.100" },
    { label: "Browser / Platform", value: "Chrome / Windows" }
  ];

  const sections = [
    { id: 2, title: "CUSTOMER INFORMATION", icon: UserRound, fields: customerFields },
    { id: 3, title: "COMPANY DETAILS", icon: Building2, fields: companyFields },
    { id: 4, title: "BANK DETAILS", icon: Landmark, fields: bankFields },
    { id: 5, title: "WAREHOUSE DETAILS", icon: Warehouse, fields: warehouseFields },
    { id: 6, title: "AUDIT INFORMATION", icon: ShieldAlert, fields: auditFields }
  ];

  return (
    <Card className="border-slate-200 shadow-md bg-white overflow-hidden w-full">
      {/* ── Action Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 gap-3">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Dashboard &gt; Accounts &gt; Live Report &gt; Account Profile</span>
          <h2 className="text-sm font-bold text-slate-800 mt-1">Account Profile Report</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="h-8 text-[11px] font-bold gap-1 border-slate-200 text-slate-700">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onPrint} className="h-8 text-[11px] font-bold gap-1 border-slate-200 text-slate-700">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={onPdf} className="h-8 text-[11px] font-bold gap-1 border-slate-200 text-slate-700">
            <FileText className="h-3.5 w-3.5 text-rose-500" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onExcel} className="h-8 text-[11px] font-bold gap-1 border-slate-200 text-slate-700">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onEmail} className="h-8 text-[11px] font-bold gap-1 border-slate-200 text-slate-700">
            <Mail className="h-3.5 w-3.5 text-blue-500" /> Email
          </Button>
          <Button variant="default" size="sm" onClick={onWhatsApp} className="h-8 text-[11px] font-extrabold gap-1 bg-emerald-600 text-white hover:bg-emerald-700 border-0">
            <MessageCircle className="h-3.5 w-3.5 fill-current" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* ── ACCOUNT REPORT PREVIEW Section (mockup styled) ──────────────── */}
      <div className="border-b border-slate-100 bg-slate-50/20 px-5 py-2.5 flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-500" />
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Account Report Preview</span>
      </div>

      {/* ── Light-theme Preview Header (mockup styled) ─────────────────── */}
      <div className="bg-white text-slate-800 p-6 border-b border-slate-150">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{accountName || "ASMATKHAN"}</h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">Account Account</p>
          </div>
          
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl lg:ml-8 text-left">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Code (Auto)</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{accountCode || "AST-001"}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Group</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{category || "Sundry Debtors"}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Currency</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{currency || "PKR"}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date</div>
              <div className="text-xs font-bold mt-1 text-slate-700">{stampDate || "31 Dec 2024"}</div>
            </div>
          </div>

          <div className="flex items-center">
            <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
        </div>

        {/* Balance KPI ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Opening Balance</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{openingBalance}</div>
          </div>
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Debit Amount</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{totalDebit}</div>
          </div>
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Credit Amount</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{totalCredit}</div>
          </div>
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Net Balance</div>
            <div className="text-sm font-bold mt-1 text-slate-700 font-mono">{netBalance}</div>
          </div>
        </div>
      </div>

      {/* ── Detail Cards Grid (mockup styled layout) ───────────────────── */}
      <CardContent className="p-6 bg-slate-50/20 space-y-6">
        {/* Row 1: CUSTOMER, COMPANY, BANK Details (3 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sections.filter(s => s.id >= 2 && s.id <= 4).map((sect) => {
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

        {/* Row 2: WAREHOUSE, AUDIT Details (2 columns - 7/12 and 5/12 span) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Warehouse (7/12 span) */}
          {sections.filter(s => s.id === 5).map((sect) => {
            const Icon = sect.icon;
            return (
              <div key={sect.id} className="md:col-span-7 bg-white rounded-lg border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
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

          {/* Audit Information (5/12 span) */}
          {sections.filter(s => s.id === 6).map((sect) => {
            const Icon = sect.icon;
            return (
              <div key={sect.id} className="md:col-span-5 bg-white rounded-lg border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
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
      </CardContent>
    </Card>
  );
}
