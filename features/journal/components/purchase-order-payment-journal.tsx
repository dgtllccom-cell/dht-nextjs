"use client";
 
import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import { printStore } from "@/lib/store/print-store";
import { createPortal } from "react-dom";
import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
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
  Minus,
  FileText,
  CheckCircle,
  XCircle,
  WalletCards,
  Edit3,
  Truck,
  User,
  Shield,
  Home,
  Globe,
  Fingerprint
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ViewportActionMenu } from "@/components/ui/viewport-action-menu";
import { openPurchaseA4ReportWindow, type PurchaseReportData } from "@/lib/reports/open-purchase-a4-report-window";
import { PaymentEditModal } from "./payment-edit-modal";
import { t, tData, type LanguageCode } from "../../i18n/purchase-journal-translations";

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
          </tr>
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
  printStore.openPrint(html, receiptTitle + " " + receiptNo);
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
  const rawCountry = String(row.countryName || form.branchCountry || form.countryName || form.loadingCountry || form.destinationCountry || form.originCountry || "Unknown Country").trim();
  const c = rawCountry.toUpperCase();
  if (c.includes("PAKISTAN") || c === "QUETTA" || c === "CHAMAN" || c === "KARACHI" || c === "ISLAMABAD" || c === "PESHAWAR" || c === "MULTAN" || c === "LAHORE") {
    return "Pakistan";
  }
  if (c.includes("UAE") || c.includes("EMIRATES") || c === "DUBAI" || c === "ABU DHABI" || c === "SHARJAH") {
    return "United Arab Emirates";
  }
  return rawCountry;
}

function rowBranchName(row: PurchaseOrderRow) {
  const form = rowForm(row);
  return String(form.branchName || form.purchaseAccountBranch || form.salesAccountBranch || "Unassigned Branch");
}

function rowCurrency(row: PurchaseOrderRow) {
  const form = rowForm(row);
  const explicit = normalizeCurrency(form.currency || row.currency_code || form.currencyType || form.purchaseCurrency || form.baseCurrency || form.purchaseAccountCurrency, "");
  if (explicit) return explicit;
  const country = rowCountryName(row).toLowerCase();
  return COUNTRY_CURRENCY[country] || "USD";
}

function rowOfficeCurrency(row: PurchaseOrderRow): string {
  const country = rowCountryName(row).toUpperCase();
  if (country.includes("PAKISTAN")) return "PKR";
  if (country.includes("EMIRATES") || country.includes("UAE") || country.includes("DUBAI")) return "AED";
  if (country.includes("CHINA")) return "CNY";
  if (country.includes("INDIA")) return "INR";
  if (country.includes("AFGHANISTAN")) return "AFN";
  return "USD";
}

const USD_EXCHANGE: Record<string, number> = {
  "USD": 1.0,
  "AED": 1 / 3.6725,
  "PKR": 1 / 278.5,
  "AFN": 1 / 70.5,
  "INR": 1 / 83.5,
  "IRR": 1 / 42000
};

function getUsdExchangeRate(cur: string, row: any, liveRates: any[] = []) {
  if (cur === "USD") return 1.0;
  const match = liveRates.find((r) => r.currency_code === cur);
  if (match && Number(match.exchange_rate || 0) > 0) return Number(match.exchange_rate);
  const staticRate = USD_EXCHANGE[cur];
  if (staticRate !== undefined) return staticRate;
  
  const form = row?.form_data?.form || {};
  const rowRate = row?.exchange_rate || form.exchangeRate || 1;
  if (rowRate > 1) {
    return 1 / rowRate;
  }
  return 1.0;
}

