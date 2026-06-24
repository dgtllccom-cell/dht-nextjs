import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ErpSession } from "@/lib/auth/session";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { multilingualService } from "@/lib/services/multilingual-service";

export type LedgerReportScope = "super_admin" | "country" | "branch";

export type LedgerLookupRow = {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  ledgerCurrency: string;
  normalBalance: "debit" | "credit";
  isActive: boolean;
  currentBalance: number;
  debitTotal: number;
  creditTotal: number;
  scope: string;
  countryId: string | null;
  countryName: string | null;
  countryBranchId: string | null;
  countryBranchName: string | null;
  cityBranchId: string | null;
  cityBranchName: string | null;
  accountId: string | null;
  accountCode: string | null;
  rawAccountCode?: string | null;
  manualReferenceNumber?: string | null;
  customerNumber?: string | null;
  countrySerialNumber?: string | null;
  branchSerialNumber?: string | null;
  accountName: string | null;
  accountKind: string | null;
  companyId: string | null;
  companyName: string | null;
  stateId?: string | null;
  stateName: string | null;
  cityId?: string | null;
  cityName: string | null;
  address: string | null;
  createdAt?: string | null;
};

export type LedgerStatementLine = {
  entryDate: string;
  sourceTable: "ledger_posting_batches" | "roznamcha_entries";
  sourceId: string;
  referenceNo: string | null;
  description: string | null;
  createdById: string | null;
  createdByName: string | null;
  debit: number;
  credit: number;
  currency: string;
  usdRate: number;
  usdAmount: number;
  createdAt: string;
  runningBalance: number;
  superAdminSerialNo?: string | null;
  countrySerialNo?: string | null;
  branchSerialNo?: string | null;
  branchName?: string | null;
};

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function unique<T>(values: Array<T | null | undefined>): T[] {
  return [...new Set(values.filter((v): v is T => v !== null && v !== undefined))];
}

type TranslationRow = {
  record_table: string;
  record_id: string;
  field_name: string;
  original_text: string;
  original_language_code: string;
  english_text: string | null;
  arabic_text: string | null;
  urdu_text: string | null;
  persian_text: string | null;
  pashto_text: string | null;
};

function translationKey(table: string, id: string, field: string) {
  return `${table}|${id}|${field}`;
}

async function loadTranslations(input: {
  supabase: any;
  language: SupportedLanguage;
  targets: Array<{ table: string; id: string; field: string }>;
}) {
  const ids = unique(input.targets.map((t) => t.id));
  const tables = unique(input.targets.map((t) => t.table));
  const fields = unique(input.targets.map((t) => t.field));

  if (!ids.length || !tables.length || !fields.length) return new Map<string, string>();

  const { data, error } = await input.supabase
    .from("record_translations")
    .select(
      "record_table, record_id, field_name, original_text, original_language_code, english_text, arabic_text, urdu_text, persian_text, pashto_text"
    )
    .in("record_table", tables)
    .in("record_id", ids)
    .in("field_name", fields)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(2000);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as TranslationRow[]) {
    const resolved = multilingualService.resolveText(
      {
        originalText: row.original_text,
        originalLanguage: (row.original_language_code as SupportedLanguage) ?? "en",
        en: row.english_text ?? undefined,
        ar: row.arabic_text ?? undefined,
        ur: row.urdu_text ?? undefined,
        fa: row.persian_text ?? undefined,
        ps: row.pashto_text ?? undefined
      },
      input.language
    );
    map.set(translationKey(row.record_table, row.record_id, row.field_name), resolved);
  }

  return map;
}

function applySessionScopeFilter(query: any, session: ErpSession) {
  if (session.isSuperAdmin) return query;

  const conditions: string[] = [];
  if (session.cityBranchIds && session.cityBranchIds.length > 0) {
    conditions.push(`city_branch_id.in.(${session.cityBranchIds.join(",")})`);
  }
  if (session.countryBranchIds && session.countryBranchIds.length > 0) {
    conditions.push(`country_branch_id.in.(${session.countryBranchIds.join(",")})`);
  }
  if (session.countryIds && session.countryIds.length > 0) {
    conditions.push(`country_id.in.(${session.countryIds.join(",")})`);
  }

  if (conditions.length > 0) {
    return query.or(conditions.join(","));
  }

  // No known scope => nothing.
  return query.eq("id", "00000000-0000-0000-0000-000000000000");
}

