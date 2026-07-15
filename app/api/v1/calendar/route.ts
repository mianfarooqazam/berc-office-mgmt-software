import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission } from "@/lib/api";

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("calendar.read");
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const from = (searchParams.get("from") || new Date(new Date().getFullYear(), 0, 1).toISOString());
  const to = (searchParams.get("to") || new Date(new Date().getFullYear(), 11, 31).toISOString());

  const db = getSupabaseAdmin();
  const [holidaysRes, meetingsRes, eventsRes, tasksRes] = await Promise.all([
    db.from("holidays").select("*").gte("date", from).lte("date", to).order("date"),
    db.from("meetings").select("*").gte("starts_at", from).lte("starts_at", to).order("starts_at"),
    db
      .from("office_events")
      .select("*")
      .lte("starts_at", to)
      .gte("ends_at", from)
      .order("starts_at"),
    db
      .from("tasks")
      .select("*")
      .gte("due_date", from)
      .lte("due_date", to)
      .neq("status", "COMPLETED")
      .order("due_date")
      .limit(50),
  ]);

  if (holidaysRes.error) return error(holidaysRes.error.message, 500);
  if (meetingsRes.error) return error(meetingsRes.error.message, 500);
  if (eventsRes.error) return error(eventsRes.error.message, 500);
  if (tasksRes.error) return error(tasksRes.error.message, 500);

  return json(
    toCamel({
      holidays: holidaysRes.data,
      meetings: meetingsRes.data,
      events: eventsRes.data,
      tasks: tasksRes.data,
    }),
  );
}
