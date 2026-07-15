import { getSupabaseAdmin } from "@/lib/supabase";
import { error, json, requirePermission } from "@/lib/api";

export type CalendarEventType =
  | "meeting"
  | "announcement"
  | "holiday"
  | "task"
  | "event";

export type CalendarEventItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: CalendarEventType;
  href?: string;
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function nextDay(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("calendar.read");
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const from =
    searchParams.get("from") || new Date(new Date().getFullYear(), 0, 1).toISOString();
  const to =
    searchParams.get("to") || new Date(new Date().getFullYear(), 11, 31, 23, 59, 59).toISOString();

  const db = getSupabaseAdmin();
  const [holidaysRes, meetingsRes, eventsRes, tasksRes, announcementsRes] = await Promise.all([
    db.from("holidays").select("id, name, date").gte("date", from).lte("date", to).order("date"),
    db
      .from("meetings")
      .select("id, title, starts_at, ends_at")
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at"),
    db
      .from("office_events")
      .select("id, title, starts_at, ends_at")
      .lte("starts_at", to)
      .gte("ends_at", from)
      .order("starts_at"),
    db
      .from("tasks")
      .select("id, title, due_date")
      .gte("due_date", from)
      .lte("due_date", to)
      .neq("status", "COMPLETED")
      .order("due_date"),
    db
      .from("announcements")
      .select("id, title, published_at")
      .gte("published_at", from)
      .lte("published_at", to)
      .order("published_at"),
  ]);

  if (holidaysRes.error) return error(holidaysRes.error.message, 500);
  if (meetingsRes.error) return error(meetingsRes.error.message, 500);
  if (eventsRes.error) return error(eventsRes.error.message, 500);
  if (tasksRes.error) return error(tasksRes.error.message, 500);
  if (announcementsRes.error) return error(announcementsRes.error.message, 500);

  const items: CalendarEventItem[] = [];

  for (const h of holidaysRes.data || []) {
    const start = dayKey(h.date);
    items.push({
      id: `holiday-${h.id}`,
      title: h.name,
      start,
      end: nextDay(start),
      allDay: true,
      type: "holiday",
    });
  }

  for (const m of meetingsRes.data || []) {
    items.push({
      id: `meeting-${m.id}`,
      title: m.title,
      start: m.starts_at,
      end: m.ends_at,
      allDay: false,
      type: "meeting",
      href: `/meetings/${m.id}`,
    });
  }

  for (const e of eventsRes.data || []) {
    items.push({
      id: `event-${e.id}`,
      title: e.title,
      start: e.starts_at,
      end: e.ends_at,
      allDay: false,
      type: "event",
    });
  }

  for (const t of tasksRes.data || []) {
    if (!t.due_date) continue;
    const start = dayKey(t.due_date);
    items.push({
      id: `task-${t.id}`,
      title: t.title,
      start,
      end: nextDay(start),
      allDay: true,
      type: "task",
      href: `/tasks/${t.id}`,
    });
  }

  for (const a of announcementsRes.data || []) {
    const start = dayKey(a.published_at);
    items.push({
      id: `announcement-${a.id}`,
      title: a.title,
      start,
      end: nextDay(start),
      allDay: true,
      type: "announcement",
      href: "/announcements",
    });
  }

  return json({ items });
}
