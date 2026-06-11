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
  status = "In Progress",
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
  
  const now = new Date();
  const stampDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const stampTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const formattedDateTime = `${stampDate} ${stampTime}`;

  // Metrics
  const openingBalance = "0.00";
  const totalDebit = "0.00";
  const totalCredit = "70,000.00";
  const netBalance = "-70,000.00";

  // Formats a UUID into a compact ID for display
  function compactCode(id: string, prefix: string) {
    if (!id) return "-";
    const clean = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return `${prefix}-${clean.slice(0, 4)}`;
  }

  // 1. Account Info
  const accountInfoFields = [
    { label: "Account Name", value: accountName || "-" },
    { label: "Account Code", value: accountCode || "AC-EXP-0001" },
    { label: "Account Type", value: subType || category || "Expense" },
    { label: "Currency", value: currency || "AED" },
    { label: "Status", value: status, highlight: true },
    { label: "Created Date", value: formattedDateTime },
    { label: "Last Updated", value: formattedDateTime }
  ];

  // 2. Customer Details
  const custObj = customerDetail?.customer;
  const customerFields = [
    { label: "Customer Name", value: custObj?.customer_name || accountName || "Khan" },
    { label: "Company Name", value: custObj?.company_name || "-" },
    { label: "Customer Code", value: custObj?.id ? compactCode(custObj.id, `CUS-${selectedCountryCode || "AE"}-${selectedBranchCode || "CHM"}`) : "CUS-AE-CHM-0002" },
    { label: "Phone", value: custObj?.mobile || "-" },
    { label: "Email", value: custObj?.email || "-" },
    { label: "Address", value: custObj?.address || "-" },
    { label: "City", value: selectedBranchName?.split(" - ")[0] || "-" },
    { label: "Country", value: selectedCountryName || "UAE" }
  ];

  // 3. Company Details
  const companyFields = [
    { label: "Company Name", value: companyDetail?.name || "Asmat Super Admin" },
    { label: "Company Code", value: companyDetail?.id ? compactCode(companyDetail.id, "COMP") : "COMP-0001" },
    { label: "Company Type", value: "Private Limited" },
    { label: "Registration No.", value: "-" },
    { label: "Tax Registration No.", value: "-" },
    { label: "NTN / GST No.", value: "-" },
    { label: "Company Address", value: "Mall Road, Chaman, District Chaman, Balochistan, Pakistan" },
    { label: "Country", value: "Pakistan" },
    { label: "Phone", value: "+92 300 1234567" },
    { label: "Email", value: "asmatandbrothers@gmail.com" }
  ];

  // 4. Bank Details
  const bankFields = [
    { label: "Bank Name", value: bankDetail?.name || "Dubai Islamic Bank" },
    { label: "Branch Name", value: bankDetail?.legal_name || "Main Branch" },
    { label: "Bank Account Number", value: "AE24 DIB 1234 5678 9012 3456" },
    { label: "IBAN", value: "AE24DIB1234567890123456" },
    { label: "Account Title", value: accountName || "Khan" },
    { label: "Swift Code", value: "DIBLAEAD" },
    { label: "Currency", value: currency || "AED" }
  ];

  // 5. Warehouse Details
  const warehouseFields = [
    { label: "Warehouse Name", value: "-" },
    { label: "Warehouse Code", value: "-" },
    { label: "Location", value: "-" },
    { label: "City", value: "-" },
    { label: "Country", value: "-" }
  ];

  // 6. Audit Information
  const auditFields = [
    { label: "Created By", value: "Super Admin" },
    { label: "Created On", value: formattedDateTime },
    { label: "Last Updated By", value: "Super Admin" },
    { label: "Last Updated On", value: formattedDateTime },
    { label: "IP Address", value: "192.168.1.100" },
    { label: "Device / Browser", value: "Chrome / Windows" }
  ];

  const sections = [
    { id: 1, title: "ACCOUNT INFORMATION", icon: Info, fields: accountInfoFields, color: "text-blue-600 bg-blue-50 border-blue-150" },
    { id: 2, title: "CUSTOMER DETAILS", icon: UserRound, fields: customerFields, color: "text-sky-600 bg-sky-50 border-sky-150" },
    { id: 3, title: "COMPANY DETAILS", icon: Building2, fields: companyFields, color: "text-indigo-600 bg-indigo-50 border-indigo-150" },
    { id: 4, title: "BANK DETAILS", icon: Landmark, fields: bankFields, color: "text-blue-700 bg-blue-50 border-blue-150" },
    { id: 5, title: "WAREHOUSE DETAILS", icon: Warehouse, fields: warehouseFields, color: "text-purple-600 bg-purple-50 border-purple-150" },
    { id: 6, title: "AUDIT INFORMATION", icon: ShieldAlert, fields: auditFields, color: "text-amber-600 bg-amber-50 border-amber-150" }
  ];

  return (
    <Card className="border-slate-200/80 shadow-md bg-white overflow-hidden w-full">
      {/* ── Action Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4 gap-3">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Dashboard &gt; Accounts &gt; Live Report &gt; Account Profile</span>
          <h2 className="text-sm font-bold text-slate-800 mt-1.5">Account Profile Report</h2>
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
          <Button variant="default" size="sm" onClick={onWhatsApp} className="h-8 text-[11px] font-extrabold gap-1 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-0">
            <MessageCircle className="h-3.5 w-3.5 fill-current" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* ── Dark Blue Header Card ───────────────────────────────────────── */}
      <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
        {/* Abstract design elements to match a high-fidelity report */}
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
          <div className="w-64 h-64 rounded-full border-[24px] border-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Account Profile Overview</span>
            <h1 className="text-2xl font-black tracking-tight mt-1 leading-tight">{accountName || "Khan"}</h1>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="inline-flex items-center rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/30">
              {status}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold mt-1">Status</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 mt-6 border-b border-slate-800 pb-5">
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Code</div>
            <div className="text-xs font-extrabold mt-1 font-mono text-slate-200">{accountCode || "AC-EXP-0001"}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Type</div>
            <div className="text-xs font-extrabold mt-1 text-slate-200">{subType || category || "Expense"}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Currency</div>
            <div className="text-xs font-extrabold mt-1 text-slate-200">{currency || "AED"}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</div>
            <div className="text-xs font-extrabold mt-1 text-slate-200 font-mono">{stampDate}</div>
          </div>
        </div>

        {/* Balance KPI ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-center">
          <div>
            <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Opening Balance</div>
            <div className="text-base font-black mt-1 font-mono">{openingBalance}</div>
          </div>
          <div>
            <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Total Debit</div>
            <div className="text-base font-black mt-1 font-mono">{totalDebit}</div>
          </div>
          <div>
            <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Total Credit</div>
            <div className="text-base font-black mt-1 font-mono">{totalCredit}</div>
          </div>
          <div>
            <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Net Balance</div>
            <div className="text-base font-black mt-1 font-mono text-rose-400">{netBalance}</div>
          </div>
        </div>
      </div>

      {/* ── Detail Cards Grid ───────────────────────────────────────────── */}
      <CardContent className="p-6 bg-slate-50/40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sections.map((sect) => {
            const Icon = sect.icon;
            return (
              <div key={sect.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-slate-100/80 px-4 py-3 bg-slate-50/20 flex items-center gap-2.5">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center border text-xs shrink-0 ${sect.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-[11px] font-black text-slate-800 tracking-wider uppercase">{sect.id}. {sect.title}</h3>
                </div>

                <div className="p-4 flex-1 space-y-2.5">
                  {sect.fields.map((f, i) => (
                    <div key={i} className="grid grid-cols-[140px_1fr] gap-3 text-xs border-b border-slate-100/50 pb-2 last:border-0 last:pb-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{f.label}</span>
                      <span className={`font-bold text-slate-700 truncate ${
                        f.highlight ? "inline-flex px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200/50 w-fit" : ""
                      }`}>
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
