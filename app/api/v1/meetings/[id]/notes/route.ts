import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission } from "@/lib/api";
import { z } from "zod";

const schema = z.object({ content: z.string().min(1) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("meetings.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: note, error: dbError } = await db
    .from("meeting_notes")
    .insert({ meeting_id: id, author_id: user.id, content: parsed.data.content })
    .select("*, author:users(*, employee:employees(*))")
    .single();

  if (dbError) return error(dbError.message, 500);
  return json(toCamel(note), 201);
}
