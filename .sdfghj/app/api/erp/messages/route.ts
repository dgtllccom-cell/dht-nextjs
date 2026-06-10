import { NextRequest } from "next/server";
import { z } from "zod";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  channel: z.enum(["email", "whatsapp", "internal", "notifications"]).default("email")
});

const composeSchema = z.object({
  channel: z.enum(["email", "whatsapp", "internal", "notifications"]).default("email"),
  folder: z.enum(["draft", "sent"]).default("sent"),
  provider: z.string().trim().min(1).max(80).optional(),
  to: z.string().trim().max(500).optional(),
  cc: z.string().trim().max(500).optional(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  companyId: z.string().uuid().nullable().optional(),
  countryId: z.string().uuid().nullable().optional(),
  countryBranchId: z.string().uuid().nullable().optional(),
  cityBranchId: z.string().uuid().nullable().optional(),
  linkedRoute: z.string().trim().max(255).optional(),
  linkedModule: z.string().trim().max(80).optional(),
  labels: z.array(z.string().trim().min(1).max(50)).optional()
});

type AuditRow = {
  id: string;
  company_id: string | null;
  actor_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
};

type DraftPurchaseOrderRow = {
  id: string;
  purchase_order_no: string;
  purchase_contract_no: string | null;
  country_id: string | null;
  country_branch_id: string | null;
  city_branch_id: string | null;
  supplier_company_id: string | null;
  companies: { name: string | null } | { name: string | null }[] | null;
  currency_code: string;
  exchange_rate: string | number;
  order_total: string | number;
  payment_status: string | null;
  ledger_posting_status: string | null;
  created_at: string;
  updated_at: string;
};

type DraftJournalEntryRow = {
  id: string;
  entry_no: string;
  company_id: string | null;
  branch_id: string | null;
  status: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type DraftTransactionRow = {
  id: string;
  transaction_no: string;
  country_id: string | null;
  city_branch_id: string | null;
  status: string | null;
  description: string | null;
  local_currency: string;
  local_amount: string | number;
  created_at: string;
  updated_at: string;
};

type DraftRoznamchaRow = {
  id: string;
  journal_no: string | null;
  voucher_no: string | null;
  country_id: string | null;
  country_branch_id: string | null;
  city_branch_id: string | null;
  type: string | null;
  status: string | null;
  narration: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  user_code: string | null;
  default_company_id: string | null;
};

type SimpleRow = { id: string; name: string | null };

type CountryRow = { id: string; name: string; iso2: string | null };
type CountryBranchRow = { id: string; name: string; code: string; country_id: string; local_currency: string; status: string };
type CityBranchRow = { id: string; name: string; code: string; city_name: string; country_id: string; country_branch_id: string; local_currency: string; status: string };

type MessageFolder = "inbox" | "sent" | "draft" | "trash" | "spam" | "attachments" | "notifications";

type MessageRow = {
  id: string;
  folder: MessageFolder;
  channel: "email" | "whatsapp" | "internal" | "notifications";
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

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function titleCase(input: string) {
  return input
    .split(/[_\-. ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function messageFolderFor(action: string, after: any): MessageFolder {
  const folder = String(after?.folder ?? "").toLowerCase();
  if (folder === "draft") return "draft";
  if (folder === "trash") return "trash";
  if (folder === "spam") return "spam";
  if (folder === "attachments") return "attachments";
  if (folder === "notifications") return "notifications";
  if (action.startsWith("message.draft")) return "draft";
  if (action.startsWith("message.send") || action.startsWith("message.reply") || action.startsWith("message.forward")) return "sent";
  if (action.startsWith("message.trash")) return "trash";
  if (action.startsWith("message.spam")) return "spam";
  if (action.startsWith("erp.notification") || action.startsWith("auth.login") || action.startsWith("users.") || action.startsWith("companies.") || action.startsWith("countries.") || action.startsWith("country_branches.") || action.startsWith("city_branches.") || action.startsWith("accounts.") || action.startsWith("journal_entries.") || action.startsWith("transactions.") || action.startsWith("purchases.") || action.startsWith("roznamcha.") || action.startsWith("approvals.")) {
    return "inbox";
  }
  return "notifications";
}

function messageStatus(folder: MessageFolder, action: string) {
  if (folder === "draft") return "draft" as const;
  if (action.startsWith("message.send")) return "sent" as const;
  return "received" as const;
}

function deriveLinkedRoute(entityTable: string, sourceTable: string) {
  const table = (entityTable || sourceTable || "").toLowerCase();
  if (table.includes("purchase_order")) return "/dashboard/purchase/purchase-order";
  if (table.includes("purchase")) return "/dashboard/purchase/purchase-order";
  if (table.includes("roznamcha")) return "/dashboard/roznamcha/super-admin";
  if (table.includes("journal")) return "/dashboard/ledger/super-admin";
  if (table.includes("transaction")) return "/dashboard/ledger/branch";
  if (table.includes("user")) return "/dashboard/new-entry/users/registration";
  if (table.includes("country_branch") || table.includes("city_branch") || table.includes("branch")) return "/dashboard/branch-management/general-report";
  if (table.includes("company")) return "/dashboard/settings/company";
  if (table.includes("customer")) return "/dashboard/settings/customers";
  if (table.includes("attachment")) return "/dashboard/documents";
  return null;
}

function deriveLinkedModule(entityTable: string, sourceTable: string) {
  const table = (entityTable || sourceTable || "").toLowerCase();
  if (table.includes("purchase")) return "Purchase";
  if (table.includes("roznamcha")) return "Roznamcha";
  if (table.includes("journal")) return "Ledger";
  if (table.includes("transaction")) return "Payments";
  if (table.includes("user")) return "Users";
  if (table.includes("country_branch") || table.includes("city_branch") || table.includes("branch")) return "Branch";
  if (table.includes("company")) return "Company";
  if (table.includes("customer")) return "Customer";
  return "ERP";
}

function deriveSubject(action: string, entityTable: string, after: any, before: any, fallbackNo?: string | null) {
  const subject = safeText(after?.subject || after?.title || after?.name || after?.message || before?.subject || before?.title || before?.name);
  if (subject) return subject;

  const docNo = safeText(
    after?.documentNo ||
      after?.document_no ||
      after?.purchase_order_no ||
      after?.journal_no ||
      after?.voucher_no ||
      after?.entry_no ||
      after?.transaction_no ||
      fallbackNo
  );
  if (docNo) return `${titleCase(entityTable || action)} ${docNo}`.trim();
  return titleCase(action.replace(/^message\./, "").replace(/^erp\.notification\./, "")) || titleCase(entityTable || "Message");
}

function derivePreview(action: string, entityTable: string, after: any, before: any) {
  const preview = safeText(after?.preview || after?.body || after?.description || after?.narration || after?.memo || before?.preview || before?.body || before?.description || before?.narration || before?.memo);
  if (preview) return preview.slice(0, 220);
  return `ERP ${titleCase(entityTable || action)} activity recorded at ${new Date().toLocaleString()}`;
}

function scopeLabel(countryId: string | null, countryName: string | null, branchType: string, branchName: string) {
  if (branchType && branchType !== "Global") return `${countryName ?? "Country"} / ${branchName}`;
  if (countryId) return countryName ?? "Country";
  return "Global";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const query = querySchema.parse({
      channel: request.nextUrl.searchParams.get("channel") ?? undefined
    });

    const admin = createSupabaseAdminClient() as any;

    const [profileRes, auditRes, purchaseDraftsRes, journalDraftsRes, transactionDraftsRes, roznamchaDraftsRes, attachmentRes, companiesRes, countriesRes, countryBranchesRes, cityBranchesRes] =
      await Promise.all([
        admin.from("profiles").select("id, full_name, user_code, default_company_id").eq("id", session.userId).maybeSingle(),
        admin.from("audit_logs").select("id, company_id, actor_id, action, entity_table, entity_id, before, after, created_at").order("created_at", { ascending: false }).limit(400),
        admin
          .from("purchase_orders")
          .select("id, purchase_order_no, purchase_contract_no, country_id, country_branch_id, city_branch_id, supplier_company_id, companies(name), currency_code, exchange_rate, order_total, payment_status, ledger_posting_status, created_at, updated_at")
          .in("ledger_posting_status", ["draft", "pending"])
          .order("created_at", { ascending: false })
          .limit(40),
        admin
          .from("journal_entries")
          .select("id, entry_no, company_id, branch_id, status, memo, created_at, updated_at")
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(30),
        admin
          .from("transactions")
          .select("id, transaction_no, country_id, city_branch_id, status, description, local_currency, local_amount, created_at, updated_at")
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(30),
        admin
          .from("roznamcha_entries")
          .select("id, journal_no, voucher_no, country_id, country_branch_id, city_branch_id, type, status, narration, created_at, updated_at")
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(30),
        admin.from("attachments").select("id, company_id, owner_table, owner_id, bucket, path, created_at").order("created_at", { ascending: false }).limit(100),
        admin.from("companies").select("id, name").order("name", { ascending: true }),
        admin.from("countries").select("id, name, iso2").order("name", { ascending: true }),
        admin.from("country_branches").select("id, name, code, country_id, local_currency, status").order("name", { ascending: true }),
        admin.from("city_branches").select("id, name, code, city_name, country_id, country_branch_id, local_currency, status").order("city_name", { ascending: true })
      ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (auditRes.error) throw new Error(auditRes.error.message);
    if (purchaseDraftsRes.error) throw new Error(purchaseDraftsRes.error.message);
    if (journalDraftsRes.error) throw new Error(journalDraftsRes.error.message);
    if (transactionDraftsRes.error) throw new Error(transactionDraftsRes.error.message);
    if (roznamchaDraftsRes.error) throw new Error(roznamchaDraftsRes.error.message);
    if (attachmentRes.error) throw new Error(attachmentRes.error.message);
    if (companiesRes.error) throw new Error(companiesRes.error.message);
    if (countriesRes.error) throw new Error(countriesRes.error.message);
    if (countryBranchesRes.error) throw new Error(countryBranchesRes.error.message);
    if (cityBranchesRes.error) throw new Error(cityBranchesRes.error.message);

    const profile = profileRes.data as ProfileRow | null;
    const defaultCompanyId = profile?.default_company_id ?? null;
    const auditRows = (auditRes.data ?? []) as AuditRow[];
    const auditActorIds = [...new Set(auditRows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
    const draftActorIds = [
      ...(journalDraftsRes.data ?? []).map((row: DraftJournalEntryRow) => row.company_id ?? null),
      ...(purchaseDraftsRes.data ?? []).map((row: DraftPurchaseOrderRow) => row.supplier_company_id ?? null)
    ].filter((id): id is string => Boolean(id));
    const profileIds = [...new Set([...auditActorIds, ...draftActorIds])];

    const actorProfilesRes =
      profileIds.length > 0
        ? await admin.from("profiles").select("id, full_name, user_code").in("id", profileIds)
        : { data: [], error: null };
    if ((actorProfilesRes as any).error) throw new Error((actorProfilesRes as any).error.message);

    const actorProfiles = ((actorProfilesRes as any).data ?? []) as ProfileRow[];
    const actorLookup = new Map(actorProfiles.map((row) => [row.id, row] as const));
    const companyLookup = new Map(((companiesRes.data ?? []) as SimpleRow[]).map((row) => [row.id, row] as const));
    const countryLookup = new Map(((countriesRes.data ?? []) as CountryRow[]).map((row) => [row.id, row] as const));
    const countryBranchLookup = new Map(((countryBranchesRes.data ?? []) as CountryBranchRow[]).map((row) => [row.id, row] as const));
    const cityBranchLookup = new Map(((cityBranchesRes.data ?? []) as CityBranchRow[]).map((row) => [row.id, row] as const));

    const rows: MessageRow[] = [];

    const includeCompany = (companyId: string | null) => {
      if (session.isSuperAdmin) return true;
      if (!defaultCompanyId) return true;
      return !companyId || companyId === defaultCompanyId;
    };

    const attachments = ((attachmentRes.data ?? []) as Array<{ id: string; company_id: string | null; owner_table: string; owner_id: string; bucket: string; path: string; created_at: string }>).filter((row) => includeCompany(row.company_id));
    const attachmentCountByOwner = new Map<string, number>();
    for (const attachment of attachments) {
      attachmentCountByOwner.set(attachment.owner_id, (attachmentCountByOwner.get(attachment.owner_id) ?? 0) + 1);
    }

    for (const row of auditRows) {
      if (!includeCompany(row.company_id)) continue;

      const after = (row.after ?? {}) as any;
      const before = (row.before ?? {}) as any;
      const folder = messageFolderFor(row.action, after);
      const companyId = (row.company_id ?? after?.companyId ?? after?.company_id ?? null) as string | null;
      const companyName = companyId ? companyLookup.get(companyId)?.name ?? "Company" : "Global";
      const countryId = (after?.countryId ?? after?.country_id ?? null) as string | null;
      const countryBranchId = (after?.countryBranchId ?? after?.country_branch_id ?? null) as string | null;
      const cityBranchId = (after?.cityBranchId ?? after?.city_branch_id ?? null) as string | null;
      const countryName = countryId ? countryLookup.get(countryId)?.name ?? null : null;
      const countryBranch = countryBranchId ? countryBranchLookup.get(countryBranchId) ?? null : null;
      const cityBranch = cityBranchId ? cityBranchLookup.get(cityBranchId) ?? null : null;
      const branchType = cityBranchId ? "City Branch" : countryBranchId ? "Main Branch" : countryId ? "Country" : "Global";
      const branchName = cityBranchId
        ? `${cityBranch?.city_name ?? cityBranch?.name ?? "City"} - ${cityBranch?.name ?? "Branch"}`
        : countryBranchId
          ? countryBranch?.name ?? "Main Branch"
          : countryId
            ? countryName ?? "Country"
            : "Global";
      const actor = row.actor_id ? actorLookup.get(row.actor_id) ?? null : null;
      const senderName =
        row.actor_id === session.userId
          ? profile?.full_name ?? profile?.user_code ?? session.fullName ?? session.email ?? "You"
          : actor?.full_name ?? (row.actor_id ? `User ${row.actor_id.slice(0, 8)}` : "ERP System");
      const recipients = normalizeStringArray(after?.to).concat(normalizeStringArray(after?.recipients));
      const cc = normalizeStringArray(after?.cc);
      const subject = deriveSubject(row.action, row.entity_table, after, before, row.entity_id);
      const preview = derivePreview(row.action, row.entity_table, after, before);
      const body = safeText(after?.body || after?.message || after?.description || after?.narration || after?.memo || preview);
      const linkedModule = deriveLinkedModule(row.entity_table, row.entity_table);
      const linkedRoute = after?.linkedRoute ? String(after.linkedRoute) : deriveLinkedRoute(row.entity_table, row.entity_table);
      const linkedDocumentNo = safeText(
        after?.documentNo || after?.document_no || after?.purchase_order_no || after?.entry_no || after?.transaction_no || after?.voucher_no || after?.journal_no || row.entity_id
      ) || null;
      const labels = uniqueStrings([
        ...(Array.isArray(after?.labels) ? after.labels.map((label: unknown) => (typeof label === "string" ? label : "")).filter(Boolean) : []),
        titleCase(row.entity_table),
        linkedModule,
        branchType !== "Global" ? branchType : null
      ]);

      rows.push({
        id: `audit:${row.id}`,
        folder,
        channel: query.channel,
        provider: safeText(after?.provider || "ERP Internal Messaging") || "ERP Internal Messaging",
        subject,
        preview,
        body,
        senderName,
        senderEmail: row.actor_id === session.userId ? session.email : null,
        recipientSummary: recipients.length ? recipients.join(", ") : (after?.recipientSummary ? String(after.recipientSummary) : "-"),
        ccSummary: cc.length ? cc.join(", ") : (after?.ccSummary ? String(after.ccSummary) : "-"),
        companyId,
        companyName,
        branchId: cityBranchId ?? countryBranchId ?? countryId,
        branchName,
        branchType,
        createdAt: row.created_at,
        status: messageStatus(folder, row.action),
        isUnread: folder === "inbox" || folder === "notifications",
        labels,
        attachmentCount: Array.isArray(after?.attachments) ? after.attachments.length : attachmentCountByOwner.get(row.id) ?? 0,
        linkedModule,
        linkedRoute,
        linkedDocumentNo,
        sourceTable: row.entity_table,
        sourceId: row.entity_id,
        action: row.action,
        companyFilterKey: companyId ?? "global",
        branchFilterKey: branchIdKey(cityBranchId, countryBranchId, countryId)
      });
    }

    const purchaseDrafts = ((purchaseDraftsRes.data ?? []) as DraftPurchaseOrderRow[]).filter((row) => includeCompany(row.supplier_company_id));
    for (const row of purchaseDrafts) {
      const companyId = row.supplier_company_id ?? null;
      const companyName = companyId ? companyLookup.get(companyId)?.name ?? "Supplier" : "Supplier";
      const countryId = row.country_id ?? null;
      const countryBranchId = row.country_branch_id ?? null;
      const cityBranchId = row.city_branch_id ?? null;
      const countryName = countryId ? countryLookup.get(countryId)?.name ?? null : null;
      const countryBranch = countryBranchId ? countryBranchLookup.get(countryBranchId) ?? null : null;
      const cityBranch = cityBranchId ? cityBranchLookup.get(cityBranchId) ?? null : null;
      rows.push({
        id: `purchase:${row.id}`,
        folder: "draft",
        channel: query.channel,
        provider: "ERP Internal Messaging",
        subject: `Draft Purchase Order ${row.purchase_order_no}`,
        preview: `Purchase total ${row.currency_code} ${String(row.order_total)} · ${row.payment_status ?? "draft"} · ${row.ledger_posting_status ?? "draft"}`,
        body: `Purchase Contract: ${row.purchase_contract_no ?? "-"}\nCurrency: ${row.currency_code}\nExchange Rate: ${row.exchange_rate}\nOrder Total: ${row.order_total}`,
        senderName: profile?.full_name ?? profile?.user_code ?? session.fullName ?? session.email ?? "You",
        senderEmail: session.email,
        recipientSummary: companyName,
        ccSummary: "-",
        companyId,
        companyName,
        branchId: cityBranchId ?? countryBranchId ?? countryId,
        branchName: cityBranchId
          ? `${cityBranch?.city_name ?? cityBranch?.name ?? "City"} - ${cityBranch?.name ?? "Branch"}`
          : countryBranchId
            ? countryBranch?.name ?? "Main Branch"
            : countryName ?? "Country",
        branchType: cityBranchId ? "City Branch" : countryBranchId ? "Main Branch" : countryId ? "Country" : "Global",
        createdAt: row.created_at,
        status: "draft",
        isUnread: false,
        labels: uniqueStrings(["Purchase Order", "Draft", row.payment_status ?? "Pending"]),
        attachmentCount: 0,
        linkedModule: "Purchase",
        linkedRoute: "/dashboard/purchase/purchase-order",
        linkedDocumentNo: row.purchase_order_no,
        sourceTable: "purchase_orders",
        sourceId: row.id,
        action: "purchase_order.draft",
        companyFilterKey: companyId ?? "global",
        branchFilterKey: branchIdKey(cityBranchId, countryBranchId, countryId)
      });
    }

    for (const row of ((journalDraftsRes.data ?? []) as DraftJournalEntryRow[])) {
      if (!includeCompany(row.company_id)) continue;
      const companyId = row.company_id ?? null;
      const companyName = companyId ? companyLookup.get(companyId)?.name ?? "Company" : "Company";
      rows.push({
        id: `journal:${row.id}`,
        folder: "draft",
        channel: query.channel,
        provider: "ERP Internal Messaging",
        subject: `Draft Journal Entry ${row.entry_no}`,
        preview: row.memo ?? `Journal entry ${row.entry_no} is in draft status.`,
        body: row.memo ?? `Journal entry ${row.entry_no} is in draft status.`,
        senderName: profile?.full_name ?? profile?.user_code ?? session.fullName ?? session.email ?? "You",
        senderEmail: session.email,
        recipientSummary: companyName,
        ccSummary: "-",
        companyId,
        companyName,
        branchId: row.branch_id,
        branchName: row.branch_id ? "Branch" : "Global",
        branchType: row.branch_id ? "Branch" : "Global",
        createdAt: row.created_at,
        status: "draft",
        isUnread: false,
        labels: uniqueStrings(["Journal", "Draft"]),
        attachmentCount: 0,
        linkedModule: "Ledger",
        linkedRoute: "/dashboard/ledger/super-admin",
        linkedDocumentNo: row.entry_no,
        sourceTable: "journal_entries",
        sourceId: row.id,
        action: "journal_entries.draft",
        companyFilterKey: companyId ?? "global",
        branchFilterKey: branchIdKey(row.branch_id, null, null)
      });
    }

    for (const row of ((transactionDraftsRes.data ?? []) as DraftTransactionRow[])) {
      if (!includeCompany(null)) continue;
      const countryId = row.country_id ?? null;
      const cityBranchId = row.city_branch_id ?? null;
      const countryName = countryId ? countryLookup.get(countryId)?.name ?? null : null;
      const cityBranch = cityBranchId ? cityBranchLookup.get(cityBranchId) ?? null : null;
      rows.push({
        id: `transaction:${row.id}`,
        folder: "draft",
        channel: query.channel,
        provider: "ERP Internal Messaging",
        subject: `Draft Payment ${row.transaction_no}`,
        preview: `${row.description ?? "Transaction"} · ${row.local_currency} ${String(row.local_amount)}`,
        body: row.description ?? `Draft payment ${row.transaction_no}`,
        senderName: profile?.full_name ?? profile?.user_code ?? session.fullName ?? session.email ?? "You",
        senderEmail: session.email,
        recipientSummary: countryName ?? "-",
        ccSummary: "-",
        companyId: defaultCompanyId,
        companyName: defaultCompanyId ? companyLookup.get(defaultCompanyId)?.name ?? "Company" : "Company",
        branchId: cityBranchId ?? countryId,
        branchName: cityBranchId ? `${cityBranch?.city_name ?? cityBranch?.name ?? "City"} - ${cityBranch?.name ?? "Branch"}` : countryName ?? "Country",
        branchType: cityBranchId ? "City Branch" : countryId ? "Country" : "Global",
        createdAt: row.created_at,
        status: "draft",
        isUnread: false,
        labels: uniqueStrings(["Payment", "Draft"]),
        attachmentCount: 0,
        linkedModule: "Payments",
        linkedRoute: "/dashboard/roznamcha/cash-entry",
        linkedDocumentNo: row.transaction_no,
        sourceTable: "transactions",
        sourceId: row.id,
        action: "transactions.draft",
        companyFilterKey: defaultCompanyId ?? "global",
        branchFilterKey: branchIdKey(cityBranchId, null, countryId)
      });
    }

    for (const row of ((roznamchaDraftsRes.data ?? []) as DraftRoznamchaRow[])) {
      if (!includeCompany(null)) continue;
      const countryId = row.country_id ?? null;
      const countryBranchId = row.country_branch_id ?? null;
      const cityBranchId = row.city_branch_id ?? null;
      const countryName = countryId ? countryLookup.get(countryId)?.name ?? null : null;
      const countryBranch = countryBranchId ? countryBranchLookup.get(countryBranchId) ?? null : null;
      const cityBranch = cityBranchId ? cityBranchLookup.get(cityBranchId) ?? null : null;
      rows.push({
        id: `roz:${row.id}`,
        folder: "draft",
        channel: query.channel,
        provider: "ERP Internal Messaging",
        subject: `Draft Roznamcha ${row.voucher_no ?? row.journal_no ?? row.id.slice(0, 8)}`,
        preview: row.narration ?? `Roznamcha ${row.type ?? ""} is in draft status.`,
        body: row.narration ?? `Roznamcha entry ${row.voucher_no ?? row.journal_no ?? row.id} is in draft status.`,
        senderName: profile?.full_name ?? profile?.user_code ?? session.fullName ?? session.email ?? "You",
        senderEmail: session.email,
        recipientSummary: countryName ?? "-",
        ccSummary: "-",
        companyId: defaultCompanyId,
        companyName: defaultCompanyId ? companyLookup.get(defaultCompanyId)?.name ?? "Company" : "Company",
        branchId: cityBranchId ?? countryBranchId ?? countryId,
        branchName: cityBranchId
          ? `${cityBranch?.city_name ?? cityBranch?.name ?? "City"} - ${cityBranch?.name ?? "Branch"}`
          : countryBranchId
            ? countryBranch?.name ?? "Main Branch"
            : countryName ?? "Country",
        branchType: cityBranchId ? "City Branch" : countryBranchId ? "Main Branch" : countryId ? "Country" : "Global",
        createdAt: row.created_at,
        status: "draft",
        isUnread: false,
        labels: uniqueStrings(["Roznamcha", "Draft"]),
        attachmentCount: 0,
        linkedModule: "Roznamcha",
        linkedRoute: "/dashboard/roznamcha/super-admin",
        linkedDocumentNo: row.voucher_no ?? row.journal_no,
        sourceTable: "roznamcha_entries",
        sourceId: row.id,
        action: "roznamcha_entries.draft",
        companyFilterKey: defaultCompanyId ?? "global",
        branchFilterKey: branchIdKey(cityBranchId, countryBranchId, countryId)
      });
    }

    const filtered = rows
      .filter((row) => row.channel === query.channel || query.channel === "email")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const summary = {
      totalMessages: filtered.length,
      inbox: filtered.filter((row) => row.folder === "inbox").length,
      sent: filtered.filter((row) => row.folder === "sent").length,
      drafts: filtered.filter((row) => row.folder === "draft").length,
      notifications: filtered.filter((row) => row.folder === "notifications").length,
      attachments: attachments.length,
      providers: 4
    };

    const folders = [
      { key: "inbox", label: "Inbox", count: filtered.filter((row) => row.folder === "inbox").length },
      { key: "sent", label: "Sent", count: filtered.filter((row) => row.folder === "sent").length },
      { key: "draft", label: "Draft", count: filtered.filter((row) => row.folder === "draft").length },
      { key: "trash", label: "Trash", count: filtered.filter((row) => row.folder === "trash").length },
      { key: "spam", label: "Spam", count: filtered.filter((row) => row.folder === "spam").length },
      { key: "attachments", label: "Attachments", count: attachments.length },
      { key: "notifications", label: "ERP Notifications", count: filtered.filter((row) => row.folder === "notifications").length }
    ];

    const companies = uniqueOptions(filtered.map((row) => ({ value: row.companyId ?? "all", label: row.companyName, keywords: [row.companyName, row.senderName, row.recipientSummary].join(" ") }))).sort((a, b) => a.label.localeCompare(b.label));
    const branches = uniqueOptions(filtered.map((row) => ({ value: row.branchId ?? "all", label: row.branchName, keywords: [row.branchName, row.branchType, row.companyName].join(" ") }))).sort((a, b) => a.label.localeCompare(b.label));
    const providers = uniqueOptions(filtered.map((row) => ({ value: row.provider, label: row.provider, keywords: row.provider }))).sort((a, b) => a.label.localeCompare(b.label));
    const labels = uniqueOptions(
      filtered.flatMap((row) => row.labels.map((label) => ({ value: label, label, keywords: label })))
    ).sort((a, b) => a.label.localeCompare(b.label));

    return apiOk({
      channel: query.channel,
      summary,
      folders,
      filters: { companies, branches, providers, labels },
      rows: filtered,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = composeSchema.parse(await request.json());
    const admin = createSupabaseAdminClient() as any;

    const profileRes = await admin.from("profiles").select("id, full_name, user_code, default_company_id").eq("id", session.userId).maybeSingle();
    if (profileRes.error) throw new Error(profileRes.error.message);
    const profile = profileRes.data as ProfileRow | null;

    const payload = {
      channel: body.channel,
      folder: body.folder,
      provider: body.provider ?? "ERP Internal Messaging",
      to: body.to ?? "",
      cc: body.cc ?? "",
      subject: body.subject,
      body: body.body,
      companyId: body.companyId ?? profile?.default_company_id ?? null,
      countryId: body.countryId ?? null,
      countryBranchId: body.countryBranchId ?? null,
      cityBranchId: body.cityBranchId ?? null,
      linkedRoute: body.linkedRoute ?? null,
      linkedModule: body.linkedModule ?? null,
      labels: body.labels ?? [],
      senderUserId: session.userId,
      senderName: session.fullName ?? profile?.full_name ?? session.email ?? "User",
      senderEmail: session.email,
      createdAt: new Date().toISOString()
    };

    const action = body.folder === "draft" ? "message.draft.save" : "message.send";
    const inserted = await admin
      .from("audit_logs")
      .insert({
        company_id: payload.companyId,
        actor_id: session.userId,
        action,
        entity_table: "erp_messages",
        entity_id: null,
        before: null,
        after: payload,
        ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null
      })
      .select("id")
      .single();

    if (inserted.error) throw new Error(inserted.error.message);

    return apiCreated({ id: inserted.data.id as string });
  } catch (error) {
    return handleApiError(error);
  }
}

function branchIdKey(cityBranchId: string | null, countryBranchId: string | null, countryId: string | null) {
  return cityBranchId ?? countryBranchId ?? countryId ?? "global";
}

function uniqueOptions(options: Array<{ value: string; label: string; keywords: string }>) {
  const map = new Map<string, { value: string; label: string; keywords: string }>();
  for (const option of options) {
    if (!map.has(option.value)) map.set(option.value, option);
  }
  return [...map.values()].filter((option) => option.value !== "all");
}
