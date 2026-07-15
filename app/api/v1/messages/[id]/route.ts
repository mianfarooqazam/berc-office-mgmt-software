import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { getConversation, sendMessage } from "@/lib/messaging";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("messages.read");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const conversation = await getConversation(user.id, id);
  if (!conversation) return error("Conversation not found", 404);
  return json(conversation);
}

const schema = z.object({
  body: z.string().min(1),
});

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("messages.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  try {
    const message = await sendMessage(user.id, id, parsed.data.body);
    await writeAudit(user.id, "CREATE", "Message", message.id);
    return json(message, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send message";
    return error(msg, msg.includes("not found") ? 404 : 400);
  }
}
