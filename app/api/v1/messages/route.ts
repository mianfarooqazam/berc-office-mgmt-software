import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import {
  listConversations,
  listMessageContacts,
  startConversation,
} from "@/lib/messaging";
import { z } from "zod";

export async function GET(req: Request) {
  const { error: authError, user } = await requirePermission("messages.read");
  if (authError || !user) return authError!;

  const url = new URL(req.url);
  if (url.searchParams.get("contacts") === "1") {
    const contacts = await listMessageContacts(user.id);
    return json(contacts);
  }

  const conversations = await listConversations(user.id);
  return json(conversations);
}

const schema = z.object({
  participantIds: z.array(z.string().min(1)).min(1),
  body: z.string().optional(),
  subject: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("messages.write");
  if (authError || !user) return authError!;

  const body = await req.json().catch(() => null);
  const parsed = parseBody(schema, body);
  if (parsed.error || !parsed.data) return parsed.error!;

  try {
    const conversation = await startConversation(
      user.id,
      parsed.data.participantIds,
      parsed.data.body,
      parsed.data.subject,
    );
    await writeAudit(user.id, "CREATE", "Conversation", conversation.id);
    return json(conversation, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to start conversation", 400);
  }
}
