import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission } from "@/lib/api";
import { findDemoUserById, listDemoAudit } from "@/lib/demo-store";

export async function GET() {
  const { error: authError } = await requirePermission("audit.read");
  if (authError) return authError;

  if (isDemoMode()) {
    const rows = listDemoAudit().map((a) => {
      const user = a.userId ? findDemoUserById(a.userId) : null;
      return {
        id: a.id,
        action: a.action,
        entity: a.entity,
        createdAt: a.createdAt,
        user: user
          ? { email: user.email, employee: { fullName: user.employee.fullName } }
          : null,
      };
    });
    return json(rows);
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("audit_logs")
    .select("*, user:users(*, employee:employees(*))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}
