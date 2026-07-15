import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission } from "@/lib/api";

export async function GET() {
  const { error: authError } = await requirePermission("audit.read");
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("audit_logs")
    .select("*, user:users(*, employee:employees(*))")
    .order("created_at", { ascending: false })
    .limit(200);

  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}
