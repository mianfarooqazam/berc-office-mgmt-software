import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  platform: z.enum(["GOOGLE_MEET", "MICROSOFT_TEAMS", "IN_PERSON", "OTHER"]).optional().nullable(),
  meetingUrl: z.string().optional().nullable(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("meetings.read");
  if (authError) return authError;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("meetings")
    .select(
      "*, participants:meeting_participants(*, employee:employees(*)), notes:meeting_notes(*, author:users(*, employee:employees(*))), action_items:action_items(*, assignee:employees(*)), minutes:meeting_minutes(*, author:users(*, employee:employees(*)))",
    )
    .eq("id", id)
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  if (!data) return error("Not found", 404);

  const meeting = toCamel<{
    notes?: { createdAt?: string }[];
    actionItems?: { createdAt?: string }[];
    minutes?: { createdAt?: string; meetingDate?: string | null }[];
  }>(data);
  if (Array.isArray(meeting.notes)) {
    meeting.notes.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
  }
  if (Array.isArray(meeting.actionItems)) {
    meeting.actionItems.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
  }
  if (Array.isArray(meeting.minutes)) {
    meeting.minutes.sort((a, b) =>
      String(b.meetingDate || b.createdAt || "").localeCompare(
        String(a.meetingDate || a.createdAt || ""),
      ),
    );
  }
  return json(meeting);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("meetings.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  const db = getSupabaseAdmin();

  if (parsed.data.participantIds) {
    await db.from("meeting_participants").delete().eq("meeting_id", id);
    if (parsed.data.participantIds.length) {
      const { error: partError } = await db.from("meeting_participants").insert(
        parsed.data.participantIds.map((employee_id) => ({ meeting_id: id, employee_id })),
      );
      if (partError) return error(partError.message, 500);
    }
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.location !== undefined) update.location = parsed.data.location;
  if (parsed.data.platform !== undefined) update.platform = parsed.data.platform;
  if (parsed.data.meetingUrl !== undefined) update.meeting_url = parsed.data.meetingUrl;
  if (parsed.data.startsAt !== undefined) update.starts_at = parsed.data.startsAt;
  if (parsed.data.endsAt !== undefined) update.ends_at = parsed.data.endsAt;

  if (Object.keys(update).length) {
    const { error: updateError } = await db.from("meetings").update(update).eq("id", id);
    if (updateError) return error(updateError.message, 500);
  }

  const { data, error: fetchError } = await db
    .from("meetings")
    .select("*, participants:meeting_participants(*, employee:employees(*))")
    .eq("id", id)
    .single();

  if (fetchError) return error(fetchError.message, 500);

  await writeAudit(user.id, "UPDATE", "Meeting", id);
  return json(toCamel(data));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("meetings.write");
  if (authError || !user) return authError!;
  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { error: dbError } = await db.from("meetings").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "DELETE", "Meeting", id);
  return json({ ok: true });
}
