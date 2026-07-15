import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requireAuth } from "@/lib/api";

export async function GET() {
  const { error: authError, user } = await requireAuth();
  if (authError || !user) return authError!;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

export async function PATCH() {
  const { error: authError, user } = await requireAuth();
  if (authError || !user) return authError!;

  const db = getSupabaseAdmin();
  const { error: dbError } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (dbError) return error(dbError.message, 500);
  return json({ ok: true });
}
