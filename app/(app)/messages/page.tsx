"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Plus, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api-client";
import { cn, formatDateTime } from "@/lib/utils";

type Contact = { id: string; email: string; fullName: string };

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; email: string; fullName: string };
};

type Conversation = {
  id: string;
  subject: string | null;
  updatedAt: string;
  unreadCount: number;
  participants: Contact[];
  lastMessage: ChatMessage | null;
  messages?: ChatMessage[];
};

function titleFor(c: Conversation) {
  if (c.subject) return c.subject;
  if (c.participants.length) return c.participants.map((p) => p.fullName).join(", ");
  return "Conversation";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const [meId, setMeId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const [list, people, me] = await Promise.all([
      api<Conversation[]>("/api/v1/messages"),
      api<Contact[]>("/api/v1/messages?contacts=1"),
      api<{ id: string }>("/api/v1/auth/me"),
    ]);
    setConversations(list);
    setContacts(people);
    setMeId(me.id);
    setRecipientId((current) => current || people[0]?.id || "");
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    const detail = await api<Conversation>(`/api/v1/messages/${id}`);
    setActive(detail);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  useEffect(() => {
    loadList().catch(console.error);
  }, [loadList]);

  useEffect(() => {
    const fromUrl = searchParams.get("c");
    if (fromUrl) {
      openConversation(fromUrl).catch(console.error);
    }
  }, [searchParams, openConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages?.length]);

  const messages = useMemo(() => active?.messages || [], [active]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await api(`/api/v1/messages/${activeId}`, {
        method: "POST",
        json: { body: draft },
      });
      setDraft("");
      await openConversation(activeId);
      await loadList();
    } finally {
      setSending(false);
    }
  }

  async function startChat(e: FormEvent) {
    e.preventDefault();
    if (!recipientId) return;
    setSending(true);
    try {
      const created = await api<Conversation>("/api/v1/messages", {
        method: "POST",
        json: {
          participantIds: [recipientId],
          body: firstMessage.trim() || undefined,
        },
      });
      setComposeOpen(false);
      setFirstMessage("");
      await loadList();
      await openConversation(created.id);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Direct text messages between team members."
        actions={
          <Button size="sm" onClick={() => setComposeOpen((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New message
          </Button>
        }
      />

      {composeOpen ? (
        <Card className="mb-4">
          <CardHeader>
            <div>
              <CardTitle>New conversation</CardTitle>
              <CardDescription>Start a direct message with a colleague</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={startChat} className="space-y-3">
            <div>
              <label className="ui-label">Recipient</label>
              <Select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select recipient
                </option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.email})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="ui-label">Message</label>
              <Textarea
                placeholder="Write your first message (optional)"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={sending || !recipientId}>
                Start chat
              </Button>
              <Button type="button" variant="ghost" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid min-h-[620px] overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] lg:grid-cols-[340px_1fr]">
        <div className="border-b border-[var(--border)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--border)] bg-[var(--surface-2)]/70 px-5 py-4">
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold">Inbox</p>
            <p className="mt-0.5 text-xs text-[var(--muted-fg)]">
              {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Start a conversation with a teammate."
                />
              </div>
            ) : (
              conversations.map((c) => {
                const selected = c.id === activeId;
                const name = titleFor(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openConversation(c.id).catch(console.error)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-[var(--border)] px-4 py-3.5 text-left transition",
                      selected
                        ? "bg-[color-mix(in_oklab,var(--brand)_9%,transparent)]"
                        : "hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)]/12 text-xs font-bold text-[var(--brand)] ring-1 ring-[var(--brand)]/12">
                      {initials(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{name}</span>
                        {c.unreadCount > 0 ? <Badge tone="info">{c.unreadCount}</Badge> : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted-fg)]">
                        {c.lastMessage?.body || "No messages yet"}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted-fg)]">
                        {formatDateTime(c.lastMessage?.createdAt || c.updatedAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-2)_65%,transparent),transparent_140px)]">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Pick a thread from the inbox or start a new message."
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/80 px-5 py-4 backdrop-blur">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)] text-xs font-bold text-[var(--brand-fg)]">
                  {initials(titleFor(active))}
                </span>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-sm font-semibold">
                    {titleFor(active)}
                  </p>
                  <p className="text-xs text-[var(--muted-fg)]">
                    {active.participants.map((p) => p.fullName).join(", ") || "Direct message"}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6">
                {messages.map((m) => {
                  const mine = m.senderId === meId;
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                          mine
                            ? "rounded-br-md bg-[var(--brand)] text-[var(--brand-fg)]"
                            : "rounded-bl-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
                        )}
                      >
                        {!mine ? (
                          <p className="mb-1 text-[11px] font-semibold text-[var(--brand)]">
                            {m.sender.fullName}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p
                          className={cn(
                            "mt-1.5 text-[10px] font-medium",
                            mine ? "text-[var(--brand-fg)]/70" : "text-[var(--muted-fg)]",
                          )}
                        >
                          {formatDateTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={send}
                className="flex items-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] p-3 md:p-4"
              >
                <Textarea
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  className="min-h-[48px] flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (draft.trim()) {
                        void send(e as unknown as FormEvent);
                      }
                    }
                  }}
                />
                <Button type="submit" disabled={sending || !draft.trim()} className="h-11 w-11 shrink-0 p-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted-fg)]">Loading messages…</p>}>
      <MessagesPageInner />
    </Suspense>
  );
}
