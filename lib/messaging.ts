import { randomUUID } from "crypto";
import { getSupabaseAdmin, isDemoMode } from "./supabase";
import { toCamel } from "./mappers";
import { listDemoUsers, findDemoUserById } from "./demo-store";
import { notifyUser } from "./notifications";

export type MessageContact = {
  id: string;
  email: string;
  fullName: string;
};

export type MessageAttachment = {
  id: string;
  name: string;
  filePath: string;
  mimeType: string | null;
  size: number | null;
};

export type MessageAttachmentInput = {
  name: string;
  filePath: string;
  mimeType: string;
  size: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; email: string; fullName: string };
  attachments: MessageAttachment[];
};

export type ConversationSummary = {
  id: string;
  subject: string | null;
  updatedAt: string;
  unreadCount: number;
  participants: MessageContact[];
  lastMessage: ChatMessage | null;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[];
};

type DemoMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  attachments: MessageAttachment[];
};

type DemoConversation = {
  id: string;
  subject: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  participantIds: string[];
  lastReadAt: Record<string, string>;
  messages: DemoMessage[];
};

const globalStore = globalThis as unknown as {
  __bercMessagesV3?: DemoConversation[];
};

function demoStore(): DemoConversation[] {
  if (!globalStore.__bercMessagesV3) {
    globalStore.__bercMessagesV3 = [];
  }
  return globalStore.__bercMessagesV3;
}

function contactFromDemo(userId: string): MessageContact {
  const a = findDemoUserById(userId);
  return {
    id: userId,
    email: a?.email || userId,
    fullName: a?.employee.fullName || a?.email || userId,
  };
}

function mapDemoMessage(m: DemoMessage): ChatMessage {
  const sender = contactFromDemo(m.senderId);
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt,
    sender: { id: sender.id, email: sender.email, fullName: sender.fullName },
    attachments: m.attachments || [],
  };
}

export function messagePreviewText(message: {
  body?: string | null;
  attachments?: Array<{ name: string }> | null;
}) {
  const text = message.body?.trim();
  if (text) return text;
  const attachments = message.attachments || [];
  if (attachments.length === 1) return `📎 ${attachments[0].name}`;
  if (attachments.length > 1) return `📎 ${attachments.length} attachments`;
  return "Message";
}

function summarizeDemo(c: DemoConversation, userId: string): ConversationSummary {
  const last = c.messages[c.messages.length - 1] || null;
  const lastRead = c.lastReadAt[userId] ? new Date(c.lastReadAt[userId]).getTime() : 0;
  const unreadCount = c.messages.filter(
    (m) => m.senderId !== userId && new Date(m.createdAt).getTime() > lastRead,
  ).length;

  return {
    id: c.id,
    subject: c.subject,
    updatedAt: c.updatedAt,
    unreadCount,
      participants: c.participantIds
      .filter((id) => id !== userId)
      .map(contactFromDemo),
    lastMessage: last
      ? {
          ...mapDemoMessage(last),
          body: messagePreviewText(last),
        }
      : null,
  };
}

async function contactFromDb(userId: string): Promise<MessageContact> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("users")
    .select("id, email, employee:employees(full_name)")
    .eq("id", userId)
    .maybeSingle();

  const camel = toCamel<{
    id: string;
    email: string;
    employee: { fullName: string } | { fullName: string }[] | null;
  } | null>(data);

  const emp = Array.isArray(camel?.employee) ? camel?.employee[0] : camel?.employee;
  return {
    id: userId,
    email: camel?.email || userId,
    fullName: emp?.fullName || camel?.email || userId,
  };
}

