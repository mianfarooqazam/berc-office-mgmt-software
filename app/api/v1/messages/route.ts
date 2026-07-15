import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import {
  listConversations,
  listMessageContacts,
  startConversation,
  type MessageAttachmentInput,
} from "@/lib/messaging";
import { saveUpload } from "@/lib/storage";
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

async function filesFromForm(form: FormData, folder: string) {
  const files = form
    .getAll("files")
    .concat(form.getAll("file"))
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 5);

  const attachments: MessageAttachmentInput[] = [];
  for (const file of files) {
    const saved = await saveUpload(file, folder);
    attachments.push({
      name: saved.name,
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      size: saved.size,
    });
  }
  return attachments;
}

export async function POST(req: Request) {
  const { error: authError, user } = await requirePermission("messages.write");
  if (authError || !user) return authError!;

  const contentType = req.headers.get("content-type") || "";

  try {
    let participantIds: string[] = [];
    let bodyText = "";
    let subject: string | null = null;
    let attachments: MessageAttachmentInput[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const rawParticipants = form.getAll("participantIds").map(String).filter(Boolean);
      const single = form.get("participantId");
      if (single) rawParticipants.push(String(single));
      participantIds = [...new Set(rawParticipants)];
      bodyText = String(form.get("body") || "");
      subject = form.get("subject") ? String(form.get("subject")) : null;
      attachments = await filesFromForm(form, "messages/new");
      if (!participantIds.length) return error("Select at least one recipient", 400);
    } else {
      const body = await req.json().catch(() => null);
      const parsed = parseBody(schema, body);
      if (parsed.error || !parsed.data) return parsed.error!;
      participantIds = parsed.data.participantIds;
      bodyText = parsed.data.body || "";
      subject = parsed.data.subject ?? null;
    }

    const conversation = await startConversation(
      user.id,
      participantIds,
      bodyText,
      subject,
      attachments,
    );
    await writeAudit(user.id, "CREATE", "Conversation", conversation.id);
    return json(conversation, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to start conversation", 400);
  }
}
