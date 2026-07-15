import { getSupabaseAdmin, isDemoMode } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { addDemoHoliday, listDemoHolidays } from "@/lib/demo-store";
import { z } from "zod";

export async function GET() {
  const { error: authError } = await requirePermission("settings.read");
  if (authError) return authError;

  if (isDemoMode()) {
    return json(listDemoHolidays());
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db.from("holidays").select("*").order("date");
  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

const schema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("settings.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  if (isDemoMode()) {
    const holiday = addDemoHoliday(parsed.data.name, parsed.data.date);
    await writeAudit(user.id, "CREATE", "Holiday", holiday.id);
    return json(holiday, 201);
  }

  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("holidays")
    .insert({
      name: parsed.data.name,
      date: new Date(parsed.data.date).toISOString(),
    })
    .select()
    .single();
  if (dbError) return error(dbError.message, 500);
  const result = toCamel<{ id: string }>(data);
  await writeAudit(user.id, "CREATE", "Holiday", result.id);
  return json(result, 201);
}