export class LedgerReportService {
  async listLedgers(input: {
    session: ErpSession;
    reportScope: LedgerReportScope;
    ledgerId?: string | string[] | null;
    countryId?: string | null;
    countryBranchId?: string | null;
    cityBranchId?: string | null;
    limit?: number;
    language?: SupportedLanguage | null;
    includeAllScopes?: boolean;
  }): Promise<LedgerLookupRow[]> {
    const supabase = createSupabaseAdminClient() as any;
    const limit = Math.max(1, Math.min(input.limit ?? 250, 500));

    let q = supabase
      .from("ledgers")
      .select(
        "id, scope, country_id, country_branch_id, city_branch_id, account_id, enterprise_account_id, code, name, currency, normal_balance, current_balance, debit_total, credit_total, is_active, created_at, deleted_at"
      )
      .is("deleted_at", null)
      .order("code", { ascending: true })
      .limit(limit);

    q = applySessionScopeFilter(q, input.session);

    if (input.ledgerId) {
      if (Array.isArray(input.ledgerId)) {
        q = q.in("id", input.ledgerId);
      } else {
        q = q.eq("id", input.ledgerId);
      }
    }
    if (input.countryId) q = q.eq("country_id", input.countryId);
    if (input.countryBranchId) q = q.eq("country_branch_id", input.countryBranchId);
    if (input.cityBranchId) q = q.eq("city_branch_id", input.cityBranchId);

    // Report scope tabs (viewer convenience). Super Admin report is the global view:
    // it must include country/main-branch/city-branch ledgers too, while the
    // session scope above still enforces real access control for non-super users.
    // When fetching a single ledger by id, never hide it via report-scope filtering.
    if (!input.ledgerId && !input.includeAllScopes) {
      if (input.reportScope === "country") q = q.neq("scope", "super_admin");
      if (input.reportScope === "branch") q = q.eq("scope", "city_branch");
    }

    const { data: ledgers, error } = await q;
    if (error) throw new Error(error.message);

    const rows = (ledgers ?? []) as Array<{
      id: string;
      scope: string;
      country_id: string | null;
      country_branch_id: string | null;
      city_branch_id: string | null;
      account_id: string | null;
      enterprise_account_id: string | null;
      code: string;
      name: string;
      currency: string;
      normal_balance: "debit" | "credit" | null;
      current_balance: string | number | null;
      debit_total: string | number | null;
      credit_total: string | number | null;
      is_active: boolean | null;
      created_at: string | null;
    }>;

    const accountIds = unique(rows.map((r) => r.account_id));
    const enterpriseAccountIds = unique(rows.map((r) => r.enterprise_account_id));
    const countryIds = unique(rows.map((r) => r.country_id));
    const countryBranchIds = unique(rows.map((r) => r.country_branch_id));
    const cityBranchIds = unique(rows.map((r) => r.city_branch_id));

    const [accountsRes, enterpriseAccountsRes, countriesRes, countryBranchesRes, cityBranchesRes] = await Promise.all([
      accountIds.length
        ? supabase
            .from("accounts")
            .select("id, code, name, kind, currency, company_id")
            .in("id", accountIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      enterpriseAccountIds.length
        ? supabase
            .from("enterprise_accounts")
            .select("id, code, account_number, manual_reference_number, customer_number, country_serial_number, branch_serial_number, name, kind, currency")
            .in("id", enterpriseAccountIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      countryIds.length
        ? supabase.from("countries").select("id, name").in("id", countryIds).is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      countryBranchIds.length
        ? supabase
            .from("country_branches")
            .select("id, name, code, state_province_id, city_id, address")
            .in("id", countryBranchIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      cityBranchIds.length
        ? supabase
            .from("city_branches")
            .select("id, name, code, state_province_id, city_id, address")
            .in("id", cityBranchIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (enterpriseAccountsRes.error) throw new Error(enterpriseAccountsRes.error.message);
    if (countriesRes.error) throw new Error(countriesRes.error.message);
    if (countryBranchesRes.error) throw new Error(countryBranchesRes.error.message);
    if (cityBranchesRes.error) throw new Error(cityBranchesRes.error.message);

    const accounts = (accountsRes.data ?? []) as Array<{
      id: string;
      code: string;
      name: string;
      kind: string;
      currency: string;
      company_id: string;
    }>;
    const enterpriseAccounts = (enterpriseAccountsRes.data ?? []) as Array<{
      id: string;
      code: string;
      account_number: string | null;
      manual_reference_number: string | null;
      customer_number: string | null;
      country_serial_number: string | null;
      branch_serial_number: string | null;
      name: string;
      kind: string;
      currency: string;
    }>;
    const countries = (countriesRes.data ?? []) as Array<{ id: string; name: string }>;
    const countryBranches = (countryBranchesRes.data ?? []) as Array<{
      id: string;
      name: string;
      code: string;
      state_province_id: string | null;
      city_id: string | null;
      address: string | null;
    }>;
    const cityBranches = (cityBranchesRes.data ?? []) as Array<{
      id: string;
      name: string;
      code: string;
      state_province_id: string | null;
      city_id: string | null;
      address: string | null;
    }>;

    const companyIds = unique(accounts.map((a) => a.company_id));
    const stateIds = unique([...countryBranches.map((b) => b.state_province_id), ...cityBranches.map((b) => b.state_province_id)]);
    const cityIds = unique([...countryBranches.map((b) => b.city_id), ...cityBranches.map((b) => b.city_id)]);

    const [companiesRes, statesRes, citiesRes] = await Promise.all([
      companyIds.length ? supabase.from("companies").select("id, name").in("id", companyIds).is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
      stateIds.length ? supabase.from("states_provinces").select("id, name").in("id", stateIds).is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
      cityIds.length ? supabase.from("cities").select("id, name").in("id", cityIds).is("deleted_at", null) : Promise.resolve({ data: [], error: null })
    ]);

    if (companiesRes.error) throw new Error(companiesRes.error.message);
    if (statesRes.error) throw new Error(statesRes.error.message);
    if (citiesRes.error) throw new Error(citiesRes.error.message);

    const companies = (companiesRes.data ?? []) as Array<{ id: string; name: string }>;
    const states = (statesRes.data ?? []) as Array<{ id: string; name: string }>;
    const cities = (citiesRes.data ?? []) as Array<{ id: string; name: string }>;

    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const enterpriseAccountById = new Map(enterpriseAccounts.map((a) => [a.id, a]));
    const countryById = new Map(countries.map((c) => [c.id, c]));
    const countryBranchById = new Map(countryBranches.map((b) => [b.id, b]));
    const cityBranchById = new Map(cityBranches.map((b) => [b.id, b]));
    const companyById = new Map(companies.map((c) => [c.id, c]));
    const stateById = new Map(states.map((s) => [s.id, s]));
    const cityById = new Map(cities.map((c) => [c.id, c]));

    const result = rows.map((row) => {
      const enterpriseAccount = row.enterprise_account_id
        ? enterpriseAccountById.get(row.enterprise_account_id) ?? null
        : null;
      const legacyAccount = row.account_id ? accountById.get(row.account_id) ?? null : null;
      const account = enterpriseAccount ?? legacyAccount;
      const company = legacyAccount?.company_id ? companyById.get(legacyAccount.company_id) ?? null : null;
      const country = row.country_id ? countryById.get(row.country_id) ?? null : null;
      const countryBranch = row.country_branch_id ? countryBranchById.get(row.country_branch_id) ?? null : null;
      const cityBranch = row.city_branch_id ? cityBranchById.get(row.city_branch_id) ?? null : null;

      const branchStateId = cityBranch?.state_province_id ?? countryBranch?.state_province_id ?? null;
      const branchCityId = cityBranch?.city_id ?? countryBranch?.city_id ?? null;
      const stateName = branchStateId ? stateById.get(branchStateId)?.name ?? null : null;
      const cityName = branchCityId ? cityById.get(branchCityId)?.name ?? null : null;
      const address = cityBranch?.address ?? countryBranch?.address ?? null;

      return {
        ledgerId: row.id,
        ledgerCode: row.code,
        ledgerName: row.name,
        ledgerCurrency: row.currency,
        normalBalance: row.normal_balance ?? "debit",
        isActive: row.is_active !== false,
        currentBalance: toNumber(row.current_balance),
        debitTotal: toNumber(row.debit_total),
        creditTotal: toNumber(row.credit_total),
        scope: row.scope,
        countryId: row.country_id,
        countryName: country?.name ?? null,
        countryBranchId: row.country_branch_id,
        countryBranchName: countryBranch?.name ?? null,
        cityBranchId: row.city_branch_id,
        cityBranchName: cityBranch?.name ?? null,
        accountId: row.enterprise_account_id ?? row.account_id,
        accountCode: enterpriseAccount?.account_number ?? account?.code ?? null,
        rawAccountCode: account?.code ?? null,
        manualReferenceNumber: enterpriseAccount?.manual_reference_number ?? null,
        customerNumber: enterpriseAccount?.customer_number ?? null,
        countrySerialNumber: enterpriseAccount?.country_serial_number ?? null,
        branchSerialNumber: enterpriseAccount?.branch_serial_number ?? null,
        accountName: account?.name ?? null,
        accountKind: (account as any)?.kind ?? null,
        companyId: legacyAccount?.company_id ?? null,
        companyName: company?.name ?? null,
        stateId: branchStateId,
        stateName,
        cityId: branchCityId,
        cityName,
        address,
        createdAt: row.created_at ?? null
      };
    });

    const language = input.language ?? null;
    if (!language) return result;

    const targets: Array<{ table: string; id: string; field: string }> = [];
    for (const row of result) {
      if (row.countryId) targets.push({ table: "countries", id: row.countryId, field: "name" });
      if (row.countryBranchId) targets.push({ table: "country_branches", id: row.countryBranchId, field: "name" });
      if (row.cityBranchId) targets.push({ table: "city_branches", id: row.cityBranchId, field: "name" });
      if (row.companyId) targets.push({ table: "companies", id: row.companyId, field: "name" });
      if (row.stateId) targets.push({ table: "states_provinces", id: row.stateId, field: "name" });
      if (row.cityId) targets.push({ table: "cities", id: row.cityId, field: "name" });
      if (row.accountId) {
        // We support both legacy `accounts` and newer `enterprise_accounts` ledgers.
        // Load translations from both tables and resolve whichever exists.
        targets.push({ table: "enterprise_accounts", id: row.accountId, field: "name" });
        targets.push({ table: "enterprise_accounts", id: row.accountId, field: "code" });
        targets.push({ table: "accounts", id: row.accountId, field: "name" });
        targets.push({ table: "accounts", id: row.accountId, field: "code" });
      }
      // Ledger itself (fallback "economic name")
      targets.push({ table: "ledgers", id: row.ledgerId, field: "name" });
    }

    const translations = await loadTranslations({ supabase, language, targets });

    return result.map((row) => {
      const countryName =
        (row.countryId && translations.get(translationKey("countries", row.countryId, "name"))) || row.countryName;
      const countryBranchName =
        (row.countryBranchId &&
          translations.get(translationKey("country_branches", row.countryBranchId, "name"))) ||
        row.countryBranchName;
      const cityBranchName =
        (row.cityBranchId && translations.get(translationKey("city_branches", row.cityBranchId, "name"))) ||
        row.cityBranchName;
      const companyName =
        (row.companyId && translations.get(translationKey("companies", row.companyId, "name"))) || row.companyName;
      const stateName =
        (row.stateId && translations.get(translationKey("states_provinces", row.stateId, "name"))) || row.stateName;
      const cityName = (row.cityId && translations.get(translationKey("cities", row.cityId, "name"))) || row.cityName;

      // Account name/code: try enterprise_accounts first, then accounts, then keep original.
      let accountName = row.accountName;
      let accountCode = row.accountCode;
      if (row.accountId) {
        const nameEnterprise = translations.get(translationKey("enterprise_accounts", row.accountId, "name"));
        const codeEnterprise = translations.get(translationKey("enterprise_accounts", row.accountId, "code"));
        const nameLegacy = translations.get(translationKey("accounts", row.accountId, "name"));
        const codeLegacy = translations.get(translationKey("accounts", row.accountId, "code"));
        accountName = nameEnterprise || nameLegacy || accountName;
        accountCode = codeEnterprise || codeLegacy || accountCode;
      }

      const ledgerName = translations.get(translationKey("ledgers", row.ledgerId, "name")) || row.ledgerName;

      return {
        ...row,
        countryName,
        countryBranchName,
        cityBranchName,
        companyName,
        stateName,
        cityName,
        accountName,
        accountCode,
        ledgerName
      };
    });
  }

  async getLedgerStatement(input: {
    session: ErpSession;
    ledgerId: string | string[];
    fromDate: string;
    toDate: string;
    limit?: number;
    language?: SupportedLanguage | null;
  }): Promise<{ header: LedgerLookupRow | null; lines: LedgerStatementLine[] }> {
    const supabase = createSupabaseAdminClient() as any;
    const limit = Math.max(1, Math.min(input.limit ?? 2000, 5000));

    const ledgerIds = Array.isArray(input.ledgerId) ? input.ledgerId : [input.ledgerId];
    if (ledgerIds.length === 0) return { header: null, lines: [] };

    // Ensure ledger is accessible (session-scoped).
    const headerRows = await this.listLedgers({
      session: input.session,
      reportScope: "super_admin",
      ledgerId: ledgerIds,
      limit: 1,
      language: input.language ?? null
    });
    const header = headerRows[0] ?? null;
    if (!header) return { header: null, lines: [] };

    const [batchRes, rozRes] = await Promise.all([
      supabase
        .from("ledger_posting_lines")
        .select(
          "id, batch_id, description, debit, credit, currency, usd_rate, usd_amount, created_at, ledger_posting_batches!inner(entry_date, reference_no, created_by, city_branch_id, country_branch_id)"
        )
        .in("ledger_id", ledgerIds)
        .gte("ledger_posting_batches.entry_date", input.fromDate)
        .lte("ledger_posting_batches.entry_date", input.toDate)
        .order("created_at", { ascending: true })
        .limit(limit),
      supabase
        .from("roznamcha_lines")
        .select(
          "id, roznamcha_entry_id, description, debit, credit, currency, usd_rate, usd_amount, roznamcha_entries!inner(entry_date, voucher_no, created_by, created_at, city_branch_id, country_branch_id, super_admin_serial_number, country_transaction_serial_number, branch_transaction_serial_number)"
        )
        .in("ledger_id", ledgerIds)
        .gte("roznamcha_entries.entry_date", input.fromDate)
        .lte("roznamcha_entries.entry_date", input.toDate)
        .is("roznamcha_entries.deleted_at", null)
        .order("entry_date", { ascending: true, foreignTable: "roznamcha_entries" })
        .order("created_at", { ascending: true, foreignTable: "roznamcha_entries" })
        .order("id", { ascending: true })
        .limit(limit)
    ]);

    if (batchRes.error) throw new Error(batchRes.error.message);
    if (rozRes.error) throw new Error(rozRes.error.message);

    const batchLines = (batchRes.data ?? []) as any[];
    const rozLines = (rozRes.data ?? []) as any[];

    const merged = [
      ...batchLines.map((row) => ({
        entryDate: row.ledger_posting_batches?.entry_date as string,
        sourceTable: "ledger_posting_batches" as const,
        sourceId: row.batch_id as string,
        referenceNo: (row.ledger_posting_batches?.reference_no as string | null) ?? null,
        description: (row.description as string | null) ?? null,
        createdById: (row.ledger_posting_batches?.created_by as string | null) ?? null,
        cityBranchId: (row.ledger_posting_batches?.city_branch_id as string | null) ?? null,
        countryBranchId: (row.ledger_posting_batches?.country_branch_id as string | null) ?? null,
        debit: toNumber(row.debit),
        credit: toNumber(row.credit),
        currency: (row.currency as string) ?? header.ledgerCurrency,
        usdRate: toNumber(row.usd_rate) || 1,
        usdAmount: toNumber(row.usd_amount),
        createdAt: row.created_at as string,
        superAdminSerialNo: null,
        countrySerialNo: null,
        branchSerialNo: null
      })),
      ...rozLines.map((row) => ({
        entryDate: row.roznamcha_entries?.entry_date as string,
        sourceTable: "roznamcha_entries" as const,
        sourceId: row.roznamcha_entry_id as string,
        referenceNo: (row.roznamcha_entries?.voucher_no as string | null) ?? null,
        description: (row.description as string | null) ?? null,
        createdById: (row.roznamcha_entries?.created_by as string | null) ?? null,
        cityBranchId: (row.roznamcha_entries?.city_branch_id as string | null) ?? null,
        countryBranchId: (row.roznamcha_entries?.country_branch_id as string | null) ?? null,
        debit: toNumber(row.debit),
        credit: toNumber(row.credit),
        currency: (row.currency as string) ?? header.ledgerCurrency,
        usdRate: toNumber(row.usd_rate) || 1,
        usdAmount: toNumber(row.usd_amount),
        createdAt: (row.roznamcha_entries?.created_at as string | null) ?? (row.roznamcha_entries?.entry_date as string),
        superAdminSerialNo: (row.roznamcha_entries?.super_admin_serial_number as string | null) ?? null,
        countrySerialNo: (row.roznamcha_entries?.country_transaction_serial_number as string | null) ?? null,
        branchSerialNo: (row.roznamcha_entries?.branch_transaction_serial_number as string | null) ?? null
      }))
    ]
      .filter((row) => Boolean(row.entryDate))
      .sort((a, b) => {
        if (a.entryDate !== b.entryDate) return a.entryDate < b.entryDate ? -1 : 1;
        if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
        return a.sourceId < b.sourceId ? -1 : 1;
      });

    const createdByIds = unique(merged.map((row) => row.createdById));
    const cityBranchIds = unique(merged.map((row) => row.cityBranchId));
    const countryBranchIds = unique(merged.map((row) => row.countryBranchId));

    const [usersRes, countryBranchesRes, cityBranchesRes] = await Promise.all([
      createdByIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", createdByIds).is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      countryBranchIds.length
        ? supabase.from("country_branches").select("id, name, code").in("id", countryBranchIds).is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      cityBranchIds.length
        ? supabase.from("city_branches").select("id, name, code").in("id", cityBranchIds).is("deleted_at", null)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (usersRes.error) throw new Error(usersRes.error.message);
    if (countryBranchesRes.error) throw new Error(countryBranchesRes.error.message);
    if (cityBranchesRes.error) throw new Error(cityBranchesRes.error.message);

    const userById = new Map(((usersRes.data ?? []) as Array<{ id: string; full_name: string | null }>).map((u) => [u.id, u]));

    const branchNameById = new Map<string, string>();
    for (const b of (countryBranchesRes.data ?? [])) {
      branchNameById.set(b.id, b.name);
    }
    for (const b of (cityBranchesRes.data ?? [])) {
      branchNameById.set(b.id, b.name);
    }

    const creditNormal = header.normalBalance === "credit";
    let running = 0;
    const lines: LedgerStatementLine[] = merged.map((row) => {
      running += creditNormal ? row.credit - row.debit : row.debit - row.credit;
      const branchId = row.cityBranchId || row.countryBranchId;
      const branchName = branchId ? branchNameById.get(branchId) ?? null : null;

      return {
        entryDate: row.entryDate,
        sourceTable: row.sourceTable,
        sourceId: row.sourceId,
        referenceNo: row.referenceNo,
        description: row.description,
        createdById: row.createdById,
        createdByName: row.createdById ? (userById.get(row.createdById)?.full_name ?? null) : null,
        debit: row.debit,
        credit: row.credit,
        currency: row.currency,
        usdRate: row.usdRate || 1,
        usdAmount: row.usdAmount,
        createdAt: row.createdAt,
        runningBalance: running,
        superAdminSerialNo: row.superAdminSerialNo,
        countrySerialNo: row.countrySerialNo,
        branchSerialNo: row.branchSerialNo,
        branchName
      };
    });

    return { header, lines };
  }
}

export const ledgerReportService = new LedgerReportService();
