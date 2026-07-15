import { json, requirePermission } from "@/lib/api";
import { isDemoMode } from "@/lib/supabase";
import { demoPermissionsCatalog, listDemoUsers } from "@/lib/demo-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error } from "@/lib/api";

/** Legacy endpoint — prefer /api/v1/settings/users for Admin user management. */
export async function GET() {
  const { error: authError } = await requirePermission("roles.write");
  if (authError) return authError;

  if (isDemoMode()) {
    const users = listDemoUsers();
    return json({
      roles: [
        {
          id: "demo-role-admin",
          name: "Admin",
          permissions: demoPermissionsCatalog().map((p) => ({ permission: p })),
          _count: { users: users.filter((u) => u.roleName === "Admin").length },
        },
        {
          id: "demo-role-employee",
          name: "Employee",
          permissions: [],
          _count: { users: users.filter((u) => u.roleName === "Employee").length },
        },
      ],
      permissions: demoPermissionsCatalog(),
    });
  }

  const db = getSupabaseAdmin();
  const [{ data: roles, error: rolesError }, { data: permissions }] = await Promise.all([
    db.from("roles").select("*, permissions:role_permissions(permission:permissions(*))"),
    db.from("permissions").select("*").order("module"),
  ]);
  if (rolesError) return error(rolesError.message, 500);

  const mapped = await Promise.all(
    (roles || []).map(async (role) => {
      const { count } = await db
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role_id", role.id);
      return { ...(toCamel(role) as Record<string, unknown>), _count: { users: count || 0 } };
    }),
  );

  return json({ roles: mapped, permissions: toCamel(permissions || []) });
}