export async function listMessageContacts(userId: string): Promise<MessageContact[]> {
  if (isDemoMode()) {
    return listDemoUsers()
      .filter((a) => a.id !== userId)
      .map((a) => ({
        id: a.id,
        email: a.email,
        fullName: a.employee.fullName,
      }));
  }

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("users")
    .select("id, email, employee:employees(full_name)")
    .eq("is_active", true)
    .neq("id", userId);

  return (data || []).map((row) => {
    const camel = toCamel<{
      id: string;
      email: string;
      employee: { fullName: string } | { fullName: string }[] | null;
    }>(row);
    const emp = Array.isArray(camel.employee) ? camel.employee[0] : camel.employee;
    return {
      id: camel.id,
      email: camel.email,
      fullName: emp?.fullName || camel.email,
    };
  });
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  if (isDemoMode()) {
    return demoStore()
      .filter((c) => c.participantIds.includes(userId))
      .map((c) => summarizeDemo(c, userId))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }

  const db = getSupabaseAdmin();
  const { data: parts } = await db
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  const ids = (parts || []).map((p) => p.conversation_id as string);
  if (!ids.length) return [];

  const lastReadMap = Object.fromEntries(
    (parts || []).map((p) => [p.conversation_id as string, p.last_read_at as string | null]),
  );

  const { data: convs } = await db
    .from("conversations")
    .select(
      `
      *,
      participants:conversation_participants(user_id, user:users(id, email, employee:employees(full_name))),
      messages(*, attachments:message_attachments(*))
    `,
    )
    .in("id", ids)
    .order("updated_at", { ascending: false });

  const result: ConversationSummary[] = [];
  for (const raw of convs || []) {
    const c = toCamel<{
      id: string;
      subject: string | null;
      updatedAt: string;
      participants: Array<{
        userId: string;
        user: {
          id: string;
          email: string;
          employee: { fullName: string } | { fullName: string }[] | null;
        };
      }>;
      messages: Array<{
        id: string;
        conversationId: string;
        senderId: string;
        body: string;
        createdAt: string;
        attachments?: MessageAttachment[];
      }>;
    }>(raw);

    const messages = [...(c.messages || [])].sort(
      (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
    );
    const last = messages[messages.length - 1] || null;
    const lastRead = lastReadMap[c.id] ? new Date(lastReadMap[c.id]!).getTime() : 0;
    const unreadCount = messages.filter(
      (m) => m.senderId !== userId && new Date(m.createdAt).getTime() > lastRead,
    ).length;

    const participants: MessageContact[] = (c.participants || [])
      .filter((p) => p.userId !== userId)
      .map((p) => {
        const emp = Array.isArray(p.user.employee) ? p.user.employee[0] : p.user.employee;
        return {
          id: p.user.id,
          email: p.user.email,
          fullName: emp?.fullName || p.user.email,
        };
      });

    let lastMessage: ChatMessage | null = null;
    if (last) {
      const sender = await contactFromDb(last.senderId);
      const attachments = last.attachments || [];
      lastMessage = {
        id: last.id,
        conversationId: last.conversationId || c.id,
        senderId: last.senderId,
        body: messagePreviewText({ body: last.body, attachments }),
        createdAt: last.createdAt,
        sender: { id: sender.id, email: sender.email, fullName: sender.fullName },
        attachments,
      };
    }

    result.push({
      id: c.id,
      subject: c.subject,
      updatedAt: c.updatedAt,
      unreadCount,
      participants,
      lastMessage,
    });
  }

  return result;
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  if (isDemoMode()) {
    const c = demoStore().find(
      (x) => x.id === conversationId && x.participantIds.includes(userId),
    );
    if (!c) return null;
    c.lastReadAt[userId] = new Date().toISOString();
    const summary = summarizeDemo(c, userId);
    return {
      ...summary,
      unreadCount: 0,
      messages: c.messages.map(mapDemoMessage),
    };
  }

  const db = getSupabaseAdmin();
  const { data: part } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!part) return null;

  await db
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  const { data: raw } = await db
    .from("conversations")
    .select(
      `
      *,
      participants:conversation_participants(user_id, user:users(id, email, employee:employees(full_name))),
      messages(*, attachments:message_attachments(*))
    `,
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (!raw) return null;

  const c = toCamel<{
    id: string;
    subject: string | null;
    updatedAt: string;
    participants: Array<{
      userId: string;
      user: {
        id: string;
        email: string;
        employee: { fullName: string } | { fullName: string }[] | null;
      };
    }>;
    messages: Array<{
      id: string;
      conversationId: string;
      senderId: string;
      body: string;
      createdAt: string;
      attachments?: MessageAttachment[];
    }>;
  }>(raw);

  const messagesSorted = [...(c.messages || [])].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );

  const messages: ChatMessage[] = await Promise.all(
    messagesSorted.map(async (m) => {
      const sender = await contactFromDb(m.senderId);
      return {
        id: m.id,
        conversationId: m.conversationId || c.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt,
        sender: { id: sender.id, email: sender.email, fullName: sender.fullName },
        attachments: m.attachments || [],
      };
    }),
  );

  const participants: MessageContact[] = (c.participants || [])
    .filter((p) => p.userId !== userId)
    .map((p) => {
      const emp = Array.isArray(p.user.employee) ? p.user.employee[0] : p.user.employee;
      return {
        id: p.user.id,
        email: p.user.email,
        fullName: emp?.fullName || p.user.email,
      };
    });

  return {
    id: c.id,
    subject: c.subject,
    updatedAt: c.updatedAt,
    unreadCount: 0,
    participants,
    lastMessage: messages[messages.length - 1] || null,
    messages,
  };
}

