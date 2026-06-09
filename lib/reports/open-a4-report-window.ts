export type A4ReportRow = { label: string; value: string };

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function openA4ReportWindow(input: {
  title: string;
  subtitle?: string;
  rows: A4ReportRow[];
  autoPrint?: boolean;
}) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank");
  if (!w) return;

  const now = new Date();
  const stamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

  const title = escapeHtml(input.title);
  const subtitle = escapeHtml(input.subtitle || "");
  const rowsHtml = input.rows
    .filter((r) => r && (r.label || r.value))
    .map(
      (r) => `
        <tr>
          <th>${escapeHtml(r.label)}</th>
          <td>${escapeHtml(r.value || "-")}</td>
        </tr>
      `
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      html, body { height: 100%; }
      body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; }
      .wrap { padding: 18px; }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #fff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
        border-radius: 10px;
        overflow: hidden;
      }
      .head { padding: 18px 22px; border-bottom: 1px solid #e5e7eb; }
      .title { font-size: 20px; font-weight: 800; margin: 0; }
      .sub { margin-top: 6px; color: #6b7280; font-size: 12px; }
      .meta { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; color: #6b7280; font-size: 12px; }
      .pill { border: 1px solid #e5e7eb; border-radius: 999px; padding: 4px 10px; background: #f9fafb; }
      .content { padding: 18px 22px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; text-align: left; vertical-align: top; }
      th { width: 32%; background: #f9fafb; color: #374151; font-weight: 700; }
      td { font-weight: 600; }

      @media print {
        body { background: #fff; }
        .wrap { padding: 0; }
        .page { border: 0; box-shadow: none; border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="page">
        <div class="head">
          <h1 class="title">${title}</h1>
          ${subtitle ? `<div class="sub">${subtitle}</div>` : ""}
          <div class="meta">
            <span class="pill">Generated: ${escapeHtml(stamp)}</span>
          </div>
        </div>
        <div class="content">
          <table>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <script>
      window.__ERP_A4_AUTOPRINT__ = ${input.autoPrint ? "true" : "false"};
      window.addEventListener('load', () => {
        if (window.__ERP_A4_AUTOPRINT__) {
          setTimeout(() => window.print(), 50);
        }
      }, { once: true });
    </script>
  </body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

