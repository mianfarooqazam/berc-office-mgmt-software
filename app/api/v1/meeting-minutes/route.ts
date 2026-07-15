import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { error, json, requirePermission, writeAudit } from "@/lib/api";
import { saveUpload } from "@/lib/storage";

const select =
  "*, author:users(*, employee:employees(*)), meeting:meetings(id, title, starts_at)";

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("meetings.read");
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meetingId");
  const q = searchParams.get("q")?.trim();

  const db = getSupabaseAdmin();
  let query = db
    .from("meeting_minutes")
    .select(select)
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (meetingId) query = query.eq("meeting_id", meetingId);
  if (q) {
    const pattern = `%${q.replace(/[%_,"\\]/g, " ")}%`;
    query = query.or(
      [
        `title.ilike."${pattern}"`,
        `discussion.ilike."${pattern}"`,
        `decisions.ilike."${pattern}"`,
        `attendees.ilike."${pattern}"`,
        `action_summary.ilike."${pattern}"`,
        `file_name.ilike."${pattern}"`,
      ].join(","),
    );
  }

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);
  return json(toCamel(data));
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("meetings.write");
  if (authError || !user) return authError!;

  const form = await req.formData().catch(() => null);
  if (!form) return error("Expected form data", 400);

  const title = String(form.get("title") || "").trim();
  const meetingDate = form.get("meetingDate") ? String(form.get("meetingDate")) : null;
  const meetingId = form.get("meetingId") ? String(form.get("meetingId")) : null;
  const attendees = form.get("attendees") ? String(form.get("attendees")).trim() : null;
  const discussion = String(form.get("discussion") || "").trim();
  const decisions = form.get("decisions") ? String(form.get("decisions")).trim() : null;
  const actionSummary = form.get("actionSummary")
    ? String(form.get("actionSummary")).trim()
    : null;
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!title) return error("title is required", 400);
  if (!meetingDate) return error("date is required", 400);
  if (!hasFile && !discussion) {
    return error("Upload a file or type the meeting minutes", 400);
  }

  let saved: Awaited<ReturnType<typeof saveUpload>> | null = null;
  if (hasFile) {
    try {
      saved = await saveUpload(file as File, "meeting-minutes");
    } catch (e) {
      return error(e instanceof Error ? e.message : "Upload failed", 400);
    }
  }

  const db = getSupabaseAdmin();
  const { data: item, error: dbError } = await db
    .from("meeting_minutes")
    .insert({
      title,
      meeting_id: meetingId,
      meeting_date: meetingDate,
      attendees: attendees || null,
      discussion,
      decisions: decisions || null,
      action_summary: actionSummary || null,
      file_name: saved?.name ?? null,
      file_path: saved?.filePath ?? null,
      mime_type: saved?.mimeType ?? null,
      file_size: saved?.size ?? null,
      author_id: user.id,
    })
    .select(select)
    .single();

  if (dbError) return error(dbError.message, 500);

  const result = toCamel<{ id: string }>(item);
  await writeAudit(user.id, "CREATE", "MeetingMinutes", result.id);
  return json(result, 201);
}
