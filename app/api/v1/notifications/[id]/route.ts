import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requireAuth } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requireAuth();
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data: item } = await db
    .from("notifications")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!item || item.user_id !== user.id) return error("Not found", 404);

  const { data: updated, error: dbError } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);
  return json(toCamel(updated));
}
