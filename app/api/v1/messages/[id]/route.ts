import { error, json, parseBody, requirePermission, writeAudit } from "@/lib/api";
import { getConversation, sendMessage, type MessageAttachmentInput } from "@/lib/messaging";
import { saveUpload } from "@/lib/storage";
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
  body: z.string().optional().default(""),
});

async function collectAttachments(conversationId: string, files: File[]) {
  const attachments: MessageAttachmentInput[] = [];
  for (const file of files.slice(0, 5)) {
    const saved = await saveUpload(file, `messages/${conversationId}`);
    attachments.push({
      name: saved.name,
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      size: saved.size,
    });
  }
  return attachments;
}

export async function POST(req: Request, ctx: Ctx) {
  const { error: authError, user } = await requirePermission("messages.write");
  if (authError || !user) return authError!;

  const { id } = await ctx.params;
  const contentType = req.headers.get("content-type") || "";

  try {
    let bodyText = "";
    let attachments: MessageAttachmentInput[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      bodyText = String(form.get("body") || "");
      const files = form
        .getAll("files")
        .concat(form.getAll("file"))
        .filter((f): f is File => f instanceof File && f.size > 0);
      attachments = await collectAttachments(id, files);
    } else {
      const body = await req.json().catch(() => null);
      const parsed = parseBody(schema, body);
      if (parsed.error || !parsed.data) return parsed.error!;
      bodyText = parsed.data.body || "";
    }

    const message = await sendMessage(user.id, id, bodyText, attachments);
    await writeAudit(user.id, "CREATE", "Message", message.id);
    return json(message, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send message";
    return error(msg, msg.includes("not found") ? 404 : 400);
  }
}
