export const PERMISSIONS = [
  { code: "dashboard.read", name: "View dashboard", module: "dashboard" },
  { code: "employees.read", name: "View employees", module: "employees" },
  { code: "employees.write", name: "Manage employees", module: "employees" },
  { code: "employees.delete", name: "Delete employees", module: "employees" },
  { code: "tasks.read", name: "View tasks", module: "tasks" },
  { code: "tasks.write", name: "Manage tasks", module: "tasks" },
  { code: "meetings.read", name: "View meetings", module: "meetings" },
  { code: "meetings.write", name: "Manage meetings", module: "meetings" },
  { code: "assets.read", name: "View assets", module: "assets" },
  { code: "assets.write", name: "Manage assets", module: "assets" },
  { code: "documents.read", name: "View documents", module: "documents" },
  { code: "documents.write", name: "Manage documents", module: "documents" },
  { code: "announcements.read", name: "View announcements", module: "announcements" },
  { code: "announcements.write", name: "Manage announcements", module: "announcements" },
  { code: "messages.read", name: "View messages", module: "messages" },
  { code: "messages.write", name: "Send messages", module: "messages" },
  { code: "calendar.read", name: "View calendar", module: "calendar" },
  { code: "calendar.write", name: "Manage calendar", module: "calendar" },
  { code: "reports.read", name: "View reports", module: "reports" },
  { code: "integrations.read", name: "View integrations", module: "integrations" },
  { code: "integrations.write", name: "Manage integrations", module: "integrations" },
  { code: "settings.read", name: "View settings", module: "settings" },
  { code: "settings.write", name: "Manage settings", module: "settings" },
  { code: "roles.write", name: "Manage users & access", module: "settings" },
  { code: "audit.read", name: "View audit logs", module: "settings" },
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

/** Only Admin is a system role. Employees get per-user view permissions set by Admin. */
export const ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  Admin: PERMISSIONS.map((p) => p.code),
  Employee: [],
};

/** Default views Admin can assign when creating a new employee login. */
export const DEFAULT_EMPLOYEE_VIEWS: PermissionCode[] = [
  "dashboard.read",
  "tasks.read",
  "tasks.write",
  "meetings.read",
  "announcements.read",
  "messages.read",
  "messages.write",
  "calendar.read",
  "employees.read",
  "documents.read",
  "assets.read",
];

/** Grouped modules for the Admin “what can they see” UI. */
export const VIEW_MODULES = [
  { module: "dashboard", label: "Dashboard", codes: ["dashboard.read"] as PermissionCode[] },
  { module: "tasks", label: "Tasks", codes: ["tasks.read", "tasks.write"] as PermissionCode[] },
  { module: "reports", label: "Reports", codes: ["reports.read"] as PermissionCode[] },
  { module: "meetings", label: "Meetings", codes: ["meetings.read", "meetings.write"] as PermissionCode[] },
  { module: "announcements", label: "Announcements", codes: ["announcements.read", "announcements.write"] as PermissionCode[] },
  { module: "messages", label: "Messages", codes: ["messages.read", "messages.write"] as PermissionCode[] },
  { module: "calendar", label: "Calendar", codes: ["calendar.read", "calendar.write"] as PermissionCode[] },
  { module: "employees", label: "Employees", codes: ["employees.read", "employees.write", "employees.delete"] as PermissionCode[] },
  { module: "assets", label: "Assets", codes: ["assets.read", "assets.write"] as PermissionCode[] },
  { module: "documents", label: "Documents", codes: ["documents.read", "documents.write"] as PermissionCode[] },
  { module: "integrations", label: "Integrations", codes: ["integrations.read", "integrations.write"] as PermissionCode[] },
  {
    module: "settings",
    label: "Settings",
    codes: ["settings.read", "settings.write", "roles.write", "audit.read"] as PermissionCode[],
  },
];

export const ROUTE_PERMISSIONS: Record<string, PermissionCode | null> = {
  "/dashboard": "dashboard.read",
  "/tasks": "tasks.read",
  "/reports": "reports.read",
  "/meetings": "meetings.read",
  "/meetings/minutes": "meetings.read",
  "/announcements": "announcements.read",
  "/messages": "messages.read",
  "/calendar": "calendar.read",
  "/notifications": null,
  "/employees": "employees.read",
  "/assets": "assets.read",
  "/documents": "documents.read",
  "/integrations": "integrations.read",
  "/settings": "settings.read",
  "/ai": "dashboard.read",
};

export function isAdminRole(name?: string | null) {
  return name === "Admin" || name === "Administrator";
}
