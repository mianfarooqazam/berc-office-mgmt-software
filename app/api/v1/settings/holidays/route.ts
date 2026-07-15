import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

export async function GET() {
  const { error: authError } = await requirePermission("settings.read");
  if (authError) return authError;

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db.from("holidays").select("*").order("date");
  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

const schema = z.object({
  name: z.string().min(1),
  date: z.string(),
  recurring: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("settings.write");
  if (authError || !user) return authError!;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  const { data: holiday, error: dbError } = await db
    .from("holidays")
    .insert({
      name: parsed.data.name,
      date: parsed.data.date,
      recurring: parsed.data.recurring || false,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string }>(holiday);
  await writeAudit(user.id, "CREATE", "Holiday", result.id);
  return json(result, 201);
}
