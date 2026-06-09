export type PermissionLevel = "super_admin" | "country" | "city" | "branch" | "department" | "user" | "agent";

export type PermissionDefinition = {
  key: string;
  label: string;
  description: string;
  group: string;
  resources: string[];
  actions: string[];
};

export type PermissionTemplate = {
  key: string;
  label: string;
  description: string;
  level: PermissionLevel;
  permissions: string[];
};

export const permissionHierarchy: PermissionLevel[] = [
  "super_admin",
  "country",
  "city",
  "branch",
  "department",
  "user",
  "agent"
];

export const permissionCatalog: PermissionDefinition[] = [
  {
    key: "users.manage",
    label: "User Management",
    description: "Create, edit, delete, and view ERP users.",
    group: "Administration",
    resources: ["users", "roles"],
    actions: ["create", "read", "update", "delete"]
  },
  {
    key: "branches.manage",
    label: "Branch Management",
    description: "Create and maintain country, city, branch, and department structure.",
    group: "Administration",
    resources: ["countries", "country_branches", "city_branches", "branches"],
    actions: ["create", "read", "update", "delete"]
  },
  {
    key: "reports.view",
    label: "Reports Management",
    description: "View and export ERP reports.",
    group: "Reports",
    resources: ["reports", "global_reports"],
    actions: ["read", "export"]
  },
  {
    key: "finance.access",
    label: "Financial Access",
    description: "Access financial periods, cash, approval, and posting areas.",
    group: "Finance",
    resources: ["transactions", "journal_entries", "roznamcha", "approvals", "financial_periods"],
    actions: ["create", "read", "update", "post", "approve"]
  },
  {
    key: "purchases.access",
    label: "Purchase Management",
    description: "Create, view, update, post, and report purchase documents.",
    group: "Operations",
    resources: ["purchases", "bookings"],
    actions: ["create", "read", "update", "post", "export"]
  },
  {
    key: "sales.access",
    label: "Sales Management",
    description: "Create, view, update, post, and report sales documents.",
    group: "Operations",
    resources: ["sales", "customers"],
    actions: ["create", "read", "update", "post", "export"]
  },
  {
    key: "inventory.access",
    label: "Inventory Management",
    description: "Access warehouses, goods, shipping records, and inventory reports.",
    group: "Operations",
    resources: ["products", "product_categories", "product_brands", "product_units", "warehouses", "inventory", "shipping_records", "attachments"],
    actions: ["create", "read", "update", "post", "export"]
  },
  {
    key: "accounts.access",
    label: "Accounts Management",
    description: "Manage accounts, ledgers, journals, and customer balances.",
    group: "Finance",
    resources: ["accounts", "ledgers", "ledger", "journal_entries"],
    actions: ["create", "read", "update", "post", "export"]
  },
  {
    key: "settings.access",
    label: "Settings Management",
    description: "Access system settings, modules, masters, and audit logs.",
    group: "Administration",
    resources: ["settings", "modules", "audit_logs"],
    actions: ["create", "read", "update"]
  },
  {
    key: "messages.access",
    label: "Messaging & Notifications",
    description: "Send and read internal, email, and notification messages.",
    group: "Communication",
    resources: ["messages"],
    actions: ["create", "read", "update"]
  }
];

export const permissionTemplates: PermissionTemplate[] = [
  {
    key: "country-standard",
    label: "Country Standard",
    description: "Country can manage city branches, users, reports, purchase, sales, accounts, and finance.",
    level: "country",
    permissions: [
      "users.manage",
      "branches.manage",
      "reports.view",
      "finance.access",
      "purchases.access",
      "sales.access",
      "accounts.access",
      "messages.access"
    ]
  },
  {
    key: "country-operations",
    label: "Country Operations",
    description: "Operations focused access without system settings.",
    level: "country",
    permissions: ["branches.manage", "reports.view", "purchases.access", "sales.access", "inventory.access", "messages.access"]
  },
  {
    key: "city-standard",
    label: "City Standard",
    description: "City branch can operate users, reports, purchase, sales, inventory, and accounts.",
    level: "city",
    permissions: ["users.manage", "reports.view", "purchases.access", "sales.access", "inventory.access", "accounts.access", "messages.access"]
  },
  {
    key: "city-limited",
    label: "City Limited",
    description: "Read/report and basic operations only.",
    level: "city",
    permissions: ["reports.view", "purchases.access", "sales.access", "messages.access"]
  },
  {
    key: "department-finance",
    label: "Department Finance",
    description: "Finance/accounting department permissions.",
    level: "department",
    permissions: ["finance.access", "accounts.access", "reports.view"]
  },
  {
    key: "user-basic",
    label: "User Basic",
    description: "Basic user operations and reports.",
    level: "user",
    permissions: ["reports.view", "messages.access"]
  },
  {
    key: "agent-basic",
    label: "Agent Basic",
    description: "Agent can operate assigned shipping, clearing, customer, and collection tasks only.",
    level: "agent",
    permissions: ["reports.view", "messages.access", "purchases.access", "sales.access"]
  }
];

export function getPermissionTemplate(key: string) {
  return permissionTemplates.find((template) => template.key === key) ?? null;
}

export function getPermissionKeysForTemplate(key: string) {
  return getPermissionTemplate(key)?.permissions ?? [];
}

export function expandPermissionGroups(permissionKeys: string[]) {
  const selected = new Set(permissionKeys);
  return permissionCatalog
    .filter((permission) => selected.has(permission.key))
    .flatMap((permission) => permission.resources.flatMap((resource) => permission.actions.map((action) => `${resource}:${action}`)));
}

export function constrainChildPermissions(parentPermissions: string[], requestedPermissions: string[]) {
  const parent = new Set(parentPermissions);
  return requestedPermissions.filter((permission) => parent.has(permission));
}

export function groupPermissionCatalog() {
  return permissionCatalog.reduce<Record<string, PermissionDefinition[]>>((groups, permission) => {
    groups[permission.group] = groups[permission.group] ?? [];
    groups[permission.group].push(permission);
    return groups;
  }, {});
}
