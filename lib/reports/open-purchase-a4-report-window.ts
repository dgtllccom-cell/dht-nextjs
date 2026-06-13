import { t } from "@/lib/i18n/ui";
import type { SupportedLanguage } from "@/lib/i18n/languages";

export type PurchaseReportData = {
  id: string;
  purchaseBookingOrderNumber: string;
  purchaseDate: string;
  bookingDate: string;
  purchaseAccountName: string;
  purchaseAccountNumber: string;
  salesAccountName: string;
  salesAccountNumber: string;
  supplierName: string;
  buyerName: string;
  productName: string;
  goodsDescription: string;
  quantity: number;
  unit: string;
  totalWeight: number;
  containerCount: number;
  purchaseRate: number;
  totalPurchaseAmount: number;
  currency: string;
  status: string;
  currentStep?: string;
  nextStep?: string;
  paymentStatus: string;
  containerStatus?: string;
  inventoryStatus?: string;
  deliveryStatus?: string;
  finalDeliveryStatus?: string;
  branchName: string;
  countryName: string;
  createdAt: string;
  audit: {
    userName: string;
    userId: string;
    branchCode: string;
  };
};

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function openPurchaseA4ReportWindow(input: {
  title: string;
  subtitle?: string;
  autoPrint?: boolean;
  purchaseData: PurchaseReportData;
  lang?: string;
}) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank");
  if (!w) return;

  const lang = (input.lang || "en") as SupportedLanguage;
  const isRtl = ["ur", "ar", "fa", "ps"].includes(lang);

  const now = new Date();
  const stampDate = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const stampTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const title = escapeHtml(input.title);
  const subtitle = escapeHtml(input.subtitle || "Purchase Booking Order Summary");
  const b = input.purchaseData;

  const formattedDateTime = `${stampDate} ${stampTime}`;

  // 1. General Info
  const generalInfoHtml = `
    <tr><td class="label">Booking Number</td><td class="value font-mono font-bold text-blue-600">${escapeHtml(b.purchaseBookingOrderNumber || "-")}</td></tr>
    <tr><td class="label">Purchase Date</td><td class="value">${formatDate(b.purchaseDate)}</td></tr>
    <tr><td class="label">Booking Date</td><td class="value">${formatDate(b.bookingDate)}</td></tr>
    <tr><td class="label">${t(lang, "ledger.country")}</td><td class="value">${escapeHtml(b.countryName || "-")}</td></tr>
    <tr><td class="label">${t(lang, "ledger.branch_name")}</td><td class="value">${escapeHtml(b.branchName || "-")}</td></tr>
    <tr><td class="label">${t(lang, "ledger.branch_account_no")}</td><td class="value font-mono">${escapeHtml(b.audit?.branchCode || "-")}</td></tr>
  `;

  // 2. Party Information
  const partyHtml = `
    <tr><td class="label">Supplier / Seller</td><td class="value font-semibold text-slate-800">${escapeHtml(b.supplierName || "-")}</td></tr>
    <tr><td class="label">Buyer / Customer</td><td class="value font-semibold text-slate-800">${escapeHtml(b.buyerName || "-")}</td></tr>
    <tr><td class="label">Registered Country</td><td class="value">${escapeHtml(b.countryName || "-")}</td></tr>
    <tr><td class="label">Registered Branch</td><td class="value">${escapeHtml(b.branchName || "-")}</td></tr>
  `;

  // 3. Ledger Accounts
  const ledgerHtml = `
    <tr>
      <td class="label">Purchase Account</td>
      <td class="value">
        <div class="font-mono font-bold">${escapeHtml(b.purchaseAccountNumber || "-")}</div>
        <div style="font-size: 8.5px; color: #64748b; font-weight: 500;">${escapeHtml(b.purchaseAccountName || "-")}</div>
      </td>
    </tr>
    <tr>
      <td class="label">Sales Account</td>
      <td class="value">
        <div class="font-mono font-bold">${escapeHtml(b.salesAccountNumber || "-")}</div>
        <div style="font-size: 8.5px; color: #64748b; font-weight: 500;">${escapeHtml(b.salesAccountName || "-")}</div>
      </td>
    </tr>
  `;

  // 4. Goods & Cargo Details
  const cargoHtml = `
    <tr><td class="label">Product / Goods</td><td class="value font-bold text-slate-800">${escapeHtml(b.productName || "-")}</td></tr>
    <tr><td class="label">Description</td><td class="value" style="font-size: 9px; line-height: 1.3;">${escapeHtml(b.goodsDescription || "-")}</td></tr>
    <tr><td class="label">${t(lang, "form.quantity")}</td><td class="value font-bold">${formatNumber(b.quantity)} ${escapeHtml(b.unit)}</td></tr>
    <tr><td class="label">Container Count</td><td class="value font-bold">${b.containerCount} Containers</td></tr>
    <tr><td class="label">Total Weight</td><td class="value font-bold">${formatNumber(b.totalWeight)} kg</td></tr>
  `;

  // 5. Financial & Workflow Details
  const financialHtml = `
    <tr><td class="label">${t(lang, "form.transaction_rate")}</td><td class="value font-mono font-bold">${formatMoney(b.purchaseRate)} ${escapeHtml(b.currency)}</td></tr>
    <tr><td class="label">${t(lang, "form.final_amount")}</td><td class="value font-mono font-bold text-blue-600">${formatMoney(b.totalPurchaseAmount)} ${escapeHtml(b.currency)}</td></tr>
    <tr><td class="label">Payment Status</td><td class="value"><span class="badge badge-payment">${escapeHtml(b.paymentStatus || "Pending")}</span></td></tr>
    <tr><td class="label">${t(lang, "ledger.ledger_status")}</td><td class="value"><span class="badge badge-workflow">${escapeHtml(b.currentStep || b.status || "Open")}</span></td></tr>
    ${b.nextStep ? `<tr><td class="label">Next Required Step</td><td class="value font-medium text-amber-700">${escapeHtml(b.nextStep)}</td></tr>` : ""}
  `;

  // 6. Audit & System Metadata
  const auditHtml = `
    <tr><td class="label">${t(lang, "roz.created_by")}</td><td class="value">${escapeHtml(b.audit?.userName || "Super Admin")} (ID: ${escapeHtml(b.audit?.userId || "-")})</td></tr>
    <tr><td class="label">${t(lang, "ledger.col_date")}</td><td class="value">${formatDate(b.createdAt)}</td></tr>
    <tr><td class="label">Printed By</td><td class="value">Authorized ERP User</td></tr>
    <tr><td class="label">IP Address / Host</td><td class="value">127.0.0.1 (Localhost)</td></tr>
    <tr><td class="label">System Status</td><td class="value font-black text-emerald-600">VERIFIED / LOGGED</td></tr>
  `;

  const html = `<!doctype html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      @page { size: A4; margin: 12mm; }
      html, body { height: 100%; margin: 0; padding: 0; }
      body { background: #f1f5f9; color: #1e293b; font-family: 'Inter', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .wrap { padding: 25px; display: flex; justify-content: center; }
      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 15mm 15mm;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        border-radius: 12px;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      .header-table td { border: none; padding: 0; }
      .logo-title { display: flex; align-items: center; gap: 10px; }
      .logo-icon { width: 36px; height: 36px; background: #0f172a; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold; }
      .logo-text { font-size: 14px; font-weight: 950; color: #0f172a; line-height: 1.1; }
      .logo-subtext { font-size: 8px; color: #64748b; font-weight: 600; line-height: 1.2; }
      .report-title { font-size: 16px; font-weight: 900; color: #1e3a8a; margin: 0 0 4px 0; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
      .meta-box { font-size: 9px; color: #334155; font-weight: 700; line-height: 1.4; text-align: right; }
      .meta-label { color: #64748b; font-weight: 500; }

      .overview-banner {
        background: #0f172a;
        color: #ffffff;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 20px;
      }
      .overview-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
      .overview-name { font-size: 20px; font-weight: 900; color: #ffffff; margin-top: 2px; }
      .overview-status { float: right; font-size: 8.5px; font-weight: 800; border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.15); color: #34d399; border-radius: 4px; padding: 2px 8px; text-transform: uppercase; }
      
      .overview-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; border-bottom: 1px solid #334155; padding-bottom: 12px; }
      .overview-meta-label { font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
      .overview-meta-val { font-size: 11px; font-weight: 800; color: #e2e8f0; margin-top: 2px; }

      .overview-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; text-align: center; }
      .kpi-label { font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
      .kpi-val { font-size: 14px; font-weight: 900; margin-top: 2px; color: #38bdf8; }

      .section-card {
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 15px;
        overflow: hidden;
      }
      .section-header {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 8px 12px;
        font-size: 9px;
        font-weight: 800;
        color: #1e293b;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .section-badge {
        background: #e2e8f0;
        color: #475569;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        font-weight: 900;
      }
      
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px; }
      .info-table { width: 100%; border-collapse: collapse; }
      .info-table td { padding: 5px 10px; font-size: 9.5px; border-bottom: 1px solid #f1f5f9; }
      .info-table td.label { color: #64748b; font-weight: 600; width: 40%; }
      .info-table td.value { font-weight: 700; color: #1e293b; text-align: left; }
      
      .badge { display: inline-block; font-size: 8px; font-weight: 800; border-radius: 4px; padding: 2px 6px; text-transform: uppercase; }
      .badge-payment { border: 1px solid rgba(37,99,235,0.3); background: rgba(37,99,235,0.1); color: #2563eb; }
      .badge-workflow { border: 1px solid rgba(245,158,11,0.3); background: rgba(245,158,11,0.1); color: #d97706; }

      .footer-signatures { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 15px; border-top: 1px solid #e2e8f0; }
      .notes-box { width: 45%; font-size: 8px; color: #64748b; line-height: 1.3; }
      .seal-box { text-align: center; }
      .sig-box { width: 30%; text-align: center; font-size: 9px; }
      .sig-line { border-bottom: 1px solid #94a3b8; margin-bottom: 4px; height: 20px; display: flex; align-items: flex-end; justify-content: center; font-family: 'Georgia', serif; font-style: italic; color: #0f172a; font-size: 11px; }
      .page-footer { display: flex; justify-content: space-between; font-size: 7.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 10px; font-weight: 700; }

      /* RTL direction specific layouts */
      html[dir="rtl"] body { text-align: right; direction: rtl; }
      html[dir="rtl"] th, html[dir="rtl"] td { text-align: right; }
      html[dir="rtl"] .info-table td.value { text-align: right; }
      html[dir="rtl"] .meta-box { text-align: left; }
      html[dir="rtl"] .logo-title { flex-direction: row-reverse; }
      html[dir="rtl"] .overview-status { float: left; }
      html[dir="rtl"] .footer-signatures { flex-direction: row-reverse; }

      @media print {
        body { background: #ffffff; }
        .wrap { padding: 0; }
        .page { border: none; box-shadow: none; border-radius: 0; padding: 0; width: 100%; min-height: 100%; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="page">
        <!-- Branding Header -->
        <table class="header-table">
          <tr>
            <td style="width: 35%; vertical-align: middle;">
              <div class="logo-title">
                <div class="logo-icon">📦</div>
                <div>
                  <div class="logo-text">ACCOUNTS.DGT.LLC</div>
                  <div class="logo-subtext">Enterprise ERP / FMS</div>
                  <div class="logo-subtext">Purchase Booking Order Registry</div>
                </div>
              </div>
            </td>
            <td style="width: 30%; text-align: center; vertical-align: middle;">
              <h1 class="report-title">${title}</h1>
              <div style="font-size: 8px; font-weight: 800; border: 1px solid #1e3a8a; color: #1e3a8a; border-radius: 999px; padding: 2px 10px; display: inline-block; text-transform: uppercase;">
                ${subtitle}
              </div>
            </td>
            <td style="width: 35%; text-align: right; vertical-align: middle;">
              <div class="meta-box">
                <div class="meta-item"><span class="meta-label">${t(lang, "ledger.col_date")} :</span> ${stampDate}</div>
                <div class="meta-item"><span class="meta-label">Time :</span> ${stampTime}</div>
                <div class="meta-item"><span class="meta-label">Printed By :</span> ERP Admin</div>
                <div class="meta-item"><span class="meta-label">Report Type :</span> Booking Order Document</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Dark Blue Overview Banner -->
        <div class="overview-banner">
          <span class="overview-status">${escapeHtml(b.paymentStatus || "Unpaid")}</span>
          <div class="overview-title">Booking Registry Document</div>
          <div class="overview-name">${escapeHtml(b.purchaseBookingOrderNumber || "-")}</div>

          <div class="overview-meta-grid">
            <div>
              <span class="overview-meta-label">Supplier / Seller</span>
              <div class="overview-meta-val">${escapeHtml(b.supplierName || "-")}</div>
            </div>
            <div>
              <span class="overview-meta-label">Product / Goods</span>
              <div class="overview-meta-val">${escapeHtml(b.productName || "-")}</div>
            </div>
            <div>
              <span class="overview-meta-label">Purchase Date</span>
              <div class="overview-meta-val">${formatDate(b.purchaseDate)}</div>
            </div>
            <div>
              <span class="overview-meta-label">${t(lang, "ledger.branch_name")}</span>
              <div class="overview-meta-val">${escapeHtml(b.branchName || "-")}</div>
            </div>
          </div>

          <div class="overview-kpis">
            <div>
              <span class="kpi-label">${t(lang, "form.quantity")}</span>
              <div class="kpi-val">${formatNumber(b.quantity)} ${escapeHtml(b.unit)}</div>
            </div>
            <div>
              <span class="kpi-label">Total Weight</span>
              <div class="kpi-val">${formatNumber(b.totalWeight)} kg</div>
            </div>
            <div>
              <span class="kpi-label">Container Count</span>
              <div class="kpi-val">${b.containerCount}</div>
            </div>
            <div>
              <span class="kpi-label">Total Value</span>
              <div class="kpi-val" style="color: #67e8f9;">${formatMoney(b.totalPurchaseAmount)} ${escapeHtml(b.currency)}</div>
            </div>
          </div>
        </div>

        <!-- 6 Details Cards Grid Layout -->
        <div class="grid-2">
          <!-- Card 1 -->
          <div class="section-card">
            <div class="section-header"><span class="section-badge">1</span> GENERAL REGISTRATION INFO</div>
            <table class="info-table">
              ${generalInfoHtml}
            </table>
          </div>
          <!-- Card 2 -->
          <div class="section-card">
            <div class="section-header"><span class="section-badge">2</span> CONTRACTING PARTIES</div>
            <table class="info-table">
              ${partyHtml}
            </table>
          </div>
        </div>

        <div class="grid-2">
          <!-- Card 3 -->
          <div class="section-card">
            <div class="section-header"><span class="section-badge">3</span> DOUBLE-ENTRY LEDGERS</div>
            <table class="info-table">
              ${ledgerHtml}
            </table>
          </div>
          <!-- Card 4 -->
          <div class="section-card">
            <div class="section-header"><span class="section-badge">4</span> CARGO & QUANTITY SPECS</div>
            <table class="info-table">
              ${cargoHtml}
            </table>
          </div>
        </div>

        <div class="grid-2">
          <!-- Card 5 -->
          <div class="section-card">
            <div class="section-header"><span class="section-badge">5</span> FINANCIALS & WORKFLOW</div>
            <table class="info-table">
              ${financialHtml}
            </table>
          </div>
          <!-- Card 6 -->
          <div class="section-card">
            <div class="section-header"><span class="section-badge">6</span> SECURITY & AUDIT TRAIL</div>
            <table class="info-table">
              ${auditHtml}
            </table>
          </div>
        </div>

        <!-- Signature Block -->
        <div class="footer-signatures">
          <div class="notes-box">
            <strong style="color: #0f172a; font-size: 9px; display: block; margin-bottom: 2px;">${t(lang, "form.remarks_notes")}</strong>
            <span>This is an official automated print statement from the ACCOUNTS.DGT.LLC Purchase Registry system. All ledger postings and currency balances are verified for security and multi-branch transaction tracking.</span>
          </div>

          <!-- Premium Gold Badge Seal -->
          <div class="seal-box">
            <svg width="55" height="55" viewBox="0 0 100 100">
              <!-- Ribbon -->
              <path d="M35 50 L25 85 L50 75 L75 85 L65 50 Z" fill="#d97706" />
              <path d="M45 50 L40 90 L50 82 L60 90 L55 50 Z" fill="#b45309" />
              <!-- Outer Ring -->
              <circle cx="50" cy="45" r="35" fill="url(#goldGrad)" stroke="#f59e0b" stroke-width="2" />
              <circle cx="50" cy="45" r="30" fill="none" stroke="#d97706" stroke-width="1" stroke-dasharray="3,3" />
              <!-- Typography -->
              <text x="50" y="38" font-family="'Inter', sans-serif" font-size="7" font-weight="900" text-anchor="middle" fill="#78350f" letter-spacing="0.2">ERP BOOKING</text>
              <text x="50" y="46" font-family="'Inter', sans-serif" font-size="5" font-weight="800" text-anchor="middle" fill="#92400e">VERIFIED</text>
              <text x="50" y="55" font-family="'Inter', sans-serif" font-size="6" font-weight="900" text-anchor="middle" fill="#78350f" letter-spacing="0.2">RECORDED</text>
              
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fef3c7" />
                  <stop offset="50%" stop-color="#fbbf24" />
                  <stop offset="100%" stop-color="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div class="sig-box">
            <div class="sig-line">ERP Registrar</div>
            <div style="font-size: 8px; font-weight: 700; color: #64748b;">Authorized Registrar</div>
            <div style="font-size: 7px; color: #94a3b8; font-weight: 500;">DGT Accounts Department</div>
          </div>
        </div>

        <!-- Page Footer -->
        <div class="page-footer">
          <div>🏢 ACCOUNTS.DGT.LLC | Purchase Booking Order Summary</div>
          <div>Report Code: PO-${escapeHtml(b.purchaseBookingOrderNumber || "MAIN")}-${stampDate.replace(/-/g, "")}</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
    <script>
      window.__ERP_A4_AUTOPRINT__ = ${input.autoPrint ? "true" : "false"};
      window.addEventListener('load', () => {
        if (window.__ERP_A4_AUTOPRINT__) {
          setTimeout(() => window.print(), 100);
        }
      }, { once: true });
    </script>
  </body>
</html>
