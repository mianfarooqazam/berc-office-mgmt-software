import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).optional(),
  meetingId: z.string().optional().nullable(),
  meetingDate: z.string().optional().nullable(),
  attendees: z.string().optional().nullable(),
  discussion: z.string().optional().nullable(),
  decisions: z.string().optional().nullable(),
  actionSummary: z.string().optional().nullable(),
});

const select =
  "*, author:users(*, employee:employees(*)), meeting:meetings(id, title, starts_at)";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError } = await requirePermission("meetings.read");
  if (authError) return authError;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data, error: dbError } = await db
    .from("meeting_minutes")
    .select(select)
    .eq("id", id)
    .maybeSingle();

  if (dbError) return error(dbError.message, 500);
  if (!data) return error("Not found", 404);
  return json(toCamel(data));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("meetings.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const contentType = req.headers.get("content-type") || "";
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (form.has("title")) update.title = String(form.get("title") || "");
    if (form.has("meetingId")) {
      update.meeting_id = form.get("meetingId") ? String(form.get("meetingId")) : null;
    }
    if (form.has("meetingDate")) {
      update.meeting_date = form.get("meetingDate") ? String(form.get("meetingDate")) : null;
    }
    if (form.has("attendees")) {
      update.attendees = form.get("attendees") ? String(form.get("attendees")) : null;
    }
    if (form.has("discussion")) update.discussion = String(form.get("discussion") || "");
    if (form.has("decisions")) {
      update.decisions = form.get("decisions") ? String(form.get("decisions")) : null;
    }
    if (form.has("actionSummary")) {
      update.action_summary = form.get("actionSummary")
        ? String(form.get("actionSummary"))
        : null;
    }

    if (file instanceof File && file.size > 0) {
      const { data: existing } = await db
        .from("meeting_minutes")
        .select("file_path")
        .eq("id", id)
        .maybeSingle();
      try {
        const saved = await saveUpload(file, "meeting-minutes");
        update.file_name = saved.name;
        update.file_path = saved.filePath;
        update.mime_type = saved.mimeType;
        update.file_size = saved.size;
      } catch (e) {
        return error(e instanceof Error ? e.message : "Upload failed", 400);
      }
      if (existing?.file_path) await deleteUpload(existing.file_path);
    }
  } else {
    const body = await req.json().catch(() => null);
    const parsed = parseBody(schema, body);
    if (parsed.error || !parsed.data) return parsed.error!;

    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.meetingId !== undefined) update.meeting_id = parsed.data.meetingId;
    if (parsed.data.meetingDate !== undefined) update.meeting_date = parsed.data.meetingDate;
    if (parsed.data.attendees !== undefined) update.attendees = parsed.data.attendees;
    if (parsed.data.discussion !== undefined) update.discussion = parsed.data.discussion;
    if (parsed.data.decisions !== undefined) update.decisions = parsed.data.decisions;
    if (parsed.data.actionSummary !== undefined) {
      update.action_summary = parsed.data.actionSummary;
    }
  }

  const { data, error: dbError } = await db
    .from("meeting_minutes")
    .update(update)
    .eq("id", id)
    .select(select)
    .single();

  if (dbError) return error(dbError.message, 500);
  await writeAudit(user.id, "UPDATE", "MeetingMinutes", id);
  return json(toCamel(data));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("meetings.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from("meeting_minutes")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  const { error: dbError } = await db.from("meeting_minutes").delete().eq("id", id);
  if (dbError) return error(dbError.message, 500);
  if (existing?.file_path) await deleteUpload(existing.file_path);
  await writeAudit(user.id, "DELETE", "MeetingMinutes", id);
  return json({ ok: true });
}
