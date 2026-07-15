import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission } from "@/lib/api";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("tasks.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: comment, error: dbError } = await db
    .from("task_comments")
    .insert({ task_id: id, user_id: user.id, body: parsed.data.body })
    .select("*, user:users(*, employee:employees(*))")
    .single();

  if (dbError) return error(dbError.message, 500);

  await db.from("task_activities").insert({
    task_id: id,
    message: `${user.employee?.fullName || user.email} commented`,
  });

  return json(toCamel(comment), 201);
}
