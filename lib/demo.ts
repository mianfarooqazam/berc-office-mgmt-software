import { PERMISSIONS } from "./permissions";
import type { AppUser } from "./auth";

/** True when Supabase is not configured (placeholders) or DEMO_MODE=true. */
export function isDemoMode() {
  if (process.env.DEMO_MODE === "true") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return (
    !url ||
    !key ||
    url.includes("YOUR_PROJECT") ||
    key.includes("your-service-role")
  );
}

// bcrypt hash for Admin@123
const DEMO_PASSWORD_HASH =
  "$2b$10$UPu50mPe7orHO0ZshZoy1e7X9PNEObRJ.8gvB72vrgtq1xVd2nuoa";

export type DemoAccount = {
  id: string;
  email: string;
  passwordHash: string;
  roleId: string;
  roleName: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "demo-user-admin",
    email: "admin@berc.local",
    passwordHash: DEMO_PASSWORD_HASH,
    roleId: "demo-role-admin",
    roleName: "Administrator",
    employeeId: "demo-emp-admin",
    employeeCode: "BERC-001",
    fullName: "BERC Admin",
  },
  {
    id: "demo-user-hr",
    email: "hr@berc.local",
    passwordHash: DEMO_PASSWORD_HASH,
    roleId: "demo-role-hr",
    roleName: "Office Manager",
    employeeId: "demo-emp-hr",
    employeeCode: "BERC-002",
    fullName: "HR Manager",
  },
  {
    id: "demo-user-manager",
    email: "manager@berc.local",
    passwordHash: DEMO_PASSWORD_HASH,
    roleId: "demo-role-mgr",
    roleName: "Department Manager",
    employeeId: "demo-emp-mgr",
    employeeCode: "BERC-003",
    fullName: "Dept Manager",
  },
  {
    id: "demo-user-employee",
    email: "employee1@berc.local",
    passwordHash: DEMO_PASSWORD_HASH,
    roleId: "demo-role-emp",
    roleName: "Employee",
    employeeId: "demo-emp-1",
    employeeCode: "BERC-004",
    fullName: "Demo Employee",
  },
];

export function findDemoAccount(email: string) {
  return DEMO_ACCOUNTS.find((a) => a.email === email.toLowerCase()) ?? null;
}

export function demoUserFromAccount(account: DemoAccount): AppUser {
  return {
    id: account.id,
    email: account.email,
    passwordHash: account.passwordHash,
    isActive: true,
    roleId: account.roleId,
    role: {
      id: account.roleId,
      name: account.roleName,
      permissions: PERMISSIONS.map((p) => ({
        permission: { id: p.code, code: p.code, name: p.name, module: p.module },
      })),
    },
    employee: {
      id: account.employeeId,
      employeeId: account.employeeCode,
      fullName: account.fullName,
      departmentId: "demo-dept-1",
      profilePhoto: null,
    },
  };
}

export function getDemoUserById(userId: string): AppUser | null {
  const account = DEMO_ACCOUNTS.find((a) => a.id === userId);
  return account ? demoUserFromAccount(account) : null;
}

/** Minimal thenable query builder so pages don't crash without Supabase. */
export function createDemoSupabase() {
  const result = { data: [] as unknown[], error: null as null, count: 0 };

  function chain(): Record<string, unknown> {
    const q: Record<string, unknown> = {};
    const methods = [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "like",
      "ilike",
      "is",
      "in",
      "contains",
      "order",
      "limit",
      "range",
      "match",
      "filter",
      "not",
      "or",
      "textSearch",
    ];
    for (const m of methods) {
      q[m] = () => chain();
    }
    q.maybeSingle = async () => ({ data: null, error: null });
    q.single = async () => ({ data: null, error: { message: "Not found", code: "PGRST116" } });
    q.then = (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return q;
  }

  return {
    from: () => chain(),
    auth: { persistSession: false },
  };
}
