import type { AppUser } from "./auth";
import { PERMISSIONS } from "./permissions";
import { findDemoUserByEmail, findDemoUserById } from "./demo-store";

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

export function findDemoAccount(email: string) {
  return findDemoUserByEmail(email);
}

export function demoUserFromAccount(user: NonNullable<ReturnType<typeof findDemoUserById>>): AppUser {
  const codes =
    user.roleName === "Admin"
      ? PERMISSIONS.map((p) => p.code)
      : user.permissionCodes;

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    isActive: user.isActive,
    roleId: user.roleName === "Admin" ? "demo-role-admin" : "demo-role-employee",
    role: {
      id: user.roleName === "Admin" ? "demo-role-admin" : "demo-role-employee",
      name: user.roleName,
      permissions: PERMISSIONS.filter((p) => codes.includes(p.code)).map((p) => ({
        permission: { id: p.code, code: p.code, name: p.name, module: p.module },
      })),
    },
    employee: {
      id: user.employee.id,
      employeeId: user.employee.employeeId,
      fullName: user.employee.fullName,
      departmentId: user.employee.departmentId,
      profilePhoto: user.employee.profilePhoto,
    },
  };
}

export function getDemoUserById(userId: string): AppUser | null {
  const user = findDemoUserById(userId);
  if (!user || !user.isActive) return null;
  return demoUserFromAccount(user);
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
