import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { notifyUser } from "@/lib/notifications";
import { createMeetingJoinUrl } from "@/lib/integrations";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  platform: z.enum(["GOOGLE_MEET", "MICROSOFT_TEAMS", "IN_PERSON", "OTHER"]).optional().nullable(),
  meetingUrl: z.string().optional().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  participantIds: z.array(z.string()).optional(),
});

function withMeetingCounts<
  T extends {
    action_items?: { count: number }[] | null;
    notes?: { count: number }[] | null;
  },
>(row: T) {
  const actionItems = row.action_items?.[0]?.count ?? 0;
  const notes = row.notes?.[0]?.count ?? 0;
  const { action_items: _a, notes: _n, ...rest } = row;
  return { ...rest, _count: { actionItems, notes } };
}

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("meetings.read");
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get("upcoming") === "1";

  const db = getSupabaseAdmin();
  let query = db
    .from("meetings")
    .select(
      "*, participants:meeting_participants(*, employee:employees(*)), action_items(count), notes:meeting_notes(count)",
    )
    .order("starts_at");

  if (upcoming) query = query.gte("starts_at", new Date().toISOString());

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);
  return json(toCamel((data || []).map(withMeetingCounts)));
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("meetings.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();
  let meetingUrl = parsed.data.meetingUrl || null;
  const platform = parsed.data.platform || null;

  if (!meetingUrl && (platform === "GOOGLE_MEET" || platform === "MICROSOFT_TEAMS")) {
    const { data: connected } = await db
      .from("integrations")
      .select("status")
      .eq("provider", platform)
      .maybeSingle();
    if (connected?.status === "CONNECTED") {
      meetingUrl = createMeetingJoinUrl(platform, parsed.data.title);
    }
  }

  const { data: meetingRow, error: createError } = await db
    .from("meetings")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      platform,
      meeting_url: meetingUrl,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
    })
    .select("id, title")
    .single();

  if (createError || !meetingRow) {
    return error(createError?.message || "Failed to create meeting", 500);
  }

  const participantIds = parsed.data.participantIds || [];
  if (participantIds.length) {
    const { error: partError } = await db.from("meeting_participants").insert(
      participantIds.map((employee_id) => ({ meeting_id: meetingRow.id, employee_id })),
    );
    if (partError) return error(partError.message, 500);
  }

  const { data: meeting, error: fetchError } = await db
    .from("meetings")
    .select("*, participants:meeting_participants(*, employee:employees(*))")
    .eq("id", meetingRow.id)
    .single();

  if (fetchError) return error(fetchError.message, 500);

  const result = toCamel<{
    id: string;
    title: string;
    participants: { employee: { userId?: string | null; email?: string } }[];
  }>(meeting);

  await Promise.all(
    result.participants
      .filter((p) => p.employee.userId)
      .map((p) =>
        notifyUser({
          userId: p.employee.userId!,
          title: "Meeting scheduled",
          body: result.title,
          link: `/meetings/${result.id}`,
          email: p.employee.email,
        }),
      ),
  );

  await writeAudit(user.id, "CREATE", "Meeting", result.id);
  return json(result, 201);
}
