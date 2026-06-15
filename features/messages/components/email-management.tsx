"use client";

import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  Check,
  ChevronRight,
  CircleDashed,
  Download,
  ExternalLink,
  FileDown,
  FilePlus2,
  Globe2,
  Inbox,
  Link2,
  Mail,
  MailOpen,
  MessageSquareText,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Reply,
  ReplyAll,
  Send,
  Settings2,
  ShieldAlert,
  Star,
  Trash2,
  Users,
  X,
  Search
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { ReportActionsMenu } from "@/components/reports/report-actions-menu";
import { ReportFilterMenu } from "@/components/reports/report-filter-menu";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { SimpleModal } from "@/components/ui/simple-modal";
import { cn } from "@/lib/utils";

type EmailFolder = "inbox" | "sent" | "draft" | "trash" | "spam" | "attachments" | "notifications";
type EmailChannel = "email" | "whatsapp" | "internal" | "notifications";

type EmailMessage = {
  id: string;
  folder: EmailFolder;
  channel: EmailChannel;
  provider: string;
  subject: string;
  preview: string;
  body: string;
  senderName: string;
  senderEmail: string | null;
  recipientSummary: string;
  ccSummary: string;
  companyId: string | null;
  companyName: string;
  branchId: string | null;
  branchName: string;
  branchType: string;
  createdAt: string;
  status: "draft" | "sent" | "received";
  isUnread: boolean;
  labels: string[];
  attachmentCount: number;
  linkedModule: string | null;
  linkedRoute: string | null;
  linkedDocumentNo: string | null;
  sourceTable: string;
  sourceId: string | null;
  action: string;
  companyFilterKey: string;
  branchFilterKey: string;
};

