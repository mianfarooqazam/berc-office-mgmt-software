import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("calendar.write");
  if (authError || !user) return authError!;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: event, error: dbError } = await db
    .from("office_events")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string }>(event);
  await writeAudit(user.id, "CREATE", "OfficeEvent", result.id);
  return json(result, 201);
}
