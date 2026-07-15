import { json, requireAuth } from "@/lib/api";

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const body = await req.json().catch(() => ({}));
  return json({
    status: "coming_soon",
    feature: "ai_reports",
    prompt: body.prompt || null,
    report:
      "AI-generated narrative reports will appear here. Use the Reports module for Excel/PDF exports today.",
  });
}
