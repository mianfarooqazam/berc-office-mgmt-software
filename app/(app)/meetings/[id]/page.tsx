"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  platform?: string | null;
  meetingUrl?: string | null;
  startsAt: string;
  endsAt: string;
  participants: { employee: { id: string; fullName: string } }[];
  notes: { id: string; content: string; createdAt: string; author: { employee?: { fullName: string } | null; email: string } }[];
  actionItems: { id: string; title: string; status: string; assignee?: { fullName: string } | null }[];
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);
  const [note, setNote] = useState("");
  const [action, setAction] = useState({ title: "", assigneeId: "" });

  async function load() {
    const [m, e] = await Promise.all([
      api<Meeting>(`/api/v1/meetings/${id}`),
      api<{ id: string; fullName: string }[]>("/api/v1/employees"),
    ]);
    setMeeting(m);
    setEmployees(e);
  }

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    await api(`/api/v1/meetings/${id}/notes`, { method: "POST", json: { content: note } });
    setNote("");
    await load();
  }

  async function addAction(e: FormEvent) {
    e.preventDefault();
    await api(`/api/v1/meetings/${id}/action-items`, {
      method: "POST",
      json: { title: action.title, assigneeId: action.assigneeId || null },
    });
    setAction({ title: "", assigneeId: "" });
    await load();
  }

  if (!meeting) return <p className="text-sm text-[var(--muted-fg)]">Loading…</p>;

  return (
    <div>
      <PageHeader title={meeting.title} description={meeting.description || undefined} />
      <p className="mb-2 text-sm text-[var(--muted-fg)]">
        {formatDateTime(meeting.startsAt)} – {formatDateTime(meeting.endsAt)} ·{" "}
        {meeting.location || "No room"}
        {meeting.platform ? ` · ${meeting.platform.replaceAll("_", " ")}` : ""}
      </p>
      {meeting.meetingUrl ? (
        <a
          href={meeting.meetingUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-4 inline-flex text-sm font-medium text-[var(--brand)] hover:underline"
        >
          Join meeting
        </a>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {meeting.participants.map((p) => (
          <Badge key={p.employee.id}>{p.employee.fullName}</Badge>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Meeting notes</h2>
          <div className="mb-4 space-y-3">
            {meeting.notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-[var(--muted)]/40 px-3 py-2 text-sm">
                <p>{n.content}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">
                  {n.author.employee?.fullName || n.author.email} · {formatDateTime(n.createdAt)}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={addNote} className="space-y-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} required />
            <Button type="submit">Add note</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Action items</h2>
          <div className="mb-4 space-y-2">
            {meeting.actionItems.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {a.title}
                  {a.assignee ? ` · ${a.assignee.fullName}` : ""}
                </span>
                <Badge>{a.status}</Badge>
              </div>
            ))}
          </div>
          <form onSubmit={addAction} className="space-y-2">
            <Input
              placeholder="Action item"
              value={action.title}
              onChange={(e) => setAction({ ...action, title: e.target.value })}
              required
            />
            <Select
              value={action.assigneeId}
              onChange={(e) => setAction({ ...action, assigneeId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
            <Button type="submit">Add action item</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
