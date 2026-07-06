"use client";
 
import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import { createPortal } from "react-dom";
import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Landmark,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  Save,
  Paperclip,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  WalletCards,
  Edit3,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { openPurchaseA4ReportWindow, type PurchaseReportData } from "@/lib/reports/open-purchase-a4-report-window";
import { PaymentEditModal } from "./payment-edit-modal";

type PaymentMode = "advance" | "advance_completed" | "remaining" | "credit" | "charges" | "history";

type PurchaseOrderRow = {
  id: string;
  purchase_order_no: string;
  purchase_contract_no: string | null;
  country_id?: string | null;
  country_branch_id?: string | null;
  city_branch_id?: string | null;
  currency_code: string | null;
  exchange_rate: number | null;
  order_total: number | null;
  advance_paid: number | null;
  remaining_paid: number | null;
  credit_amount: number | null;
  remaining_due: number | null;
  super_admin_serial_number?: string | null;
  country_transaction_serial_number?: string | null;
  branch_transaction_serial_number?: string | null;
  superAdminSerialNo?: string | null;
  countrySerialNo?: string | null;
  branchSerialNo?: string | null;
  branchName?: string | null;
  countryName?: string | null;
  audit?: { branchCode?: string | null } | null;
  payment_status: string | null;
  ledger_posting_status: string | null;
  created_at: string | null;
  form_data?: any;
};

