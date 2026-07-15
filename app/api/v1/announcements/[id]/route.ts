import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel, toSnake } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  pinned: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("announcements.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: item, error: dbError } = await db
    .from("announcements")
    .update(toSnake(parsed.data as Record<string, unknown>))
    .eq("id", id)
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "UPDATE", "Announcement", id);
  return json(toCamel(item));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("announcements.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { error: dbError } = await db.from("announcements").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "DELETE", "Announcement", id);
  return json({ ok: true });
}
