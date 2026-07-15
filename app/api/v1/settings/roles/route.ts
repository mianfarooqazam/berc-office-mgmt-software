import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission } from "@/lib/api";

function withUserCount<T extends { users?: { count: number }[] | null }>(row: T) {
  const count = row.users?.[0]?.count ?? 0;
  const { users: _users, ...rest } = row;
  return { ...rest, _count: { users: count } };
}

export async function GET() {
  const { error: authError } = await requirePermission("roles.write");
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const [rolesRes, permissionsRes] = await Promise.all([
    db
      .from("roles")
      .select("*, permissions:role_permissions(*, permission:permissions(*)), users(count)")
      .order("name"),
    db.from("permissions").select("*").order("module").order("code"),
  ]);

  if (rolesRes.error) return error(rolesRes.error.message, 500);
  if (permissionsRes.error) return error(permissionsRes.error.message, 500);

  return json(
    toCamel({
      roles: (rolesRes.data || []).map(withUserCount),
      permissions: permissionsRes.data,
    }),
  );
}