function getConversionRate(row: any, bookCur: string, officeCur: string, liveRates: any[] = []) {
  const bCur = bookCur.toUpperCase();
  const oCur = officeCur.toUpperCase();
  if (bCur === oCur) return 1.0;
  
  const form = row?.form_data?.form || {};
  const rowRate = Number(row?.exchange_rate || form.exchangeRate || 0);
  
  if (rowRate > 0) {
    if (bCur === "USD" && oCur === "PKR") return rowRate;
    if (bCur === "USD" && oCur === "AED") return rowRate;
    if (bCur === "PKR" && oCur === "AED") return 1 / rowRate;
    if (bCur === "AED" && oCur === "PKR") return rowRate;
  }
  
  const usdRateForBook = getUsdExchangeRate(bCur, row, liveRates);
  const usdRateForOffice = getUsdExchangeRate(oCur, row, liveRates);
  
  if (usdRateForOffice > 0) {
    return usdRateForBook / usdRateForOffice;
  }
  return 1.0;
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
  
  const localCur = (country.toUpperCase().includes("PAKISTAN")) ? "PKR" : 
                   (country.toUpperCase().includes("EMIRATES") || country.toUpperCase().includes("UAE") || country.toUpperCase().includes("DUBAI")) ? "AED" : 
                   (country.toUpperCase().includes("CHINA")) ? "CNY" : 
                   (country.toUpperCase().includes("INDIA")) ? "INR" : 
                   (country.toUpperCase().includes("AFGHANISTAN")) ? "AFN" : 
                   (firstRow?.payment_currency ?? firstRow?.form_data?.form?.secondaryCurrency?.split(" ")[0] ?? "PKR");

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

    const conversionRate = getConversionRate(row, currRaw, localCur);
    
    const invoiceAmountRaw = parseNumber(orderTotal(row));
    const invoiceAmountFC = (conversionRate > 1 && invoiceAmountRaw > 1000000) ? invoiceAmountRaw / conversionRate : invoiceAmountRaw;
    const invoiceAmountLC = invoiceAmountFC * conversionRate;

    const advancePaidRaw = parseNumber(row.advance_paid || 0);
    const advancePaidFC = (conversionRate > 1 && advancePaidRaw > invoiceAmountFC * 1.05) ? advancePaidRaw / conversionRate : advancePaidRaw;
    const advancePaidLC = advancePaidFC * conversionRate;

    const explicitRemainingRaw = parseNumber(row.remaining_due || 0);
    const explicitRemainingFC = (conversionRate > 1 && explicitRemainingRaw > invoiceAmountFC * 1.05) ? explicitRemainingRaw / conversionRate : explicitRemainingRaw;
    const explicitRemainingLC = explicitRemainingFC * conversionRate;

    const remainingFC = explicitRemainingFC > 0 ? explicitRemainingFC : Math.max(0, invoiceAmountFC - advancePaidFC);
    const remainingLC = remainingFC * conversionRate;

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
  const branch = row?.cityBranchName ?? row?.city_branch_name ?? row?.countryBranchName ?? row?.country_branch_name ?? "";
  const label = branch ? `[${branch}] ${accountNo} - ${account}` : `${accountNo} - ${account}`;
  const keywords = [accountNo, account, branch].filter(Boolean).join(" ");
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
        {required ? <span className="text-red-500"> *</span> : null}
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

function NestedPaymentHistory({ 
  row, 
  ledgers, 
  baseCurrency, 
  activeMode,
  selectOrder,
  expandedIds,
  setExpandedIds,
  logClientError
}: { 
  row: any, 
  ledgers: any[], 
  baseCurrency: string, 
  activeMode: string,
  selectOrder: (id: string) => void,
  expandedIds: Record<string, boolean>,
  setExpandedIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  logClientError: (msg: string) => void
}) {
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
  
  // Payments come newest first. Sort chronologically (oldest first) to compute running balances.
  const chronological = [...filteredPayments].sort((a: any, b: any) =>
    new Date(a.entry_date || a.created_at).getTime() - new Date(b.entry_date || b.created_at).getTime()
  );

  let runningPaidForeign = 0;
  let runningPaidLocal = 0;

  const computedHistory = chronological.map((p: any) => {
    const drLedger = ledgers.find((l) => ledgerId(l) === p.debit_ledger_id);
    const crLedger = ledgers.find((l) => ledgerId(l) === p.credit_ledger_id);
    const localCurrency = (ledgerCurrency(drLedger) || ledgerCurrency(crLedger) || baseCurrency).toUpperCase();

    // Determine correct amount in pricing/foreign currency vs local currency
    const isPayLocal = p.currency_code?.toUpperCase() === localCurrency;
    const amtForeign = isPayLocal
      ? Number(p.base_currency_amount || 0) || (Number(p.amount) / Number(p.exchange_rate || 1))
      : Number(p.amount || 0);
    const amtLocal = isPayLocal
      ? Number(p.amount)
      : Number(p.amount) * Number(p.exchange_rate || 1);

    runningPaidForeign += amtForeign;
    runningPaidLocal += amtLocal;

    // Remaining total purchase balance after this payment
    const remainingForeign = Math.max(0, totalPrice - runningPaidForeign);
    const remainingLocal = remainingForeign * Number(p.exchange_rate || 1);

    // Remaining required advance balance after this payment
    const remainingRequiredAdvance = Math.max(0, totalRequiredAdvanceFC - runningPaidForeign);

    return {
      ...p,
      amtForeign,
      amtLocal,
      localCurrency,
      runningPaidForeign,
      runningPaidLocal,
      remainingForeign,
      remainingLocal,
      remainingRequiredAdvance
    };
  });

  // Display newest first in UI table view (reversed chronological)
  const historyWithBalance = [...computedHistory].reverse();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
          ➔ Traceable Payment History (Nested Journal Entries)
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
                <th className="px-4 py-3 text-right border-r">Remaining Balance</th>
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
                const re = p.roznamcha_entries || {};

                return (
                  <tr key={p.id} className="border-b border-indigo-100/50 hover:bg-indigo-50/40 transition">
                    <td className="px-4 py-3 border-r font-mono text-slate-900 dark:text-slate-100 text-[10px] align-top space-y-1">
                      <div><span className="text-muted-foreground font-semibold">Admin:</span> <span className="font-bold">{re.super_admin_serial_number || "—"}</span></div>
                      <div><span className="text-muted-foreground font-semibold">Country:</span> <span className="font-bold">{re.country_transaction_serial_number || "-"}</span></div>
                      <div><span className="text-muted-foreground font-semibold">Branch:</span> <span className="font-bold">{re.branch_transaction_serial_number || "-"}</span></div>
                    </td>
                    <td className="px-4 py-3 border-r text-xs align-top space-y-1">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.users?.full_name || row.form_data?.form?.userName || "Admin"}</div>
                      <div className="text-muted-foreground">{date(p.entry_date || p.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono border-r align-top whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-600">{money(p.amtForeign, p.currency_code || "USD")}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5" title="Cumulative Foreign Paid">
                        Cum: {money(p.runningPaidForeign, p.currency_code || "USD")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600 whitespace-nowrap border-r align-top">
                      <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold inline-block">
                        {Number(p.exchange_rate || 1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono border-r align-top whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{money(p.amtLocal, p.localCurrency)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5" title="Cumulative Local Paid">
                        Cum: {money(p.runningPaidLocal, p.localCurrency)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono border-r align-top whitespace-nowrap">
                      <div className="text-sm font-bold text-rose-600">
                        {p.remainingForeign <= 0.01 ? "✓ Fully Paid" : money(p.remainingForeign, p.currency_code || "USD")}
                      </div>
                      <div className="text-[10px] font-semibold text-rose-500 mt-0.5">
                        {p.remainingForeign <= 0.01 ? "" : money(p.remainingLocal, p.localCurrency)}
                      </div>
                      {totalRequiredAdvanceFC > 0 && (
                        <div className="text-[9px] font-bold text-amber-500 mt-1">
                          {p.remainingRequiredAdvance <= 0.01
                            ? "✓ Adv Cleared"
                            : `Adv Bal: ${money(p.remainingRequiredAdvance, p.currency_code || "USD")}`
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r text-[10px] align-top">
                      <div className="font-semibold text-indigo-600 mb-1 leading-tight" title={drLabel}><span className="font-black text-indigo-800 mr-1">DR:</span>{drLabel}</div>
                      <div className="font-semibold text-violet-600 leading-tight" title={crLabel}><span className="font-black text-violet-800 mr-1">CR:</span>{crLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <NestedRowActions payment={p} row={row} ledgers={ledgers} localCurrency={p.localCurrency} />
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

const getCountryCode = (country: string) => {
  if (!country) return "GL";
  const c = country.toUpperCase();
  if (c.includes("PAKISTAN")) return "PK";
  if (c.includes("UNITED ARAB") || c === "UAE") return "AE";
  if (c.includes("UNITED STATES") || c === "USA") return "US";
  if (c.includes("SAUDI")) return "SA";
  if (c.includes("CHINA")) return "CN";
  if (c.includes("INDIA")) return "IN";
  if (c.includes("AFGHANISTAN")) return "AF";
  if (c.includes("UNITED KINGDOM") || c === "UK") return "UK";
  if (c.includes("CANADA")) return "CA";
  return "GL";
};

const renderCountryBadge = (countryName: string) => {
  const code = getCountryCode(countryName);
  const colorMap: Record<string, string> = {
    "PK": "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
    "AE": "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50",
    "US": "bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50",
    "SA": "bg-green-50 text-green-700 border-green-250 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50",
    "CN": "bg-red-50 text-red-700 border-red-255 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50",
    "IN": "bg-orange-50 text-orange-700 border-orange-255 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50",
    "AF": "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
    "UK": "bg-purple-50 text-purple-700 border-purple-250 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50",
    "CA": "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50"
  };
  const colorClass = colorMap[code] || "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
  return (
    <span className={cn("px-1.5 py-0.5 text-[9px] font-black rounded border tracking-wider select-none", colorClass)}>
      {code}
    </span>
  );
};

function DashboardSummaryHeader({ 
  summary, 
  mode, 
  isGroupSummary,
  isSuperAdmin,
  rows,
  expandedCountries,
  setExpandedCountries,
  selectedCountryForSummary,
  setSelectedCountryForSummary,
  session,
  lang = "en"
}: { 
  summary: DashboardSummaryData; 
  mode: string; 
  isGroupSummary?: boolean; 
  isSuperAdmin?: boolean; 
  rows?: PurchaseOrderRow[];
  expandedCountries?: Record<string, boolean>;
  setExpandedCountries?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedCountryForSummary?: string | null;
  setSelectedCountryForSummary?: (c: string | null) => void;
  lang?: LanguageCode;
  session?: any;
}) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [expandedSummaryCountries, setExpandedSummaryCountries] = useState<Record<string, boolean>>({});
  const [showAllCountries, setShowAllCountries] = useState(true);

  if (!summary) return null;

  const notTransferredPercentLC = summary.totalPurchaseLC > 0 ? (summary.remainingBalanceLC / summary.totalPurchaseLC) * 100 : 0;
  const numCurrencies = Object.keys(summary.foreignCurrencies).length;
  const reportType = mode === "advance" ? "Advance Payment Summary" : mode === "credit" ? "Credit Payment Summary" : "Purchase Payment Summary";
  const now = new Date();
  
  // Format Date & Time based on Pakistan time (or local system)
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();



  const getUsdRate = (currency: string, baseCurrency: string, rowRate: number) => {
    const cur = currency.toUpperCase();
    const base = baseCurrency.toUpperCase();
    if (USD_EXCHANGE[cur] !== undefined) return USD_EXCHANGE[cur];
    if (base === "AED") return rowRate / 3.6725;
    if (base === "PKR") return rowRate / 278.5;
    return 1.0;
  };

  // Group rows strictly by Country first, and nested by Branch
  const summaryRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    
    const groups: Record<string, {
      country: string;
      currency: string;
      purchase: number;
      sale: number;
      dollarRate: number;
      dollarTotal: number;
      finalTotal: number;
      requiredAdvance: number;
      paidAdvance: number;
      remainingAdvance: number;
      remainingDue: number;
      remPaid: number;
      branches: Record<string, {
        branch: string;
        currency: string;
        purchase: number;
        sale: number;
        dollarRate: number;
        dollarTotal: number;
        finalTotal: number;
        requiredAdvance: number;
        paidAdvance: number;
        remainingAdvance: number;
        remainingDue: number;
        remPaid: number;
      }>;
    }> = {};

    rows.forEach(row => {
      const country = rowCountryName(row);
      const branch = rowBranchName(row);
      const currency = rowCurrency(row);
      const officeCur = rowOfficeCurrency(row);

      const purchaseAmt = orderTotal(row);
      const goods = row.form_data?.goodsEntries || [];
      const saleAmt = goods.reduce((sum: number, g: any) => sum + Number(g.saleAmount || g.sellingAmount || (Number(g.saleRate || g.sellingRate || g.salePrice || g.sellingPrice || 0) * Number(g.qtyNo || g.quantity || 0)) || 0), 0) || (purchaseAmt * 1.15);

      const conversionRate = getConversionRate(row, currency, officeCur, []);
      const finalTotal = purchaseAmt * conversionRate;
      const usdRate = getUsdRate(currency, summary.localCurrency, row.exchange_rate || 1);
      const dollarTotal = (purchaseAmt + saleAmt) * usdRate;

      // Advance conversion & values in Local Currency
      const form = row.form_data?.form || {};
      const advancePercent = Number(form.advancePercent || 0);
      const requiredAdvance = finalTotal * advancePercent / 100;
      const paidAdvance = Number(row.advance_paid || 0) * conversionRate;
      const remainingAdvance = Math.max(0, requiredAdvance - paidAdvance);
      const remainingDue = Number(row.remaining_due || 0) * conversionRate;
      const remPaid = Number(row.remaining_paid || 0) * conversionRate;

      if (!groups[country]) {
        groups[country] = {
          country,
          currency: officeCur,
          purchase: 0,
          sale: 0,
          dollarRate: usdRate,
          dollarTotal: 0,
          finalTotal: 0,
          requiredAdvance: 0,
          paidAdvance: 0,
          remainingAdvance: 0,
          remainingDue: 0,
          remPaid: 0,
          branches: {}
        };
      }

      groups[country].purchase += purchaseAmt;
      groups[country].sale += saleAmt;
      groups[country].dollarTotal += dollarTotal;
      groups[country].finalTotal += finalTotal;
      groups[country].requiredAdvance += requiredAdvance;
      groups[country].paidAdvance += paidAdvance;
      groups[country].remainingAdvance += remainingAdvance;
      groups[country].remainingDue += remainingDue;
      groups[country].remPaid += remPaid;

      if (!groups[country].branches[branch]) {
        groups[country].branches[branch] = {
          branch,
          currency: officeCur,
          purchase: 0,
          sale: 0,
          dollarRate: usdRate,
          dollarTotal: 0,
          finalTotal: 0,
          requiredAdvance: 0,
          paidAdvance: 0,
          remainingAdvance: 0,
          remainingDue: 0,
          remPaid: 0
        };
      }

      const br = groups[country].branches[branch];
      br.purchase += purchaseAmt;
      br.sale += saleAmt;
      br.dollarTotal += dollarTotal;
      br.finalTotal += finalTotal;
      br.requiredAdvance += requiredAdvance;
      br.paidAdvance += paidAdvance;
      br.remainingAdvance += remainingAdvance;
      br.remainingDue += remainingDue;
      br.remPaid += remPaid;
    });

    // Convert groups to array and convert branches Record to array, sorting them
    return Object.values(groups).map(g => ({
      ...g,
      branches: Object.values(g.branches).sort((a, b) => a.branch.localeCompare(b.branch))
    })).sort((a, b) => a.country.localeCompare(b.country));
  }, [rows, summary.localCurrency]);

  const renderSuperAdminSummaryTable = () => {
    if (!summaryRows || summaryRows.length === 0) {
      return (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-semibold">
          No summary data available
        </div>
      );
    }

    const grandTotals = summaryRows.reduce((acc, cur) => {
      acc.purchaseUSD += cur.purchase * cur.dollarRate;
      acc.saleUSD += cur.sale * cur.dollarRate;
      // Convert cur.finalTotal (which is in cur.currency) to summary.localCurrency
      const conversionRateToLocal = getConversionRate(null, cur.currency, summary.localCurrency, []);
      acc.finalTotal += cur.finalTotal * conversionRateToLocal;
      acc.dollarTotal += cur.dollarTotal;
      return acc;
    }, { purchaseUSD: 0, saleUSD: 0, finalTotal: 0, dollarTotal: 0 });

    const dir = ["ur", "ar", "fa", "ps"].includes(lang) ? "rtl" : "ltr";

    return (
      <div dir={dir} className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full">
        <table className={cn("w-full text-[10.5px] border-collapse bg-white dark:bg-slate-900", dir === "rtl" ? "text-right" : "text-left")}>
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[9.5px] text-slate-700 dark:text-slate-350 font-bold uppercase tracking-wider">
                <th className={cn("px-2.5 py-2.5 font-extrabold", dir === "rtl" ? "text-right" : "text-left")}>{t("country", lang)}</th>
                <th className={cn("px-2.5 py-2.5 font-extrabold", dir === "rtl" ? "text-right" : "text-left")}>{t("col_currency", lang)}</th>
                <th className={cn("px-2.5 py-2.5 font-extrabold", dir === "rtl" ? "text-left" : "text-right")}>{t("col_total_value", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((r, idx) => {
                const isSelected = selectedCountryForSummary === r.country;
                const isExpanded = !!expandedSummaryCountries[r.country];

                return (
                  <React.Fragment key={idx}>
                    <tr 
                      onClick={() => {
                        if (setSelectedCountryForSummary) {
                          setSelectedCountryForSummary(isSelected ? null : r.country);
                        }
                        setExpandedSummaryCountries(prev => ({
                          ...prev,
                          [r.country]: !prev[r.country]
                        }));
                      }}
                      className={cn(
                        "border-b border-slate-200 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-900/30 cursor-pointer font-extrabold text-slate-800 dark:text-slate-200 transition-all",
                        isSelected && "bg-blue-50/90 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-black border-l-2 border-l-blue-600 shadow-sm"
                      )}
                    >
                      <td className="px-2.5 py-3 uppercase truncate max-w-[120px] flex items-center gap-1 select-none font-sans" title={r.country}>
                        <span className="text-slate-400 mr-0.5">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </span>
                        {renderCountryBadge(r.country)}
                        <span className="font-extrabold ml-1">{tData(r.country, lang)}</span>
                      </td>
                      <td className="px-2.5 py-3 font-black text-slate-900 dark:text-slate-100">{tData(r.currency, lang)}</td>
                      <td className={cn("px-2.5 py-3 font-sans font-black tabular-nums text-slate-900 dark:text-slate-100", dir === "rtl" ? "text-left" : "text-right")}>{r.finalTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-slate-50/40 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800">
                        <td colSpan={3} className="p-3">
                          <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-inner dark:border-slate-850 dark:bg-slate-950 space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                              <span>{tData(r.country, lang)} Branches Report Details</span>
                              <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold dark:bg-blue-950/40 dark:text-blue-400">
                                {r.branches.length} Branches
                              </span>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[10px] border-collapse">
                                <thead>
                                  <tr className="border-b text-slate-450 font-bold uppercase text-[9px] tracking-wider bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="px-2 py-1.5">{t("branch", lang)}</th>
                                    <th className="px-2 py-1.5 text-right">Total Purchase</th>
                                    <th className="px-2 py-1.5 text-right">Required Adv</th>
                                    <th className="px-2 py-1.5 text-right">Paid Adv</th>
                                    <th className="px-2 py-1.5 text-right">Remaining Adv</th>
                                    <th className="px-2 py-1.5 text-right">Remaining Due (Baqaya)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {r.branches.map((b, bIdx) => (
                                    <tr key={bIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350">
                                      <td className="px-2 py-2 font-extrabold uppercase">{tData(b.branch, lang)}</td>
                                      <td className="px-2 py-2 text-right font-mono font-bold">{money(b.purchase, b.currency)}</td>
                                      <td className="px-2 py-2 text-right font-mono text-slate-500 dark:text-slate-400">{money(b.requiredAdvance, b.currency)}</td>
                                      <td className="px-2 py-2 text-right font-mono text-emerald-600 font-bold">{money(b.paidAdvance, b.currency)}</td>
                                      <td className={cn("px-2 py-2 text-right font-mono font-bold", b.remainingAdvance > 0 ? "text-amber-600" : "text-emerald-600")}>
                                        {money(b.remainingAdvance, b.currency)}
                                      </td>
                                      <td className={cn("px-2 py-2 text-right font-mono font-black", b.remainingDue > 0 ? "text-rose-600" : "text-slate-500")}>
                                        {money(b.remainingDue, b.currency)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {/* Grand Totals */}
              <tr className="bg-blue-50/40 dark:bg-blue-950/20 font-black text-slate-900 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-700 text-[11px]">
                <td colSpan={2} className={cn("px-2.5 py-3 uppercase tracking-wider text-[9.5px] text-slate-500 dark:text-slate-400", dir === "rtl" ? "text-left" : "text-right")}>{t("total_summary", lang)} ({summary.localCurrency})</td>
                <td className={cn("px-2.5 py-3 font-sans tabular-nums text-slate-900 dark:text-slate-100", dir === "rtl" ? "text-left" : "text-right")}>{grandTotals.finalTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
              </tr>
            </tbody>
          </table>
        </div>
    );
  };

  const renderDetailItem = (icon: React.ReactNode, label: string, value: React.ReactNode, textClass = "text-slate-800 dark:text-slate-200") => (
    <div className="flex justify-between items-center gap-2 border-b border-slate-100/50 dark:border-slate-850/20 pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-[10.5px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
        {icon}
        {label}:
      </span>
      <div className={cn("font-extrabold text-[11.5px] truncate max-w-[120px] uppercase", textClass)}>{value}</div>
    </div>
  );

  const renderDetails = () => (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="bg-blue-600 p-1 rounded-full text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400">1. BRANCH & USER DETAILS</h4>
      </div>
      <div className="p-4 flex flex-col gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        {renderDetailItem(<Globe className="h-3.5 w-3.5 text-slate-400" />, "Country", (
          <div className="flex items-center gap-1.5 font-extrabold text-[11.5px]">
            {renderCountryBadge(summary.country)}
            <span>{summary.country}</span>
          </div>
        ))}
        {renderDetailItem(<Home className="h-3.5 w-3.5 text-slate-400" />, "Branch", summary.branchName)}
        {renderDetailItem(<Fingerprint className="h-3.5 w-3.5 text-slate-400" />, "User ID", summary.userId)}
        {renderDetailItem(<User className="h-3.5 w-3.5 text-slate-400" />, "Name", summary.userName)}
        {renderDetailItem(<Shield className="h-3.5 w-3.5 text-slate-400" />, "Role", summary.role)}
        {renderDetailItem(<CalendarDays className="h-3.5 w-3.5 text-slate-400" />, "Date/Time", `${dateStr} ${timeStr}`, "text-[10px] text-slate-700 dark:text-slate-350")}
        <div className="flex justify-between items-center gap-2">
          <span className="flex items-center gap-2 text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
            Status:
          </span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-455 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider">Active</span>
        </div>
      </div>
    </div>
  );

  const renderPurchaseSummary = (onlyBody = false) => {
    const body = (
      <div className="flex flex-col gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></div> Total Transactions:</span>
          <span className="font-black text-slate-800 dark:text-slate-200">{summary.totalTransactions}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div> Purchase Currencies:</span>
          <span className="font-black text-slate-800 dark:text-slate-200">{numCurrencies}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5" y="0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div> Total Purchase (All):</span>
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
    );

    if (onlyBody) return body;

    return (
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-900/10">
          <div className="bg-purple-600 p-1 rounded-full text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-purple-800 dark:text-purple-400">2. PURCHASE SUMMARY (ALL CURRENCIES)</h4>
        </div>
        <div className="p-4 flex-1">
          {body}
        </div>
      </div>
    );
  };

  const renderOfficeCurrencySummary = (onlyBody = false) => {
    const body = (
      <div className="flex flex-col gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2"><div className="w-4 flex justify-center text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.55" y="0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div> Total Amount ({summary.localCurrency}):</span>
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
    );

    if (onlyBody) return body;

    return (
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <div className="bg-emerald-600 p-1 rounded-full text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-455 bg-emerald-50 dark:bg-emerald-900/10">3. FINAL OFFICE CURRENCY SUMMARY ({summary.localCurrency})</h4>
        </div>
        <div className="p-4 flex-1">
          {body}
        </div>
      </div>
    );
  };

  const renderTransactionSummary = (onlyBody = false) => {
    const body = (
      <div className="flex flex-col gap-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
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
    );

    if (onlyBody) return body;

    return (
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden h-full">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-900/10">
          <div className="bg-orange-600 p-1 rounded-full text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-orange-800 dark:text-orange-400">4. TRANSACTION SUMMARY</h4>
        </div>
        <div className="p-4 flex-1">
          {body}
        </div>
      </div>
    );
  };

  const renderAllStepsContent = () => {
    const avgPurchaseRate = summary.totalAllFC.totalPurchase > 0 
      ? (summary.totalPurchaseLC / summary.totalAllFC.totalPurchase).toFixed(4)
      : "1.0000";

    const avgAdvanceRate = summary.totalAllFC.advancePaid > 0 
      ? (summary.advancePaidLC / summary.totalAllFC.advancePaid).toFixed(4)
      : "1.0000";

    const dir = ["ur", "ar", "fa", "ps"].includes(lang) ? "rtl" : "ltr";
    return (
      <div dir={dir} className={cn("flex flex-col gap-3 text-[10px]", dir === "rtl" ? "text-right" : "text-left")}>
        {/* Block P1: Purchase Summary */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/30 p-2.5">
          <div className="flex items-center gap-1.5 font-black uppercase text-purple-700 dark:text-purple-400 mb-2 border-b border-slate-100 dark:border-slate-850/60 pb-1 flex-wrap">
            <span className="text-[7.5px] bg-purple-600 text-white font-extrabold px-1 rounded">P1</span>
            <span>{t("purchase_summary", lang)}</span>
          </div>
          <div className="space-y-1 text-slate-500 dark:text-slate-400 font-semibold">
            <div className="flex justify-between items-center">
              <span>{t("currencies", lang)}:</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200">{numCurrencies} {lang === "en" ? "Currencies" : ""}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("total_purchase_fc", lang)}:</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200 font-sans tabular-nums">{summary.totalAllFC.totalPurchase.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("total_purchase_lc", lang)} ({summary.localCurrency}):</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200 font-sans tabular-nums">{summary.totalPurchaseLC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("avg_rate", lang)}:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 font-sans tabular-nums">{avgPurchaseRate}</span>
            </div>
          </div>
        </div>

        {/* Block P2: Advance Summary */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/30 p-2.5">
          <div className="flex items-center gap-1.5 font-black uppercase text-blue-700 dark:text-blue-400 mb-2 border-b border-slate-100 dark:border-slate-850/60 pb-1 flex-wrap">
            <span className="text-[7.5px] bg-blue-600 text-white font-extrabold px-1 rounded">P2</span>
            <span>{t("advance_summary", lang)}</span>
          </div>
          <div className="space-y-1 text-slate-500 dark:text-slate-400 font-semibold">
            <div className="flex justify-between items-center">
              <span>{t("total_purchase_fc", lang).replace("Purchase", "Advance")}:</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200 font-sans tabular-nums">{summary.totalAllFC.advancePaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("total_purchase_lc", lang).replace("Purchase", "Advance")} ({summary.localCurrency}):</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200 font-sans tabular-nums">{summary.advancePaidLC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("avg_rate", lang)}:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 font-sans tabular-nums">{avgAdvanceRate}</span>
            </div>
          </div>
        </div>

        {/* Block P3: Paid Advance */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/30 p-2.5">
          <div className="flex items-center gap-1.5 font-black uppercase text-emerald-700 dark:text-emerald-455 mb-2 border-b border-slate-100 dark:border-slate-850/60 pb-1 flex-wrap">
            <span className="text-[7.5px] bg-emerald-600 text-white font-extrabold px-1 rounded">P3</span>
            <span>{t("paid_advance", lang)}</span>
          </div>
          <div className="space-y-1 text-slate-500 dark:text-slate-400 font-semibold">
            <div className="flex justify-between items-center">
              <span>{t("paid_advance", lang)} (FC):</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-455 font-sans tabular-nums">{summary.totalAllFC.advancePaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("paid_advance", lang)} ({summary.localCurrency}):</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-455 font-sans tabular-nums">{summary.advancePaidLC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("cleared_records", lang)}:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{summary.totalTransactions} {lang === "en" ? "Records" : ""}</span>
            </div>
          </div>
        </div>

        {/* Block P4: Remaining Advance */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/30 p-2.5">
          <div className="flex items-center gap-1.5 font-black uppercase text-rose-700 dark:text-rose-400 mb-2 border-b border-slate-100 dark:border-slate-850/60 pb-1 flex-wrap">
            <span className="text-[7.5px] bg-rose-600 text-white font-extrabold px-1 rounded">P4</span>
            <span>{t("remaining_advance", lang)}</span>
          </div>
          <div className="space-y-1 text-slate-500 dark:text-slate-400 font-semibold">
            <div className="flex justify-between items-center">
              <span>{t("remaining_advance", lang)} (FC):</span>
              <span className="font-extrabold text-rose-600 dark:text-rose-400 font-sans tabular-nums">{summary.totalAllFC.remainingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("remaining_advance", lang)} ({summary.localCurrency}):</span>
              <span className="font-extrabold text-rose-600 dark:text-rose-400 font-sans tabular-nums">{summary.remainingBalanceLC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t("remaining_ratio", lang)}:</span>
              <span className="font-extrabold text-rose-600 dark:text-rose-400">{notTransferredPercentLC.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUnifiedReport = () => (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="bg-blue-600 p-1 rounded-full text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400">{t("report_title", lang)}</h4>
      </div>
      <div className="p-3 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
        {renderAllStepsContent()}
      </div>
    </div>
  );

  // Group summary for display under table collapse row
  if (isGroupSummary) {
    return (
      <div className="flex flex-col mb-2 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {renderPurchaseSummary()}
          {renderOfficeCurrencySummary()}
          {renderTransactionSummary()}
        </div>
      </div>
    );
  }

  const renderHorizontalDetails = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800/50 mb-4 shadow-sm">
      <div className="flex justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800/40 md:border-b-0 pb-1.5 md:pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-450">
          <Globe className="h-3.5 w-3.5 text-slate-450" /> {t("country", lang)}:
        </span>
        <div className="flex items-center gap-1 font-extrabold text-[11px] text-slate-800 dark:text-slate-200">
          {renderCountryBadge(summary.country)}
          <span>{tData(summary.country, lang)}</span>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800/40 md:border-b-0 pb-1.5 md:pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-455">
          <Home className="h-3.5 w-3.5 text-slate-400" /> {t("branch", lang)}:
        </span>
        <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[110px]" title={summary.branchName}>{tData(summary.branchName, lang)}</span>
      </div>

      <div className="flex justify-between items-center gap-2 border-b border-slate-100/50 dark:border-slate-800/40 md:border-b-0 pb-1.5 md:pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-455">
          <Globe className="h-3.5 w-3.5 text-blue-500" /> {t("scope", lang)}:
        </span>
        {selectedCountryForSummary ? (
          <div className="flex items-center gap-1 font-extrabold text-[11px] text-blue-600 dark:text-blue-400">
            {renderCountryBadge(selectedCountryForSummary)}
            <span>{tData(selectedCountryForSummary, lang)}</span>
            {setSelectedCountryForSummary && (
              <button 
                type="button" 
                onClick={() => setSelectedCountryForSummary(null)} 
                className="text-[9px] font-black text-rose-500 hover:text-rose-600 dark:hover:text-rose-455 underline ml-1 cursor-pointer"
              >
                (Reset)
              </button>
            )}
          </div>
        ) : (
          <span className="font-extrabold text-[11px] text-slate-400">{t("global_all", lang)}</span>
        )}
      </div>

      <div className="flex justify-between items-center gap-2 border-b border-slate-100/50 dark:border-slate-800/40 md:border-b-0 pb-1.5 md:pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-455">
          <Fingerprint className="h-3.5 w-3.5 text-slate-400" /> {t("user_id", lang)}:
        </span>
        <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">{summary.userId}</span>
      </div>

      <div className="flex justify-between items-center gap-2 border-b border-slate-100/50 dark:border-slate-800/40 md:border-b-0 pb-1.5 md:pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-455">
          <User className="h-3.5 w-3.5 text-slate-400" /> {t("name", lang)}:
        </span>
        <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[110px]">{tData(summary.userName, lang)}</span>
      </div>

      <div className="flex justify-between items-center gap-2 border-b border-slate-100/50 dark:border-slate-800/40 md:border-b-0 pb-1.5 md:pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-455">
          <Shield className="h-3.5 w-3.5 text-slate-400" /> {t("role", lang)}:
        </span>
        <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase">{t(summary.role, lang)}</span>
      </div>

      <div className="flex justify-between items-center gap-2 border-b border-slate-100/50 dark:border-slate-800/40 md:border-b-0 pb-1.5 md:pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-455">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {t("time", lang)}:
        </span>
        <span className="font-extrabold text-[10px] text-slate-700 dark:text-slate-350">{dateStr} {timeStr}</span>
      </div>

      <div className="flex justify-between items-center gap-2 pb-0">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-455">
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" /> {t("status", lang)}:
        </span>
        <span className="font-extrabold text-emerald-600 dark:text-emerald-455 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wider">{t("active", lang)}</span>
      </div>
    </div>
  );

  // Super Admin view: 4 cards + Expandable Country Accordion
  if (isSuperAdmin) {
    const totalGlobalEntries = (rows || []).length;
    const transferredEntries = (rows || []).filter(row => {
      const ps = (row.ledger_posting_status || "").toLowerCase();
      const st = (row.payment_status || "").toLowerCase();
      return ps === "posted" || ps === "transferred" || st === "paid" || st === "completed";
    }).length;
    const remainingEntries = totalGlobalEntries - transferredEntries;
    
    const activeCountriesCount = summaryRows.length;
    let activeBranchesCount = 0;
    summaryRows.forEach(r => { activeBranchesCount += r.branches.length; });

    const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const getFlag = (cName: string) => {
      if (!cName) return '🏳️';
      if (cName.toLowerCase().includes('pakistan')) return '🇵🇰';
      if (cName.toLowerCase().includes('iran')) return '🇮🇷';
      if (cName.toLowerCase().includes('arab emirates') || cName.toLowerCase().includes('uae')) return '🇦🇪';
      if (cName.toLowerCase().includes('afghanistan')) return '🇦🇫';
      if (cName.toLowerCase().includes('india')) return '🇮🇳';
      if (cName.toLowerCase().includes('china')) return '🇨🇳';
      return '🏳️';
    };
    
    const adminCountry = session?.countryName || "United Arab Emirates";
    const adminBranch = session?.branchName || "Head Office";
    const adminUserId = session?.id || session?.username || summary.userId;

    return (
      <div className="flex flex-col mb-6 space-y-4">
        {/* 4 Panels Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Panel 1: Branch & User Details */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
              <div className="bg-blue-600 p-1 rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400">1. BRANCH & USER DETAILS</h4>
            </div>
            <div className="p-4 flex flex-col gap-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
              <div className="flex justify-between items-center">
                <span>Country:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">{getFlag(adminCountry)} {tData(adminCountry, lang)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Branch Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{tData(adminBranch, lang)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>User ID:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{adminUserId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>User Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{tData(summary.userName, lang)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Role:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{t(summary.role, lang)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Date & Time:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{dateStr}, {timeStr}</span>
              </div>
              <div className="flex justify-between items-center mt-auto">
                <span>Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-[10px]">Active</span>
              </div>
            </div>
          </div>

          {/* Panel 2: Global Financial Summary */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
              <div className="bg-emerald-600 p-1 rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">2. GLOBAL FINANCIAL SUMMARY (USD)</h4>
            </div>
            <div className="p-4 flex flex-col gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
              <div className="flex justify-between items-center">
                <span>Total Global Entries:</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{totalGlobalEntries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Purchase (USD):</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">{formatMoney(summary.totalPurchaseLC)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-rose-600 dark:text-rose-500">Total Advance/Paid (USD):</span>
                <span className="font-black text-rose-700 dark:text-rose-400 font-mono">{formatMoney(summary.advancePaidLC)}</span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 uppercase font-bold">Balance (USD):</span>
                <span className="font-black text-slate-900 dark:text-slate-100 font-mono text-sm">{formatMoney(summary.remainingBalanceLC)}</span>
              </div>
            </div>
          </div>

          {/* Panel 3: Bill Entries Summary */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-900/10">
              <div className="bg-purple-600 p-1 rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-800 dark:text-purple-400 truncate">3. BILL ENTRIES SUMMARY</h4>
            </div>
            <div className="p-4 flex flex-col gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 h-full">
              <div className="flex justify-between items-center">
                <span>Total Bill Entries:</span>
                <span className="font-black text-purple-700 dark:text-purple-400 font-mono">{totalGlobalEntries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Transferred to Loading:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-500 font-mono">{transferredEntries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-rose-600 dark:text-rose-500">Remaining Advance Balance:</span>
                <span className="font-black text-rose-700 dark:text-rose-400 font-mono">{remainingEntries}</span>
              </div>
              <div className="flex justify-between items-center mt-auto pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                <span>System Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-500">Online & Synced</span>
              </div>
            </div>
          </div>

          {/* Panel 4: All Countries Report Details (Interactive) */}
          <div 
            className={cn(
              "group flex flex-col rounded-xl border-2 bg-white shadow-sm dark:bg-slate-900 overflow-hidden cursor-pointer transition-colors",
              showAllCountries 
                ? "border-orange-400 dark:border-orange-600 shadow-md" 
                : "border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700"
            )}
            onClick={() => setShowAllCountries(!showAllCountries)}
          >
            <div className="flex flex-col h-full outline-none">
              <div className={cn(
                "flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 transition-colors",
                showAllCountries 
                  ? "bg-orange-100/80 dark:bg-orange-900/40" 
                  : "bg-orange-50/50 dark:bg-orange-900/10 group-hover:bg-orange-100/50 dark:group-hover:bg-orange-900/30"
              )}>
                <div className={cn("bg-orange-600 p-1 rounded-full text-white transition-transform duration-300", showAllCountries ? "rotate-90" : "rotate-0")}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-orange-800 dark:text-orange-400 flex-1">4. ALL COUNTRIES REPORT</h4>
                <span className="text-[9px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-bold">{showAllCountries ? "Hide Details" : "Show Details"}</span>
              </div>
              <div className="p-3 flex flex-col gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 h-full overflow-y-auto max-h-[160px] scrollbar-thin">
                {summaryRows.map((r, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                     <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[120px]">
                       {getFlag(r.country)} {tData(r.country, lang)}
                     </span>
                     <span className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-sm text-[9px] whitespace-nowrap">{r.branches.length} Branches</span>
                   </div>
                ))}
                
                <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                  {!showAllCountries && <span className="text-orange-600 dark:text-orange-500 font-bold uppercase text-[10px]">Show Report Details ↓</span>}
                  {showAllCountries && <span className="text-orange-600 dark:text-orange-500 font-bold uppercase text-[10px]">Hide Report Details ↑</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Country Dashboard Section Content */}
        {showAllCountries && (
          <div className="country-accordion-content block animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {summaryRows.map((r, idx) => (
                <div key={idx} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-black text-[11px] uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {getFlag(r.country)} {tData(r.country, lang)}
                    </span>
                    <span className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-sm text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {r.branches.length} Branches
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="mb-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Currency</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 text-xs">{r.currency}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Purchase</span>
                        <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-[11px]">{formatMoney(r.purchase)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paid Advance</span>
                        <span className="font-black text-emerald-600 font-mono text-[11px]">{formatMoney(r.sale)}</span>
                      </div>
                      <div className="mt-1 flex justify-between items-center border-t border-slate-200 pt-2 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remaining Balance</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 font-mono text-sm">{formatMoney(r.finalTotal)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex justify-between items-center">
                        <span>Branch Breakdown</span>
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] dark:bg-slate-800">All</span>
                      </h5>
                      {r.branches.map((b, bIdx) => (
                        <div key={bIdx} className="flex flex-col gap-1.5 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-[10px] uppercase text-slate-700 dark:text-slate-300 truncate pr-2" title={b.branch}>{tData(b.branch, lang)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[9px]">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Total Purch.</span>
                              <span className="font-bold text-rose-500 font-mono">{formatMoney(b.purchase)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Req. Adv</span>
                              <span className="font-bold text-slate-500 font-mono">{formatMoney(b.requiredAdvance)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Paid Adv</span>
                              <span className="font-bold text-emerald-500 font-mono">{formatMoney(b.paidAdvance)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Rem. Bal</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatMoney(b.remainingAdvance)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard view: return null so that no top summary header cards are rendered on the standard user main dashboard
  return null;
}

export function PurchaseOrderPaymentJournal({ mode = "advance" }: { mode?: PaymentMode }) {
  const router = useRouter();
  const activeMode: PaymentMode = mode === "charges" ? "credit" : mode;
  const logClientError = (msg: string) => {
    fetch("/api/erp/purchases/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientLog: msg })
    }).catch(() => {});
  };
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
          fetch("/api/branch-management/countries"),
          fetch("/api/branch-management/city-branches?limit=1000")
        ]);
        if (cRes.ok && bRes.ok) {
          const cData = await cRes.json();
          const bData = await bRes.json();
          if (!cancelled) {
            setSaCountries(cData.countries || []);
            setSaBranches(bData.cityBranches || []);
          }
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
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  const [selectedCountryForSummary, setSelectedCountryForSummary] = useState<string | null>(null);
  
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
      finalCurrency: rowOfficeCurrency(row),
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

  // Container Selection local state
  const [selectedLoadingRecord, setSelectedLoadingRecord] = useState<any>(null);
  const [loadingRecords, setLoadingRecords] = useState<any[]>([]);
  const [loadingLoadingRecords, setLoadingLoadingRecords] = useState(false);

  // Fetch loaded container records for Remaining Payment mode
  useEffect(() => {
    if (selected && activeMode === "remaining") {
      setLoadingLoadingRecords(true);
      fetch(`/api/erp/purchases/loading-records?q=${selected.purchase_order_no}`, { credentials: "include" })
        .then(res => res.json())
        .then(res => {
          if (res.ok && Array.isArray(res.data?.records)) {
            const loaded = res.data.records.filter((r: any) =>
              r.loading_status === "loaded" ||
              Number(r.report_payload?.loadedQuantity || r.loadedQuantity || 0) > 0
            );
            setLoadingRecords(loaded);
          }
        })
        .catch(err => console.error("Error loading container records:", err))
        .finally(() => setLoadingLoadingRecords(false));
    } else {
      setLoadingRecords([]);
      setSelectedLoadingRecord(null);
    }
  }, [selected, activeMode]);

  // Sync selected container if URL has fromLoading parameters
  useEffect(() => {
    if (selected && activeMode === "remaining") {
      const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const fromLoading = searchParams.get("fromLoading") === "true";
      if (fromLoading) {
        const cLoadingRecordId = searchParams.get("loadingRecordId") || "";
        const cLoadedQty = Number(searchParams.get("loadedQty") || 0);
        const cGrossWeight = Number(searchParams.get("grossWeight") || 0);
        const cNetWeight = Number(searchParams.get("netWeight") || 0);
        const cPriceRate = Number(searchParams.get("priceRate") || 0);
        
        setSelectedLoadingRecord({
          id: cLoadingRecordId,
          loading_record_no: searchParams.get("purchaseOrderNo") ? `Transferred Container (${searchParams.get("purchaseOrderNo")})` : "Transferred Container",
          report_payload: {
            loadedQuantity: cLoadedQty,
            grossWeight: cGrossWeight,
            netWeight: cNetWeight,
            priceRateC1: cPriceRate
          }
        });
      }
    }
  }, [selected, activeMode]);

  const handleSelectLoadingRecord = (lr: any) => {
    setSelectedLoadingRecord(lr);
    if (!selected) return;

    const poRow = selected || {};
    const finance = calcLoadingFinance(lr, poRow, poRow.form_data?.form || {});
    const loadedQty = lr.report_payload?.loadedQuantity || lr.loadedQuantity || 0;
    const poAdvanceAmt = Number(poRow.advance_paid || poRow.form_data?.form?.advanceAmount || 0);
    
    const goods = poRow.form_data?.goodsEntries || [];
    const totalPOQuantity = Number(
      poRow.form_data?.totals?.totalQuantity ||
      goods.reduce((acc: number, item: any) => acc + Number(item.qtyNo || item.quantity || 0), 0) ||
      poRow.form_data?.form?.quantity ||
      1
    );

    const loadedAdvanceUSD = totalPOQuantity > 0 ? (loadedQty / totalPOQuantity) * poAdvanceAmt : poAdvanceAmt;
    const loadedRemainingUSD = Math.max(0, finance.amountUSD - loadedAdvanceUSD);
    
    const exRateVal = Number(exchangeRate || finance.exRate || 1);
    setCalcAmount(loadedRemainingUSD.toFixed(4));
    setFinalPayment((loadedRemainingUSD * exRateVal).toFixed(2));
  };

  // Local cache for Bank/Method quick add
  const [savedBanks, setSavedBanks] = useState<SavedBankItem[]>([]);
  const [savedMethods, setSavedMethods] = useState<string[]>([]);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<"bank" | "method">("bank");
  const [activeTab, setActiveTab] = useState<"remaining" | "advance" | "history">("advance");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [titleSlot, setTitleSlot] = useState<Element | null>(null);
  const [actionsSlot, setActionsSlot] = useState<Element | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("en");
  const isRtl = ["ur", "ar", "fa", "ps"].includes(currentLanguage);

  useEffect(() => {
    const titleEl = document.getElementById("erp-page-title-slot");
    const actionsEl = document.getElementById("erp-page-actions-slot");
    if (titleEl) setTitleSlot(titleEl);
    if (actionsEl) setActionsSlot(actionsEl);

    if (titleEl && actionsEl) return;

    const timer = setInterval(() => {
      const t = document.getElementById("erp-page-title-slot");
      const a = document.getElementById("erp-page-actions-slot");
      if (t) setTitleSlot(t);
      if (a) setActionsSlot(a);
      if (t && a) clearInterval(timer);
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const [addOptionValue, setAddOptionValue] = useState("");
  const [addOptionAddress, setAddOptionAddress] = useState("");

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [selectedOrderPayments, setSelectedOrderPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showModalHistory, setShowModalHistory] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setSelectedOrderPayments([]);
      setShowModalHistory(false);
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
        const scopedCountryId = isSuperAdmin ? (saCountryId || null) : (selectedOrderForLedger?.country_id ?? null);
        const scopedCountryBranchId = selectedOrderForLedger?.country_branch_id ?? null;
        const scopedCityBranchId = isSuperAdmin ? (saBranchId || null) : (selectedOrderForLedger?.city_branch_id ?? null);
        
        const res = await listLedgerReportLedgers({
          reportScope: isSuperAdmin
            ? (saBranchId ? "branch" : saCountryId ? "country" : "super_admin")
            : (scopedCountryId ? "country" : "super_admin"),
          countryId: scopedCountryId,
          countryBranchId: null,
          cityBranchId: isSuperAdmin ? (saBranchId || null) : null,
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
    const urlOrderNo = getInitialPurchaseOrderNo();
    return orders.filter((row) => {
      if (urlOrderNo && row.purchase_order_no === urlOrderNo) return true;
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
      const finalAmount = orderTotal(row);
      const advancePercent = Number(form.advancePercent || 0);
      const requiredAdvance = (finalAmount * advancePercent) / 100;
      const paidAdvance = Number(row.advance_paid || 0);
      const remainingAdvance = requiredAdvance - paidAdvance;
      let remainingDue = Number(row.remaining_due || 0);
      if (remainingDue === 0) {
        // Fallback calculation if db field is not populated
        const remPaid = Number(row.remaining_paid || 0);
        remainingDue = finalAmount - paidAdvance - remPaid;
      }
      
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
        // Required advance must be fully cleared first before appearing in remaining payments
        if (advancePercent > 0 && remainingAdvance > 0.01) return false;
        if (remainingDue <= 0.01) return false; // Already cleared

        // STRICT BUSINESS RULE: Remaining payment requires Transfer to Loading first.
        // An order must have been transferred (dispatched) before remaining payment is allowed.
        const workflow = row.form_data?.workflow || {};
        const hasTransferStatus = (workflow.transferStatus || "").toLowerCase() === "transferred";
        const hasTransferAudit  = Boolean(row.form_data?.form?.transferAudit || workflow.transferAudit);
        const hasLoadingRecord  = Number((row as any).loading_record_count || 0) > 0
          || Boolean(workflow.loadedQuantity && Number(workflow.loadedQuantity) > 0);
        const hasContainerMovement = hasTransferStatus || hasTransferAudit || hasLoadingRecord;
        if (!hasContainerMovement) return false; // Block: not yet transferred to loading
      } else if (activeMode === "credit") {
        if (isCreditPaid) return false; // Already cleared
      } else if (activeMode === "history") {
        // Show in history if fully cleared
        const isFullyCleared = (advancePercent > 0 ? isAdvanceCleared : true) && isRemainingCleared;
        if (!isFullyCleared && !isCreditPaid) return false;
      }

      if (!needle) return true;
      const supplierName = form.salesAccountName || form.supplierName || "";
      const supplierCode = form.salesAccountNo || "";
      const customerName = form.customerName || form.buyerName || "";
      const goodsName = form.goodsName || form.productName || "";
      const containerNo = form.containerNo || form.containerNumber || "";
      return [
        row.purchase_order_no,
        row.purchase_contract_no,
        form.manualBillNo,
        form.manual_bill_no,
        form.manualBillNumber,
        form.billNo,
        form.invoiceNo,
        form.invoiceNumber,
        form.purchaseContractNo,
        row.payment_status,
        row.currency_code,
        row.currency,
        row.createdByName,
        form.userName,
        supplierName,
        supplierCode,
        customerName,
        goodsName,
        containerNo,
        rowCountryName(row),
        rowBranchName(row)
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [activeMode, branchFilter, countryFilter, currencyFilter, draftFilter, orders, query]);

  const selected = selectedId ? (filtered.find((row) => row.id === selectedId) ?? null) : null;
  const pageRows = useMemo(() => {
    return filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [filtered, pageIndex, pageSize]);

  const countryGroups = useMemo(() => {
    const groups: Array<{ country: string; rows: PurchaseOrderRow[] }> = [];
    for (const row of pageRows) {
      const c = rowCountryName(row) || "Unknown Country";
      let group = groups.find(g => g.country === c);
      if (!group) {
        group = { country: c, rows: [] };
        groups.push(group);
      }
      group.rows.push(row);
    }
    return groups;
  }, [pageRows]);

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
    if (!selectedSourceLedger) return "—";
    const bal = Number(selectedSourceLedger.current_balance ?? 0);
    return `${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ledgerCurrency(selectedSourceLedger) || "PKR"}`;
  }, [selectedSourceLedger]);

  const baseCurrency = useMemo(() => {
    if (selectedSourceLedger) {
      const ledgerCurrency = selectedSourceLedger.currency || "";
      if (ledgerCurrency) {
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
  }, [selectedSourceLedger, selectedForm, session]);

  // Sync PO currency, exchange rate, and Super Admin filters when order changes
  useEffect(() => {
    if (selected) {
      const searchParams = new URLSearchParams(window.location.search);
      const urlAmount = searchParams.get("amount");
      const urlExchangeRate = searchParams.get("exchangeRate");
      const urlFinalAmount = searchParams.get("finalAmount");
      const urlAmountPKR = searchParams.get("amountPKR");
      const urlRemarks = searchParams.get("remarks");
      const urlCurrency = searchParams.get("currency");

      if (urlExchangeRate) {
        setExchangeRate(urlExchangeRate);
      } else {
        if (selected.currency_code === baseCurrency && currency === baseCurrency) {
          setExchangeRate("1");
        } else {
          const rate = String(getEffectiveRate(selected));
          setExchangeRate(rate);
        }
      }

      if (urlAmount) {
        setCalcAmount(urlAmount);
      } else {
        setCalcAmount("");
      }

      if (urlFinalAmount) {
        setFinalPayment(urlFinalAmount);
      } else if (urlAmountPKR) {
        setFinalPayment(urlAmountPKR);
      } else {
        setFinalPayment("");
      }

      if (urlRemarks) {
        setRemarks(urlRemarks);
      } else {
        setRemarks("");
      }

      if (urlCurrency) {
        setCurrency(urlCurrency.toUpperCase());
      } else {
        const poCur = selected.currency_code || "USD";
        // Auto-enforce local currency for payment
        setCurrency(baseCurrency || poCur.toUpperCase());
      }

      // Pre-populate Super Admin selectors with selected order scope
      if (isSuperAdmin) {
        setSaCountryId(selected.country_id || "");
        setSaBranchId(selected.city_branch_id || selected.country_branch_id || "");
      }
    }
  }, [selectedId, selected, baseCurrency, currency, getEffectiveRate, isSuperAdmin]);

  const cards = useMemo(() => kpis(filtered, activeMode, baseCurrency), [activeMode, filtered, baseCurrency]);
  const countryOptions = useMemo(() => Array.from(new Set(orders.map(rowCountryName))).filter(Boolean).sort(), [orders]);
  const branchOptions = useMemo(() => Array.from(new Set(orders.filter((row) => !countryFilter || rowCountryName(row) === countryFilter).map(rowBranchName))).filter(Boolean).sort(), [orders, countryFilter]);
  const currencyOptions = useMemo(() => Array.from(new Set(orders.filter((row) => !countryFilter || rowCountryName(row) === countryFilter).map(rowCurrency))).filter(Boolean).sort(), [orders, countryFilter]);

  const dashboardSummary = useMemo(() => {
    return getDashboardSummaryData(filtered, session, activeMode);
  }, [filtered, session, activeMode]);

  // Quick add saved options on mount
  useEffect(() => {
    setSavedBanks(readLocalBankList(SAVED_BANKS_KEY));
    setSavedMethods(readLocalList(SAVED_METHODS_KEY));
  }, []);

  function openAddOption(type: "bank" | "method") {
    setAddOptionType(type);
    setAddOptionValue("");
    setAddOptionAddress("");
    setAddOptionOpen(true);
  }

  function commitAddOption() {
    const val = addOptionValue.trim();
    if (!val) return;
    if (addOptionType === "bank") {
      const updated = [...savedBanks, { name: val, address: addOptionAddress.trim() }];
      setSavedBanks(updated);
      writeLocalBankList(SAVED_BANKS_KEY, updated);
      setTypeDetails((prev) => ({ ...prev, bankName: val }));
    } else {
      const updated = [...savedMethods, val];
      setSavedMethods(updated);
      writeLocalList(SAVED_METHODS_KEY, updated);
      setTypeDetails((prev) => ({ ...prev, method: val }));
    }
    setAddOptionOpen(false);
  }

  function deleteCustomMethod(method: string) {
    const updated = savedMethods.filter((m) => m !== method);
    setSavedMethods(updated);
    writeLocalList(SAVED_METHODS_KEY, updated);
    if (typeDetails.method === method) {
      setTypeDetails((p) => ({ ...p, method: "" }));
    }
  }

  function renameCustomMethod(oldVal: string, newVal: string) {
    const updated = savedMethods.map((m) => (m === oldVal ? newVal : m));
    setSavedMethods(updated);
    writeLocalList(SAVED_METHODS_KEY, updated);
    if (typeDetails.method === oldVal) {
      setTypeDetails((p) => ({ ...p, method: newVal }));
    }
  }

  // Load custom select options
  const ledgerOptions = useMemo(() => {
    return ledgers.map(toLedgerOption);
  }, [ledgers]);

  // Calculate dynamic currency values
  const isLocalCurrency = currency === baseCurrency;
  const isPOCurrencyLocal = useMemo(() => {
    const poCurr = (selected?.currency_code || "USD").toUpperCase();
    return poCurr === baseCurrency.toUpperCase();
  }, [selected?.currency_code, baseCurrency]);

  const showCalcPanel = useMemo(() => {
    return currency !== (selected?.currency_code || "USD") || currency !== baseCurrency;
  }, [currency, selected?.currency_code, baseCurrency]);

  const calcFinal = useMemo(() => {
    if (!showCalcPanel) return null;
    const fAmt = Number(calcAmount || 0);
    // If PO currency is local (PKR), no conversion rate is needed (rate is 1).
    // Otherwise we use the user-entered exchangeRate (e.g. 289).
    const exRate = isPOCurrencyLocal ? 1 : Number(exchangeRate || 1);
    if (calcOp === "mul") {
      return fAmt * exRate;
    } else {
      return exRate > 0 ? fAmt / exRate : 0;
    }
  }, [showCalcPanel, calcAmount, exchangeRate, calcOp, isPOCurrencyLocal]);

  // Derive target numeric payment amount
  const amount = useMemo(() => {
    if (showCalcPanel && calcFinal !== null) return calcFinal;
    return Number(finalPayment || 0);
  }, [showCalcPanel, calcFinal, finalPayment]);

  const payloadAmount = useMemo(() => {
    return showCalcPanel
      ? (isLocalCurrency ? Number(calcFinal || 0) : Number(calcAmount || 0))
      : Number(finalPayment || 0);
  }, [showCalcPanel, isLocalCurrency, calcFinal, calcAmount, finalPayment]);

  const canSave = useMemo(() => {
    return Boolean(paymentSourceLedgerId && roznamchaNumber && paymentType && amount > 0);
  }, [paymentSourceLedgerId, roznamchaNumber, paymentType, amount]);

  // Dynamic double entry preview values
  const doubleEntry = useMemo(() => {
    // For payments (advance, remaining, credit), the debit account is the supplier's party account (salesAccountNo / salesAccountName)
    // and the credit account is the user-selected payment source account (bank/cash).
    // If it's a booking entry, we debit the purchase account and credit the supplier's account.
    const isBooking = activeMode === "booking";

    const debitCode = isBooking 
      ? (selectedForm.purchaseAccountNo || "-") 
      : (selectedForm.salesAccountNo || "LIABILITY-001");
      
    const debitName = isBooking 
      ? (selectedForm.purchaseAccountName || "Purchase Account") 
      : (selectedForm.salesAccountName || "Supplier Liability Ledger");
      
    const debitBranch = isBooking 
      ? (selectedForm.purchaseAccountBranch || "-") 
      : (selectedForm.salesAccountBranch || "-");

    const creditCode = isBooking
      ? (selectedForm.salesAccountNo || "-")
      : (selectedSourceLedger ? ledgerCode(selectedSourceLedger) : "CASH-001");
      
    const creditName = isBooking
      ? (selectedForm.salesAccountName || "Supplier Liability Ledger")
      : (selectedSourceLedger ? ledgerName(selectedSourceLedger) : "Cash Book Dubai Branch");
      
    const creditBranch = isBooking
      ? (selectedForm.salesAccountBranch || "-")
      : (selectedSourceLedger ? (selectedSourceLedger.branchName || "-") : "-");

    return { debitCode, debitName, debitBranch, creditCode, creditName, creditBranch };
  }, [selectedSourceLedger, selectedForm, activeMode]);

  // Suggested values to make input easier
  const suggestedAdvance = useMemo(() => {
    if (!selected) return 0;
    const form = selected.form_data?.form || {};
    const totalPrice = selected.form_data?.goodsEntries?.length
      ? selected.form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
      : Number(form.totalAmount || 0);
    const advancePercent = Number(form.advancePercent || 0);
    const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
    const paidAdvanceBC = Number(selected.advance_paid || 0);
    return Math.max(0, requiredAdvanceBC - paidAdvanceBC);
  }, [selected]);

  // Final Action POST handler
  async function handleProcessPayment() {
    if (!canSave || !selected) return;
    setProcessingPayment(true);
    setPaymentSuccess("");
    setPaymentError("");

    try {
      const finalRemarks = remarks.trim() || `Automated payment settlement for Purchase Order No: ${selected.purchase_order_no}. Roznamcha Category: ${paymentType.toUpperCase()}.`;
      const formData = new FormData();

      // Helper to check if a string is a valid UUID
      const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      // Resolve debit ledger ID by matching code against active ledgers
      let debitLedgerId = "";
      const foundDeb = ledgers.find((l) => ledgerCode(l) === doubleEntry.debitCode);
      if (foundDeb) {
        debitLedgerId = ledgerId(foundDeb) || "";
      } else {
        const rawId = doubleEntry.debitCode === debitAccountCode 
          ? selectedForm.purchaseAccountLedgerId || selectedForm.purchaseAccountId 
          : selectedForm.salesAccountLedgerId || selectedForm.salesAccountId;
        debitLedgerId = String(rawId || "");
      }

      // Resolve credit ledger ID by matching code against active ledgers
      let creditLedgerId = "";
      const foundCred = ledgers.find((l) => ledgerCode(l) === doubleEntry.creditCode);
      if (foundCred) {
        creditLedgerId = ledgerId(foundCred) || "";
      } else {
        creditLedgerId = paymentSourceLedgerId;
      }

      if (!isUuid(debitLedgerId) || !isUuid(creditLedgerId)) {
        setPaymentError("Invalid ledger account selection. Please ensure debit and credit accounts are fully mapped with valid UUIDs.");
        return;
      }
      
      const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const fromLoading = searchParams.get("fromLoading") === "true";
      const loadingRecordId = searchParams.get("loadingRecordId") || "";

      const payload = {
        purchaseOrderId: selected.id,
        purchaseOrderNo: selected.purchase_order_no,
        kind: ["advance", "remaining", "credit", "booking"].includes(activeMode) ? activeMode : "advance",
        debitLedgerId,
        creditLedgerId,
        paymentType,
        roznamchaType,
        roznamchaNumber,
        currencyCode: currency,
        exchangeRate: Number(exchangeRate || 1),
        amount: payloadAmount,
        amountLocal: amount,
        narration: finalRemarks,
        entryDate: paymentDate,
        referenceNo: roznamchaNumber || undefined,
        typeDetails: {
          ...typeDetails,
          ...(fromLoading && loadingRecordId ? { loadingRecordId } : {})
        },
        doubleEntry,
        countryId: selected.country_id || null,
        countryBranchId: selected.country_branch_id || null,
        cityBranchId: selected.city_branch_id || selected.country_branch_id || null
      };

      formData.append("payload", JSON.stringify(payload));
      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
      }
      const postUrl = `/api/erp/purchases/orders/${selected.id}/payments${fromLoading ? "?fromLoading=true" : ""}`;

      const res = await fetch(postUrl, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        throw new Error(body?.error?.message ?? body?.message ?? "Execution failure on backend server.");
      }

      const allSerials = [body.data?.serialNumber, body.data?.countrySerialNumber, body.data?.branchSerialNumber].filter(Boolean).join(" | ");
      setPaymentSuccess(`Double-entry ledger voucher successfully balanced! Journal Serial Number: ${allSerials || "N/A"}.`);
      setCalcAmount("");
      setFinalPayment("");
      setRemarks("");
      setTypeDetails({});
      setAttachmentFile(null);
      
      // Auto-reload data
      await loadOrders();
    } catch (err: any) {
      setPaymentError(err?.message || "Failed to process payment settlement. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  }

  const renderRow = (row: PurchaseOrderRow, index: number) => {
    const form = row.form_data?.form || {};
    const goods = row.form_data?.goodsEntries || [];
    const totalPrice = orderTotal(row);
    const bookCur = rowCurrency(row);
    const officeCur = rowOfficeCurrency(row);
    const conversionRate = getConversionRate(row, bookCur, officeCur, liveRates);
    
    // Correctly resolve Book Currency (USD/FC) and Local Currency (PKR/LC)
    const totalAmountBC = (conversionRate > 1 && totalPrice > 1000000) ? (totalPrice / conversionRate) : totalPrice;
    const totalAmountLocal = totalAmountBC * conversionRate;

    const advancePercent = Number(form.advancePercent || 0);
    const requiredAdvanceBC = (totalAmountBC * advancePercent) / 100;
    const paidAdvanceBC = Number(row.advance_paid || 0);
    const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
    
    const requiredAdvance = (totalAmountLocal * advancePercent) / 100;
    const paidAdvance = paidAdvanceBC * conversionRate;
    const remainingAdvance = Math.max(0, requiredAdvance - paidAdvance);
    
    const remainingDueBC = Number(row.remaining_due || 0);
    const rowLocalCurrency = officeCur;
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
      const remPaidBC = Number(row.remaining_paid || 0);
      paidAmountBC = remPaidBC;
      paidAmountLocal = remPaidBC * conversionRate;
      balanceAmountBC = remainingDueBC;
      balanceAmountLocal = remainingDueBC * conversionRate;
    } else {
      const credPaidBC = Number(row.credit_amount || 0);
      paidAmountBC = credPaidBC;
      paidAmountLocal = credPaidBC * conversionRate;
      balanceAmountBC = Math.max(0, totalAmountBC - paidAmountBC);
      balanceAmountLocal = balanceAmountBC * conversionRate;
    }
    const statusText = row.payment_status || "Pending";
    const isSelected = selected?.id === row.id;
    const isExpanded = Boolean(expandedIds[row.id]);
    const rowBg = isSelected ? "#eff6ff" : index % 2 === 0 ? "#ffffff" : "#f8fafc";
    const isPosted = row.ledger_posting_status === "Posted"
      || row.ledger_posting_status === "posted"
      || row.ledger_posting_status === "Transferred"
      || row.ledger_posting_status === "transferred";
    const isPaymentCompleted = (activeMode === "remaining" || activeMode === "credit")
      ? balanceAmountBC <= 0.01
      : isPosted;
    const getRowColor = () => isPosted ? "text-black dark:text-white" : "text-red-600 dark:text-red-400";

    // Per-row derived display values
    const goodsName = goods.map((g: any) => g.goodsName || g.name).filter(Boolean).join(", ") || form.goodsName || "—";
    const grossWeight = goods.length ? goods.reduce((s: number, g: any) => s + Number(g.grossWeight || 0), 0) : Number(form.grossWeight || 0);
    const netWeight = goods.length ? goods.reduce((s: number, g: any) => s + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0);
    const billNo = form.billNo || form.invoiceNo || row.purchase_contract_no || "—";
    const dateStr = form.purchaseDate ? new Date(form.purchaseDate).toLocaleDateString("en-GB") : row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB") : "—";
    const branchName = rowBranchName(row) || "—";
    const countryName = rowCountryName(row) || "—";

    // Serial numbers
    const superSerialNo = index + 1 + pageIndex * pageSize;
    const countryRows = filtered.filter((r) => rowCountryName(r) === countryName);
    const countrySerialNo = countryRows.findIndex((r) => r.id === row.id) + 1;
    const branchRows = filtered.filter((r) => rowBranchName(r) === branchName);
    const branchSerialNo = branchRows.findIndex((r) => r.id === row.id) + 1;

    return (
      <React.Fragment key={row.id}>
        <tr
          onClick={() => setExpandedIds((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
          style={{ background: rowBg, borderBottom: "1px solid #e2e8f0", cursor: "pointer", outline: isSelected ? "2px solid #3b82f6" : undefined, outlineOffset: -1 }}
          onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#f0f9ff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
        >
          {/* Order ID */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="font-mono text-[11px] font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {row.purchase_order_no}
            </div>
          </td>
          {/* Bill & Date */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col">
              <span className="font-mono font-black text-[11px] text-slate-850 dark:text-slate-200">{billNo}</span>
              <span className="text-[10px] text-slate-500 mt-1 font-semibold">{dateStr}</span>
            </div>
          </td>
          {/* Branch & Country */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col">
              <span className="font-black text-[11px] text-slate-850 dark:text-slate-200 uppercase tracking-wide">{tData(branchName, currentLanguage)}</span>
              <span className="text-[10px] text-slate-500 mt-1 font-semibold">{tData(countryName, currentLanguage)}</span>
            </div>
          </td>
          {/* Purchase Account */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col">
              <span className="font-extrabold text-[11px] text-slate-850 dark:text-slate-200 truncate max-w-[130px]" title={tData(form.purchaseAccountName, currentLanguage) || "N/A"}>
                {tData(form.purchaseAccountName, currentLanguage) || "N/A"}
              </span>
              <span className="font-mono text-[10px] text-slate-500 mt-1 font-bold">
                {form.purchaseAccountNumber || "-"}
              </span>
            </div>
          </td>
          {/* Sales Account */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col">
              <span className="font-extrabold text-[11px] text-slate-850 dark:text-slate-200 truncate max-w-[130px]" title={tData(form.salesAccountName || form.supplierName, currentLanguage) || "N/A"}>
                {tData(form.salesAccountName || form.supplierName, currentLanguage) || "N/A"}
              </span>
              <span className="font-mono text-[10px] text-slate-500 mt-1 font-bold">
                {form.salesAccountNumber || "-"}
              </span>
            </div>
          </td>
          {/* Goods & Brand */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col gap-0.5 text-[10px]">
              <span className="font-extrabold text-[11px] text-slate-850 dark:text-slate-200 truncate max-w-[145px]" title={tData(goodsName, currentLanguage)}>{tData(goodsName, currentLanguage)}</span>
              <span className="text-slate-500 font-semibold">
                Sz: <span className="font-extrabold text-slate-700 dark:text-slate-300">{goods.map((g: any) => g.size || "").filter(Boolean).join(", ") || "-"}</span> | Br: <span className="font-extrabold text-slate-700 dark:text-slate-300">{goods.map((g: any) => g.brand || "").filter(Boolean).join(", ") || "-"}</span>
              </span>
            </div>
          </td>
          {/* Weight & Qty */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              <span>Qty: <span className="font-extrabold text-slate-750 dark:text-slate-200">{form.quantity || 0} {form.quantityUnit || "BAGS"}</span></span>
              <span>GW: <span className="font-extrabold text-slate-750 dark:text-slate-200">{grossWeight.toLocaleString()} KG</span></span>
              <span>NW: <span className="font-extrabold text-slate-750 dark:text-slate-200">{netWeight.toLocaleString()} KG</span></span>
            </div>
          </td>
          {/* Total / Rate */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col">
              <span className="font-extrabold text-[11px] text-slate-850 dark:text-slate-200">{totalAmountLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {rowLocalCurrency}</span>
              <span className="text-[10px] text-slate-500 mt-1 font-bold">
                Rate: {conversionRate.toFixed(4)}
              </span>
            </div>
          </td>
          {/* Adv Details */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              <span>Req: <span className="font-black text-slate-800 dark:text-slate-200">{requiredAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {rowLocalCurrency}</span></span>
              <span>Paid: <span className="font-black text-slate-800 dark:text-slate-200">{paidAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {rowLocalCurrency}</span></span>
              <span>Rem: <span className="font-black text-slate-800 dark:text-slate-200">{remainingAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {rowLocalCurrency}</span></span>
            </div>
          </td>
          {/* Balance */}
          <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
            <div className="flex flex-col font-bold">
              <span className="text-slate-800 dark:text-slate-200 text-[11px]">{balanceAmountLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {rowLocalCurrency}</span>
            </div>
          </td>
          {/* Status / Action */}
          <td className="px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 justify-end">
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs",
                statusText.toLowerCase() === "paid" || statusText.toLowerCase() === "completed" || statusText.toLowerCase() === "transferred"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                  : statusText.toLowerCase() === "partial" || statusText.toLowerCase() === "partially_paid"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200"
              )}>
                {statusText}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleDropdown(row.id); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 transition"
                >
                  <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                </button>
                {openDropdownId === row.id && (
                  <div className="absolute right-0 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 z-50">
                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { setExpandedIds((prev) => ({ ...prev, [row.id]: !prev[row.id] })); setOpenDropdownId(null); }}>
                      <Eye className="mr-2.5 h-4 w-4 text-slate-500" /> Details & History
                    </button>
                    {!isPaymentCompleted && (
                      <button className="flex w-full items-center px-4 py-2.5 text-xs text-red-650 hover:bg-slate-100 dark:hover:bg-slate-800 transition" onClick={() => { selectOrder(row.id); setOpenDropdownId(null); }}>
                        <Banknote className="mr-2.5 h-4 w-4 text-red-500" /> Pay / Transfer
                      </button>
                    )}
                    {isPosted && (
                      <>
                        <button className="flex w-full items-center px-4 py-2.5 text-xs text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-800 transition" onClick={() => { setOpenDropdownId(null); handleOpenA4PDF(row); }}>
                          <Printer className="mr-2.5 h-4 w-4 text-indigo-500" /> Print Voucher (A4)
                        </button>
                        {activeMode === "advance" && (
                          <button className="flex w-full items-center px-4 py-2.5 text-xs text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-800 transition" onClick={() => { 
                            setOpenDropdownId(null); 
                            router.push(`/dashboard/journal/purchase-order-payment/advance?purchaseOrderNo=${encodeURIComponent(row.purchase_order_no)}`);
                          }}>
                            <RefreshCw className="mr-2.5 h-4 w-4 text-indigo-500" /> Revert & Edit Advance
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr onClick={(e) => e.stopPropagation()} style={{ background: "#f8fafc" }}>
            <td colSpan={10} className="p-4 border-b border-slate-100 dark:border-slate-800">
              <NestedPaymentHistory 
                row={row} 
                ledgers={ledgers} 
                baseCurrency={baseCurrency} 
                activeMode={activeMode} 
                selectOrder={selectOrder}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                logClientError={logClientError}
              />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const recordsTextMap: Record<LanguageCode, string> = {
    en: "records",
    ur: "ریکارڈز",
    ar: "سجلات",
    fa: "رکوردها",
    ps: "ریکارډونه"
  };

  const refreshTextMap: Record<LanguageCode, string> = {
    en: "Refresh",
    ur: "تازه کریں",
    ar: "تحديث",
    fa: "بروزرسانی",
    ps: "تازه کول"
  };

  const getTableHeader = (h: string) => {
    const headersMap: Record<string, Record<LanguageCode, string>> = {
      "PO No.": { en: "PO Number", ur: "آرڈر نمبر", ar: "رقم طلب الشراء", fa: "شماره سفارش", ps: "د امر شمیره" },
      "Bill / Date": { en: "Bill & Date", ur: "بل اور تاریخ", ar: "الفاتورة والتاريخ", fa: "صورتحساب و تاریخ", ps: "بل او نیټه" },
      "Branch / Country": { en: "Branch & Country", ur: "برانچ اور ملک", ar: "الفرع والبلد", fa: "شعبه و کشور", ps: "څانګه او هیواد" },
      "Purchase A/C": { en: "Purchase A/C", ur: "خریداری اکاؤنٹ", ar: "حساب الشراء", fa: "حساب خرید", ps: "د پیرود حساب" },
      "Sales A/C": { en: "Sales A/C", ur: "سیلز اکاؤنٹ", ar: "حساب المبيعات", fa: "حساب فروش", ps: "د پلور حساب" },
      "Total Purchase": { en: "Total Purchase", ur: "کل خریداری", ar: "إجمالي الشراء", fa: "کل خرید", ps: "ټول پیرود" },
      "Paid Advance": { en: "Paid Advance", ur: "ادا شدہ ایڈوانس", ar: "الدفعة المقدمة المدفوعة", fa: "پیش پرداخت", ps: "تادیه شوی پرمختګ" },
      "Final Amount": { en: "Final Amount", ur: "حتمی رقم", ar: "المبلغ النهائي", fa: "مبلغ نهایی", ps: "وروستی مقدار" },
      "Rem. Advance": { en: "Rem. Advance", ur: "باقی ماندہ ایڈوانس", ar: "الدفعة المقدمة المتبقية", fa: "پیش پرداخت باقیمانده", ps: "پاتې پرمختګ" },
      "Action": { en: "Action", ur: "عمل", ar: "إجراء", fa: "عمل", ps: "عمل" }
    };
    return headersMap[h]?.[currentLanguage] || h;
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={cn("flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950", isRtl ? "text-right" : "text-left")}>
      {/* Header / Title Portal */}
      {titleSlot && createPortal(
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {activeMode === "advance" ? t("page_title", currentLanguage) :
           activeMode === "advance_completed" ? `${t("page_title", currentLanguage)} (${t("Completed", currentLanguage)})` :
           activeMode === "remaining" ? t("remaining_advance", currentLanguage) :
           activeMode === "credit" ? t("col_remaining_balance", currentLanguage) : `${t("page_title", currentLanguage)} (${t("Cleared", currentLanguage)})`}
        </span>,
        titleSlot
      )}
      {actionsSlot && createPortal(
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value as LanguageCode)}
              className="h-7 rounded-lg border border-slate-200 bg-white pl-2 pr-6 text-[10px] font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 transition focus:border-blue-500 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: isRtl ? 'left 0.5rem center' : 'right 0.5rem center',
                backgroundSize: '1em',
                paddingRight: isRtl ? '0.5rem' : '1.5rem',
                paddingLeft: isRtl ? '1.5rem' : '0.5rem'
              }}
            >
              <option value="en">English (EN)</option>
              <option value="ur">اردو (UR)</option>
              <option value="ar">العربية (AR)</option>
              <option value="fa">فارسی (FA)</option>
              <option value="ps">پښتو (PS)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400", isRtl ? "right-2.5" : "left-2.5")} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPageIndex(0); }}
              placeholder={t("search_placeholder", currentLanguage)}
              className={cn(
                "h-7 w-48 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 transition",
                isRtl ? "pr-8 pl-2.5" : "pl-8 pr-2.5"
              )}
            />
          </div>

          {/* Filters Toggler */}
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              "flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition",
              filtersOpen && "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
            )}
          >
            <Filter className="h-3 w-3" />
            {t("filters", currentLanguage)}
          </button>

          {/* Super Admin Location Selectors */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5">
              <SearchableSelect
                value={saCountryId}
                onChange={(val) => { setSaCountryId(val); setSaBranchId(""); }}
                options={[
                  { label: t("all_countries", currentLanguage), value: "" },
                  ...saCountries.map((c: any) => ({ label: tData(c.name, currentLanguage), value: c.id }))
                ]}
                placeholder={t("all_countries", currentLanguage)}
                className="w-36 text-[10px] font-semibold relative z-[45]"
              />
              <SearchableSelect
                value={saBranchId}
                onChange={(val) => setSaBranchId(val)}
                options={[
                  { label: t("all_branches", currentLanguage), value: "" },
                  ...saBranches.filter((b: any) => !saCountryId || b.country_id === saCountryId).map((b: any) => ({ label: tData(b.name, currentLanguage), value: b.id }))
                ]}
                placeholder={t("all_branches", currentLanguage)}
                disabled={!saCountryId}
                className="w-36 text-[10px] font-semibold relative z-[45]"
              />
            </div>
          )}

          {/* Active Filters Clear Button */}
          {(query || draftFilter || countryFilter || branchFilter || currencyFilter) && (
            <button
              type="button"
              onClick={reset}
              className="flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 text-[10px] font-bold text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 transition"
            >
              <XCircle className="h-3 w-3" />
              {t("reset_all", currentLanguage)}
            </button>
          )}

          {/* Records count */}
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1">{filtered.length} {recordsTextMap[currentLanguage]}</span>

          {/* Refresh Button */}
          <button id="refresh-btn" type="button" onClick={() => void loadOrders()} className="flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition">
            <RefreshCw className="h-3 w-3" />
            {refreshTextMap[currentLanguage]}
          </button>

          {/* Action Menu / Report Actions */}
          <ReportActions rows={filtered} mode={activeMode} />
        </div>,
        actionsSlot
      )}
      {/* Dashboard Header Details (Voucher Style) */}
      {dashboardSummary && (
        <div className="p-6 pb-0">
          {(() => {
            let targetSummary = dashboardSummary;
            if (isSuperAdmin && selectedCountryForSummary) {
              const countryRows = filtered.filter(row => rowCountryName(row) === selectedCountryForSummary);
              if (countryRows.length > 0) {
                const groupData = getDashboardSummaryData(countryRows, session, activeMode);
                if (groupData) {
                  targetSummary = groupData;
                }
              }
            }
            return (
              <DashboardSummaryHeader 
                summary={targetSummary} 
                mode={activeMode} 
                isSuperAdmin={isSuperAdmin}
                rows={filtered}
                expandedCountries={expandedCountries}
                setExpandedCountries={setExpandedCountries}
                selectedCountryForSummary={selectedCountryForSummary}
                setSelectedCountryForSummary={setSelectedCountryForSummary}
                lang={currentLanguage}
              />
            );
          })()}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 p-6 pb-0 md:grid-cols-4 max-w-5xl">
        {cards.map((card) => (
          <Metric key={card.label} {...card} />
        ))}
      </div>

      {/* Main Table Card */}
      <div className="m-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Toolbar controls have been moved to erp-page-actions-slot header portal */}

        {filtersOpen && (
          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:grid-cols-4">
            <MiniFilter label="Status" value={draftFilter} options={["pending", "posted", "partial"]} onChange={(v) => { setDraftFilter(v); setPageIndex(0); }} />
            <MiniFilter label="Country" value={countryFilter} options={countryOptions as string[]} onChange={(v) => { setCountryFilter(v); setPageIndex(0); }} />
            <MiniFilter label="Branch" value={branchFilter} options={branchOptions as string[]} onChange={(v) => { setBranchFilter(v); setPageIndex(0); }} />
            <MiniFilter label="Currency" value={currencyFilter} options={currencyOptions as string[]} onChange={(v) => { setCurrencyFilter(v); setPageIndex(0); }} />
          </div>
        )}

        {error && (
          <div className="mx-6 my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                {["PO No.", "Bill / Date", "Branch / Country", "Purchase A/C", "Sales A/C", "Total Purchase", "Req. Advance", "Paid Advance", "Final Amount", "Rem. Advance", "Action"].map((h) => (
                  <th key={h} className={cn("px-3 py-4 text-[10px] font-black uppercase tracking-widest text-slate-605 dark:text-slate-350 whitespace-nowrap", isRtl ? "text-right" : "text-left")}>{getTableHeader(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isSuperAdmin ? (
                countryGroups.map((group) => {
                  const isExpandedCountry = expandedCountries[group.country] !== false;
                  
                  // Calculate country sums in Local Currency
                  let sumPurchaseLocal = 0;
                  let sumReqAdvanceLocal = 0;
                  let sumPaidLocal = 0;
                  let sumFinalLocal = 0;
                  let sumRemAdvanceLocal = 0;
                  
                  group.rows.forEach(row => {
                    const totalPrice = orderTotal(row);
                    const bookCur = rowCurrency(row);
                    const rowLocalCurrency = rowOfficeCurrency(row);
                    const conversionRate = getConversionRate(row, bookCur, rowLocalCurrency, liveRates);
                    
                    const totalAmountBC = totalPrice;
                    const totalAmountLocal = totalAmountBC * conversionRate;
                    const advancePercent = Number(row.form_data?.form?.advancePercent || 0);
                    const requiredAdvanceBC = (totalAmountBC * advancePercent) / 100;
                    const paidAdvanceBC = Number(row.advance_paid || 0);
                    const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                    
                    const requiredAdvance = (totalAmountLocal * advancePercent) / 100;
                    const paidAdvance = paidAdvanceBC * conversionRate;
                    const remainingAdvance = Math.max(0, requiredAdvance - paidAdvance);
                    
                    const remainingDueBC = Number(row.remaining_due || 0);
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
                      const remPaidBC = Number(row.remaining_paid || 0);
                      paidAmountBC = remPaidBC;
                      paidAmountLocal = remPaidBC * conversionRate;
                      balanceAmountBC = remainingDueBC;
                      balanceAmountLocal = remainingDueBC * conversionRate;
                    } else {
                      const credPaidBC = Number(row.credit_amount || 0);
                      paidAmountBC = credPaidBC;
                      paidAmountLocal = credPaidBC * conversionRate;
                      balanceAmountBC = Math.max(0, totalAmountBC - paidAmountBC);
                      balanceAmountLocal = balanceAmountBC * conversionRate;
                    }
                    
                    sumPurchaseLocal += totalAmountLocal;
                    sumReqAdvanceLocal += requiredAdvance;
                    sumPaidLocal += paidAmountLocal;
                    sumFinalLocal += balanceAmountLocal;
                    sumRemAdvanceLocal += remainingAdvance;
                  });

                  return (
                    <React.Fragment key={group.country}>
                      <tr
                        onClick={() => {
                          const nextExpanded = !isExpandedCountry;
                          setExpandedCountries(prev => ({
                            ...prev,
                            [group.country]: nextExpanded
                          }));
                          if (nextExpanded) {
                            setSelectedCountryForSummary(group.country);
                          } else if (selectedCountryForSummary === group.country) {
                            setSelectedCountryForSummary(null);
                          }
                        }}
                        className="bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 cursor-pointer border-y border-slate-200 dark:border-slate-800 transition"
                      >
                        <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-slate-100 text-[10px] tracking-wide text-center">
                          {`PURCH: ${group.rows.length}`}
                        </td>
                        <td className="px-3 py-3 font-black text-slate-950 dark:text-white text-[11px] uppercase tracking-wider text-left">
                          {group.country}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-200 text-[10px] text-center">
                          {`BRANCH (${new Set(group.rows.map((r) => rowBranchName(r)).filter(Boolean)).size || 1})`}
                        </td>
                        <td className="px-3 py-3 font-mono font-black text-slate-700 dark:text-slate-300 text-[10px] text-center">
                          {group.rows.length > 0 ? rowOfficeCurrency(group.rows[0]) : "USD"}
                        </td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 font-bold text-rose-600 font-mono text-[11px]">{sumPurchaseLocal > 0 ? sumPurchaseLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                        <td className="px-3 py-3 font-bold text-amber-600 font-mono text-[11px]">{sumReqAdvanceLocal > 0 ? sumReqAdvanceLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                        <td className="px-3 py-3 font-bold text-emerald-600 font-mono text-[11px]">{sumPaidLocal > 0 ? sumPaidLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                        <td className="px-3 py-3 font-bold text-indigo-600 font-mono text-[11px]">{sumFinalLocal > 0 ? sumFinalLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                        <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">{sumRemAdvanceLocal > 0 ? sumRemAdvanceLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              className="flex h-6 w-6 items-center justify-center rounded bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 transition shadow-sm"
                            >
                              {isExpandedCountry ? (
                                <Minus className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              ) : (
                                <Plus className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpandedCountry && (
                        <tr>
                          <td colSpan={11} className="p-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="w-full overflow-x-auto p-4 border-l-[3px] border-l-blue-500 shadow-inner">
                              <table className="w-max min-w-full text-xs text-left border-collapse bg-white dark:bg-slate-950 rounded shadow-sm border border-slate-200 dark:border-slate-800">
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                                    {[
                                      "SR.", "SUPER S/N", "CTY S/N", "BR. S/N", "BRANCH", "USER NAME",
                                      "GOODS NAME", "TOTAL QTY", "WT (KG)", "NET WT (KG)",
                                      "TOTAL PURCHASE", "REQ. ADVANCE", "PAID ADVANCE", "REM. ADVANCE", "FINAL BALANCE", "ACTIONS"
                                    ].map((h, i) => (
                                      <th key={i} className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 last:border-0 align-middle text-center">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.rows.map((row) => {
                                    const index = pageRows.indexOf(row);
                                    const form = row.form_data?.form || {};
                                    const goods = row.form_data?.goodsEntries || [];
                                    const totalPrice = orderTotal(row);
                                    
                                    const bookCur = rowCurrency(row);
                                    const rowLocalCurrency = rowOfficeCurrency(row);
                                    const conversionRate = getConversionRate(row, bookCur, rowLocalCurrency, liveRates);
                                    
                                    const totalAmountBC = totalPrice;
                                    const totalAmountLocal = totalAmountBC * conversionRate;
                                    const advancePercent = Number(form.advancePercent || 0);
                                    const requiredAdvanceBC = (totalAmountBC * advancePercent) / 100;
                                    const paidAdvanceBC = Number(row.advance_paid || 0);
                                    const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                                    
                                    const requiredAdvance = (totalAmountLocal * advancePercent) / 100;
                                    const paidAdvance = paidAdvanceBC * conversionRate;
                                    const remainingAdvance = Math.max(0, requiredAdvance - paidAdvance);
                                    
                                    const remainingDueBC = Number(row.remaining_due || 0);
                                    let paidAmountBC = 0;
                                    let paidAmountLocal = 0;
                                    let balanceAmountBC = 0;
                                    let balanceAmountLocal = 0;
                                    if (activeMode === "advance") {
                                      paidAmountBC = paidAdvanceBC;
                                      paidAmountLocal = paidAdvance;
                                      balanceAmountBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                                      balanceAmountLocal = remainingAdvance;
                                    } else if (activeMode === "remaining") {
                                      const remPaidBC = Number(row.remaining_paid || 0);
                                      paidAmountBC = remPaidBC;
                                      paidAmountLocal = remPaidBC * conversionRate;
                                      balanceAmountBC = remainingDueBC;
                                      balanceAmountLocal = remainingDueBC * conversionRate;
                                    } else {
                                      const credPaidBC = Number(row.credit_amount || 0);
                                      paidAmountBC = credPaidBC;
                                      paidAmountLocal = credPaidBC * conversionRate;
                                      balanceAmountBC = Math.max(0, totalAmountBC - paidAmountBC);
                                      balanceAmountLocal = balanceAmountBC * conversionRate;
                                    }
                                    
                                    const statusText = row.payment_status || "Pending";
                                    const isSelected = selected?.id === row.id;
                                    const isExpanded = Boolean(expandedIds[row.id]);
                                    const isPosted = row.ledger_posting_status === "Posted"
                                      || row.ledger_posting_status === "posted"
                                      || row.ledger_posting_status === "Transferred"
                                      || row.ledger_posting_status === "transferred";
                                    const isPaymentCompleted = (activeMode === "remaining" || activeMode === "credit")
                                      ? balanceAmountBC <= 0.01
                                      : isPosted;
                                    const getRowColor = () => isPosted ? "text-black dark:text-white" : "text-red-600 dark:text-red-400";
                                    
                                    // Derived details
                                    const goodsName = goods.map((g: any) => g.goodsName || g.name).filter(Boolean).join(", ") || form.goodsName || "—";
                                    const totalQty = goods.length ? goods.reduce((s: number, g: any) => s + Number(g.qtyNo || 0), 0) : Number(row.quantity || 0);
                                    const grossWeight = goods.length ? goods.reduce((s: number, g: any) => s + Number(g.grossWeight || 0), 0) : Number(form.grossWeight || 0);
                                    const netWeight = goods.length ? goods.reduce((s: number, g: any) => s + Number(g.netWeight || g.grossWeight || 0), 0) : Number(form.netWeight || 0);
                                    const branchName = rowBranchName(row) || "—";
                                    const countryName = rowCountryName(row) || "—";
                                    const userName = row.audit?.userName || "-";
                                    
                                    // Serials
                                    const superSerialNo = index + 1 + pageIndex * pageSize;
                                    const countryRows = filtered.filter((r) => rowCountryName(r) === countryName);
                                    const countrySerialNo = countryRows.findIndex((r) => r.id === row.id) + 1;
                                    const branchRows = filtered.filter((r) => rowBranchName(r) === branchName);
                                    const branchSerialNo = branchRows.findIndex((r) => r.id === row.id) + 1;

                                    return (
                                      <React.Fragment key={row.id}>
                                        <tr
                                          className={cn("border-b border-slate-100 dark:border-slate-800/60 text-center hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors", isSelected && "bg-blue-50/80 dark:bg-blue-900/30")}
                                        >
                                          {/* Serials */}
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-mono text-[9px] align-middle", getRowColor())}>{index + 1}</td>
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-mono text-[9px] align-middle", getRowColor())}>{superSerialNo}</td>
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-mono text-[9px] align-middle", getRowColor())}>{countrySerialNo}</td>
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-mono text-[9px] align-middle", getRowColor())}>{branchSerialNo}</td>
                                          {/* Details */}
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-bold uppercase tracking-wide align-middle text-left", getRowColor())}>{branchName}</td>
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-bold uppercase align-middle text-left", getRowColor())}>{userName}</td>
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-bold align-middle text-left", getRowColor())}>{goodsName}</td>
                                          {/* Cargo */}
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-mono font-black align-middle text-right", getRowColor())}>{totalQty.toLocaleString()}</td>
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-mono align-middle text-right", getRowColor())}>{grossWeight.toLocaleString()}</td>
                                          <td className={cn("px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 font-mono align-middle text-right", getRowColor())}>{netWeight.toLocaleString()}</td>
                                          {/* Financials */}
                                          <td className="px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 align-middle text-right">
                                            <div className="flex flex-col gap-0.5 font-mono">
                                              <span className="font-black text-[11px] text-rose-600 dark:text-rose-400">{money(totalAmountBC, bookCur)}</span>
                                              <span className="text-[9px] text-slate-500 font-bold">{money(totalAmountLocal, rowLocalCurrency)}</span>
                                            </div>
                                          </td>
                                          <td className="px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 align-middle text-right">
                                            <div className="flex flex-col gap-0.5 font-mono">
                                              <span className="font-black text-[11px] text-amber-600 dark:text-amber-400">{money(requiredAdvanceBC, bookCur)}</span>
                                              <span className="text-[9px] text-slate-500 font-bold">{money(requiredAdvance, rowLocalCurrency)}</span>
                                            </div>
                                          </td>
                                          <td className="px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 align-middle text-right">
                                            <div className="flex flex-col gap-0.5 font-mono">
                                              <span className="font-black text-[11px] text-emerald-600 dark:text-emerald-400">{money(paidAdvanceBC, bookCur)}</span>
                                              <span className="text-[9px] text-slate-500 font-bold">{money(paidAdvance, rowLocalCurrency)}</span>
                                            </div>
                                          </td>
                                          <td className="px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 align-middle text-right">
                                            <div className="flex flex-col gap-0.5 font-mono">
                                              <span className="font-black text-[11px] text-slate-800 dark:text-slate-200">{money(remainingAdvanceBC, bookCur)}</span>
                                              <span className="text-[9px] text-slate-500 font-bold">{money(remainingAdvance, rowLocalCurrency)}</span>
                                            </div>
                                          </td>
                                          <td className="px-2 py-3 border-r border-slate-100 dark:border-slate-800/50 align-middle text-right">
                                            <div className="flex flex-col gap-0.5 font-mono">
                                              <span className="font-black text-[11px] text-indigo-600 dark:text-indigo-400">{money(balanceAmountBC, bookCur)}</span>
                                              <span className="text-[9px] text-slate-500 font-bold">{money(balanceAmountLocal, rowLocalCurrency)}</span>
                                            </div>
                                          </td>
                                          {/* Actions */}
                                          <td className="px-2 py-3 align-middle text-center">
                                            <div className="flex justify-center items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                              {activeMode !== "advance_completed" && (
                                                <>
                                                  {isPaymentCompleted ? (
                                                    <span className="inline-flex rounded border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider">
                                                      Transferred ✓
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex rounded border border-amber-300 bg-amber-50 text-amber-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider animate-pulse">
                                                      Pending
                                                    </span>
                                                  )}
                                                </>
                                              )}
                          <div className={cn("relative inline-block text-left", activeMode !== "advance_completed" && "mt-1")} onClick={(e) => e.stopPropagation()}>
                            <ViewportActionMenu
                              ariaLabel="Row actions"
                              buttonClassName={cn(
                                "inline-flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400 focus:outline-none shadow-sm bg-white dark:bg-slate-900",
                                activeMode === "advance_completed" ? "h-8 px-3 text-xs font-semibold" : "h-7 w-7"
                              )}
                              trigger={activeMode === "advance_completed" ? (
                                <>Actions <ChevronDown className="ml-1 h-3.5 w-3.5" /></>
                              ) : (
                                <MoreVertical className="h-3.5 w-3.5" />
                              )}
                              menuClassName="font-semibold p-0 w-48 shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                            >
                              {(close) => (
                                <>
                                  {activeMode === "advance_completed" && (
                                    <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 items-start pointer-events-none">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Current Status</span>
                                      {isPosted ? (
                                        <span className="inline-flex rounded border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider">
                                          Transferred ✓
                                        </span>
                                      ) : (
                                        <span className="inline-flex rounded border border-amber-300 bg-amber-50 text-amber-700 px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider animate-pulse">
                                          Pending Transfer
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="py-1">
                                    {activeMode !== "advance_completed" && (
                                      <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-slate-800 transition font-bold" onClick={() => {
                                        try {
                                          logClientError(`Click Payment Entry. row.id: ${row.id}`);
                                          selectOrder(row.id);
                                          close();
                                        } catch (e: any) {
                                          logClientError(`Error in Payment Entry click: ${e.stack || e.message || String(e)}`);
                                        }
                                      }}>
                                        <WalletCards className="mr-2.5 h-4 w-4 text-slate-500" /> Payment Entry
                                      </button>
                                    )}
                                    {activeMode === "advance" && isPosted && (
                                      <button className="flex w-full items-center px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition" onClick={() => { 
                                        close();
                                        router.push(`/dashboard/purchase/loading-form`);
                                      }}>
                                        <Truck className="mr-2.5 h-4 w-4 text-blue-600 dark:text-blue-400" /> Transfer to Loading
                                      </button>
                                    )}
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { setViewingRow(row); close(); }}>
                                      <Eye className="mr-2.5 h-4 w-4 text-slate-500" /> View Detailed Bill
                                    </button>
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { handleOpenA4PDF(row, true); close(); }}>
                                      <Printer className="mr-2.5 h-4 w-4 text-slate-500" /> Print Statement
                                    </button>
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => { handleOpenA4PDF(row, false); close(); }}>
                                      <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> View Statement
                                    </button>
                                    <button className="flex w-full items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => {
                                      try {
                                        logClientError(`Click Show Payment History. row.id: ${row.id}`);
                                        setExpandedIds((prev) => ({ ...prev, [row.id]: !prev[row.id] }));
                                        close();
                                      } catch (e: any) {
                                        logClientError(`Error in Show Payment History click: ${e.stack || e.message || String(e)}`);
                                      }
                                    }}>
                                      {isExpanded ? <XCircle className="mr-2.5 h-4 w-4 text-slate-500" /> : <Plus className="mr-2.5 h-4 w-4 text-slate-500" />} {isExpanded ? "Hide Payment History" : "Show Payment History"}
                                    </button>
                                    {activeMode === "advance_completed" && (
                                      <>
                                        <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                                        <button className="flex w-full items-center px-4 py-2.5 text-xs text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 transition" onClick={() => { 
                                          close();
                                          router.push(`/dashboard/journal/purchase-order-payment/advance?purchaseOrderNo=${encodeURIComponent(row.purchase_order_no)}`);
                                        }}>
                                          <RefreshCw className="mr-2.5 h-4 w-4 text-indigo-500" /> Revert & Edit Advance
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </ViewportActionMenu>
                          </div>
                        </div>
                      </td>
                                        </tr>
                                        {isExpanded && (
                                          <tr onClick={(e) => e.stopPropagation()} className="bg-slate-50/50 dark:bg-slate-900/30">
                                            <td colSpan={17} className="p-3 border-b border-slate-200 dark:border-slate-800">
                                              <NestedPaymentHistory 
                row={row} 
                ledgers={ledgers} 
                baseCurrency={baseCurrency} 
                activeMode={activeMode} 
                selectOrder={selectOrder}
                expandedIds={expandedIds}
                setExpandedIds={setExpandedIds}
                logClientError={logClientError}
              />
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
            </React.Fragment>
          );
        })
      ) : (
        pageRows.map((row, index) => renderRow(row, index))
      )}
              {!pageRows.length && !loading && (
                <tr>
                  <td
                    colSpan={11}
                    style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <FileSpreadsheet style={{ width: 40, height: 40, opacity: 0.3 }} />
                      <span>No purchase order payment records found.</span>
                      {activeMode === "remaining" ? (
                        <div style={{ maxWidth: 420, textAlign: "center" }}>
                          <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, display: "block" }}>
                            ⚠️ Workflow Rule: Remaining Payment requires Transfer to Loading first.
                          </span>
                          <span style={{ fontSize: 10, color: "#cbd5e1", display: "block", marginTop: 4 }}>
                            Orders only appear here after: Booking → Advance Payment → Transfer to Loading → Loading Confirmation. Ensure the order has been transferred to loading before making a remaining payment.
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#cbd5e1" }}>Try adjusting filters or check if orders are posted.</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={11} style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Loading records...
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
              <span className="text-xs">‹</span>
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
              <span className="text-xs">›</span>
            </button>
          </div>
        </div>
      </div>


      {/* Ledger Cash Entry Panel (Modal) */}
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
              const paidAdvanceBC = Number(selected.advance_paid || 0);
              const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
              const remainingDue = Number(selected.remaining_due || 0);
              const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
              const fromLoading = searchParams.get("fromLoading") === "true";
              if (activeMode === "advance" && remainingAdvanceBC <= 0.01) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 animate-in fade-in duration-300">
                    <XCircle className="h-5 w-5 shrink-0" /> Already Transferred: The advance payment for PO {selected.purchase_order_no} has already been fully paid.
                  </div>
                );
              }
              if (activeMode === "remaining" && remainingDue <= 0.01 && !fromLoading) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 animate-in fade-in duration-300">
                    <XCircle className="h-5 w-5 shrink-0" /> Already Transferred: The remaining due for PO {selected.purchase_order_no} has already been fully paid.
                  </div>
                );
              }
              return null;
            })()}

            {/* Purchase & Container Loading Context Details Card */}
            {(() => {
              const form = selected.form_data?.form || {};
              const goods = selected.form_data?.goodsEntries || [];
              const goodsName = goods.map((g: any) => g.goodsName || g.name).filter(Boolean).join(", ") || form.goodsName || "—";

              const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
              const isUrlLoading = searchParams.get("fromLoading") === "true";
              const fromLoading = isUrlLoading || Boolean(selectedLoadingRecord);

              const cLoadedQty = selectedLoadingRecord
                ? String(selectedLoadingRecord.report_payload?.loadedQuantity || selectedLoadingRecord.loadedQuantity || 0)
                : (searchParams.get("loadedQty") || "0");
              const cGrossWeight = selectedLoadingRecord
                ? String(selectedLoadingRecord.report_payload?.grossWeight || 0)
                : (searchParams.get("grossWeight") || "0");
              const cNetWeight = selectedLoadingRecord
                ? String(selectedLoadingRecord.report_payload?.netWeight || 0)
                : (searchParams.get("netWeight") || "0");
              const cPriceRate = selectedLoadingRecord
                ? String(selectedLoadingRecord.report_payload?.priceRateC1 || 0)
                : (searchParams.get("priceRate") || "0");

              return (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 dark:bg-slate-900/50 dark:border-slate-800 shadow-sm space-y-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">
                      Purchase Order & Loading Specifications
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Seller (Supplier)</span>
                        <span className="font-extrabold text-slate-855 dark:text-slate-200">
                          {form.salesAccountName || form.supplierName || "—"}
                        </span>
                        <span className="block text-[9px] font-mono text-slate-500 font-bold mt-0.5">
                          {form.salesAccountNumber || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Purchaser (Purchase A/C)</span>
                        <span className="font-extrabold text-slate-855 dark:text-slate-200">
                          {form.purchaseAccountName || "—"}
                        </span>
                        <span className="block text-[9px] font-mono text-slate-500 font-bold mt-0.5">
                          {form.purchaseAccountNumber || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Goods & Brand</span>
                        <span className="font-extrabold text-slate-855 dark:text-slate-200 block truncate max-w-[200px]" title={goodsName}>
                          {goodsName}
                        </span>
                        <span className="block text-[9px] font-semibold text-slate-500 mt-0.5">
                          Brand: {goods.map((g: any) => g.brand || "").filter(Boolean).join(", ") || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Quantity & Loading Status</span>
                        <span className="font-extrabold text-slate-855 dark:text-slate-200 block">
                          PO: {form.quantity || 0} {form.quantityUnit || "BAGS"}
                        </span>
                        <span className="block text-[9px] font-semibold text-slate-500 mt-0.5">
                          Loaded: <span className="font-bold text-blue-600 dark:text-blue-400">{selected.form_data?.workflow?.loadedQuantity || 0}</span> / Balance: <span className="font-bold text-rose-600">{selected.form_data?.workflow?.remainingQuantity || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {fromLoading && (
                    <div className="border-t border-dashed border-slate-200 dark:border-slate-850 pt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex justify-between items-center">
                        <span>Transferred Container Specifications</span>
                        {/* Change Container option if direct select flow */}
                        {!isUrlLoading && selectedLoadingRecord && (
                          <button
                            type="button"
                            onClick={() => setSelectedLoadingRecord(null)}
                            className="text-[9px] font-bold text-rose-500 hover:text-rose-700 hover:underline transition uppercase tracking-wider"
                          >
                            Change Container
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-blue-50/20 border border-blue-100/50 p-3 rounded-lg dark:bg-blue-950/10 dark:border-blue-900/20">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Container Load Qty</span>
                          <span className="font-black text-slate-900 dark:text-slate-100">{cLoadedQty || "0"} {form.quantityUnit || "BAGS"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Gross Weight</span>
                          <span className="font-extrabold text-slate-855 dark:text-slate-200">{Number(cGrossWeight || 0).toLocaleString()} KGs</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Net Weight</span>
                          <span className="font-extrabold text-slate-855 dark:text-slate-200">{Number(cNetWeight || 0).toLocaleString()} KGs</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Purchase Price Rate</span>
                          <span className="font-mono font-bold text-slate-855 dark:text-slate-200">{Number(cPriceRate || 0).toFixed(4)} USD</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Comprehensive Payment Summary Dashboard */}
            {(() => {
              const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
              const isUrlLoading = searchParams.get("fromLoading") === "true";
              const fromLoading = isUrlLoading || Boolean(selectedLoadingRecord);

              const cLoadedQty = selectedLoadingRecord
                ? Number(selectedLoadingRecord.report_payload?.loadedQuantity || selectedLoadingRecord.loadedQuantity || 0)
                : Number(searchParams.get("loadedQty") || 0);
              const cGrossWeight = selectedLoadingRecord
                ? Number(selectedLoadingRecord.report_payload?.grossWeight || 0)
                : Number(searchParams.get("grossWeight") || 0);
              const cNetWeight = selectedLoadingRecord
                ? Number(selectedLoadingRecord.report_payload?.netWeight || 0)
                : Number(searchParams.get("netWeight") || 0);
              const cPriceRate = selectedLoadingRecord
                ? Number(selectedLoadingRecord.report_payload?.priceRateC1 || 0)
                : Number(searchParams.get("priceRate") || 0);
              const cLoadingRecordId = selectedLoadingRecord
                ? selectedLoadingRecord.id
                : (searchParams.get("loadingRecordId") || "");

              const form = (selected as any).form_data?.form || {};
              const goods = (selected as any).form_data?.goodsEntries || [];
              const totalPrice = goods.length
                ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                : Number(form.totalAmount || 0);
              const poOrderTotal = Number(selected.order_total || totalPrice || 0);
              const totalPOQuantity = Number(
                selected.form_data?.totals?.totalQuantity ||
                goods.reduce((acc: number, item: any) => acc + Number(item.qtyNo || item.quantity || 0), 0) ||
                form.quantity ||
                1
              );
              const advancePercent = Number(form.advancePercent || 0);

              // Resolve price type: is it weight-based?
              const firstGood = goods[0] || {};
              const isPerKg = firstGood.priceType === "P/KGs" || String(firstGood.priceType || "").toLowerCase().includes("kg");

              // Purchase Amount for this loading only
              const loadingPurchaseAmount = fromLoading
                ? (isPerKg ? cNetWeight * cPriceRate : cLoadedQty * cPriceRate)
                : poOrderTotal;

              // Total Purchase Amount metric: loadingPurchaseAmount
              // Required Advance allocated to this loading
              const loadingRequiredAdvance = (loadingPurchaseAmount * advancePercent) / 100;

              // Advance already paid for this loading: pro-rated share of actual advance paid on the PO
              const poAdvancePaid = Number(selected.advance_paid || 0);
              const loadingAdvancePaid = fromLoading
                ? (totalPOQuantity > 0 ? (cLoadedQty / totalPOQuantity) * poAdvancePaid : poAdvancePaid)
                : poAdvancePaid;

              // Remaining Advance for this loading
              const loadingRemainingAdvance = Math.max(0, loadingRequiredAdvance - loadingAdvancePaid);

              // Final Purchase Amount
              const finalPurchaseAmount = loadingPurchaseAmount;

              // Total Remaining Amount (which is Final Purchase Amount - Advance deducted/allocated)
              const totalRemainingAmount = Math.max(0, finalPurchaseAmount - loadingAdvancePaid);

              // Total Remaining Paid (specifically for this loading)
              const remainingPaymentsForThisLoading = selectedOrderPayments.filter((p: any) => {
                const payKind = p.kind || "";
                if (payKind !== "remaining") return false;
                if (!fromLoading) return true; // if not from loading, sum all remaining payments
                const payRecordId = p.typeDetails?.loadingRecordId || p.typeDetails?.loading_record_id || "";
                return payRecordId === cLoadingRecordId;
              });
              const totalRemainingPaid = remainingPaymentsForThisLoading.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

              // Outstanding Balance (Final Currency Balance remaining)
              const outstandingBalance = Math.max(0, finalPurchaseAmount - loadingAdvancePaid - totalRemainingPaid);

              const totalPaidSoFar = loadingAdvancePaid + totalRemainingPaid;
              const paidPercent = finalPurchaseAmount > 0 ? Math.min(100, (totalPaidSoFar / finalPurchaseAmount) * 100) : 0;
              const advancePaidPercent = loadingRequiredAdvance > 0 ? Math.min(100, (loadingAdvancePaid / loadingRequiredAdvance) * 100) : 0;

              const poCurrency = (selected as any).form_data?.form?.currencyType || (selected as any).form_data?.form?.currency || selected.currency_code || "USD";
              const exRate = selected.exchange_rate || 1;
              const isAdvComplete = loadingRemainingAdvance <= 0.01;
              const isFullyPaid = outstandingBalance <= 0.01;

              return (
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                  {/* Header Bar */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 font-extrabold text-xs shadow-sm">PO</span>
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">
                          {fromLoading ? "Active Container Loading Selection" : "Active Bill Selection"}
                        </div>
                        <div className="font-extrabold text-base flex items-center gap-2">
                          {selected.purchase_order_no}
                          {selected.purchase_contract_no && (
                            <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded font-mono tracking-wide">
                              Contract: {selected.purchase_contract_no}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      {isFullyPaid ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                          <CheckCircle className="h-3 w-3" /> Fully Paid
                        </span>
                      ) : isAdvComplete ? (
                        <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                          <CheckCircle className="h-3 w-3" /> Advance Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                          Advance Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Overall Progress Bar */}
                  <div className="px-5 pt-3 pb-1">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 mb-1.5">
                      <span>{fromLoading ? "Loading Payment Progress" : "Payment Progress"}</span>
                      <span className="font-mono">{paidPercent.toFixed(1)}% paid</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${paidPercent}%`,
                          background: isFullyPaid ? "#10b981" : "linear-gradient(90deg, #3b82f6, #6366f1)"
                        }}
                      />
                    </div>
                    {loadingRequiredAdvance > 0 && (
                      <div className="flex items-center justify-between text-[8px] font-semibold text-slate-400 mt-1">
                        <span>Advance Progress: {advancePaidPercent.toFixed(1)}%</span>
                        <span className="font-mono">{money(loadingAdvancePaid, poCurrency)} / {money(loadingRequiredAdvance, poCurrency)}</span>
                      </div>
                    )}
                  </div>

                  {/* Multi-Currency Endorsement & Payment Summary Panels */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                    {/* Box 2: Purchase & Endorsement Summary (Transaction Currency) */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-4 dark:bg-slate-950 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          2. Purchase & Endorsement Summary ({poCurrency})
                        </span>
                        <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase font-mono">{poCurrency}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Total Purchase Amount</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-sm">{money(loadingPurchaseAmount, poCurrency)}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Endorsement Percentage</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-sm">{advancePercent.toFixed(2)}%</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Endorsement Amount</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-sm">{money(loadingRequiredAdvance, poCurrency)}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Remaining Amount</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-sm">{money(loadingPurchaseAmount - loadingRequiredAdvance, poCurrency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Box 3: Final Payment Summary (Final Currency) */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-4 dark:bg-slate-950 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          3. Final Payment Summary ({baseCurrency})
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded uppercase font-mono">{baseCurrency}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Total Final Amount</span>
                          <span className="font-extrabold text-slate-855 dark:text-slate-200 font-mono text-sm">{money(loadingPurchaseAmount * exRate, baseCurrency)}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Advance Amount</span>
                          <span className="font-extrabold text-slate-855 dark:text-slate-200 font-mono text-sm">{money(loadingRequiredAdvance * exRate, baseCurrency)}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Remaining Amount</span>
                          <span className="font-extrabold text-slate-855 dark:text-slate-200 font-mono text-sm">{money((loadingPurchaseAmount - loadingRequiredAdvance) * exRate, baseCurrency)}</span>
                        </div>
                        <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-lg dark:bg-slate-900/50 dark:border-slate-900 shadow-inner">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Exchange Rate</span>
                          <span className="font-bold text-[10.5px] text-slate-700 dark:text-slate-350 block truncate font-mono mt-0.5" title={`1 ${poCurrency} = ${Number(exRate).toFixed(4)} ${baseCurrency}`}>
                            1 {poCurrency} = {Number(exRate).toFixed(4)} {baseCurrency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate & Recorded Payments Pill Footer */}
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="text-[9px] font-semibold text-slate-500">
                      Exchange Rate: <span className="font-mono font-black text-slate-700 dark:text-slate-300">1 {poCurrency} = {Number(exRate).toFixed(2)} {baseCurrency}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                        {remainingPaymentsForThisLoading.length} Payment{remainingPaymentsForThisLoading.length !== 1 ? 's' : ''} Recorded
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeMode === "remaining" && !selectedLoadingRecord ? (
              <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-6 dark:bg-amber-955/5 dark:border-amber-900/30 text-center space-y-4 max-w-3xl mx-auto my-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                  <Truck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-amber-800 dark:text-amber-400">Select a Loaded Container to Process Payment</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Remaining payments must be processed separately for each loaded container record. Please select one of the loaded containers below to continue:
                  </p>
                </div>
                {loadingLoadingRecords ? (
                  <div className="text-xs text-amber-700 italic flex items-center justify-center gap-1.5 py-8">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                    Loading container records...
                  </div>
                ) : loadingRecords.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-h-[350px] overflow-y-auto p-1">
                    {loadingRecords.map((lr) => {
                      const poRow = selected || {};
                      const finance = calcLoadingFinance(lr, poRow, poRow.form_data?.form || {});
                      
                      const loadedQty = lr.report_payload?.loadedQuantity || lr.loadedQuantity || 0;
                      const poAdvanceAmt = Number(poRow.advance_paid || poRow.form_data?.form?.advanceAmount || 0);
                      const goods = poRow.form_data?.goodsEntries || [];
                      const totalPOQuantity = Number(
                        poRow.form_data?.totals?.totalQuantity ||
                        goods.reduce((acc: number, item: any) => acc + Number(item.qtyNo || item.quantity || 0), 0) ||
                        poRow.form_data?.form?.quantity ||
                        1
                      );
                      const loadedAdvanceUSD = totalPOQuantity > 0 ? (loadedQty / totalPOQuantity) * poAdvanceAmt : poAdvanceAmt;
                      const loadedRemainingUSD = Math.max(0, finance.amountUSD - loadedAdvanceUSD);
                      
                      return (
                        <button
                          key={lr.id}
                          type="button"
                          onClick={() => handleSelectLoadingRecord(lr)}
                          className="flex flex-col text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition text-xs space-y-2 dark:bg-slate-900 dark:border-slate-800 shadow-sm"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              📦 Cont. #{lr.loading_record_no || lr.report_payload?.containerNumber || "—"}
                            </span>
                            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              {loadedQty.toLocaleString()} Bags
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 w-full">
                            <div>Net Wt: <span className="font-semibold text-slate-700 dark:text-slate-300">{finance.netWeight.toLocaleString()} KGs</span></div>
                            <div>Gross Wt: <span className="font-semibold text-slate-700 dark:text-slate-300">{finance.grossWeight.toLocaleString()} KGs</span></div>
                            <div className="col-span-2 border-t border-slate-100 dark:border-slate-800/85 pt-1.5 mt-1 flex justify-between items-center w-full">
                              <span>Remaining Bal:</span>
                              <span className="font-black text-xs text-emerald-600">{money(loadedRemainingUSD, lr.currency || "USD")}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic py-8 bg-slate-50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No loaded containers found for this purchase order.
                    <div className="text-[10px] text-slate-400 mt-1 font-normal">Please make sure the containers are added and loaded in the Loading module first.</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Input Form (Col Span 5) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Payment Input Form */}
                {isSuperAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldBlock label="Country (Super Admin)" required={false}>
                      <SearchableSelect
                        value={saCountryId}
                        onChange={(val) => {
                          setSaCountryId(val);
                          setSaBranchId("");
                          setPaymentSourceLedgerId("");
                        }}
                        options={[
                          { label: "-- All Countries --", value: "" },
                          ...saCountries.map(c => ({ label: c.name, value: c.id }))
                        ]}
                        placeholder="-- All Countries --"
                        className="relative z-[45] text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </FieldBlock>
                    <FieldBlock label="Branch (Super Admin)" required={false}>
                      <SearchableSelect
                        value={saBranchId}
                        onChange={(val) => {
                          setSaBranchId(val);
                          setPaymentSourceLedgerId("");
                        }}
                        options={[
                          { label: "-- All Branches --", value: "" },
                          ...saBranches.filter(b => b.country_id === saCountryId || b.country_id === undefined).map(b => ({ label: b.name, value: b.id }))
                        ]}
                        placeholder="-- All Branches --"
                        disabled={!saCountryId}
                        className="relative z-[45] text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
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
                    <SearchableSelect
                      value={roznamchaType}
                      onChange={(val) => {
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
                      options={[
                        { label: "Cash Book No.", value: "Cash Book No." },
                        { label: "Roznamcha Book No.", value: "Roznamcha Book No." },
                        { label: "Receipt No.", value: "Receipt No." }
                      ]}
                      placeholder="Select Type"
                      className="relative z-[45] text-xs font-semibold text-slate-800 dark:text-slate-100"
                    />
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
                    <SearchableSelect
                      value={paymentType}
                      onChange={(val) => {
                        const value = val as any;
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
                      options={[
                        { label: "Select Category", value: "" },
                        { label: "Cash Roznamcha", value: "cash" },
                        { label: "Bank Roznamcha", value: "bank" },
                        { label: "Business Roznamcha", value: "business" },
                        { label: "Invoice Journal", value: "invoice" },
                        { label: "Transfer", value: "transfer" }
                      ]}
                      placeholder="Select Category"
                      className="relative z-[45] text-xs font-semibold text-slate-800 dark:text-slate-100"
                    />
                  </FieldBlock>

                  <FieldBlock label="Currency" required>
                    <SearchableSelect
                      value={currency}
                      onChange={(val) => setCurrency(val)}
                      options={[
                        { label: "USD", value: "USD" },
                        { label: "AED", value: "AED" },
                        { label: "PKR", value: "PKR" },
                        { label: "INR", value: "INR" },
                        { label: "AFN", value: "AFN" },
                        { label: "IRR", value: "IRR" }
                      ]}
                      placeholder="Select Currency"
                      className="relative z-[45] text-xs font-semibold text-slate-800 dark:text-slate-100"
                    />
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
                        <div className="space-y-1 relative z-[46]">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Bank Name</span>
                          <SearchableSelect
                            value={typeDetails.bankName || ""}
                            onChange={(val) => {
                              if (val === "__ADD_NEW__") {
                                openAddOption("bank");
                              } else {
                                setTypeDetails((prev) => ({ ...prev, bankName: val }));
                              }
                            }}
                            options={[
                              { label: "Select Bank", value: "" },
                              ...["HBL", "MCB", "UBL", "Meezan", "Bank Alfalah"].map((bank) => ({ label: bank, value: bank })),
                              ...savedBanks.map((bank) => ({ label: bank.name, value: bank.name }))
                            ]}
                            placeholder="Select Bank"
                            addOptionLabel="New Bank"
                            className="text-xs font-semibold text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div className="space-y-1 relative z-[46]">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Method</span>
                          <SearchableSelect
                            value={typeDetails.method || ""}
                            onChange={(val) => {
                              if (val === "__ADD_NEW__") {
                                openAddOption("method");
                              } else {
                                setTypeDetails((prev) => ({ ...prev, method: val }));
                              }
                            }}
                            options={[
                              { label: "Select Method", value: "" },
                              ...["Cheque", "Mobile Transfer", "Online Transfer", "Bank Transfer"].map((method) => ({ label: method, value: method })),
                              ...savedMethods.map((method) => ({ label: method, value: method }))
                            ]}
                            placeholder="Select Method"
                            addOptionLabel="New Method"
                            className="text-xs font-semibold text-slate-800 dark:text-slate-100"
                          />
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
                      Transaction Conversion Details ({selected?.currency_code || "USD"} ➔ {baseCurrency})
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <FieldBlock label={`Purchase Currency Amount (${selected?.currency_code || "USD"})`} required>
                        <Input className="h-9 text-xs font-semibold" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} type="number" step="0.0001" min="0" placeholder="e.g. 100" />
                      </FieldBlock>
                      <FieldBlock label="Exchange Rate" required>
                        <Input className="h-9 text-xs font-semibold" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} type="number" step="0.0001" min="0" disabled={selected?.currency_code === baseCurrency && currency === baseCurrency} />
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
                      🔵 Balanced entry — Dr: {doubleEntry.debitCode} / Cr: {doubleEntry.creditCode}
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
                    <div><span className="font-bold text-foreground">Amount: </span>{amount ? money(amount, baseCurrency) : "—"}</div>
                    {selected && (
                      <div className="mt-1">
                        {(() => {
                          const form = selected.form_data?.form || {};
                          const totalPrice = (selected as any).form_data?.goodsEntries?.length
                            ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                            : Number(form.totalAmount || 0);
                          const advancePercent = Number(form.advancePercent || 0);
                          const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                          const paidAdvanceBC = Number(selected.advance_paid || 0);
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
                                    {money(remainingDue, selected.currency_code ?? "USD")} ({money(remainingDue * (selected.exchange_rate || 1), baseCurrency)})
                                  </span>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div>
                                <span className="font-bold text-foreground">Remaining Bill Balance (Baqaya): </span>
                                <span className="font-extrabold text-rose-600">
                                  {money(remainingDue, selected.currency_code ?? "USD")} ({money(remainingDue * (selected.exchange_rate || 1), baseCurrency)})
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
                    ❌ {paymentError}
                  </div>
                )}
              </div>

              {/* Right Column: Double-entry Ledger Preview & History (Col Span 7) */}
              <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-4">
                {/* Past Transactions Table */}
                {(() => {
                  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                  const isUrlLoading = searchParams.get("fromLoading") === "true";
                  const fromLoading = isUrlLoading || Boolean(selectedLoadingRecord);

                  const cLoadedQty = selectedLoadingRecord
                    ? Number(selectedLoadingRecord.report_payload?.loadedQuantity || selectedLoadingRecord.loadedQuantity || 0)
                    : Number(searchParams.get("loadedQty") || 0);
                  const cGrossWeight = selectedLoadingRecord
                    ? Number(selectedLoadingRecord.report_payload?.grossWeight || 0)
                    : Number(searchParams.get("grossWeight") || 0);
                  const cNetWeight = selectedLoadingRecord
                    ? Number(selectedLoadingRecord.report_payload?.netWeight || 0)
                    : Number(searchParams.get("netWeight") || 0);
                  const cPriceRate = selectedLoadingRecord
                    ? Number(selectedLoadingRecord.report_payload?.priceRateC1 || 0)
                    : Number(searchParams.get("priceRate") || 0);
                  const cLoadingRecordId = selectedLoadingRecord
                    ? selectedLoadingRecord.id
                    : (searchParams.get("loadingRecordId") || "");

                  const form = (selected as any).form_data?.form || {};
                  const goods = (selected as any).form_data?.goodsEntries || [];
                  const totalPurchaseBC = Number(selected.order_total || 0) ||
                    (goods.length ? goods.reduce((s: number, g: any) => s + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0));
                  const totalPOQuantity = Number(
                    selected.form_data?.totals?.totalQuantity ||
                    goods.reduce((acc: number, item: any) => acc + Number(item.qtyNo || item.quantity || 0), 0) ||
                    form.quantity ||
                    1
                  );
                  const advancePercent = Number(form.advancePercent || 0);
                  const poCurrency = (selected as any).form_data?.form?.currencyType || (selected as any).form_data?.form?.currency || selected.currency_code || "USD";
                  const exRate = selected.exchange_rate || 1;

                  // Resolve pricing mode
                  const firstGood = goods[0] || {};
                  const isPerKg = firstGood.priceType === "P/KGs" || String(firstGood.priceType || "").toLowerCase().includes("kg");

                  // Determine active totals based on loading record vs PO total
                  const loadingPurchaseAmount = fromLoading
                    ? (isPerKg ? cNetWeight * cPriceRate : cLoadedQty * cPriceRate)
                    : totalPurchaseBC;

                  const loadingRequiredAdvance = (loadingPurchaseAmount * advancePercent) / 100;

                  // Build history array
                  let displayPayments: any[] = [];
                  
                  if (fromLoading && cLoadingRecordId) {
                    // 1. Synthetic pro-rated advance deduction row
                    const poAdvancePaid = Number(selected.advance_paid || 0);
                    const loadingAdvancePaid = totalPOQuantity > 0 ? (cLoadedQty / totalPOQuantity) * poAdvancePaid : poAdvancePaid;
                    
                    const poAdvancePayment = selectedOrderPayments.find((p: any) => p.kind === "advance");
                    const advanceSynthetic = {
                      id: "synthetic-advance-payment",
                      kind: "advance",
                      entry_date: poAdvancePayment?.entry_date || selected.created_at,
                      created_at: poAdvancePayment?.created_at || selected.created_at,
                      amount: loadingAdvancePaid,
                      currency_code: poCurrency,
                      exchange_rate: exRate,
                      payment_method: poAdvancePayment?.payment_method || "Advance deducted",
                      created_by_name: poAdvancePayment?.created_by_name || "System Allocation",
                      typeDetails: poAdvancePayment?.typeDetails || { method: "Advance deducted" },
                      narration: `Advance deduction allocated for ${cLoadedQty.toLocaleString()} units`,
                      reference_no: poAdvancePayment?.reference_no || "-"
                    };
                    
                    const loadingRemainingPayments = selectedOrderPayments.filter((p: any) => {
                      const payKind = p.kind || "";
                      if (payKind !== "remaining") return false;
                      const payRecordId = p.typeDetails?.loadingRecordId || p.typeDetails?.loading_record_id || "";
                      return payRecordId === cLoadingRecordId;
                    });
                    
                    displayPayments = [advanceSynthetic, ...loadingRemainingPayments];
                  } else {
                    displayPayments = [...selectedOrderPayments];
                  }

                  if (displayPayments.length === 0) return null;

                  // Compute chronological running balances
                  const chronological = displayPayments.sort((a: any, b: any) =>
                    new Date(a.entry_date || a.created_at).getTime() - new Date(b.entry_date || b.created_at).getTime()
                  );
                  let runningTotalUSD = 0;
                  let runningTotalAED = 0;
                  const historyWithBalance = chronological.map((p: any, idx: number) => {
                    const isPayLocal = p.currency_code?.toUpperCase() === baseCurrency.toUpperCase();
                    
                    // Amount in USD (Transaction Currency)
                    const amtUSD = isPayLocal
                      ? Number(p.amount || 0) / Number(p.exchange_rate || exRate || 1)
                      : Number(p.amount || 0);

                    // Amount in AED (Final Currency)
                    const amtAED = isPayLocal
                      ? Number(p.amount || 0)
                      : Number(p.amount || 0) * Number(p.exchange_rate || exRate || 1);

                    runningTotalUSD += amtUSD;
                    runningTotalAED += amtAED;

                    const showRemainUSD = fromLoading
                      ? Math.max(0, loadingPurchaseAmount - runningTotalUSD)
                      : Math.max(0, loadingRequiredAdvance - runningTotalUSD);

                    const showRemainAED = fromLoading
                      ? Math.max(0, (loadingPurchaseAmount * exRate) - runningTotalAED)
                      : Math.max(0, (loadingRequiredAdvance * exRate) - runningTotalAED);

                    const remainingIndex = p.kind === "remaining"
                      ? chronological.slice(0, idx + 1).filter((x: any) => x.kind === "remaining").length
                      : 0;

                    const paymentTypeLabel = p.kind === "advance"
                      ? "Advance Payment"
                      : p.kind === "remaining"
                        ? `Remaining Payment - ${remainingIndex}`
                        : p.kind || "Payment";

                    return {
                      ...p,
                      paymentNo: idx + 1,
                      paymentTypeLabel,
                      amtUSD,
                      amtAED,
                      runningTotalUSD,
                      runningTotalAED,
                      showRemainUSD,
                      showRemainAED
                    };
                  });

                  return (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-blue-500" />
                          <h3 className="text-[11px] font-black tracking-wider uppercase text-slate-800 dark:text-slate-200">
                            {fromLoading ? "4. Payment Entry History (Container Wise)" : "4. Payment Entry History (All Transactions)"}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                            {historyWithBalance.length} Entry/Entries
                          </span>
                          {historyWithBalance[historyWithBalance.length - 1]?.showRemainUSD <= 0.01 && (
                            <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">✓ Fully Paid</span>
                          )}
                        </div>
                      </div>

                      {/* Running Ledger Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-3 py-2 text-center w-10">#</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Payment Type</th>
                              <th className="px-3 py-2 text-right">Payment Amount ({poCurrency})</th>
                              <th className="px-3 py-2 text-right">Payment Amount ({baseCurrency})</th>
                              <th className="px-3 py-2 text-right">Total Paid ({poCurrency})</th>
                              <th className="px-3 py-2 text-right">Total Paid ({baseCurrency})</th>
                              <th className="px-3 py-2 text-right">Remaining ({poCurrency})</th>
                              <th className="px-3 py-2 text-right">Remaining ({baseCurrency})</th>
                              <th className="px-3 py-2">Ref / User</th>
                              <th className="px-3 py-2 text-center w-12">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyWithBalance.map((payment: any) => {
                              const drLedger = ledgers.find((l) => ledgerId(l) === payment.debit_ledger_id);
                              const crLedger = ledgers.find((l) => ledgerId(l) === payment.credit_ledger_id);
                              const re = payment.roznamcha_entries || {};
                              const method = payment.typeDetails?.method || payment.payment_method || payment.typeDetails?.bankName || payment.bank_name || "—";
                              const userName = payment.created_by_name || payment.audit?.userName || payment.typeDetails?.receiverSenderName || re.created_by_name || "Admin";

                              const isCompleted = payment.showRemainUSD <= 0.01;

                              return (
                                <tr
                                  key={payment.id}
                                  className={"border-b border-slate-100 dark:border-slate-800/60 text-xs transition " + (isCompleted ? "bg-emerald-50/20 dark:bg-emerald-950/5" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30")}
                                >
                                  {/* Payment No. */}
                                  <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">
                                    {payment.paymentNo}
                                  </td>

                                  {/* Date */}
                                  <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400 font-semibold">
                                    {date(payment.entry_date || payment.created_at)}
                                  </td>

                                  {/* Payment Type */}
                                  <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">
                                    {payment.paymentTypeLabel}
                                    <div className="text-[8px] font-normal text-slate-400">Via {method}</div>
                                  </td>

                                  {/* Payment Amount (PO Currency) */}
                                  <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-800 dark:text-slate-200">
                                    {money(payment.amtUSD, poCurrency)}
                                  </td>

                                  {/* Payment Amount (Base Currency) */}
                                  <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-800 dark:text-slate-200">
                                    {money(payment.amtAED, baseCurrency)}
                                  </td>

                                  {/* Total (PO Currency) */}
                                  <td className="px-3 py-2 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400">
                                    {money(payment.runningTotalUSD, poCurrency)}
                                  </td>

                                  {/* Total Paid (Base Currency) */}
                                  <td className="px-3 py-2 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400">
                                    {money(payment.runningTotalAED, baseCurrency)}
                                  </td>

                                  {/* Remaining (PO Currency) */}
                                  <td className="px-3 py-2 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400">
                                    {payment.showRemainUSD <= 0.01 ? `0.00 ${poCurrency}` : money(payment.showRemainUSD, poCurrency)}
                                  </td>

                                  {/* Remaining (Base Currency) */}
                                  <td className="px-3 py-2 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400">
                                    {payment.showRemainAED <= 0.01 ? `0.00 ${baseCurrency}` : money(payment.showRemainAED, baseCurrency)}
                                  </td>

                                  {/* Ref / User */}
                                  <td className="px-3 py-2 text-[10px] text-slate-500 whitespace-nowrap">
                                    <div className="font-bold flex items-center gap-1">
                                      <User className="h-3 w-3 text-slate-400" />{userName}
                                    </div>
                                    <div className="font-mono text-[8px]">Ref: {payment.reference_no || "-"}</div>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-3 py-2 text-center">
                                    {payment.id === "synthetic-advance-payment" ? (
                                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic">Allocation</span>
                                    ) : (
                                      <NestedRowActions payment={payment} row={selected} ledgers={ledgers} localCurrency={baseCurrency} />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {/* Summary Footer Row */}
                          <tfoot>
                            <tr className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300">
                              <td colSpan={3} className="px-3 py-2 uppercase tracking-wide text-center">Totals</td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-black">
                                {money(historyWithBalance.reduce((s: number, p: any) => s + p.amtUSD, 0), poCurrency)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-black">
                                {money(historyWithBalance.reduce((s: number, p: any) => s + p.amtAED, 0), baseCurrency)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-blue-700 dark:text-blue-400 font-black">
                                {money(historyWithBalance[historyWithBalance.length - 1]?.runningTotalUSD || 0, poCurrency)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-blue-700 dark:text-blue-400 font-black">
                                {money(historyWithBalance[historyWithBalance.length - 1]?.runningTotalAED || 0, baseCurrency)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-rose-600 dark:text-rose-400 font-black">
                                {money(historyWithBalance[historyWithBalance.length - 1]?.showRemainUSD || 0, poCurrency)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-rose-600 dark:text-rose-400 font-black">
                                {money(historyWithBalance[historyWithBalance.length - 1]?.showRemainAED || 0, baseCurrency)}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
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
                        <th className="px-3 py-2.5 text-left w-16">DR / CR</th>
                        <th className="px-3 py-2.5 text-left">Account</th>
                        <th className="px-3 py-2.5 text-right">Amount ({poCurrency})</th>
                        <th className="px-3 py-2.5 text-right">Amount ({baseCurrency})</th>
                        <th className="px-2 py-2.5 text-center">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const previewUsd = showCalcPanel 
                          ? (currency === baseCurrency ? amount : Number(calcAmount || 0)) 
                          : (amount / Number(exchangeRate || 1));
                        const previewAed = amount;

                        return (
                          <>
                            <tr className="border-b border-border bg-indigo-500/5 ring-1 ring-inset ring-indigo-400/20">
                              <td className="px-3 py-3 font-black text-xs text-indigo-600">DR</td>
                              <td className="px-3 py-3">
                                <div className="font-bold text-foreground line-clamp-1">{doubleEntry.debitName}</div>
                                <div className="text-[9px] text-muted-foreground font-mono">
                                  {doubleEntry.debitCode} {doubleEntry.debitBranch && doubleEntry.debitBranch !== "-" && `| Branch: ${doubleEntry.debitBranch}`}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-bold text-indigo-600 whitespace-nowrap">
                                {previewUsd > 0 ? money(previewUsd, poCurrency) : "—"}
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-bold text-indigo-600 whitespace-nowrap">
                                {previewAed > 0 ? money(previewAed, baseCurrency) : "—"}
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
                              <td className="px-3 py-3 font-black text-xs text-violet-600">CR</td>
                              <td className="px-3 py-3">
                                <div className="font-bold text-foreground line-clamp-1">{doubleEntry.creditName}</div>
                                <div className="text-[9px] text-muted-foreground font-mono">
                                  {doubleEntry.creditCode} {doubleEntry.creditBranch && doubleEntry.creditBranch !== "-" && `| Branch: ${doubleEntry.creditBranch}`}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-bold text-violet-600 whitespace-nowrap">
                                {previewUsd > 0 ? money(previewUsd, poCurrency) : "—"}
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-bold text-violet-600 whitespace-nowrap">
                                {previewAed > 0 ? money(previewAed, baseCurrency) : "—"}
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
                          </>
                        );
                      })()}
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
            )}
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
            const paidAdvanceBC = Number(viewingRow.advance_paid || 0);
            const paidAdvanceLocal = paidAdvanceBC * exchangeRateVal;
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", colorClasses.iconBg, colorClasses.iconText)}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" }) : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">{label}</p>
        <p className={cn("mt-0.5 text-lg font-extrabold tracking-tight", colorClasses.text)}>{value}</p>
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{sublabel}</p>
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
          display: "inline-flex", alignItems: "center", justifycontent: "center",
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

function getStatusBadge(status: string | null | undefined) {
  const badgeStyle = statusClass(status);
  return (
    <span className={cn("inline-flex rounded border px-2 py-0.5 text-[9px] font-bold uppercase whitespace-nowrap shadow-sm tracking-wider", badgeStyle)}>
      {status || "Pending"}
    </span>
  );
}
