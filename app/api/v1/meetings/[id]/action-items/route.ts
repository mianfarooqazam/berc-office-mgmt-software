import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.string().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("meetings.write");
  if (authError) return authError;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: item, error: dbError } = await db
    .from("action_items")
    .insert({
      meeting_id: id,
      title: parsed.data.title,
      assignee_id: parsed.data.assigneeId || null,
      due_date: parsed.data.dueDate || null,
      status: parsed.data.status || "OPEN",
    })
    .select("*, assignee:employees(*)")
    .single();

  if (dbError) return error(dbError.message, 500);
  return json(toCamel(item), 201);
}
