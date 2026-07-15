import { json, requireAuth } from "@/lib/api";

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const body = await req.json().catch(() => ({}));
  return json({
    status: "coming_soon",
    feature: "policy_assistant",
    question: body.question || null,
    answer:
      "AI policy assistant is stubbed for this MVP. Connect an LLM provider later to answer company policy questions from your documents.",
  });
}
