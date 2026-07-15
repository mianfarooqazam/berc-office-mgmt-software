import { json, requireAuth } from "@/lib/api";

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const body = await req.json().catch(() => ({}));
  return json({
    status: "coming_soon",
    feature: "meeting_summary",
    meetingId: body.meetingId || null,
    summary: "Automatic meeting summaries will be generated here once AI is enabled.",
  });
}