function handlePrintReceipt(payment: any, orderRow: any, ledgers: any[], localCurrency: string, autoPrint = true) {
  const drLedger = ledgers.find((l) => (l.id || l.account_id) === payment.debit_ledger_id);
  const crLedger = ledgers.find((l) => (l.id || l.account_id) === payment.credit_ledger_id);
  const drLabel = drLedger ? (drLedger.account_name || drLedger.name) : "-";
  const crLabel = crLedger ? (crLedger.account_name || crLedger.name) : "-";
  const re = payment.roznamcha_entries || {};
  const form = orderRow?.form_data?.form || {};
  
  const companyName = "DAMAAN BUSINESS GROUP";
  const receiptTitle = "PAYMENT RECEIPT";
  const receiptNo = payment.reference_no || re.super_admin_serial_number || "N/A";
  const printDate = new Date().toLocaleString();
  const paymentDate = new Date(payment.entry_date || payment.created_at).toLocaleDateString();
  const purchaseDate = form.orderDate ? new Date(form.orderDate).toLocaleDateString() : "N/A";
  const poNo = orderRow?.purchase_order_no || "N/A";
  const contractNo = orderRow?.purchase_contract_no || "N/A";
  const vendorName = form.vendorName || "N/A";
  
  const paymentAmt = Number(payment.amount || 0);
  const paymentExRate = Number(payment.exchange_rate || 1);
  const currency = payment.currency_code || localCurrency.toUpperCase();
  
  const prevPaid = Number(payment.previous_balance_paid || 0);
  const totalPaid = prevPaid + paymentAmt;
  
  const goodsTotal = orderRow?.form_data?.goodsEntries?.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) || Number(form.subTotal || 0);
  const freight = Number(form.freightCharges || 0);
  const discount = Number(form.discount || 0);
  const grandTotalFC = Number(orderRow?.order_total || form.totalAmount || 0);
  const poExRate = Number(orderRow?.exchange_rate || 1);
  const outstanding = Math.max(0, grandTotalFC - totalPaid);
  
  let displayNarration = payment.narration || "-";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${receiptTitle} - ${receiptNo}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 0; }
        .container { width: 100%; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px; }
        .header-left h1 { margin: 0; font-size: 26px; color: #1e3a8a; letter-spacing: 1px; text-transform: uppercase; font-weight: 900; }
        .header-left p { margin: 4px 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
        .header-right { text-align: right; }
        .header-right h2 { margin: 0; font-size: 20px; color: #334155; font-weight: 800; }
        .header-right p { margin: 4px 0 0; font-size: 11px; font-weight: bold; color: #1e293b; }
        .section-title { background: #f1f5f9; padding: 6px 10px; font-weight: 800; font-size: 11px; border: 1px solid #cbd5e1; border-left: 4px solid #1e3a8a; margin: 20px 0 10px; text-transform: uppercase; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 11px; }
        th { background: #f8fafc; font-weight: 700; color: #475569; width: 25%; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .summary-box { display: flex; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; margin-top: 15px; }
        .summary-item { flex: 1; padding: 12px; text-align: center; background: #f8fafc; border-right: 1px solid #cbd5e1; }
        .summary-item:last-child { border-right: none; }
        .summary-item .lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .summary-item .val { font-size: 16px; font-weight: 900; margin-top: 5px; color: #0f172a; }
        .summary-item.highlight { background: #eff6ff; }
        .summary-item.highlight .lbl { color: #1d4ed8; }
        .summary-item.highlight .val { color: #1e40af; }
        .footer { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-block { width: 22%; text-align: center; }
        .sig-line { border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 50px; }
        .stamp-box { width: 90px; height: 90px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-weight: 900; margin: 0 auto; border-radius: 50%; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .sys-gen { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 30px; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
        .qr-placeholder { width: 60px; height: 60px; background: #f1f5f9; border: 1px solid #cbd5e1; float: right; margin-left: 15px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #94a3b8; text-align: center; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-left">
            <h1>${companyName}</h1>
            <p>Purchase Payment Receipt</p>
          </div>
          <div class="header-right">
            <h2>RECEIPT</h2>
            <p>No: ${receiptNo}</p>
            <p style="font-weight: normal; color: #64748b; font-size: 10px;">Printed: ${printDate}</p>
          </div>
        </div>

        <div class="section-title">Purchase & Vendor Details</div>
        <table>
          <tr>
            <th>Purchase Order No</th><td><strong>${poNo}</strong></td>
            <th>Contract / GRN No</th><td>${contractNo}</td>
          </tr>
          <tr>
            <th>Supplier Name</th><td colspan="3"><strong>${vendorName}</strong></td>
          </tr>
          <tr>
            <th>Purchase Date</th><td>${purchaseDate}</td>
            <th>Currency</th><td><strong>${currency}</strong></td>
        </table>

        <div class="section-title">Purchase Financial Summary</div>
        <table>
          <tr>
            <th>Goods Total Amount</th><td class="text-right">${Number(goodsTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <th>Discount</th><td class="text-right">${Number(discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <th>Freight Charges</th><td class="text-right">${Number(freight).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <th>Grand Total (${currency})</th><td class="text-right font-bold">${Number(grandTotalFC).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <div class="section-title">Accounting & Audit Trail</div>
        <table>
          <tr>
            <th>Debit Ledger (Dr)</th><td colspan="3">${drLabel}</td>
          </tr>
          <tr>
            <th>Credit Ledger (Cr)</th><td colspan="3">${crLabel}</td>
          </tr>
          <tr>
            <th>Payment Date</th><td>${paymentDate}</td>
            <th>Posted By</th><td>${re.profiles?.full_name ? re.profiles.full_name.toUpperCase() : "SUPER ADMIN"}</td>
          </tr>
          <tr>
            <th>Reference No</th><td>${payment.reference_no || "-"}</td>
            <th>Journal Serial</th><td>${re.super_admin_serial_number || "-"}</td>
          </tr>
          <tr>
            <th>Remarks</th><td colspan="3">${displayNarration || "-"}</td>
          </tr>
        </table>

        <div class="section-title">Payment Summary</div>
        <div class="summary-box">
          <div class="summary-item">
            <div class="lbl">Previously Paid</div>
            <div class="val">${Number(prevPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-item highlight">
            <div class="lbl">Current Payment</div>
            <div class="val">${Number(paymentAmt).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-item">
            <div class="lbl">Total Paid to Date</div>
            <div class="val">${Number(totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-item">
            <div class="lbl" style="color: #be123c;">Remaining Balance</div>
            <div class="val" style="color: #be123c;">${Number(outstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div class="footer">
          <div class="sig-block">
            <div class="sig-line">Prepared By</div>
          </div>
          <div class="sig-block" style="width: auto;">
            <div class="stamp-box">COMPANY<br/>STAMP</div>
          </div>
          <div class="sig-block">
            <div class="sig-line">Authorized Signatory</div>
          </div>
          <div class="sig-block">
            <div class="sig-line">Receiver Signature</div>
          </div>
        </div>
        
        <div class="sys-gen">
          <div class="qr-placeholder">VERIFY<br/>QR</div>
          *** THIS IS A SYSTEM GENERATED DOCUMENT ***<br/>
          UUID: ${payment.id || "N/A"} | Exchange Rate Applied: ${paymentExRate.toFixed(4)}
        </div>
      </div>
      <script>
        window.onload = function() { 
          if (${autoPrint}) { window.print(); window.close(); }
        }
      </script>
    </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

type OrdersPayload = {
  orders?: PurchaseOrderRow[];
  limit?: number;
};

type KpiCard = {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber" | "red" | "slate";
};

const modeLabels: Record<PaymentMode, string> = {
  advance: "Advance Payment",
  remaining: "Remaining Payment",
  credit: "Credit Payment",
  charges: "Credit Payment",
  history: "Payment History",
  advance_completed: "Advance Completed"
};

function money(value: unknown, currency = "") {
  const amount = Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${amount} ${currency}` : amount;
}

function numeric(value: unknown) {
  return Number(value || 0);
}


const COUNTRY_CURRENCY: Record<string, string> = {
  "united arab emirates": "AED",
  "uae": "AED",
  "pakistan": "PKR",
  "afghanistan": "AFN",
  "india": "INR",
  "iran": "IRR"
};

function normalizeCurrency(value: unknown, fallback = "USD") {
  const raw = String(value || "").trim().toUpperCase();
  return raw || fallback;
}

function rowForm(row: PurchaseOrderRow) {
  return row.form_data?.form || {};
}

function rowCountryName(row: PurchaseOrderRow) {
  const form = rowForm(row);
  return String(form.branchCountry || row.countryName || form.countryName || form.loadingCountry || form.destinationCountry || form.originCountry || "Unknown Country");
}

function rowBranchName(row: PurchaseOrderRow) {
  const form = rowForm(row);
  return String(form.branchName || form.purchaseAccountBranch || form.salesAccountBranch || "Unassigned Branch");
}

function rowCurrency(row: PurchaseOrderRow) {
  const form = rowForm(row);
  const explicit = normalizeCurrency(form.purchaseCurrency || form.baseCurrency || form.currencyType || form.currency || row.currency_code || form.purchaseAccountCurrency, "");
  if (explicit) return explicit;
  const country = rowCountryName(row).toLowerCase();
  return COUNTRY_CURRENCY[country] || "USD";
}

function orderTotal(row: PurchaseOrderRow) {
  const form = rowForm(row);
  const goods = row.form_data?.goodsEntries || [];
  const totals = row.form_data?.totals || {};
  if (Number(row.order_total || 0) > 0) return Number(row.order_total || 0);
  if (Number(totals.grandFinal || 0) > 0) return Number(totals.grandFinal || 0);
  if (Array.isArray(goods) && goods.length) return goods.reduce((sum: number, g: any) => sum + Number(g.finalAmount || g.localAmount || g.totalAmount || 0), 0);
  return Number(form.totalAmount || form.grandFinal || 0);
}

function requiredAdvanceAmount(row: PurchaseOrderRow) {
  const form = rowForm(row);
  const pct = Number(form.advancePercent || 0);
  return pct > 0 ? (orderTotal(row) * pct) / 100 : Number(row.advance_paid || 0);
}

export type PurchaseCurrencySummaryFC = {
  currency: string;
  totalPurchase: number;
  advancePaid: number;
  remainingBalance: number;
};

export type DashboardSummaryData = {
  country: string;
  branchName: string;
  userName: string;
  userId: string;
  role: string;
  
  totalTransactions: number;
  localCurrency: string;
  
  // Left side (Foreign Currencies)
  foreignCurrencies: Record<string, PurchaseCurrencySummaryFC>;
  totalAllFC: {
    totalPurchase: number;
    advancePaid: number;
    remainingBalance: number;
  };
  
  // Right side (Local Currency)
  totalPurchaseLC: number;
  advancePaidLC: number;
  remainingBalanceLC: number;
};

function getDashboardSummaryData(rows: PurchaseOrderRow[], session: any, mode: string): DashboardSummaryData | null {
  if (!rows || rows.length === 0) return null;

  const firstRow = rows[0];
  const country = rowCountryName(firstRow) || session?.countryName || "Unknown";
  const branchName = rowBranchName(firstRow) || session?.branchName || "Main Branch";
  
  const baseCurrencyFallback = (country.toUpperCase().includes("PAKISTAN") || firstRow?.countries?.iso2 === "PK") ? "PKR" : 
                             (country.toUpperCase().includes("EMIRATES") || country.toUpperCase().includes("DUBAI") || firstRow?.countries?.iso2 === "AE") ? "AED" : 
                             (country.toUpperCase().includes("INDIA") || firstRow?.countries?.iso2 === "IN") ? "INR" : "PKR";
                             
  const localCurRaw = firstRow?.payment_currency ?? firstRow?.form_data?.form?.secondaryCurrency?.split(" ")[0] ?? baseCurrencyFallback;
  const localCur = (localCurRaw === "USD") ? "PKR" : localCurRaw;

  const summary: DashboardSummaryData = {
    country,
    branchName,
    userName: session?.name || session?.username || session?.user?.fullName || "SUPER ADMIN",
    userId: session?.userId || session?.user?.id || "SA001",
    role: session?.role || "Super Admin",
    
    totalTransactions: rows.length,
    localCurrency: localCur,
    
    foreignCurrencies: {},
    totalAllFC: { totalPurchase: 0, advancePaid: 0, remainingBalance: 0 },
    
    totalPurchaseLC: 0,
    advancePaidLC: 0,
    remainingBalanceLC: 0,
  };

  const parseNumber = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const num = Number(String(val).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  };

  rows.forEach((row) => {
    const currRaw = rowCurrency(row);
    let foreignCur = (currRaw && currRaw !== localCur) ? currRaw : "USD";
    if (!foreignCur || foreignCur === "UNDEFINED") {
       foreignCur = "USD";
    }

    const exRateRaw = parseNumber(row.exchange_rate || row.form_data?.form?.exchangeRate || 1);
    const exRate = exRateRaw > 0 ? exRateRaw : 1;
    
    const invoiceAmountRaw = parseNumber(orderTotal(row));
    const invoiceAmountFC = (exRate > 1 && invoiceAmountRaw > 1000000) ? invoiceAmountRaw / exRate : invoiceAmountRaw;
    const invoiceAmountLC = invoiceAmountFC * exRate;

    const advancePaidRaw = parseNumber(row.advance_paid || 0);
    const advancePaidFC = (exRate > 1 && advancePaidRaw > invoiceAmountFC * 1.05) ? advancePaidRaw / exRate : advancePaidRaw;
    const advancePaidLC = advancePaidFC * exRate;

    const explicitRemainingRaw = parseNumber(row.remaining_due || 0);
    const explicitRemainingFC = (exRate > 1 && explicitRemainingRaw > invoiceAmountFC * 1.05) ? explicitRemainingRaw / exRate : explicitRemainingRaw;
    const explicitRemainingLC = explicitRemainingFC * exRate;

    const remainingFC = explicitRemainingFC > 0 ? explicitRemainingFC : Math.max(0, invoiceAmountFC - advancePaidFC);
    const remainingLC = remainingFC * exRate;

    if (!summary.foreignCurrencies[foreignCur]) {
      summary.foreignCurrencies[foreignCur] = {
        currency: foreignCur,
        totalPurchase: 0,
        advancePaid: 0,
        remainingBalance: 0
      };
    }
    summary.foreignCurrencies[foreignCur].totalPurchase += invoiceAmountFC;
    summary.foreignCurrencies[foreignCur].advancePaid += advancePaidFC;
    summary.foreignCurrencies[foreignCur].remainingBalance += remainingFC;
    
    summary.totalAllFC.totalPurchase += invoiceAmountFC;
    summary.totalAllFC.advancePaid += advancePaidFC;
    summary.totalAllFC.remainingBalance += remainingFC;

    summary.totalPurchaseLC += invoiceAmountLC;
    summary.advancePaidLC += advancePaidLC;
    summary.remainingBalanceLC += remainingLC;
  });

  return summary;
}

function date(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB");
}

function monthMatch(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function weekDue(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const sevenDays = new Date(now);
  sevenDays.setDate(now.getDate() + 7);
  return d >= now && d <= sevenDays;
}

function kpis(rows: PurchaseOrderRow[], mode: PaymentMode, baseCurrency: string): KpiCard[] {
  const count = rows.length;

  if (mode === "remaining") {
    const totalRemaining = rows.reduce((sum, row) => sum + numeric(row.remaining_due), 0);
    const totalRemainingPaid = rows.reduce((sum, row) => sum + numeric(row.remaining_paid), 0);
    const totalOutstanding = Math.max(0, totalRemaining - totalRemainingPaid);

    return [
      {
        label: "Total POs",
        value: String(count),
        sublabel: "All Purchase Orders",
        icon: <FileText className="h-5 w-5" />,
        tone: "blue"
      },
      {
        label: "Total Remaining",
        value: money(totalRemaining),
        sublabel: baseCurrency,
        icon: <Banknote className="h-5 w-5" />,
        tone: "green"
      },
      {
        label: "Cleared Amount",
        value: money(totalRemainingPaid),
        sublabel: baseCurrency,
        icon: <CheckCircle className="h-5 w-5" />,
        tone: "amber"
      },
      {
        label: "Outstanding Due",
        value: money(totalOutstanding),
        sublabel: baseCurrency,
        icon: <XCircle className="h-5 w-5" />,
        tone: "red"
      }
    ];
  }

  if (mode === "credit" || mode === "charges") {
    const totalCredit = rows.reduce((sum, row) => sum + numeric(row.credit_amount), 0);
    const usedCredit = rows.filter((row) => numeric(row.credit_amount) > 0).reduce((sum, row) => sum + numeric(row.credit_amount), 0);
    const availableCredit = Math.max(0, totalCredit - usedCredit);

    return [
      {
        label: "Total POs",
        value: String(count),
        sublabel: "All Purchase Orders",
        icon: <FileText className="h-5 w-5" />,
        tone: "blue"
      },
      {
        label: "Total Credit",
        value: money(totalCredit),
        sublabel: baseCurrency,
        icon: <Banknote className="h-5 w-5" />,
        tone: "green"
      },
      {
        label: "Used Credit",
        value: money(usedCredit),
        sublabel: baseCurrency,
        icon: <CheckCircle className="h-5 w-5" />,
        tone: "amber"
      },
      {
        label: "Available Credit",
        value: money(availableCredit),
        sublabel: baseCurrency,
        icon: <XCircle className="h-5 w-5" />,
        tone: "red"
      }
    ];
  }

  // advance mode (mockup style)
  const totalAdvanceRequired = rows.reduce((sum, row) => {
    const form = row.form_data?.form || {};
    const totalPrice = row.form_data?.goodsEntries?.length
      ? row.form_data.goodsEntries.reduce((s: number, g: any) => s + Number(g.totalAmount || 0), 0)
      : Number(form.totalAmount || 0);
    const advancePercent = Number(form.advancePercent || 0);
    const rate = row.exchange_rate || form.exchangeRate || 1;
    return sum + ((totalPrice * advancePercent) / 100) * rate;
  }, 0);
  const totalPaidAdvance = rows.reduce((sum, row) => sum + numeric(row.advance_paid), 0);
  const pendingAdvance = Math.max(0, totalAdvanceRequired - totalPaidAdvance);

  return [
    {
      label: "Total POs",
      value: String(count),
      sublabel: "All Purchase Orders",
      icon: <FileText className="h-5 w-5" />,
      tone: "blue"
    },
    {
      label: "Total Advance",
      value: money(totalAdvanceRequired),
      sublabel: baseCurrency,
      icon: <Banknote className="h-5 w-5" />,
      tone: "green"
    },
    {
      label: "Paid Advance",
      value: money(totalPaidAdvance),
      sublabel: baseCurrency,
      icon: <CheckCircle className="h-5 w-5" />,
      tone: "amber"
    },
    {
      label: "Pending Advance",
      value: money(pendingAdvance),
      sublabel: baseCurrency,
      icon: <XCircle className="h-5 w-5" />,
      tone: "red"
    }
  ];
}

function statusClass(status: string | null | undefined) {
  const value = (status || "Pending").toLowerCase();
  if (value.includes("paid") || value.includes("posted") || value.includes("clear")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value.includes("overdue") || value.includes("expired")) return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (value.includes("pending") || value.includes("due")) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function exportRows(rows: PurchaseOrderRow[], mode: PaymentMode) {
  try {
    const headers = ["PO Number", "Contract", "Date", "Currency", "Order Total", "Advance", "Remaining", "Credit", "Payment Status", "Journal Status"];
    const body = rows.map((row) =>
      [
        row.purchase_order_no,
        row.purchase_contract_no ?? "-",
        date(row.created_at),
        row.currency_code ?? "-",
        money(row.order_total),
        money(row.advance_paid),
        money(row.remaining_due),
        money(row.credit_amount),
        row.payment_status ?? "Pending",
        row.ledger_posting_status ?? "Pending"
      ].map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const modeLabel = modeLabels[mode] || String(mode);
    anchor.download = `purchase-order-${modeLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export rows:", error);
    alert("Failed to export to CSV. Please try again.");
  }
}

const SAVED_BANKS_KEY = "erp_saved_banks_v1";
const SAVED_METHODS_KEY = "erp_saved_payment_methods_v1";

type SavedBankItem = { name: string; address?: string };

function readLocalList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLocalList(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function readLocalBankList(key: string): SavedBankItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBankList(key: string, values: SavedBankItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function ledgerId(row: any): string | undefined {
  return row?.id ?? row?.ledgerId;
}

function ledgerCode(row: any): string {
  return String(row?.code ?? row?.ledgerCode ?? row?.accountCode ?? "");
}

function ledgerName(row: any): string {
  return String(row?.name ?? row?.ledgerName ?? row?.accountName ?? "");
}

function ledgerCurrency(row: any): string {
  return String(row?.currency ?? row?.ledgerCurrency ?? "");
}

function toLedgerOption(row: any): SearchSelectOption {
  const account = ledgerName(row);
  const accountNo = ledgerCode(row);
  const label = `${accountNo} - ${account}`;
  const keywords = [accountNo, account].filter(Boolean).join(" ");
  return { value: ledgerId(row) || "", label, keywords };
}

function getInitialPurchaseOrderNo(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("purchaseOrderNo") ?? "";
}

function FieldBlock({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
        {required ? <span className="text-red-605"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function NestedRowActions({ payment, row, ledgers, localCurrency }: any) {
  function handleAction(fn: () => void) {
    fn();
    const details = document.activeElement?.closest("details");
    if (details) (details as HTMLDetailsElement).open = false;
  }
  return (
    <details className="relative">
      <summary className="flex h-7 w-8 cursor-pointer list-none items-center justify-center rounded border border-indigo-200 bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 [&::-webkit-details-marker]:hidden mx-auto" aria-label="Payment actions" title="Actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-36 rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl">
        <MenuAction icon={<Eye />} label="View Details" onClick={() => handleAction(() => handlePrintReceipt(payment, row, ledgers, localCurrency, false))} />
        <MenuAction icon={<Edit3 />} label="Edit" onClick={() => handleAction(() => window.dispatchEvent(new CustomEvent("open-edit-payment", { detail: { payment, row } })))} />
        <MenuAction icon={<Printer />} label="Print Receipt" onClick={() => handleAction(() => handlePrintReceipt(payment, row, ledgers, localCurrency, true))} />
      </div>
    </details>
  );
}

function NestedPaymentHistory({ row, ledgers, baseCurrency, activeMode }: { row: any, ledgers: any[], baseCurrency: string, activeMode: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPayments() {
      setLoading(true);
      try {
        const response = await fetch(`/api/erp/purchases/orders/${row.id}/payments`, { credentials: "include" });
        const body = await response.json();
        if (body?.ok && body.data?.payments && !cancelled) {
          setPayments(body.data.payments);
        }
      } catch (err) {
        console.error("Failed to load nested payments:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPayments();
    return () => { cancelled = true; };
  }, [row.id]);

  const form = row.form_data?.form || {};
  const totalPrice = row.form_data?.goodsEntries?.length
    ? row.form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
    : Number(form.totalAmount || 0);
  const advancePercent = Number(form.advancePercent || 0);
  const totalRequiredAdvanceFC = (totalPrice * advancePercent) / 100;
  
  // Filter out the initial booking liability transfer so it only shows actual payments
  const filteredPayments = payments.filter((p: any) => !p.narration?.toLowerCase().includes("initial booking transfer"));
  
  // Payments come newest first
  const historyWithBalance = filteredPayments.map((p: any) => {
    const amtUSD = Number(p.amount || 0) / Number(p.exchange_rate || 1);
    return { ...p, amount_usd: amtUSD };
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
          Ã¢Å¾â€¢ Traceable Payment History (Nested Journal Entries)
        </h4>
        {loading && (
          <span className="text-[10px] font-semibold text-slate-400 animate-pulse">Loading history...</span>
        )}
      </div>
      {payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 border-b font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3 border-r">Journal Serials</th>
                <th className="px-4 py-3 border-r">User & Date</th>
                <th className="px-4 py-3 text-right border-r">Paid (Foreign)</th>
                <th className="px-4 py-3 text-center border-r">Exchange Rate</th>
                <th className="px-4 py-3 text-right border-r">Paid (Local)</th>
                <th className="px-4 py-3 border-r">Ledger Postings</th>
                <th className="px-4 py-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyWithBalance.map((p) => {
                const drLedger = ledgers.find((l) => ledgerId(l) === p.debit_ledger_id);
                const crLedger = ledgers.find((l) => ledgerId(l) === p.credit_ledger_id);
                const drLabel = drLedger ? ledgerName(drLedger) : "-";
                const crLabel = crLedger ? ledgerName(crLedger) : "-";
                const localCurrency = (ledgerCurrency(drLedger) || ledgerCurrency(crLedger) || baseCurrency).toUpperCase();
                const re = p.roznamcha_entries || {};

                return (
                  <tr key={p.id} className="border-b border-indigo-100/50 hover:bg-indigo-50/40 transition">
                    <td className="px-4 py-3 border-r font-mono text-slate-900 dark:text-slate-100 text-[10px] align-top space-y-1">
                      <div><span className="text-muted-foreground font-semibold">Admin:</span> <span className="font-bold">{re.super_admin_serial_number || "Ã¢â‚¬â€"}</span></div>
                      <div><span className="text-muted-foreground font-semibold">Country:</span> <span className="font-bold">{re.country_transaction_serial_number || "-"}</span></div>
                      <div><span className="text-muted-foreground font-semibold">Branch:</span> <span className="font-bold">{re.branch_transaction_serial_number || "-"}</span></div>
                    </td>
                    <td className="px-4 py-3 border-r text-xs align-top space-y-1">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.users?.full_name || row.form_data?.form?.userName || "Admin"}</div>
                      <div className="text-muted-foreground">{date(p.entry_date || p.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap border-r align-top">
                      <div className="text-sm">{money(p.amount_usd, p.currency_code || "USD")}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600 whitespace-nowrap border-r align-top">
                      <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold inline-block">
                        {Number(p.exchange_rate || 1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap border-r align-top">
                      <div className="text-sm">{money(p.amount, localCurrency)}</div>
                    </td>
                    <td className="px-4 py-3 border-r text-[10px] align-top">
                      <div className="font-semibold text-indigo-600 mb-1 leading-tight" title={drLabel}><span className="font-black text-indigo-800 mr-1">DR:</span>{drLabel}</div>
                      <div className="font-semibold text-violet-600 leading-tight" title={crLabel}><span className="font-black text-violet-800 mr-1">CR:</span>{crLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <NestedRowActions payment={p} row={row} ledgers={ledgers} localCurrency={localCurrency} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic py-2">
          {loading ? "Loading payments..." : "No payments posted for this purchase order yet."}
        </p>
      )}
    </div>
  );
}

const getFlag = (country: string) => {
  if (!country) return "🏳️";
  const c = country.toUpperCase();
  if (c.includes("PAKISTAN")) return "🇵🇰";
  if (c.includes("UNITED ARAB") || c === "UAE") return "🇦🇪";
  if (c.includes("UNITED STATES") || c === "USA") return "🇺🇸";
  if (c.includes("SAUDI")) return "🇸🇦";
  if (c.includes("CHINA")) return "🇨🇳";
  if (c.includes("INDIA")) return "🇮🇳";
  if (c.includes("AFGHANISTAN")) return "🇦🇫";
  if (c.includes("UNITED KINGDOM") || c === "UK") return "🇬🇧";
  if (c.includes("CANADA")) return "🇨🇦";
  if (c.includes("AUSTRALIA")) return "🇦🇺";
  return "🏳️";
};

function DashboardSummaryHeader({ summary, mode }: { summary: DashboardSummaryData, mode: string }) {
  if (!summary) return null;

  const notTransferredPercentLC = summary.totalPurchaseLC > 0 ? (summary.remainingBalanceLC / summary.totalPurchaseLC) * 100 : 0;
  const numCurrencies = Object.keys(summary.foreignCurrencies).length;
  const reportType = mode === "advance" ? "Advance Payment Summary" : mode === "credit" ? "Credit Payment Summary" : "Purchase Payment Summary";
  const now = new Date();
  
  // Format Date & Time based on Pakistan time (or local system)
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  return (
    <div className="flex flex-col mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Panel 1: Branch & User Details */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
            <div className="bg-blue-600 p-1 rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400">1. BRANCH & USER DETAILS</h4>
          </div>
          <div className="p-4 flex flex-col gap-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span>Country:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">{getFlag(summary.country)} {summary.country}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Branch Name:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{summary.branchName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>User ID:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{summary.userId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>User Name:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{summary.userName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Role:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{summary.role}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Date & Time:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{dateStr}, {timeStr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-[10px]">Active</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Purchase Summary */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-900/10">
            <div className="bg-purple-600 p-1 rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-800 dark:text-purple-400">2. PURCHASE SUMMARY (ALL CURRENCIES)</h4>
          </div>
          <div className="p-4 flex flex-col gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></div> Total Transactions:</span>
              <span className="font-black text-slate-800 dark:text-slate-200">{summary.totalTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div> Purchase Currencies:</span>
              <span className="font-black text-slate-800 dark:text-slate-200">{numCurrencies}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div> Total Purchase (All):</span>
              <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{summary.totalAllFC.totalPurchase.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg></div> Total Invoice / Advance (All):</span>
              <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{summary.totalAllFC.advancePaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-auto border-t border-dashed border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-rose-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div> Total Not Transferred (All):</span>
              <span className="font-black text-rose-600 dark:text-rose-400 font-mono">{summary.totalAllFC.remainingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-rose-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div> % Not Transferred:</span>
              <span className="font-black text-rose-600 dark:text-rose-400">{summary.totalAllFC.totalPurchase > 0 ? ((summary.totalAllFC.remainingBalance / summary.totalAllFC.totalPurchase) * 100).toFixed(2) : "0.00"}%</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Final Office Currency */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <div className="bg-emerald-600 p-1 rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">3. FINAL OFFICE CURRENCY SUMMARY ({summary.localCurrency})</h4>
          </div>
          <div className="p-4 flex flex-col gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div> Total Amount ({summary.localCurrency}):</span>
              <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{summary.totalPurchaseLC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg></div> Invoice / Advance ({summary.localCurrency}):</span>
              <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{summary.advancePaidLC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-auto border-t border-dashed border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-rose-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div> Not Transferred ({summary.localCurrency}):</span>
              <span className="font-black text-rose-600 dark:text-rose-400 font-mono">{summary.remainingBalanceLC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-rose-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div> % Not Transferred:</span>
              <span className="font-black text-rose-600 dark:text-rose-400">{notTransferredPercentLC.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Panel 4: Transaction Summary */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-900/10">
            <div className="bg-orange-600 p-1 rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-orange-800 dark:text-orange-400">4. TRANSACTION SUMMARY</h4>
          </div>
          <div className="p-4 flex flex-col gap-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span>Total Transactions:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{summary.totalTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Purchase Currencies:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{numCurrencies}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Final Currency:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{summary.localCurrency}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Exchange Rate Type:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Live</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Last Updated:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{dateStr}, {timeStr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Report Type:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{reportType}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export function PurchaseOrderPaymentJournal({ mode = "advance" }: { mode?: PaymentMode }) {
  const router = useRouter();
  const activeMode: PaymentMode = mode === "charges" ? "credit" : mode;
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const selectOrder = (id: string) => {
    setSelectedId(id);
    setTimeout(() => {
      const el = document.getElementById("ledger-cash-entry-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 250);
  };
  const [query, setQuery] = useState("");
  const [draftFilter, setDraftFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<any>(null);
  const [reportNow, setReportNow] = useState<{ date: string; time: string } | null>(null);
  const [liveRates, setLiveRates] = useState<any[]>([]);

  // Super Admin Filtering for Source Ledger
  const [saCountryId, setSaCountryId] = useState<string>("");
  const [saBranchId, setSaBranchId] = useState<string>("");
  const [saCountries, setSaCountries] = useState<any[]>([]);
  const [saBranches, setSaBranches] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadSaFilters() {
      try {
        const [cRes, bRes] = await Promise.all([
          fetch("/api/erp/locations/countries").then(r => r.json()),
          fetch("/api/erp/locations/city-branches?limit=1000").then(r => r.json())
        ]);
        if (!cancelled) {
          if (cRes.ok) setSaCountries(cRes.data || []);
          if (bRes.ok) setSaBranches(bRes.data?.data || bRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load SA filters", err);
      }
    }
    loadSaFilters();
    return () => { cancelled = true; };
  }, []);

  // Redesign state hooks
  const [viewingRow, setViewingRow] = useState<PurchaseOrderRow | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<{payment: any, row: any} | null>(null);

  useEffect(() => {
    const handleOpenEdit = (e: any) => {
      setEditingPayment(e.detail);
    };
    window.addEventListener("open-edit-payment", handleOpenEdit);
    return () => window.removeEventListener("open-edit-payment", handleOpenEdit);
  }, []);

  const handleOpenA4PDF = async (row: PurchaseOrderRow, autoPrint = false) => {
    const form = row.form_data?.form || {};
    const goods = row.form_data?.goodsEntries || [];
    const totals = row.form_data?.totals || {};

    let paymentHistory: any[] = [];
    try {
      const response = await fetch(`/api/erp/purchases/orders/${row.id}/payments`, { credentials: "include" });
      const body = await response.json();
      if (body?.ok && body.data?.payments) {
        paymentHistory = body.data.payments.filter((p: any) => !p.narration?.toLowerCase().includes("initial booking transfer"));
      }
    } catch (err) {
      console.error("Failed to load nested payments for statement:", err);
    }

    const purchaseData: PurchaseReportData = {
      id: row.id,
      purchaseBookingOrderNumber: row.purchase_order_no,
      purchaseDate: form.purchaseDate || row.created_at || "",
      bookingDate: form.bookingDate || form.purchaseDate || row.created_at || "",
      purchaseAccountName: form.purchaseAccountName || "Dubai Purchase Account",
      purchaseAccountNumber: form.purchaseAccountNo || "AE-AC-0001",
      salesAccountName: form.salesAccountName || "Damaan Sales Account",
      salesAccountNumber: form.salesAccountNo || "SA-2001",
      supplierName: form.salesAccountName || "N/A",
      buyerName: form.purchaseAccountName || "N/A",
      productName: goods.map((g: any) => g.goodsName).filter(Boolean).join(", ") || form.goodsName || "N/A",
      goodsDescription: form.orderReportRemarks || "",
      quantity: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.qtyNo || 0), 0) : Number(form.qtyNo || 0),
      unit: goods[0]?.qtyName || form.qtyName || "BAGS",
      totalWeight: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0),
      containerCount: Number(form.containersCount || form.containerCount || 1),
      purchaseRate: goods.length ? (goods.reduce((sum: number, g: any) => sum + Number(g.coursePrice || 0), 0) / goods.length) : Number(form.coursePrice || 0),
      totalPurchaseAmount: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0),
      currency: row.currency_code || "USD",
      status: row.payment_status || "Pending",
      paymentStatus: row.payment_status || "Pending",
      branchName: form.purchaseAccountBranch || "Kabul Main Branch",
      countryName: form.loadingCountry || "N/A",
      createdAt: row.created_at || "",
      form_data: row.form_data || {},
      paymentHistory,
      audit: {
        userName: session?.name || session?.username || "SUPER ADMIN",
        userId: session?.id || "USR-1001",
        branchCode: form.branchCode || "QTA-01"
      }
    };

    openPurchaseA4ReportWindow({
      title: "Purchase Master Verification Report",
      purchaseData,
      autoPrint,
      lang: "en"
    });
  };

  // Ledger Entry Panel state
  const [paymentSourceLedgerId, setPaymentSourceLedgerId] = useState("");
  const [roznamchaType, setRoznamchaType] = useState("Cash Book No.");
  const [roznamchaNumber, setRoznamchaNumber] = useState("000123");
  const [paymentType, setPaymentType] = useState<"" | "bank" | "business" | "invoice" | "cash" | "transfer">("");
  const [currency, setCurrency] = useState("USD");
  const [calcAmount, setCalcAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [calcOp, setCalcOp] = useState<"mul" | "div">("mul");
  const [finalPayment, setFinalPayment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [typeDetails, setTypeDetails] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  // Local cache for Bank/Method quick add
  const [savedBanks, setSavedBanks] = useState<SavedBankItem[]>([]);
  const [savedMethods, setSavedMethods] = useState<string[]>([]);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<"bank" | "method">("bank");
  const [activeTab, setActiveTab] = useState<"remaining" | "advance" | "history">("advance");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [titleSlot, setTitleSlot] = useState<Element | null>(null);
  const [actionsSlot, setActionsSlot] = useState<Element | null>(null);

  useEffect(() => {
    setTitleSlot(document.getElementById("erp-page-title-slot"));
    setActionsSlot(document.getElementById("erp-page-actions-slot"));
  }, []);

  const [addOptionValue, setAddOptionValue] = useState("");
  const [addOptionAddress, setAddOptionAddress] = useState("");

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [selectedOrderPayments, setSelectedOrderPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setSelectedOrderPayments([]);
      return;
    }
    let cancelled = false;
    async function fetchPayments() {
      setLoadingPayments(true);
      try {
        const response = await fetch(`/api/erp/purchases/orders/${selectedId}/payments`, { credentials: "include" });
        const body = await response.json();
        if (body?.ok && body.data?.payments && !cancelled) {
          setSelectedOrderPayments(body.data.payments);
        }
      } catch (err) {
        console.error("Failed to load payments for selected order:", err);
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    }
    void fetchPayments();
    return () => { cancelled = true; };
  }, [selectedId]);
/* ===== DUPLICATED BLOCK REMOVED =====
export function PurchaseOrderPaymentJournal({ mode = "advance" }: { mode?: PaymentMode }) {
  const router = useRouter();
  const activeMode: PaymentMode = mode === "charges" ? "credit" : mode;
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const selectOrder = (id: string) => {
    setSelectedId(id);
    setTimeout(() => {
      const el = document.getElementById("ledger-cash-entry-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 250);
  };
  const [query, setQuery] = useState("");
  const [draftFilter, setDraftFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<any>(null);
  const [reportNow, setReportNow] = useState<{ date: string; time: string } | null>(null);
  const [liveRates, setLiveRates] = useState<any[]>([]);
  const [liveRates, setLiveRates] = useState<any[]>([]);

  // Super Admin Filtering for Source Ledger
  const [saCountryId, setSaCountryId] = useState<string>("");
  const [saBranchId, setSaBranchId] = useState<string>("");
  const [saCountries, setSaCountries] = useState<any[]>([]);
  const [saBranches, setSaBranches] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadSaFilters() {
      try {
        const [cRes, bRes] = await Promise.all([
          fetch("/api/erp/locations/countries").then(r => r.json()),
          fetch("/api/erp/locations/city-branches?limit=1000").then(r => r.json())
        ]);
        if (!cancelled) {
          if (cRes.ok) setSaCountries(cRes.data || []);
          if (bRes.ok) setSaBranches(bRes.data?.data || bRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load SA filters", err);
      }
    }
    loadSaFilters();
    return () => { cancelled = true; };
  }, []);

  // Redesign state hooks
  const [viewingRow, setViewingRow] = useState<PurchaseOrderRow | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<{payment: any, row: any} | null>(null);

  useEffect(() => {
    const handleOpenEdit = (e: any) => {
      setEditingPayment(e.detail);
    };
    window.addEventListener("open-edit-payment", handleOpenEdit);
    return () => window.removeEventListener("open-edit-payment", handleOpenEdit);
  }, []);

  const handleOpenA4PDF = async (row: PurchaseOrderRow, autoPrint = false) => {
    const form = row.form_data?.form || {};
    const goods = row.form_data?.goodsEntries || [];
    const totals = row.form_data?.totals || {};

    let paymentHistory: any[] = [];
    try {
      const response = await fetch(`/api/erp/purchases/orders/${row.id}/payments`, { credentials: "include" });
      const body = await response.json();
      if (body?.ok && body.data?.payments) {
        paymentHistory = body.data.payments.filter((p: any) => !p.narration?.toLowerCase().includes("initial booking transfer"));
      }
    } catch (err) {
      console.error("Failed to load nested payments for statement:", err);
    }

    const purchaseData: PurchaseReportData = {
      id: row.id,
      purchaseBookingOrderNumber: row.purchase_order_no,
      purchaseDate: form.purchaseDate || row.created_at || "",
      bookingDate: form.bookingDate || form.purchaseDate || row.created_at || "",
      purchaseAccountName: form.purchaseAccountName || "Dubai Purchase Account",
      purchaseAccountNumber: form.purchaseAccountNo || "AE-AC-0001",
      salesAccountName: form.salesAccountName || "Damaan Sales Account",
      salesAccountNumber: form.salesAccountNo || "SA-2001",
      supplierName: form.salesAccountName || "N/A",
      buyerName: form.purchaseAccountName || "N/A",
      productName: goods.map((g: any) => g.goodsName).filter(Boolean).join(", ") || form.goodsName || "N/A",
      goodsDescription: form.orderReportRemarks || "",
      quantity: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.qtyNo || 0), 0) : Number(form.qtyNo || 0),
      unit: goods[0]?.qtyName || form.qtyName || "BAGS",
      totalWeight: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0),
      containerCount: Number(form.containersCount || form.containerCount || 1),
      purchaseRate: goods.length ? (goods.reduce((sum: number, g: any) => sum + Number(g.coursePrice || 0), 0) / goods.length) : Number(form.coursePrice || 0),
      totalPurchaseAmount: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0),
      currency: row.currency_code || "USD",
      status: row.payment_status || "Pending",
      paymentStatus: row.payment_status || "Pending",
      branchName: form.purchaseAccountBranch || "Kabul Main Branch",
      countryName: form.loadingCountry || "N/A",
      createdAt: row.created_at || "",
      form_data: row.form_data || {},
      paymentHistory,
      audit: {
        userName: session?.name || session?.username || "SUPER ADMIN",
        userId: session?.id || "USR-1001",
        branchCode: form.branchCode || "QTA-01"
      }
    };

    openPurchaseA4ReportWindow({
      title: "Purchase Master Verification Report",
      purchaseData,
      autoPrint,
      lang: "en"
    });
  };

  // Ledger Entry Panel state
  const [paymentSourceLedgerId, setPaymentSourceLedgerId] = useState("");
  const [roznamchaType, setRoznamchaType] = useState("Cash Book No.");
  const [roznamchaNumber, setRoznamchaNumber] = useState("000123");
  const [paymentType, setPaymentType] = useState<"" | "bank" | "business" | "invoice" | "cash" | "transfer">("");
  const [currency, setCurrency] = useState("USD");
  const [calcAmount, setCalcAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [calcOp, setCalcOp] = useState<"mul" | "div">("mul");
  const [finalPayment, setFinalPayment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [typeDetails, setTypeDetails] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  // Local cache for Bank/Method quick add
  const [savedBanks, setSavedBanks] = useState<SavedBankItem[]>([]);
  const [savedMethods, setSavedMethods] = useState<string[]>([]);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<"bank" | "method">("bank");
  const [activeTab, setActiveTab] = useState<"remaining" | "advance" | "history">("advance");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [titleSlot, setTitleSlot] = useState<Element | null>(null);
  const [actionsSlot, setActionsSlot] = useState<Element | null>(null);

  useEffect(() => {
    setTitleSlot(document.getElementById("erp-page-title-slot"));
    setActionsSlot(document.getElementById("erp-page-actions-slot"));
  }, []);

  const [addOptionValue, setAddOptionValue] = useState("");
  const [addOptionAddress, setAddOptionAddress] = useState("");

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [selectedOrderPayments, setSelectedOrderPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setSelectedOrderPayments([]);
      return;
    }
    let cancelled = false;
    void fetchPayments();
    return () => { cancelled = true; };
  }, [selectedId]);
===== END DUPLICATED BLOCK ===== */

  useEffect(() => {
    let cancelled = false;
    async function fetchSession() {
      try {
        const response = await fetch("/api/erp/auth/session", { credentials: "include" });
        const body = await response.json();
        if (body?.ok && !cancelled) setSession(body.data);
      } catch (err) { console.error("Session load error:", err); }
    }
    fetchSession();
    return () => { cancelled = true; };
  }, []);

  const [ledgers, setLedgers] = useState<any[]>([]);
  const isSuperAdmin = useMemo(() => session ? (session.scopes?.isSuperAdmin || session.roles?.includes("super_admin")) : true, [session]);
  const selectedOrderForLedger = useMemo(
    () => selectedId ? orders.find((row) => row.id === selectedId) ?? null : null,
    [orders, selectedId]
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchLedgers() {
      try {
        const { listLedgerReportLedgers } = await import("@/features/reports/ledger-report/ledger-report-api");
        const scopedCountryId = isSuperAdmin && saCountryId ? saCountryId : (selectedOrderForLedger?.country_id ?? null);
        const scopedCountryBranchId = selectedOrderForLedger?.country_branch_id ?? null;
        const scopedCityBranchId = isSuperAdmin && saBranchId ? saBranchId : (selectedOrderForLedger?.city_branch_id ?? null);
        
        const res = await listLedgerReportLedgers({
          reportScope: isSuperAdmin ? "super_admin" : scopedCityBranchId ? "branch" : "country",
          countryId: scopedCountryId,
          countryBranchId: isSuperAdmin ? null : scopedCountryBranchId,
          cityBranchId: scopedCityBranchId,
          limit: 1000
        });
        if (!cancelled) {
          setLedgers(Array.isArray(res.ledgers) ? res.ledgers : []);
        }
      } catch (err) {
        console.error("Ledger load error:", err);
      }
    }
    fetchLedgers();
    return () => { cancelled = true; };
  }, [isSuperAdmin, saCountryId, saBranchId, selectedOrderForLedger?.country_id, selectedOrderForLedger?.country_branch_id, selectedOrderForLedger?.city_branch_id]);

  useEffect(() => {
    let cancelled = false;
    async function fetchRates() {
      try {
        const res = await fetch("/api/erp/currency/monitoring?limit=100");
        const body = await res.json();
        if (!cancelled && body?.countries) {
          setLiveRates(body.countries);
        }
      } catch (e) {
        console.error("Failed to load live currency rates", e);
      }
    }
    fetchRates();
    return () => { cancelled = true; };
  }, []);

  const getEffectiveRate = React.useCallback((row: any) => {
    const countryName = rowCountryName(row) || "";
    const countryId = row.country_id;
    const rateData = liveRates.find((c: any) => 
      c.countryId === countryId || 
      (c.countryName && countryName && c.countryName.toLowerCase() === countryName.toLowerCase())
    );
    if (rateData) {
       const live = rateData.latestSellRate || rateData.latestDebitRate || rateData.latestBuyRate || rateData.latestCreditRate;
       if (live && live > 0) return live;
    }
    const form = row.form_data?.form || {};
    return row.exchange_rate || form.exchangeRate || 1;
  }, [liveRates]);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/erp/purchases/orders?limit=200", { cache: "no-store", credentials: "include" });
      const body = await response.json();
      if (!response.ok || body?.ok === false) throw new Error(body?.error?.message ?? body?.message ?? "Unable to load purchase orders.");
      const payload = (body?.data ?? body) as OrdersPayload | PurchaseOrderRow[];
      const rows = Array.isArray(payload) ? payload : payload.orders ?? [];
      setOrders(rows);
      // Auto-select by URL param
      const urlOrderNo = getInitialPurchaseOrderNo();
      if (urlOrderNo) {
        const match = rows.find((r) => r.purchase_order_no === urlOrderNo);
        if (match) setSelectedId(match.id);
      }
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Unable to load purchase order payment records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const now = new Date();
    setReportNow({
      date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
      time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toUpperCase()
    });
  }, []);
  
  useEffect(() => {
    setPageIndex(0);
  }, [activeMode]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const draft = draftFilter.trim().toLowerCase();
    return orders.filter((row) => {
      const postingStatus = row.ledger_posting_status?.toLowerCase();
      const workflowTransferStatus = row.form_data?.workflow?.transferStatus?.toLowerCase();
      const hasTransferAudit = Boolean(row.form_data?.form?.transferAudit);
      const isPosted = row.status === "Posted"
        || row.status?.toLowerCase() === "posted"
        || postingStatus === "posted"
        || postingStatus === "transferred"
        || workflowTransferStatus === "transferred"
        || hasTransferAudit
        || row.form_data?.workflow?.journalStatus === "Posted"
        || row.form_data?.workflow?.journalStatus?.toLowerCase() === "posted"
        || (row as any).journalStatus?.toLowerCase() === "posted";
      const isEligibleForPayment = isPosted;
      if (!isEligibleForPayment) return false;
      if (draft && !(row.payment_status ?? "").toLowerCase().includes(draft)) return false;
      if (countryFilter && rowCountryName(row) !== countryFilter) return false;
      if (branchFilter && rowBranchName(row) !== branchFilter) return false;
      if (currencyFilter && rowCurrency(row) !== currencyFilter) return false;

      // Extract form values for clearance calculation
      const form = row.form_data?.form || {};
      const totals = row.form_data?.totals || {};
      const finalAmount = orderTotal(row);
      const advancePercent = Number(form.advancePercent || 0);
      const requiredAdvance = (finalAmount * advancePercent) / 100;
      const paidAdvance = Number(row.advance_paid || 0);
      const remainingAdvance = requiredAdvance - paidAdvance;
      const remainingDue = Number(row.remaining_due || 0);
      const isCreditPaid = (row.payment_status || "").toLowerCase().includes("posted") || 
                           (row.payment_status || "").toLowerCase().includes("paid");

      const isAdvanceCleared = advancePercent > 0 ? remainingAdvance <= 0.01 : paidAdvance > 0;
      const isRemainingCleared = remainingDue <= 0.01;

      if (activeMode === "advance") {
        // Show all pending POs even if advancePercent is 0, so users can make manual advance payments
        const isFullyPaid = (row.payment_status || "").toLowerCase() === "paid" || (row.payment_status || "").toLowerCase() === "completed";
        if (isFullyPaid) return false;
        
        if (advancePercent > 0 && remainingAdvance <= 0.01) return false; // Already cleared required advance

      } else if (activeMode === "advance_completed") {
        if (advancePercent === 0) return false;
        if (remainingAdvance > 0.01) return false; // Not yet cleared
        if (paidAdvance <= 0) return false; // Not paid anything
      } else if (activeMode === "remaining") {
        if (remainingDue <= 0.01) return false; // Already cleared
        // Remaining payments should appear as soon as any loading/container movement exists.
        // This supports partial flow: 2 paid/loaded containers move forward while 8 remain payable.
        const workflow = row.form_data?.workflow || {};
        const containerStatus = String(workflow.containerStatus || "").toLowerCase();
        const loadedContainers = Number(workflow.loadedContainers || workflow.paidContainers || 0);
        const remainingContainers = Number(workflow.remainingContainers || 0);
        const hasContainerMovement =
          loadedContainers > 0 ||
          remainingContainers > 0 ||
          containerStatus.includes("loaded") ||
          containerStatus.includes("loading") ||
          containerStatus.includes("partial");
        if (!hasContainerMovement) return false;
      } else if (activeMode === "credit") {
        if (isCreditPaid) return false; // Already cleared
      } else if (activeMode === "history") {
        // Show in history if fully cleared
        const isFullyCleared = (advancePercent > 0 ? isAdvanceCleared : true) && isRemainingCleared;
        if (!isFullyCleared && !isCreditPaid) return false;
      }

      if (!needle) return true;
      const supplierName = form.salesAccountName || "";
      const supplierCode = form.salesAccountNo || "";
      return [row.purchase_order_no, row.purchase_contract_no, row.payment_status, row.currency_code, supplierName, supplierCode, rowCountryName(row), rowBranchName(row)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [activeMode, branchFilter, countryFilter, currencyFilter, draftFilter, orders, query]);

  const selected = selectedId ? (filtered.find((row) => row.id === selectedId) ?? null) : null;
  const pageRows = useMemo(() => {
    return filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [filtered, pageIndex, pageSize]);

  function reset() {
    setQuery("");
    setDraftFilter("");
    setCountryFilter("");
    setBranchFilter("");
    setCurrencyFilter("");
    setPageIndex(0);
  }

  // Derived account info from form_data
  const selectedForm = (selected as any)?.form_data?.form || {};
  const debitAccountCode = selectedForm.purchaseAccountNo || "-";
  const debitAccountName = selectedForm.purchaseAccountName || "Purchase Account";
  const debitAccountBranch = selectedForm.purchaseAccountBranch || "-";
  const creditAccountCode = selectedForm.salesAccountNo || "-";
  const creditAccountName = selectedForm.salesAccountName || "Sales Account";
  const creditAccountBranch = selectedForm.salesAccountBranch || "-";
  const orderTotalUsd = Number(selected?.order_total || 0);
  const advancePct = Number(selectedForm.advancePercent || 0);

  const cashLedger = useMemo(() => {
    return ledgers.find((l) => ledgerCode(l) === "CASH-001") ||
           ledgers.find((l) => ledgerCode(l).toLowerCase().includes("cash") || ledgerName(l).toLowerCase().includes("cash")) ||
           ledgers.find((l) => ledgerCode(l).toLowerCase().includes("bank") || ledgerName(l).toLowerCase().includes("bank")) ||
           ledgers[0];
  }, [ledgers]);

  // Set default paymentSourceLedgerId and sync Category & Type once cashLedger is loaded
  useEffect(() => {
    if (cashLedger && !paymentSourceLedgerId) {
      setPaymentSourceLedgerId(ledgerId(cashLedger) || "");
      const name = ledgerName(cashLedger).toLowerCase();
      const code = ledgerCode(cashLedger).toLowerCase();
      if (name.includes("cash") || code.includes("cash")) {
        setPaymentType("cash");
        setRoznamchaType("Cash Book No.");
      } else if (name.includes("bank") || code.includes("bank")) {
        setPaymentType("bank");
        setRoznamchaType("Roznamcha Book No.");
      }
    }
  }, [cashLedger, paymentSourceLedgerId]);

  const selectedSourceLedger = useMemo(() => {
    return ledgers.find((l) => ledgerId(l) === paymentSourceLedgerId) || cashLedger || null;
  }, [ledgers, paymentSourceLedgerId, cashLedger]);

  const sourceBalanceText = useMemo(() => {
    if (!selectedSourceLedger) return "Ã¢â‚¬â€ ";
    const bal = Number(selectedSourceLedger.current_balance ?? 0);
    return `${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ledgerCurrency(selectedSourceLedger) || "PKR"}`;
  }, [selectedSourceLedger]);

  const purchaseLedger = useMemo(() => {
    const code = selectedForm.purchaseAccountNumber || selectedForm.purchaseAccountNo;
    return ledgers.find((l) => ledgerCode(l) === code);
  }, [ledgers, selectedForm.purchaseAccountNumber, selectedForm.purchaseAccountNo]);

  const doubleEntry = useMemo(() => {
    return {
      debitName: selectedForm.purchaseAccountName || selectedForm.buyerName || "Purchase Account",
      debitCode: selectedForm.purchaseAccountNumber || selectedForm.purchaseAccountNo || "-",
      debitBranch: selectedForm.purchaseAccountBranch || "-",
      creditName: ledgerName(selectedSourceLedger) || "General Cash/Bank Account",
      creditCode: ledgerCode(selectedSourceLedger) || "CASH-001",
      creditBranch: "-",
      debitLedgerId: ledgerId(purchaseLedger) || selectedForm.purchaseAccountId || selectedForm.buyerId,
      creditLedgerId: ledgerId(selectedSourceLedger)
    };
  }, [selectedForm, selectedSourceLedger, purchaseLedger]);

  const baseCurrency = useMemo(() => {
    // 1. Prioritize explicitly selected local/ledger currency from the form
    if (selectedForm) {
      const ledgerCurrency = selectedForm.purchaseCurrency || selectedForm.purchaseAccountCurrency;
      if (ledgerCurrency && ledgerCurrency !== "USD") {
        return ledgerCurrency.toUpperCase();
      }
    }

    // Auto-detect from user name or roles
    const userName = (session?.user?.fullName || "").toUpperCase();
    if (userName.includes("EMIRATES") || userName.includes("DUBAI") || userName.includes("AE")) return "AED";
    if (userName.includes("AFGHANISTAN") || userName.includes("KABUL")) return "AFN";
    if (userName.includes("INDIA") || userName.includes("MUMBAI")) return "INR";
    if (userName.includes("IRAN")) return "IRR";
    if (userName.includes("US") || userName.includes("UNITED STATES")) return "USD";

    // If still nothing, check roles or session country defaults if available
    const roleStr = (session?.roles?.[0] || "").toUpperCase();
    if (roleStr.includes("EMIRATES") || roleStr.includes("DUBAI") || roleStr.includes("AE")) return "AED";

    // Only fallback to selected form if we really can't tell (e.g. super admin looking at a specific record)
    if (selectedForm) {
      const sec = selectedForm.secondaryCurrency || "";
      if (sec) return sec.replace(" - Rs", "").trim().toUpperCase();
      return (selectedForm.salesAccountCurrency || "PKR").toUpperCase();
    }

    return "PKR";
  }, [selectedForm, session]);

  // Sync PO currency and exchange rate when order changes
  useEffect(() => {
    if (selected) {
      const rate = String(getEffectiveRate(selected));
      setExchangeRate(rate);
      const poCur = selected.currency_code || "USD";
      // Auto-enforce local currency for payment
      setCurrency(baseCurrency || poCur.toUpperCase());
    }
  }, [selectedId, selected, baseCurrency, getEffectiveRate]);

  const cards = useMemo(() => kpis(filtered, activeMode, baseCurrency), [activeMode, filtered, baseCurrency]);
  const countryOptions = useMemo(() => Array.from(new Set(orders.map(rowCountryName))).filter(Boolean).sort(), [orders]);
  const branchOptions = useMemo(() => Array.from(new Set(orders.filter((row) => !countryFilter || rowCountryName(row) === countryFilter).map(rowBranchName))).filter(Boolean).sort(), [orders, countryFilter]);
  const currencyOptions = useMemo(() => Array.from(new Set(orders.filter((row) => !countryFilter || rowCountryName(row) === countryFilter).map(rowCurrency))).filter(Boolean).sort(), [orders, countryFilter]);
  return null;
}
/*
    return getDashboardSummaryData(filtered, session, activeMode);
                const effectiveRate = exchangeRate !== 1 ? exchangeRate : (rawFinalAmount > 0 && totalPrice > 0 ? (rawFinalAmount / totalPrice) : 1);
                
                const finalAmount = totalPrice * effectiveRate;

                const advancePercent = Number(form.advancePercent || 0);
                const requiredAdvance = (finalAmount * advancePercent) / 100;
                const paidAdvance = Number(row.advance_paid || 0);
                const remainingAdvance = Math.max(0, requiredAdvance - paidAdvance);

                const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                const paidAdvanceBC = paidAdvance / effectiveRate;
                const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                const remainingDue = Number(row.remaining_due || 0);

                const totalAmountBC = totalPrice;
                const rowLocalCurrency = rowCurrency(row);
                const totalAmountLocal = finalAmount;

                let paidAmountBC = 0;
                let paidAmountLocal = 0;
                let balanceAmountBC = 0;
                let balanceAmountLocal = 0;

                if (activeMode === "advance") {
                  paidAmountBC = paidAdvanceBC;
                  paidAmountLocal = paidAdvance;
                  balanceAmountBC = remainingAdvanceBC;
                  balanceAmountLocal = remainingAdvance;
                } else if (activeMode === "remaining") {
                  const remPaid = Number(row.remaining_paid || 0);
                  paidAmountLocal = remPaid;
                  paidAmountBC = remPaid / effectiveRate;
                  balanceAmountLocal = remainingDue;
                  balanceAmountBC = remainingDue / effectiveRate;
                } else {
                  // credit or history
                  const credPaid = Number(row.credit_amount || 0);
                  paidAmountLocal = credPaid;
                  paidAmountBC = credPaid / exchangeRate;
                  balanceAmountLocal = Math.max(0, finalAmount - credPaid);
                  balanceAmountBC = Math.max(0, totalPrice - paidAmountBC);
                }

                const statusText = row.payment_status || "Pending";
                const isSelected = selected?.id === row.id;
                const isExpanded = Boolean(expandedIds[row.id]);
                const rowBg = isSelected ? "#eff6ff" : index % 2 === 0 ? "#ffffff" : "#f8fafc";

                const getLedgerLabel = (id: string) => {
                  const led = ledgers.find((l) => l.id === id);
                  if (!led) return "Ã¢â‚¬â€";
                  return `${led.code} - ${led.name}`;
                };

                const isPosted = row.ledger_posting_status === "Posted" 
                  || row.ledger_posting_status === "posted"
                  || row.ledger_posting_status === "Transferred"
                  || row.ledger_posting_status === "transferred";
                const getRowColor = () => {
                  return isPosted ? "text-black dark:text-white" : "text-red-600 dark:text-red-400";
                };

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => selectOrder(row.id)}
                      style={{ background: rowBg, borderBottom: "1px solid #e2e8f0", cursor: "pointer", outline: isSelected ? "2px solid #3b82f6" : undefined, outlineOffset: -1 }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#f0f9ff"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                    >
                      {/* Order ID */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {row.purchase_order_no}
                        </div>
                      </td>
                      {/* Super S/N */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="font-mono text-[10px] font-bold">{superSerialNo}</div>
                      </td>
                      {/* Cty S/N */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="font-mono text-[10px] font-bold">{countrySerialNo}</div>
                      </td>
                      {/* Br. S/N */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="font-mono text-[10px] font-bold">{branchSerialNo}</div>
                      </td>
                      {/* Bill & Date */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200">{billNo}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5 font-medium">{dateStr}</span>
                        </div>
                      </td>
                      {/* Branch & Country */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 uppercase">{branchName}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5 font-medium">{countryName}</span>
                        </div>
                      </td>
                      {/* Purchase Account */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate" title={form.purchaseAccountName || "N/A"}>
                            {form.purchaseAccountName || "N/A"}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500 mt-0.5 font-semibold">
                            {form.purchaseAccountNumber || "-"}
                          </span>
                        </div>
                      </td>
                      {/* Sales Account */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate" title={form.salesAccountName || form.supplierName || "N/A"}>
                            {form.salesAccountName || form.supplierName || "N/A"}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500 mt-0.5 font-semibold">
                            {form.salesAccountNumber || "-"}
                          </span>
                        </div>
                      </td>
                      {/* Goods & Brand */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="flex flex-col gap-0.5 text-[9px]">
                          <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate" title={goodsName}>{goodsName}</span>
                          <span className="text-slate-500">
                            Sz: <span className="font-medium text-slate-700 dark:text-slate-300">{goods.map((g: any) => g.size || "").filter(Boolean).join(", ") || "-"}</span> | Br: <span className="font-medium text-slate-700 dark:text-slate-300">{goods.map((g: any) => g.brand || "").filter(Boolean).join(", ") || "-"}</span>
                          </span>
                        </div>
                      </td>
                      {/* Weights & Qty */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="flex flex-col gap-1 text-[9px] font-mono">
                          <span className="text-slate-500">Qty: <span className="font-bold text-slate-700 dark:text-slate-200">{goods.length ? goods.reduce((s:number,g:any)=>s+Number(g.qtyNo||0),0).toLocaleString() : Number(form.quantity||0).toLocaleString()}</span></span>
                          <span className="text-slate-500">Gross: <span className="font-semibold text-slate-700 dark:text-slate-300">{grossWeight.toLocaleString()}</span></span>
                          <span className="text-slate-500">Net: <span className="font-semibold text-slate-700 dark:text-slate-300">{netWeight.toLocaleString()}</span></span>
                        </div>
                      </td>
                      {/* Total & Exchange */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-right", getRowColor())}>
                        <div className="flex flex-col items-end gap-1 font-mono">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                            {money(totalAmountBC, (row as any).form_data?.form?.currencyType || (row as any).form_data?.form?.currency || "USD")}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {money(totalAmountLocal, rowLocalCurrency)}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-1">
                            Rate: {exchangeRate}
                          </span>
                        </div>
                      </td>
                      {/* Advance Details */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-right", getRowColor())}>
                        <div className="flex flex-col items-end gap-1 font-mono">
                          <span className="text-[9px] text-slate-500 uppercase font-semibold">Req ({advancePercent}%)</span>
                          <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">
                            {money(requiredAdvanceBC, (row as any).form_data?.form?.currencyType || (row as any).form_data?.form?.currency || "USD")}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {money(requiredAdvance, rowLocalCurrency)}
                          </span>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Paid: {money(paidAdvanceBC, (row as any).form_data?.form?.currencyType || (row as any).form_data?.form?.currency || "USD")}
                          </span>
                        </div>
                      </td>
                      {/* Remaining Balance */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-right", getRowColor())}>
                        <div className="flex flex-col items-end gap-1 font-mono">
                          <span className="font-black text-[11px] text-indigo-600 dark:text-indigo-400">
                            {money(balanceAmountBC, (row as any).form_data?.form?.currencyType || (row as any).form_data?.form?.currency || "USD")}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-500/80 dark:text-indigo-400/80">
                            {money(balanceAmountLocal, rowLocalCurrency)}
                          </span>
                        </div>
                      </td>
                      {/* Status & Action */}
                      <td className="px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {activeMode !== "advance_completed" && (
                            <>
                              {isPosted ? (
                                <span className="inline-flex rounded border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider">
                                  Transferred Ã¢Å“â€œ
                                </span>
                              ) : (
                                <span className="inline-flex rounded border border-amber-300 bg-amber-50 text-amber-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider animate-pulse">
                                  Pending Transfer
                                </span>
                              )}
                              {getStatusBadge(statusText)}
                              {activeMode === "advance" && isPosted && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard/purchase/loading-form`);
                                  }}
                                  className="mt-1 flex items-center justify-center gap-1 rounded bg-blue-600 px-2 py-1 text-[9px] font-bold text-white shadow hover:bg-blue-700 transition"
                                >
                                  <Truck className="h-3 w-3" />
                                  Loading
                                </button>
                              )}
                            </>
                          )}
                          <div className={cn("relative inline-block text-left", activeMode !== "advance_completed" && "mt-1")} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setOpenDropdownId(openDropdownId === row.id ? null : row.id)}
                              className={cn(
                                "inline-flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400 focus:outline-none shadow-sm bg-white dark:bg-slate-900",
                                activeMode === "advance_completed" ? "h-8 px-3 text-xs font-semibold" : "h-7 w-7"
                              )}
                            >
                              {activeMode === "advance_completed" ? (
                                <>Actions <ChevronDown className="ml-1 h-3.5 w-3.5" /></>
                              ) : (
                                <MoreVertical className="h-3.5 w-3.5" />
                              )}
                            </button>
                            {openDropdownId === row.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                                <div className="absolute right-0 top-full mt-1 w-48 rounded-md bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden border border-slate-200 dark:border-slate-800 font-semibold">
                                  {activeMode === "advance_completed" && (
                                    <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 items-start pointer-events-none">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Current Status</span>
                                      {isPosted ? (
                                        <span className="inline-flex rounded border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider">
                                          Transferred Ã¢Å“â€œ
                                        </span>
                                      ) : (
                                        <span className="inline-flex rounded border border-amber-300 bg-amber-50 text-amber-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider animate-pulse">
                                          Pending Transfer
                                        </span>
                                      )}
                                      {getStatusBadge(statusText)}
                                    </div>
                                  )}
                                  <div className="py-1">
                                    {activeMode === "advance" && isPosted && (
                                      <button className="flex w-full items-center px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition" onClick={() => { 
                                        setOpenDropdownId(null);
                                        router.push(`/dashboard/purchase/loading-form`);
                                      }}>
                                        <Truck className="mr-2.5 h-4 w-4 text-blue-600 dark:text-blue-400" /> Transfer to Loading
                                      </button>
                                    )}
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { setViewingRow(row); setOpenDropdownId(null); }}>
                                      <Eye className="mr-2.5 h-4 w-4 text-slate-500" /> View Detailed Bill
                                    </button>
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { handleOpenA4PDF(row, true); setOpenDropdownId(null); }}>
                                      <Printer className="mr-2.5 h-4 w-4 text-slate-500" /> Print Statement
                                    </button>
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { handleOpenA4PDF(row, false); setOpenDropdownId(null); }}>
                                      <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> View Statement
                                    </button>
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { setExpandedIds((prev) => ({ ...prev, [row.id]: !prev[row.id] })); setOpenDropdownId(null); }}>
                                      {isExpanded ? <XCircle className="mr-2.5 h-4 w-4 text-slate-500" /> : <Plus className="mr-2.5 h-4 w-4 text-slate-500" />} {isExpanded ? "Hide Payment History" : "Show Payment History"}
                                    </button>
                                    {activeMode === "advance_completed" && (
                                      <>
                                        <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                                        <button className="flex w-full items-center px-4 py-2.5 text-xs text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 transition" onClick={() => { 
                                          setOpenDropdownId(null);
                                          router.push(`/dashboard/journal/purchase-order-payment/advance?purchaseOrderNo=${encodeURIComponent(row.purchase_order_no)}`);
                                        }}>
                                          <RefreshCw className="mr-2.5 h-4 w-4 text-indigo-500" /> Revert & Edit Advance
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr onClick={(e) => e.stopPropagation()} style={{ background: "#f8fafc" }}>
                        <td colSpan={14} className="p-4 border-b border-slate-100 dark:border-slate-800">
                          <NestedPaymentHistory row={row} ledgers={ledgers} baseCurrency={baseCurrency} activeMode={activeMode} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!pageRows.length && !loading && (
                <tr>
                  <td
                    colSpan={14}
                    style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <FileSpreadsheet style={{ width: 40, height: 40, opacity: 0.3 }} />
                      <span>No purchase order payment records found.</span>
                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>Try adjusting filters or check if orders are posted.</span>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={14} style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Loading recordsÃ¢â‚¬Â¦
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong className="font-semibold text-slate-700 dark:text-slate-300">{pageRows.length ? pageIndex * pageSize + 1 : 0} to {Math.min(filtered.length, (pageIndex + 1) * pageSize)}</strong> of <strong className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</strong> records
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPageIndex(0);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((idx) => Math.max(0, idx - 1))}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-650 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
                pageIndex === 0 && "text-slate-400 opacity-50 cursor-not-allowed"
              )}
              aria-label="Previous page"
            >
              <span className="text-xs">Ã¢â‚¬Â¹</span>
            </button>
            {Array.from({ length: Math.ceil(filtered.length / pageSize) }).slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPageIndex(idx)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition",
                  pageIndex === idx
                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/20 dark:text-blue-400"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                )}
              >
                {idx + 1}
              </button>
            ))}
            <button
              disabled={(pageIndex + 1) * pageSize >= filtered.length}
              onClick={() => setPageIndex((idx) => idx + 1)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-655 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
                (pageIndex + 1) * pageSize >= filtered.length && "text-slate-400 opacity-50 cursor-not-allowed"
              )}
              aria-label="Next page"
            >
              <span className="text-xs">Ã¢â‚¬Âº</span>
            </button>
          </div>
        </div>
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Ledger Cash Entry Panel (Modal) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {selected && (
        <SimpleModal
          title={`Payment Entry - PO ${selected.purchase_order_no}`}
          onClose={() => setSelectedId("")}
          className="max-w-[98vw] xl:max-w-[1600px] w-full shadow-2xl"
        >
          <div className="space-y-6">
            {/* Already Transferred / Overpaid Warning Banner */}
            {(() => {
              const form = selected.form_data?.form || {};
              const totalPrice = (selected as any).form_data?.goodsEntries?.length
                ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                : Number(form.totalAmount || 0);
              const advancePercent = Number(form.advancePercent || 0);
              const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
              const paidAdvanceBC = Number(selected.advance_paid || 0) / (selected.exchange_rate || 1);
              const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
              const remainingDue = Number(selected.remaining_due || 0);

              if (activeMode === "advance" && remainingAdvanceBC <= 0.01) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 animate-in fade-in duration-300">
                    <XCircle className="h-5 w-5 shrink-0" /> Already Transferred: The advance payment for PO {selected.purchase_order_no} has already been fully paid.
                  </div>
                );
              }
              if (activeMode === "remaining" && remainingDue <= 0.01) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 animate-in fade-in duration-300">
                    <XCircle className="h-5 w-5 shrink-0" /> Already Transferred: The remaining due for PO {selected.purchase_order_no} has already been fully paid.
                  </div>
                );
              }
              return null;
            })()}

            {/* Prominent Active PO Banner */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 dark:bg-blue-950/20 dark:border-blue-900/30">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-extrabold text-xs shadow-sm">
                  PO
                </span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Active Bill Selection</div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{selected.purchase_order_no}</span>
                    {selected.purchase_contract_no && (
                      <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border">
                        Contract: {selected.purchase_contract_no}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Total Value</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">{money(Number(selected.order_total || 0) / (selected.exchange_rate || 1), (selected as any).form_data?.form?.currencyType || (selected as any).form_data?.form?.currency || "USD")}</span>
                  <span className="block text-[10px] font-bold text-slate-500 mt-0.5">
                    {money(selected.order_total, selected.currency_code || baseCurrency)}
                  </span>
                </div>
                {activeMode === "advance" && (
                  <>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Paid Advance</span>
                      <span className="font-extrabold text-emerald-600">{money(Number(selected.advance_paid || 0) / (selected.exchange_rate || 1), (selected as any).form_data?.form?.currencyType || (selected as any).form_data?.form?.currency || "USD")}</span>
                      <span className="block text-[10px] font-bold text-emerald-700/70 mt-0.5">
                        {money(selected.advance_paid, selected.currency_code || baseCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Remaining Advance</span>
                      {(() => {
                        const form = (selected as any).form_data?.form || {};
                        const totalPrice = (selected as any).form_data?.goodsEntries?.length
                          ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                          : Number(form.totalAmount || 0);
                        const advancePercent = Number(form.advancePercent || 0);
                        const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                        const paidAdvanceBC = Number(selected.advance_paid || 0) / (selected.exchange_rate || 1);
                        const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                        return (
                          <>
                            <span className="font-extrabold text-rose-600">{money(remainingAdvanceBC, (selected as any).form_data?.form?.currencyType || (selected as any).form_data?.form?.currency || "USD")}</span>
                            <span className="block text-[10px] font-bold text-rose-700/70 mt-0.5">
                              {money(remainingAdvanceBC * (selected.exchange_rate || 1), baseCurrency)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
                {activeMode === "remaining" && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Remaining Due</span>
                    <span className="font-extrabold text-rose-600">{money(Number(selected.remaining_due || 0) / (selected.exchange_rate || 1), (selected as any).form_data?.form?.currencyType || (selected as any).form_data?.form?.currency || "USD")}</span>
                    <span className="block text-[10px] font-bold text-rose-700/70 mt-0.5">
                      {money(selected.remaining_due, selected.currency_code || baseCurrency)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Exchange Rate</span>
                  <span className="font-bold text-slate-600 dark:text-slate-400 font-mono">1 {(selected as any).form_data?.form?.currencyType || (selected as any).form_data?.form?.currency || "USD"} = {Number(selected.exchange_rate || 1).toFixed(2)} {baseCurrency}</span>
                </div>
              </div>
            </div>

            {/* Split Layout grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Input Form (Col Span 5) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Payment Input Form */}
                {isSuperAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldBlock label="Country (Super Admin)" required={false}>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                        value={saCountryId}
                        onChange={(e) => {
                          setSaCountryId(e.target.value);
                          setSaBranchId("");
                          setPaymentSourceLedgerId("");
                        }}
                      >
                        <option value="">-- All Countries --</option>
                        {saCountries.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </FieldBlock>
                    <FieldBlock label="Branch (Super Admin)" required={false}>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                        value={saBranchId}
                        onChange={(e) => {
                          setSaBranchId(e.target.value);
                          setPaymentSourceLedgerId("");
                        }}
                        disabled={!saCountryId}
                      >
                        <option value="">-- All Branches --</option>
                        {saBranches.filter(b => b.country_id === saCountryId || b.country_id === undefined).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </FieldBlock>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBlock label="Payment Source Account" required>
                    <SearchSelect
                      label=""
                      value={paymentSourceLedgerId}
                      placeholder="Search Payment Source Account..."
                      options={ledgerOptions}
                      disabled={loading}
                      onValueChange={(val) => {
                        setPaymentSourceLedgerId(val);
                        // Sync account -> Category & Type
                        const led = ledgers.find((l) => ledgerId(l) === val);
                        if (led) {
                          const name = ledgerName(led).toLowerCase();
                          const code = ledgerCode(led).toLowerCase();
                          if (name.includes("cash") || code.includes("cash")) {
                            setPaymentType("cash");
                            setRoznamchaType("Cash Book No.");
                          } else if (name.includes("bank") || code.includes("bank")) {
                            setPaymentType("bank");
                            setRoznamchaType("Roznamcha Book No.");
                          }
                        }
                      }}
                    />
                    {selectedSourceLedger && (
                      <div className="mt-1 text-[10px] font-semibold text-slate-500 flex justify-between">
                        <span>Balance: {sourceBalanceText}</span>
                        <span>Currency: {selectedSourceLedger.currency || baseCurrency}</span>
                      </div>
                    )}
                  </FieldBlock>

                  <FieldBlock label="Roznamcha Type" required>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      value={roznamchaType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoznamchaType(val);
                        if (val === "Cash Book No.") {
                          setPaymentType("cash");
                          const cashLed = ledgers.find((l) => ledgerName(l).toLowerCase().includes("cash") || ledgerCode(l).toLowerCase().includes("cash"));
                          if (cashLed) setPaymentSourceLedgerId(ledgerId(cashLed) || "");
                        } else if (val === "Roznamcha Book No.") {
                          setPaymentType("bank");
                          const bankLed = ledgers.find((l) => ledgerName(l).toLowerCase().includes("bank") || ledgerCode(l).toLowerCase().includes("bank"));
                          if (bankLed) setPaymentSourceLedgerId(ledgerId(bankLed) || "");
                        }
                      }}
                    >
                      <option value="Cash Book No.">Cash Book No.</option>
                      <option value="Roznamcha Book No.">Roznamcha Book No.</option>
                      <option value="Receipt No.">Receipt No.</option>
                    </select>
                  </FieldBlock>

                  <FieldBlock label="Roznamcha Number" required>
                    <Input
                      className="h-9 text-xs font-semibold w-full"
                      value={roznamchaNumber}
                      onChange={(e) => setRoznamchaNumber(e.target.value)}
                      placeholder="e.g. 000123"
                    />
                  </FieldBlock>

                  <FieldBlock label="Payment Date" required>
                    <Input
                      className="h-9 text-xs font-semibold w-full"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </FieldBlock>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBlock label="Roznamcha Category" required>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      value={paymentType}
                      onChange={(e) => {
                        const value = e.target.value as any;
                        setPaymentType(value);
                        setTypeDetails({});
                        setAttachmentFile(null);
                        setFinalPayment("");

                        // Sync Category -> Type and Source Account
                        if (value === "cash") {
                          setRoznamchaType("Cash Book No.");
                          const cashLed = ledgers.find((l) => ledgerName(l).toLowerCase().includes("cash") || ledgerCode(l).toLowerCase().includes("cash"));
                          if (cashLed) setPaymentSourceLedgerId(ledgerId(cashLed) || "");
                        } else if (value === "bank") {
                          setRoznamchaType("Roznamcha Book No.");
                          const bankLed = ledgers.find((l) => ledgerName(l).toLowerCase().includes("bank") || ledgerCode(l).toLowerCase().includes("bank"));
                          if (bankLed) setPaymentSourceLedgerId(ledgerId(bankLed) || "");
                        }
                      }}
                    >
                      <option value="">Select Category</option>
                      <option value="cash">Cash Roznamcha</option>
                      <option value="bank">Bank Roznamcha</option>
                      <option value="business">Business Roznamcha</option>
                      <option value="invoice">Invoice Journal</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </FieldBlock>

                  <FieldBlock label="Currency" required>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                      <option value="PKR">PKR</option>
                      <option value="INR">INR</option>
                      <option value="AFN">AFN</option>
                      <option value="IRR">IRR</option>
                    </select>
                  </FieldBlock>
                </div>

                {/* Dynamic Type Panel */}
                {paymentType && (
                  <div className="rounded-lg border bg-slate-50/50 p-3 dark:bg-slate-900/20">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      {paymentType === "cash" && "Cash Details"}
                      {paymentType === "bank" && "Bank Details"}
                      {paymentType === "business" && "Business Details"}
                      {paymentType === "invoice" && "Invoice Details"}
                      {paymentType === "transfer" && "Transfer Details"}
                    </div>
                    
                    {paymentType === "cash" && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldBlock label="Receiver / Sender Name">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.receiverSenderName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, receiverSenderName: e.target.value }))} placeholder="Receiver or sender name" />
                        </FieldBlock>
                        <FieldBlock label="Mobile Number">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.mobileNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, mobileNumber: e.target.value }))} placeholder="Mobile number" />
                        </FieldBlock>
                        <FieldBlock label="WhatsApp Number">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.whatsappNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, whatsappNumber: e.target.value }))} placeholder="WhatsApp number" />
                        </FieldBlock>
                        <FieldBlock label="ID Card Copy Upload">
                          <div className="flex items-center gap-2">
                            <Label className="cursor-pointer flex w-max items-center justify-center h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 border text-slate-500 shadow-sm transition gap-1.5 text-[10px] font-semibold">
                              <Paperclip className="h-3 w-3" />
                              <span>Attach</span>
                              <Input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  setAttachmentFile(file);
                                  setTypeDetails((p) => ({ ...p, idCardCopyName: file?.name || "" }));
                                }}
                              />
                            </Label>
                            {typeDetails.idCardCopyName && <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1.5 rounded border truncate max-w-[200px]">{typeDetails.idCardCopyName}</span>}
                          </div>
                        </FieldBlock>
                      </div>
                    )}

                    {paymentType === "bank" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Bank Name</span>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                            value={typeDetails.bankName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new_bank__") {
                                openAddOption("bank");
                              } else {
                                setTypeDetails((prev) => ({ ...prev, bankName: val }));
                              }
                            }}
                          >
                            <option value="">Select Bank</option>
                            {["HBL", "MCB", "UBL", "Meezan", "Bank Alfalah"].map((bank) => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                            {savedBanks.map((bank, index) => (
                              <option key={`${bank.name}-${index}`} value={bank.name}>{bank.name}</option>
                            ))}
                            <option value="__new_bank__" className="text-blue-700 font-bold">+ New Bank</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Method</span>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                            value={typeDetails.method || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new_method__") {
                                openAddOption("method");
                              } else {
                                setTypeDetails((prev) => ({ ...prev, method: val }));
                              }
                            }}
                          >
                            <option value="">Select Method</option>
                            {["Cheque", "Mobile Transfer", "Online Transfer", "Bank Transfer"].map((method) => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                            {savedMethods.map((method, index) => (
                              <option key={`${method}-${index}`} value={method}>{method}</option>
                            ))}
                            <option value="__new_method__" className="text-blue-700 font-bold">+ New Method</option>
                          </select>
                        </div>

                        <div className="grid gap-3 grid-cols-2">
                          <FieldBlock label="Reference No.">
                            <Input
                              className="h-9 text-xs font-semibold w-full"
                              value={typeDetails.refNo || ""}
                              onChange={(e) => setTypeDetails((prev) => ({ ...prev, refNo: e.target.value }))}
                              placeholder="Cheque/Mobile transaction number"
                            />
                          </FieldBlock>
                          <FieldBlock label="Payment Date" required>
                            <Input
                              className="h-9 text-xs font-semibold w-full"
                              type="date"
                              required
                              value={typeDetails.payDate || paymentDate}
                              onChange={(e) => setTypeDetails((prev) => ({ ...prev, payDate: e.target.value }))}
                            />
                          </FieldBlock>
                        </div>

                        <FieldBlock label="Attachment Upload">
                          <div className="flex items-center gap-2">
                            <Label className="cursor-pointer flex w-max items-center justify-center h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 border text-slate-500 shadow-sm transition gap-1.5 text-[10px] font-semibold">
                              <Paperclip className="h-3 w-3" />
                              <span>Attach</span>
                              <Input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  setAttachmentFile(file);
                                  setTypeDetails((p) => ({ ...p, bankAttachmentName: file?.name || "" }));
                                }}
                              />
                            </Label>
                            {typeDetails.bankAttachmentName && <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1.5 rounded border truncate max-w-[150px]">{typeDetails.bankAttachmentName}</span>}
                          </div>
                        </FieldBlock>
                      </div>
                    )}

                    {(paymentType === "business" || paymentType === "invoice") && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldBlock label="Invoice Number">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.invoiceNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceNumber: e.target.value }))} placeholder="Invoice number" />
                        </FieldBlock>
                        <FieldBlock label="Purchase Information">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.purchaseInfo || typeDetails.businessName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, purchaseInfo: e.target.value, businessName: e.target.value }))} placeholder="Purchase information" />
                        </FieldBlock>
                      </div>
                    )}

                    {paymentType === "transfer" && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldBlock label="From">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.from || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, from: e.target.value }))} placeholder="From account" />
                        </FieldBlock>
                        <FieldBlock label="To">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.to || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, to: e.target.value }))} placeholder="To account" />
                        </FieldBlock>
                        <FieldBlock label="Reference" className="md:col-span-2">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.ref || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, ref: e.target.value }))} placeholder="Reference" />
                        </FieldBlock>
                      </div>
                    )}
                  </div>
                )}





                {/* Currency Rate / Calculations */}
                {currency && showCalcPanel && (
                  <div className="rounded-lg border bg-slate-50/50 p-3 dark:bg-slate-900/20">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Transaction Conversion Details (Local Calculation) ({currency} Ã¢Å¾â€ {baseCurrency})
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <FieldBlock label={`Foreign Amount (${currency})`} required>
                        <Input className="h-9 text-xs font-semibold" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} type="number" step="0.0001" min="0" placeholder="e.g. 100" />
                      </FieldBlock>
                      <FieldBlock label="Exchange Rate" required>
                        <Input className="h-9 text-xs font-semibold" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} type="number" step="0.0001" min="0" disabled={isLocalCurrency} />
                      </FieldBlock>
                      <FieldBlock label="Operation">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold outline-none"
                          value={calcOp}
                          onChange={(e) => setCalcOp(e.target.value as any)}
                        >
                          <option value="mul">Multiply (*)</option>
                          <option value="div">Divide (/)</option>
                        </select>
                      </FieldBlock>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label={`Final Local Amount (${baseCurrency})`} required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        {baseCurrency}
                      </span>
                      <Input
                        className="h-9 pl-12 text-right text-xs font-black font-mono"
                        value={showCalcPanel && calcFinal !== null ? calcFinal.toFixed(2) : finalPayment}
                        onChange={(e) => setFinalPayment(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={showCalcPanel && calcFinal !== null}
                      />
                    </div>
                    {suggestedAdvance > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const rate = Number(exchangeRate || 1);
                          setFinalPayment((suggestedAdvance * rate).toFixed(2));
                          setCalcAmount(suggestedAdvance.toFixed(2));
                        }}
                        className="text-[10px] text-primary font-semibold hover:underline mt-1 block"
                      >
                        Use suggested: {money(suggestedAdvance, currency)} / {money(suggestedAdvance * Number(exchangeRate || 1), baseCurrency)}
                      </button>
                    )}
                  </FieldBlock>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Transaction Entry Preview
                    </span>
                    <div className="h-9 flex items-center px-3 rounded-lg border border-indigo-400/40 bg-indigo-500/10 text-indigo-600 font-bold text-xs uppercase truncate">
                      Ã°Å¸â€Âµ Balanced entry Ã¢â‚¬â€ Dr: {doubleEntry.debitCode} / Cr: {doubleEntry.creditCode}
                    </div>
                  </div>
                </div>

                <FieldBlock label="Narration / Remarks">
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Manually add additional descriptions, comments, explanations, or transaction notes..."
                  />
                </FieldBlock>

                {/* Summary & Action */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                  <div className="text-xs space-y-0.5 text-muted-foreground">
                    <div>
                      <span className="font-bold text-foreground">Posting: </span>
                      <><span className="font-bold text-indigo-600">DR</span> {doubleEntry.debitName} ({doubleEntry.debitCode}) / <span className="font-bold text-violet-600">CR</span> {doubleEntry.creditName} ({doubleEntry.creditCode})</>
                    </div>
                    <div><span className="font-bold text-foreground">Amount: </span>{amount ? money(amount, baseCurrency) : "Ã¢â‚¬â€"}</div>
                    {selected && (
                      <div className="mt-1">
                        {(() => {
                          const form = selected.form_data?.form || {};
                          const totalPrice = (selected as any).form_data?.goodsEntries?.length
                            ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                            : Number(form.totalAmount || 0);
                          const advancePercent = Number(form.advancePercent || 0);
                          const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                          const paidAdvanceBC = Number(selected.advance_paid || 0) / (selected.exchange_rate || 1);
                          const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                          const remainingDue = Number(selected.remaining_due || 0);

                          if (activeMode === "advance") {
                            return (
                              <div className="flex flex-col gap-1">
                                <div>
                                  <span className="font-bold text-foreground">Remaining Advance to Pay: </span>
                                  <span className="font-extrabold text-rose-600">
                                    {money(remainingAdvanceBC, selected.currency_code ?? "USD")} ({money(remainingAdvanceBC * (selected.exchange_rate || 1), baseCurrency)})
                                  </span>
                                </div>
                                <div className="text-[10px]">
                                  <span className="font-bold text-muted-foreground">Total Remaining Bill: </span>
                                  <span className="font-bold text-slate-500">
                                    {money(remainingDue / (selected.exchange_rate || 1), selected.currency_code ?? "USD")} ({money(remainingDue, baseCurrency)})
                                  </span>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div>
                                <span className="font-bold text-foreground">Remaining Bill Balance (Baqaya): </span>
                                <span className="font-extrabold text-rose-600">
                                  {money(remainingDue / (selected.exchange_rate || 1), selected.currency_code ?? "USD")} ({money(remainingDue, baseCurrency)})
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleProcessPayment}
                    disabled={processingPayment || !amount || !canSave}
                    className="h-10 px-6 font-bold text-xs uppercase shadow-md transition bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {processingPayment ? "Processing..." : `Post ${activeMode === "advance" ? "Advance" : activeMode === "credit" ? "Credit" : "Remaining"} Payment`}
                  </Button>
                </div>

                {/* Feedback messages */}
                {paymentSuccess && (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 text-sm text-emerald-700 animate-in fade-in duration-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold mb-0.5">Payment Posted Successfully</div>
                      <div className="text-xs">{paymentSuccess}</div>
                    </div>
                  </div>
                )}
                {paymentError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    Ã¢ÂÅ’ {paymentError}
                  </div>
                )}
              </div>

              {/* Right Column: Double-entry Ledger Preview & History (Col Span 7) */}
              <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-4">
                {/* Past Transactions Table */}
                {selectedOrderPayments.length > 0 && (() => {
                  const form = (selected as any).form_data?.form || {};
                  const totalPrice = (selected as any).form_data?.goodsEntries?.length
                    ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                    : Number(form.totalAmount || 0);
                  const advancePercent = Number(form.advancePercent || 0);
                  const totalRequiredFC = (totalPrice * advancePercent) / 100;
                  
                  // Compute running balance
                  let currentBalance = totalRequiredFC;
                  let accumulatedPaid = 0;
                  const reversed = [...selectedOrderPayments].reverse();
                  const historyWithBalance = reversed.map(p => {
                    const amt = Number(p.amount || 0);
                    currentBalance -= amt;
                    const prevPaid = accumulatedPaid;
                    accumulatedPaid += amt;
                    return { ...p, remaining_balance: currentBalance, previous_balance_paid: prevPaid };
                  }).reverse();

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
                        <h3 className="text-[11px] font-black tracking-wider uppercase text-slate-800 dark:text-slate-200">
                          Payment Transactions History
                        </h3>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400">
                          {selectedOrderPayments.length} Entries
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 border-b dark:border-slate-800">Date</th>
                              <th className="px-3 py-2 border-b dark:border-slate-800">Ref / Accounts</th>
                              <th className="px-3 py-2 border-b dark:border-slate-800 text-right">Paid</th>
                              <th className="px-3 py-2 border-b dark:border-slate-800 text-right">Remaining (Advance)</th>
                              <th className="px-3 py-2 border-b dark:border-slate-800 text-center w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {historyWithBalance.map((payment: any) => {
                              const drLedger = ledgers.find((l) => ledgerId(l) === payment.debit_ledger_id);
                              const crLedger = ledgers.find((l) => ledgerId(l) === payment.credit_ledger_id);
                              const re = payment.roznamcha_entries || {};
                              
                              return (
                                <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                  <td className="px-3 py-2 font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 align-top">
                                    {date(payment.entry_date || payment.created_at)}
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <div className="text-[9px] font-mono font-bold text-slate-500 truncate max-w-[120px] mb-1">{re.super_admin_serial_number || "Ã¢â‚¬â€"}</div>
                                    <div className="text-[10px] font-mono text-slate-800 dark:text-slate-200 truncate max-w-[120px] mb-1">Ref: {payment.reference_no || "-"}</div>
                                    <div className="text-[9px] font-bold text-indigo-500 truncate max-w-[120px] mb-1" title={payment.branchName || "Main Branch"}>Branch: {payment.branchName || "Main Branch"}</div>
                                    <div className="text-indigo-600 dark:text-indigo-400 font-medium text-[9px] truncate max-w-[120px]" title={drLedger ? ledgerName(drLedger) : "-"}>Dr (Purchase): {drLedger ? ledgerName(drLedger) : "-"}</div>
                                    <div className="text-violet-600 dark:text-violet-400 font-medium text-[9px] truncate max-w-[120px]" title={crLedger ? ledgerName(crLedger) : "-"}>Cr (Payment): {crLedger ? ledgerName(crLedger) : "-"}</div>
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap align-top">
                                    <div>{money(payment.amount, payment.currency_code)}</div>
                                    <div className="flex flex-col items-end mt-1">
                                      <span className="text-[8px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded mb-0.5">Rate: {Number(payment.exchange_rate || 1).toFixed(4)}</span>
                                      <span className="text-[9px] text-emerald-800 dark:text-emerald-400">Final: {money(payment.amount * (payment.exchange_rate || 1), baseCurrency)}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right font-black text-rose-600 whitespace-nowrap align-top">
                                    <div>{money(payment.remaining_balance, payment.currency_code)}</div>
                                    <div className="flex flex-col items-end mt-1">
                                      <span className="text-[8px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded opacity-0 mb-0.5">-</span>
                                      <span className="text-[9px] text-rose-800 dark:text-rose-400">Final: {money(payment.remaining_balance * (payment.exchange_rate || 1), baseCurrency)}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center align-top">
                                    <NestedRowActions payment={payment} row={selected} ledgers={ledgers} localCurrency={baseCurrency} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mt-4 block">
                  Double-Entry Journal Posting Preview
                </div>
                <div className="overflow-x-auto rounded-xl border border-border bg-white dark:bg-slate-950">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 text-left">Type</th>
                        <th className="px-3 py-2.5 text-left">Account</th>
                        <th className="px-3 py-2.5 text-right">Amount ({currency})</th>
                        <th className="px-2 py-2.5 text-center">Ã¢Å“â€œ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border bg-indigo-500/5 ring-1 ring-inset ring-indigo-400/20">
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-400/20 px-2 py-0.5 text-[9px] font-black text-indigo-600 uppercase">
                            DEBIT (Dr)
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground line-clamp-1">{doubleEntry.debitName}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">
                            {doubleEntry.debitCode} {doubleEntry.debitBranch && doubleEntry.debitBranch !== "-" && `| Branch: ${doubleEntry.debitBranch}`}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-indigo-600 whitespace-nowrap">
                          {amount ? money(amount / Number(exchangeRate || 1), currency) : <span className="text-muted-foreground">Ã¢â‚¬â€</span>}
                          <span className="block text-[9px] text-muted-foreground font-normal">{money(amount, baseCurrency)}</span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <input
                            type="radio"
                            checked
                            readOnly
                            className="h-3.5 w-3.5 accent-indigo-600"
                          />
                        </td>
                      </tr>
                      <tr className="bg-violet-500/5 ring-1 ring-inset ring-violet-400/20">
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-400/20 px-2 py-0.5 text-[9px] font-black text-violet-600 uppercase">
                            CREDIT (Cr)
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground line-clamp-1">{doubleEntry.creditName}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">
                            {doubleEntry.creditCode} {doubleEntry.creditBranch && doubleEntry.creditBranch !== "-" && `| Branch: ${doubleEntry.creditBranch}`}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-violet-600 whitespace-nowrap">
                          {(() => {
                            if (!amount) return <span className="text-muted-foreground">Ã¢â‚¬â€</span>;
                            const isCrLocal = !selectedSourceLedger || selectedSourceLedger.currency?.toUpperCase() === baseCurrency;
                            if (isCrLocal) {
                              return (
                                <>
                                  {money(amount, baseCurrency)}
                                  {currency !== baseCurrency && (
                                    <span className="block text-[9px] text-muted-foreground font-normal mt-0.5">
                                      {money(amount / Number(exchangeRate || 1), currency)}
                                    </span>
                                  )}
                                </>
                              );
                            } else {
                              const crCurrency = ledgerCurrency(selectedSourceLedger) || currency;
                              return (
                                <>
                                  {money(amount / Number(exchangeRate || 1), crCurrency)}
                                  {crCurrency !== baseCurrency && (
                                    <span className="block text-[9px] text-muted-foreground font-normal mt-0.5">
                                      {money(amount, baseCurrency)}
                                    </span>
                                  )}
                                </>
                              );
                            }
                          })()}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <input
                            type="radio"
                            checked
                            readOnly
                            className="h-3.5 w-3.5 accent-violet-600"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-[11px] text-muted-foreground dark:border-slate-800 dark:bg-slate-900/30 leading-relaxed space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Double-Entry Posting Guide</div>
                  <p>
                    Every transaction balances dynamically. When you process a payment:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>The Debit (Dr) records are updated to settle liabilities with the seller/supplier.</li>
                    <li>The Credit (Cr) records deduct funds from your payment source ledger.</li>
                    <li>Exchange conversion calculates local currency value ({baseCurrency}) automatically.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </SimpleModal>
      )}


      {addOptionOpen ? (
        <SimpleModal
          title={addOptionType === "bank" ? "Add New Bank" : "Payment Method Manager"}
          onClose={() => setAddOptionOpen(false)}
          className="max-w-md"
        >
          {addOptionType === "bank" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-black">Bank Name</Label>
                <Input
                  className="text-xs font-semibold"
                  value={addOptionValue}
                  onChange={(e) => setAddOptionValue(e.target.value)}
                  placeholder="e.g. HBL Karachi Branch"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-black">Bank Address</Label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold focus-visible:outline-none"
                  value={addOptionAddress}
                  onChange={(e) => setAddOptionAddress(e.target.value)}
                  placeholder="Enter bank physical branch address..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setAddOptionOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs" onClick={commitAddOption}>
                  Save Bank
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 pb-3 border-b">
                <Label className="text-xs font-black">Add New Payment Method</Label>
                <div className="flex gap-2">
                  <Input
                    className="text-xs font-semibold"
                    value={addOptionValue}
                    onChange={(e) => setAddOptionValue(e.target.value)}
                    placeholder="e.g. EasyPaisa / JazzCash"
                  />
                  <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs" onClick={commitAddOption}>
                    Add
                  </Button>
                </div>
              </div>

              {savedMethods.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-black">Custom Methods List (Click text to rename, or Blur to save)</Label>
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                    {savedMethods.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <Input
                          defaultValue={m}
                          className="h-8 text-xs font-semibold"
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== m) {
                              renameCustomMethod(m, val);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-bold"
                          onClick={() => deleteCustomMethod(m)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-semibold text-slate-400 italic text-center py-2">
                  No custom payment methods added yet.
                </p>
              )}

              <div className="flex justify-end pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setAddOptionOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </SimpleModal>
      ) : null}

      {/* Detailed PO Modal */}
      {viewingRow && (
        <SimpleModal
          title={`Purchase Order Details - ${viewingRow.purchase_order_no}`}
          onClose={() => setViewingRow(null)}
          className="max-w-4xl w-full"
        >
          {(() => {
            const form = viewingRow.form_data?.form || {};
            const goods = viewingRow.form_data?.goodsEntries || [];
            const totals = viewingRow.form_data?.totals || {};
            
            const billNo = form.billNo || "-";
            const dateStr = date(form.purchaseDate || viewingRow.created_at);
            const branchCode = form.branchCode || "-";
            
            const totalPriceFC = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0);
            const exchangeRateVal = viewingRow.exchange_rate || form.exchangeRate || 1;
            const viewingLocalCurrency = rowCurrency(viewingRow);
            const finalAmountLocal = viewingRow.order_total || totals.grandFinal || 0;

            const advancePercent = Number(form.advancePercent || 0);
            const reqAdvanceBC = (totalPriceFC * advancePercent) / 100;
            const reqAdvanceLocal = (finalAmountLocal * advancePercent) / 100;
            const paidAdvanceLocal = Number(viewingRow.advance_paid || 0);
            const paidAdvanceBC = paidAdvanceLocal / exchangeRateVal;
            const remAdvanceBC = Math.max(0, reqAdvanceBC - paidAdvanceBC);

            return (
              <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
                {/* Header overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">PO Number</span>
                    <span className="mt-1 block font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{viewingRow.purchase_order_no}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Bill Number</span>
                    <span className="mt-1 block font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{billNo}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Purchase Date</span>
                    <span className="mt-1 block font-bold text-xs text-slate-800 dark:text-slate-200">{dateStr}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Branch</span>
                    <span className="mt-1 block font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{branchCode}</span>
                  </div>
                </div>

                {/* Items & Weights */}
                <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    Goods & Weights Details
                  </div>
                  <div className="p-4 space-y-4">
                    {goods.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b text-slate-400 font-bold uppercase text-[10px]">
                              <th className="pb-2">Goods Name</th>
                              <th className="pb-2 text-right">Qty</th>
                              <th className="pb-2 text-right">Gross Wt</th>
                              <th className="pb-2 text-right">Net Wt</th>
                              <th className="pb-2 text-right">Unit Price</th>
                              <th className="pb-2 text-right">Total FC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {goods.map((g: any, idx: number) => (
                              <tr key={idx} className="border-b last:border-b-0 text-slate-800 dark:text-slate-200">
                                <td className="py-2.5 font-semibold">{g.goodsName || "-"}</td>
                                <td className="py-2.5 text-right font-mono">{Number(g.qtyNo || 0).toLocaleString()}</td>
                                <td className="py-2.5 text-right font-mono">{Number(g.grossWeight || 0).toLocaleString()}</td>
                                <td className="py-2.5 text-right font-mono">{Number(g.netWeight || 0).toLocaleString()}</td>
                                <td className="py-2.5 text-right font-mono">{money(g.coursePrice, viewingRow.currency_code ?? "")}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">{money(g.totalAmount, viewingRow.currency_code ?? "")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Goods</span>
                          <span className="font-semibold">{form.goodsName || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Qty</span>
                          <span className="font-mono font-semibold">{Number(form.qtyNo || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Gross Weight</span>
                          <span className="font-mono font-semibold">{Number(form.grossWeight || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Net Weight</span>
                          <span className="font-mono font-semibold">{Number(form.netWeight || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Total FC</span>
                          <span className="font-mono font-bold">{money(totalPriceFC, viewingRow.currency_code ?? "")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Total & Conversion Summary</h4>
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-400 text-xs">Total Purchase (FC)</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{money(totalPriceFC, viewingRow.currency_code ?? "")}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-xs">Exchange Rate</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">1 {viewingRow.currency_code} = {Number(exchangeRateVal).toFixed(4)} {viewingLocalCurrency}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-800 font-bold dark:text-slate-200">Final Converted ({viewingLocalCurrency})</span>
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-base">{money(finalAmountLocal, viewingLocalCurrency)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Advance Payment Summary ({advancePercent}%)</h4>
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-400 text-xs">Required Advance</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{money(reqAdvanceBC, viewingRow.currency_code ?? "")}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5 text-emerald-600">
                      <span className="text-xs font-semibold">Paid Advance</span>
                      <span className="font-mono font-bold">{money(paidAdvanceBC, viewingRow.currency_code ?? "")}</span>
                    </div>
                    <div className="flex justify-between pt-0.5 text-rose-600 font-bold">
                      <span>Remaining Advance Due</span>
                      <span className="font-mono font-black">{money(remAdvanceBC, viewingRow.currency_code ?? "")}</span>
                    </div>
                  </div>
                </div>

                {/* Transit Details */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/20 space-y-2 text-xs">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Transit & Logistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                    <div>
                      <span className="text-slate-400 block">Loading Country</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.loadingCountry || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Loading Date</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.loadingDate || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Received Country</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.receivedCountry || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Received Date</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.receivedDate || "N/A"}</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <span className="text-slate-400 block">Payment / Transit Condition</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{form.paymentType || viewingRow.payment_status || "N/A"}</span>
                  </div>
                </div>

                {/* Print and Close Buttons */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    type="button"
                    onClick={() => handleOpenA4PDF(viewingRow, true)}
                    className="h-10 px-5 font-bold text-xs uppercase bg-blue-600 hover:bg-blue-700 text-white border-0 flex items-center gap-2 rounded-xl"
                  >
                    <Printer className="h-4 w-4" />
                    Print Full A4 Invoice (PDF)
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setViewingRow(null)}
                    className="h-10 px-6 font-bold text-xs uppercase bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border-0 rounded-xl"
                  >
                    Close Details
                  </Button>
                </div>
              </div>
            );
          })()}
        </SimpleModal>
      )}

      {editingPayment && (
        <PaymentEditModal
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
          payment={editingPayment.payment}
          row={editingPayment.row}
          session={session}
          ledgers={ledgers}
          baseCurrency={baseCurrency}
          onSuccess={() => {
            const el = document.getElementById("refresh-btn");
            if (el) el.click();
          }}
        />
      )}
    </div>
  );
}

function Metric({ label, value, sublabel, icon, tone }: KpiCard) {
  const colorClasses = {
    blue: {
      text: "text-blue-800 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/30",
      iconText: "text-blue-800 dark:text-blue-400"
    },
    green: {
      text: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconText: "text-emerald-700 dark:text-emerald-400"
    },
    amber: {
      text: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/30",
      iconText: "text-amber-700 dark:text-amber-400"
    },
    red: {
      text: "text-red-700 dark:text-red-400",
      iconBg: "bg-red-50 dark:bg-red-950/30",
      iconText: "text-red-700 dark:text-red-400"
    },
    slate: {
      text: "text-slate-700 dark:text-slate-300",
      iconBg: "bg-slate-50 dark:bg-slate-800",
      iconText: "text-slate-600 dark:text-slate-400"
    }
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", colorClasses.iconBg, colorClasses.iconText)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">{label}</p>
        <p className={cn("mt-1 text-[22px] font-black tracking-tight", colorClasses.text)}>{value}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">{sublabel}</p>
      </div>
    </div>
  );
}

function MiniFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary">
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option.toLowerCase()}>{option}</option>)}
      </select>
    </label>
  );
}

function ReportActions({ rows, mode }: { rows: PurchaseOrderRow[]; mode: PaymentMode }) {
  function handleReportAction(fn: () => void) {
    fn();
    const details = document.activeElement?.closest("details");
    if (details) (details as HTMLDetailsElement).open = false;
  }
  return (
    <details className="relative">
      <summary className="flex h-9 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-input bg-background text-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Payment report actions" title="Payment report actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl">
        <MenuAction icon={<Eye />} label="Plate View" onClick={() => handleReportAction(() => undefined)} />
        <MenuAction icon={<DownloadActionIcon />} label="Download" onClick={() => handleReportAction(() => exportRows(rows, mode))} />
        <MenuAction icon={<FileSpreadsheet />} label="Export Excel" onClick={() => handleReportAction(() => exportRows(rows, mode))} />
        <MenuAction icon={<DownloadActionIcon />} label="Export PDF" onClick={() => handleReportAction(() => window.print())} />
        <MenuAction icon={<Printer />} label="Print" onClick={() => handleReportAction(() => window.print())} />
      </div>
    </details>
  );
}

function RowActions({ onSelect, rowId }: { onSelect: () => void; rowId: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 192 });
    }
    setOpen((o) => !o);
  }

  function handleItem(fn: () => void) {
    fn();
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick() { setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 32, width: 32, borderRadius: 8,
          border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer",
          color: "#64748b", transition: "background 0.15s"
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
        aria-label="Row actions"
      >
        <MoreVertical style={{ width: 15, height: 15 }} />
      </button>

      {open && typeof document !== "undefined" && (
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            minWidth: 192,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 10px 40px rgba(0,0,0,0.14)",
            padding: "4px",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { icon: <Eye style={{ width: 14, height: 14 }} />, label: "View Details", color: "#2563eb", fn: () => handleItem(onSelect) },
            { icon: <WalletCards style={{ width: 14, height: 14 }} />, label: "Payment History", color: "#7c3aed", fn: () => handleItem(onSelect) },
            { icon: <Banknote style={{ width: 14, height: 14 }} />, label: "Journal Entry", color: "#059669", fn: () => handleItem(onSelect) },
            { icon: <Printer style={{ width: 14, height: 14 }} />, label: "Print", color: "#475569", fn: () => handleItem(() => window.print()) },
            { icon: <DownloadActionIcon />, label: "Export PDF", color: "#dc2626", fn: () => handleItem(() => window.print()) },
          ].map(({ icon, label, color, fn }) => (
            <button
              key={label}
              type="button"
              onClick={fn}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 12px",
                background: "none", border: "none", borderRadius: 8,
                cursor: "pointer", textAlign: "left",
                fontSize: 12, fontWeight: 600, color: "#1e293b",
                transition: "background 0.12s"
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ color, flexShrink: 0 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function MenuAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-muted">
      <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5 last:border-b-0 dark:border-slate-800">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold text-foreground text-right truncate max-w-[200px]", highlight && "text-primary font-black")}>{value}</span>
    </div>
  );
}
*/