async function findExistingDm(userId: string, otherUserId: string): Promise<string | null> {
  if (isDemoMode()) {
    const found = demoStore().find(
      (c) =>
        c.participantIds.length === 2 &&
        c.participantIds.includes(userId) &&
        c.participantIds.includes(otherUserId),
    );
    return found?.id ?? null;
  }

  const db = getSupabaseAdmin();
  const { data: mine } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);
  const myIds = (mine || []).map((p) => p.conversation_id as string);
  if (!myIds.length) return null;

  const { data: theirs } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", otherUserId)
    .in("conversation_id", myIds);

  for (const row of theirs || []) {
    const cid = row.conversation_id as string;
    const { data: parts, count } = await db
      .from("conversation_participants")
      .select("*", { count: "exact" })
      .eq("conversation_id", cid);
    if ((count ?? parts?.length ?? 0) === 2) return cid;
  }
  return null;
}

export async function startConversation(
  userId: string,
  participantUserIds: string[],
  body?: string,
  subject?: string | null,
  attachments: MessageAttachmentInput[] = [],
): Promise<ConversationDetail> {
  const others = [...new Set(participantUserIds.filter((id) => id && id !== userId))];
  if (!others.length) throw new Error("Select at least one recipient");

  if (others.length === 1) {
    const existing = await findExistingDm(userId, others[0]);
    if (existing) {
      if (body?.trim() || attachments.length) {
        await sendMessage(userId, existing, body || "", attachments);
      }
      const detail = await getConversation(userId, existing);
      if (!detail) throw new Error("Conversation not found");
      return detail;
    }
  }

  const now = new Date().toISOString();
  const allIds = [userId, ...others];
  let convId = "";

  if (isDemoMode()) {
    convId = randomUUID();
    const conv: DemoConversation = {
      id: convId,
      subject: subject || null,
      createdById: userId,
      createdAt: now,
      updatedAt: now,
      participantIds: allIds,
      lastReadAt: Object.fromEntries(allIds.map((id) => [id, now])),
      messages: [],
    };
    demoStore().unshift(conv);
  } else {
    const db = getSupabaseAdmin();
    const { data: created, error } = await db
      .from("conversations")
      .insert({
        subject: subject || null,
        created_by_id: userId,
        updated_at: now,
      })
      .select()
      .single();
    if (error || !created) throw new Error(error?.message || "Failed to create conversation");

    convId = created.id as string;
    await db.from("conversation_participants").insert(
      allIds.map((uid) => ({
        conversation_id: convId,
        user_id: uid,
        last_read_at: uid === userId ? now : null,
      })),
    );
  }

  if (body?.trim() || attachments.length) {
    await sendMessage(userId, convId, body || "", attachments);
  } else {
    const sender = isDemoMode() ? contactFromDemo(userId) : await contactFromDb(userId);
    for (const uid of others) {
      await notifyUser({
        userId: uid,
        title: "New message",
        body: `${sender.fullName} started a conversation`,
        link: `/messages?c=${convId}`,
      });
    }
  }

  const detail = await getConversation(userId, convId);
  if (!detail) throw new Error("Failed to load conversation");
  return detail;
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  body: string,
  attachments: MessageAttachmentInput[] = [],
): Promise<ChatMessage> {
  const text = body.trim();
  if (!text && attachments.length === 0) {
    throw new Error("Message cannot be empty");
  }

  const preview = messagePreviewText({ body: text, attachments });

  if (isDemoMode()) {
    const c = demoStore().find(
      (x) => x.id === conversationId && x.participantIds.includes(userId),
    );
    if (!c) throw new Error("Conversation not found");
    const now = new Date().toISOString();
    const msg: DemoMessage = {
      id: randomUUID(),
      conversationId,
      senderId: userId,
      body: text,
      createdAt: now,
      attachments: attachments.map((a) => ({
        id: randomUUID(),
        name: a.name,
        filePath: a.filePath,
        mimeType: a.mimeType,
        size: a.size,
      })),
    };
    c.messages.push(msg);
    c.updatedAt = now;
    c.lastReadAt[userId] = now;

    const sender = contactFromDemo(userId);
    for (const uid of c.participantIds.filter((id) => id !== userId)) {
      await notifyUser({
        userId: uid,
        title: `Message from ${sender.fullName}`,
        body: preview.slice(0, 120),
        link: `/messages?c=${conversationId}`,
      });
    }
    return mapDemoMessage(msg);
  }

  const db = getSupabaseAdmin();
  const { data: part } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!part) throw new Error("Conversation not found");

  const now = new Date().toISOString();
  const { data: msg, error } = await db
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
    })
    .select()
    .single();
  if (error || !msg) throw new Error(error?.message || "Failed to send");

  const messageId = msg.id as string;
  let savedAttachments: MessageAttachment[] = [];
  if (attachments.length) {
    const { data: rows, error: attError } = await db
      .from("message_attachments")
      .insert(
        attachments.map((a) => ({
          message_id: messageId,
          name: a.name,
          file_path: a.filePath,
          mime_type: a.mimeType,
          size: a.size,
        })),
      )
      .select();
    if (attError) throw new Error(attError.message);
    savedAttachments = toCamel<MessageAttachment[]>(rows || []);
  }

  await db.from("conversations").update({ updated_at: now }).eq("id", conversationId);
  await db
    .from("conversation_participants")
    .update({ last_read_at: now })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  const sender = await contactFromDb(userId);
  const { data: others } = await db
    .from("conversation_participants")
    .select("user_id, user:users(email)")
    .eq("conversation_id", conversationId)
    .neq("user_id", userId);

  for (const row of others || []) {
    const camel = toCamel<{ userId: string; user: { email: string } | { email: string }[] }>(row);
    const u = Array.isArray(camel.user) ? camel.user[0] : camel.user;
    await notifyUser({
      userId: camel.userId,
      title: `Message from ${sender.fullName}`,
      body: preview.slice(0, 120),
      link: `/messages?c=${conversationId}`,
      email: u?.email,
    });
  }

  const mapped = toCamel<{
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
  }>(msg);

  return {
    ...mapped,
    sender: { id: sender.id, email: sender.email, fullName: sender.fullName },
    attachments: savedAttachments,
  };
}