type EmailReportResponse = {
  channel: EmailChannel;
  summary: {
    totalMessages: number;
    inbox: number;
    sent: number;
    drafts: number;
    notifications: number;
    attachments: number;
    providers: number;
  };
  folders: Array<{ key: EmailFolder; label: string; count: number }>;
  filters: {
    companies: SearchSelectOption[];
    branches: SearchSelectOption[];
    providers: SearchSelectOption[];
    labels: SearchSelectOption[];
  };
  rows: EmailMessage[];
  generatedAt: string;
};

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesText(haystack: string, query: string) {
  if (!query) return true;
  return normalizeSearch(haystack).includes(normalizeSearch(query));
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function downloadText(filename: string, content: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function emailToCsv(rows: EmailMessage[]) {
  const header = ["Folder", "Subject", "From", "Company", "Branch", "Date", "Status", "Labels", "Linked Module", "Linked Doc"];
  const csvRows = [header.join(",")];
  for (const row of rows) {
    csvRows.push(
      [
        row.folder,
        row.subject,
        row.senderName,
        row.companyName,
        row.branchName,
        row.createdAt,
        row.status,
        row.labels.join("; "),
        row.linkedModule ?? "",
        row.linkedDocumentNo ?? ""
      ]
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    );
  }
  return csvRows.join("\r\n");
}

function folderIcon(folder: EmailFolder) {
  switch (folder) {
    case "inbox":
      return Inbox;
    case "sent":
      return Send;
    case "draft":
      return Pencil;
    case "trash":
      return Trash2;
    case "spam":
      return ShieldAlert;
    case "attachments":
      return Paperclip;
    case "notifications":
      return MessageSquareText;
  }
}

const providerOptions = [
  { value: "email", label: "Outlook / Gmail / M365", keywords: "outlook gmail microsoft 365 email" },
  { value: "whatsapp", label: "WhatsApp", keywords: "whatsapp" },
  { value: "internal", label: "ERP Internal Messaging", keywords: "internal erp messaging" },
  { value: "notifications", label: "ERP Notifications", keywords: "notifications alerts" }
];

const folderLabels: Record<EmailFolder, string> = {
  inbox: "Inbox",
  sent: "Sent",
  draft: "Draft",
  trash: "Trash",
  spam: "Spam",
  attachments: "Attachments",
  notifications: "ERP Notifications"
};

const channelLabels: Record<EmailChannel, { title: string; subtitle: string }> = {
  email: { title: "Email Management", subtitle: "Global ERP email dashboard with company, country, and branch communication." },
  whatsapp: { title: "WhatsApp Management", subtitle: "ERP-connected chat and delivery communication." },
  internal: { title: "Internal Messaging", subtitle: "Internal ERP communication and workflow notes." },
  notifications: { title: "Notification Center", subtitle: "ERP alerts, approvals, and audit-driven notifications." }
};

export function EmailManagementWorkspace({ channel }: { channel: EmailChannel }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmailReportResponse | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [companyId, setCompanyId] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [provider, setProvider] = useState("all");
  const [label, setLabel] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeFolder, setComposeFolder] = useState<"draft" | "sent">("sent");
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeProvider, setComposeProvider] = useState("ERP Internal Messaging");
  const [composeLabels, setComposeLabels] = useState("");
  const [saving, setSaving] = useState(false);
  const [compactList, setCompactList] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiGet<EmailReportResponse>(`/api/erp/messages?channel=${channel}`);
        if (!cancelled) {
          setData(res);
          const firstInbox = res.rows.find((row) => row.folder === "inbox") ?? res.rows[0] ?? null;
          setSelectedId(firstInbox?.id ?? null);
          const inboxFolder = res.folders.find((folderItem) => folderItem.key === "inbox");
          if (inboxFolder && inboxFolder.count === 0 && res.rows.length) {
            setSelectedFolder(res.rows[0].folder);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load email workspace");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channel]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    return rows.filter((row) => {
      if (row.folder !== selectedFolder && selectedFolder !== "attachments") {
        if (selectedFolder === "inbox" && row.folder !== "inbox" && row.folder !== "notifications") return false;
        if (selectedFolder === "sent" && row.folder !== "sent") return false;
        if (selectedFolder === "draft" && row.folder !== "draft") return false;
        if (selectedFolder === "trash" && row.folder !== "trash") return false;
        if (selectedFolder === "spam" && row.folder !== "spam") return false;
        if (selectedFolder === "notifications" && row.folder !== "notifications") return false;
      }
      if (companyId !== "all" && row.companyFilterKey !== companyId) return false;
      if (branchId !== "all" && row.branchFilterKey !== branchId) return false;
      if (provider !== "all" && row.provider !== provider) return false;
      if (label !== "all" && !row.labels.includes(label)) return false;
      if (fromDate && row.createdAt.slice(0, 10) < fromDate) return false;
      if (toDate && row.createdAt.slice(0, 10) > toDate) return false;
      if (!query) return true;
      return matchesText(
        [row.subject, row.preview, row.body, row.senderName, row.recipientSummary, row.ccSummary, row.companyName, row.branchName, row.branchType, row.provider, row.labels.join(" ")]
          .filter(Boolean)
          .join(" "),
        query
      );
    });
  }, [branchId, companyId, data?.rows, fromDate, label, provider, query, selectedFolder, toDate]);

  useEffect(() => {
    if (!selectedId && filteredRows.length) setSelectedId(filteredRows[0]!.id);
    if (selectedId && !filteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(filteredRows[0]?.id ?? null);
    }
  }, [filteredRows, selectedId]);

  const selected = useMemo(() => filteredRows.find((row) => row.id === selectedId) ?? filteredRows[0] ?? null, [filteredRows, selectedId]);

  const summary = data?.summary ?? { totalMessages: 0, inbox: 0, sent: 0, drafts: 0, notifications: 0, attachments: 0, providers: 4 };

  function openCompose() {
    setComposeFolder("sent");
    setComposeTo(selected?.senderName ?? "");
    setComposeCc("");
    setComposeSubject(selected ? `Re: ${selected.subject}` : "");
    setComposeBody(selected ? `\n\n---\n${selected.body}` : "");
    setComposeProvider(selected?.provider ?? "ERP Internal Messaging");
    setComposeLabels(selected?.labels.join(", ") ?? "ERP, Email");
    setComposeOpen(true);
  }

  function openReplyAll() {
    setComposeFolder("sent");
    setComposeTo(selected ? `${selected.senderName}${selected.senderEmail ? ` <${selected.senderEmail}>` : ""}` : "");
    setComposeCc(selected?.ccSummary ?? "");
    setComposeSubject(selected ? `Re: ${selected.subject}` : "");
    setComposeBody(selected ? `\n\n---\n${selected.body}` : "");
    setComposeProvider(selected?.provider ?? "ERP Internal Messaging");
    setComposeLabels(selected?.labels.join(", ") ?? "ERP, Email");
    setComposeOpen(true);
  }

  function openForward() {
    setComposeFolder("sent");
    setComposeTo("");
    setComposeCc("");
    setComposeSubject(selected ? `Fwd: ${selected.subject}` : "");
    setComposeBody(selected ? `\n\n--- Forwarded message ---\nFrom: ${selected.senderName}\nDate: ${formatDateTime(selected.createdAt)}\nSubject: ${selected.subject}\n\n${selected.body}` : "");
    setComposeProvider(selected?.provider ?? "ERP Internal Messaging");
    setComposeLabels(selected?.labels.join(", ") ?? "ERP, Email");
    setComposeOpen(true);
  }

  async function saveCompose(folder: "draft" | "sent") {
    try {
      setSaving(true);
      await apiPost<{ id: string }>("/api/erp/messages", {
        channel,
        folder,
        provider: composeProvider,
        to: composeTo,
        cc: composeCc,
        subject: composeSubject,
        body: composeBody,
        companyId: selected?.companyId ?? null,
        countryId: null,
        countryBranchId: selected?.branchType === "Main Branch" ? selected.branchId : null,
        cityBranchId: selected?.branchType === "City Branch" ? selected.branchId : null,
        linkedRoute: selected?.linkedRoute ?? null,
        linkedModule: selected?.linkedModule ?? null,
        labels: composeLabels
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setComposeOpen(false);
      const refreshed = await apiGet<EmailReportResponse>(`/api/erp/messages?channel=${channel}`);
      setData(refreshed);
      setSelectedFolder(folder === "draft" ? "draft" : selectedFolder);
    } finally {
      setSaving(false);
    }
  }

  function printWorkspace() {
    window.print();
  }

  function exportCsv() {
    if (!filteredRows.length) return;
    downloadText(`email-workspace-${new Date().toISOString().slice(0, 10)}.csv`, emailToCsv(filteredRows), "text/csv;charset=utf-8");
  }

  function exportPdf() {
    window.print();
  }

  function openInErp() {
    if (selected?.linkedRoute) window.location.href = selected.linkedRoute;
  }

  function downloadAttachmentSummary() {
    if (!selected) return;
    const payload = {
      message: selected.subject,
      attachments: selected.attachmentCount,
      linkedModule: selected.linkedModule,
      linkedDocumentNo: selected.linkedDocumentNo
    };
    downloadText(`attachments-${selected.id}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function onSelectedFolder(folder: EmailFolder) {
    setSelectedFolder(folder);
    setSelectedId(null);
  }

  return (
    <div className="space-y-4">
      <ReportPageHeader
        title={channelLabels[channel].title}
        subtitle={channelLabels[channel].subtitle}
        actions={
          <>
            <Button type="button" className="h-9 rounded-lg px-3" onClick={openCompose}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Compose
            </Button>
            <ReportActionsMenu disabled={loading} onPrint={printWorkspace} onPdf={exportPdf} onExcel={exportCsv} ariaLabel="Email workspace actions" />
            <ReportFilterMenu ariaLabel="Email workspace filters" disabled={loading}>
              <div className="border-b bg-muted/10 px-3 py-2 text-sm font-semibold">Email Filters</div>
              <div className="space-y-3 p-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input className="h-9 pl-9 text-xs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subject, sender, branch, label..." />
                  </div>
                </div>

                <SearchSelect
                  label="Company"
                  value={companyId}
                  options={[{ value: "all", label: "All Companies", keywords: "all companies" }, ...(data?.filters.companies ?? [])]}
                  placeholder="All companies"
                  onValueChange={setCompanyId}
                  disabled={loading}
                />

                <SearchSelect
                  label="Branch"
                  value={branchId}
                  options={[{ value: "all", label: "All Branches", keywords: "all branches" }, ...(data?.filters.branches ?? [])]}
                  placeholder="All branches"
                  onValueChange={setBranchId}
                  disabled={loading}
                />

                <SearchSelect
                  label="Provider"
                  value={provider}
                  options={[{ value: "all", label: "All Providers", keywords: "all providers" }, ...(data?.filters.providers ?? providerOptions)]}
                  placeholder="All providers"
                  onValueChange={setProvider}
                  disabled={loading}
                />

                <SearchSelect
                  label="Label"
                  value={label}
                  options={[{ value: "all", label: "All Labels", keywords: "all labels" }, ...(data?.filters.labels ?? [])]}
                  placeholder="All labels"
                  onValueChange={setLabel}
                  disabled={loading}
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">From Date</Label>
                    <Input type="date" className="h-9 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">To Date</Label>
                    <Input type="date" className="h-9 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    setQuery("");
                    setCompanyId("all");
                    setBranchId("all");
                    setProvider("all");
                    setLabel("all");
                    setFromDate("");
                    setToDate("");
                    setSelectedFolder("inbox");
                    setSelectedId(null);
                  }}>
                    Reset
                  </Button>
                </div>
              </div>
            </ReportFilterMenu>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard icon={Inbox} label="Inbox" value={summary.inbox} />
        <MetricCard icon={Send} label="Sent" value={summary.sent} />
        <MetricCard icon={Pencil} label="Drafts" value={summary.drafts} />
        <MetricCard icon={MessageSquareText} label="ERP Notifications" value={summary.notifications} />
        <MetricCard icon={Paperclip} label="Attachments" value={summary.attachments} />
        <MetricCard icon={Globe2} label="Providers" value={summary.providers} />
      </section>

      {error ? (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1.2fr)_380px]">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div>
              <div className="text-sm font-semibold text-foreground">Folders</div>
              <p className="text-xs text-muted-foreground">Global communication and ERP notifications.</p>
            </div>
            <div className="space-y-1">
              {data?.folders.map((folder) => {
                const Icon = folderIcon(folder.key);
                const active = selectedFolder === folder.key;
                return (
                  <button
                    key={folder.key}
                    type="button"
                    onClick={() => onSelectedFolder(folder.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                      active ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-muted/60"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden />
                      {folder.label}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{folder.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t pt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Labels</div>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              <div className="space-y-1">
                {(data?.filters.labels ?? []).slice(0, 8).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLabel(opt.value)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="truncate">{opt.label}</span>
                    {label === opt.value ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="space-y-4 p-0">
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search emails, notifications, companies, branches..."
                    className="h-10 rounded-lg pl-9"
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCompactList((value) => !value)}>
                  {compactList ? "Comfort" : "Compact"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={openCompose}>
                  <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
                  New Message
                </Button>
              </div>
            </div>

            <div className="px-4">
              <div className="grid gap-2 border-b py-3 sm:grid-cols-2 lg:grid-cols-4">
                {providerOptions.map((option) => {
                  const active = provider === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProvider((current) => (current === option.value ? "all" : option.value))}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                        active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/60"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {active ? <Check className="h-4 w-4" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="divide-y overflow-hidden max-h-[760px]">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading email workspace...</div>
              ) : filteredRows.length ? (
                filteredRows.map((row) => {
                  const active = selected?.id === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 text-left transition hover:bg-muted/40",
                        compactList ? "py-2" : "py-3",
                        active ? "bg-muted/60" : ""
                      )}
                    >
                      <div className={cn("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", row.isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                        <Mail className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{row.subject}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {row.senderName} · {row.companyName}
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{row.preview}</span>
                          {row.labels.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full border px-2 py-0.5 text-[11px]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {row.attachmentCount ? <Paperclip className="mt-1 h-4 w-4 text-muted-foreground" aria-hidden /> : null}
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No email records found for the selected filters.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="space-y-4 p-4">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-foreground">{selected.subject}</h2>
                      {selected.isUnread ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Unread</span> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{selected.senderName} · {selected.companyName} · {selected.branchName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={printWorkspace}>
                      <Printer className="h-4 w-4" aria-hidden />
                    </Button>
                    <EmailActionsMenu
                      onReply={openCompose}
                      onReplyAll={openReplyAll}
                      onForward={openForward}
                      onPrint={printWorkspace}
                      onDownload={downloadAttachmentSummary}
                      onOpenInErp={openInErp}
                      onLinkDocument={() => setComposeOpen(true)}
                      onCreatePurchaseOrder={() => (window.location.href = "/dashboard/purchase/purchase-order")}
                      onCreateInvoice={() => (window.location.href = "/dashboard/sales/sales-order")}
                      onCreatePayment={() => (window.location.href = "/dashboard/roznamcha/cash-entry")}
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBlock label="From" value={selected.senderName} />
                    <InfoBlock label="To" value={selected.recipientSummary} />
                    <InfoBlock label="CC" value={selected.ccSummary} />
                    <InfoBlock label="Date" value={formatDateTime(selected.createdAt)} />
                    <InfoBlock label="Company" value={selected.companyName} />
                    <InfoBlock label="Branch" value={`${selected.branchName} · ${selected.branchType}`} />
                  </div>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">Message</div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.body}</p>
                  </div>
                </div>

                {selected.attachmentCount ? (
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">Attachments ({selected.attachmentCount})</div>
                      <Button type="button" variant="outline" size="sm" onClick={downloadAttachmentSummary}>
                        <DownloadActionIcon className="mr-2 h-4 w-4" aria-hidden />
                        Download
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Array.from({ length: Math.max(1, Math.min(4, selected.attachmentCount)) }).map((_, index) => (
                        <div key={`${selected.id}-att-${index}`} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                          <Paperclip className="h-4 w-4 text-primary" aria-hidden />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">Attachment {index + 1}</div>
                            <div className="text-xs text-muted-foreground">{selected.provider}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">Linked ERP Information</div>
                    <Button type="button" variant="outline" size="sm" onClick={openInErp} disabled={!selected.linkedRoute}>
                      <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                      Open in ERP
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBlock label="Module" value={selected.linkedModule ?? "ERP"} />
                    <InfoBlock label="Document No." value={selected.linkedDocumentNo ?? "-"} />
                    <InfoBlock label="Provider" value={selected.provider} />
                    <InfoBlock label="Status" value={selected.status.toUpperCase()} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={openCompose}>
                    <Reply className="mr-2 h-4 w-4" aria-hidden />
                    Reply
                  </Button>
                  <Button type="button" variant="outline" onClick={openReplyAll}>
                    <ReplyAll className="mr-2 h-4 w-4" aria-hidden />
                    Reply All
                  </Button>
                  <Button type="button" variant="outline" onClick={openForward}>
                    <ArrowLeftRight className="mr-2 h-4 w-4" aria-hidden />
                    Forward
                  </Button>
                  <Button type="button" variant="outline" onClick={openInErp} disabled={!selected.linkedRoute}>
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                    Open in ERP
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid min-h-[560px] place-items-center text-center">
                <div className="max-w-sm space-y-3">
                  <MailOpen className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
                  <div className="text-lg font-semibold text-foreground">Select an email thread</div>
                  <p className="text-sm text-muted-foreground">Open an ERP communication, notification, or draft to inspect the full linked document history.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {composeOpen ? (
        <SimpleModal title={composeFolder === "draft" ? "Save Draft" : "Compose Message"} onClose={() => setComposeOpen(false)} className="max-w-4xl">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="To" value={composeTo} onChange={setComposeTo} placeholder="recipient@company.com" />
                <Field label="CC" value={composeCc} onChange={setComposeCc} placeholder="cc@company.com" />
              </div>
              <Field label="Subject" value={composeSubject} onChange={setComposeSubject} placeholder="Email subject" />
              <div className="space-y-1.5">
                <Label>Body</Label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="min-h-64 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Write the email body..."
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="text-sm font-semibold text-foreground">ERP Mail Settings</div>
              <div className="space-y-2">
                <Label className="text-[11px] text-muted-foreground">Provider</Label>
                <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" value={composeProvider} onChange={(e) => setComposeProvider(e.target.value)}>
                  <option value="Outlook">Outlook</option>
                  <option value="Gmail">Gmail</option>
                  <option value="Microsoft 365">Microsoft 365</option>
                  <option value="ERP Internal Messaging">ERP Internal Messaging</option>
                </select>
              </div>
              <Field label="Labels" value={composeLabels} onChange={setComposeLabels} placeholder="ERP, Purchase, Payment" />
              <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">Linked ERP document</div>
                <div className="mt-1">{selected?.linkedModule ?? "ERP"}</div>
                <div>{selected?.linkedDocumentNo ?? "-"}</div>
              </div>
              <div className="space-y-2">
                <Button type="button" className="w-full" disabled={saving} onClick={() => saveCompose("sent")}>
                  <Send className="mr-2 h-4 w-4" aria-hidden />
                  Send
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled={saving} onClick={() => saveCompose("draft")}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Save Draft
                </Button>
              </div>
            </div>
          </div>
        </SimpleModal>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value || "-"}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EmailActionsMenu({
  onReply,
  onReplyAll,
  onForward,
  onPrint,
  onDownload,
  onOpenInErp,
  onLinkDocument,
  onCreatePurchaseOrder,
  onCreateInvoice,
  onCreatePayment
}: {
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onOpenInErp: () => void;
  onLinkDocument: () => void;
  onCreatePurchaseOrder: () => void;
  onCreateInvoice: () => void;
  onCreatePayment: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onMouseDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  function action(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div ref={rootRef} className="relative">
      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setOpen((current) => !current)}>
        <MoreVertical className="h-4 w-4" aria-hidden />
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-lg border bg-background shadow-lg">
          <ActionRow icon={Reply} label="Reply" onClick={() => action(onReply)} />
          <ActionRow icon={ReplyAll} label="Reply All" onClick={() => action(onReplyAll)} />
          <ActionRow icon={ArrowLeftRight} label="Forward" onClick={() => action(onForward)} />
          <ActionRow icon={Printer} label="Print" onClick={() => action(onPrint)} />
          <ActionRow icon={Paperclip} label="Download Attachment" onClick={() => action(onDownload)} />
          <ActionRow icon={ExternalLink} label="Open in ERP" onClick={() => action(onOpenInErp)} />
          <ActionRow icon={Link2} label="Link ERP Document" onClick={() => action(onLinkDocument)} />
          <ActionRow icon={FilePlus2} label="Create Purchase Order" onClick={() => action(onCreatePurchaseOrder)} />
          <ActionRow icon={FilePlus2} label="Create Invoice" onClick={() => action(onCreateInvoice)} />
          <ActionRow icon={FilePlus2} label="Create Payment" onClick={() => action(onCreatePayment)} />
        </div>
      ) : null}
    </div>
  );
}

function ActionRow({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
