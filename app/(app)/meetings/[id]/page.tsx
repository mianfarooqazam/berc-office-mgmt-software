"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/utils";

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
  minutes: {
    id: string;
    title: string;
    meetingDate?: string | null;
    attendees?: string | null;
    discussion?: string | null;
    decisions?: string | null;
    actionSummary?: string | null;
    fileName?: string | null;
    filePath?: string | null;
    createdAt: string;
    author: { employee?: { fullName: string } | null; email: string };
  }[];
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [note, setNote] = useState("");
  const [action, setAction] = useState({ title: "", assigneeId: "" });
  const [momMode, setMomMode] = useState<"upload" | "type">("upload");
  const [mom, setMom] = useState({
    title: "",
    meetingDate: "",
    attendees: "",
    discussion: "",
    decisions: "",
    actionSummary: "",
  });

  async function load() {
    const [m, e, me] = await Promise.all([
      api<Meeting>(`/api/v1/meetings/${id}`),
      api<{ id: string; fullName: string }[]>("/api/v1/employees"),
      api<{ role: { permissions: string[] } }>("/api/v1/auth/me"),
    ]);
    setMeeting(m);
    setEmployees(e);
    setCanWrite(me.role.permissions.includes("meetings.write"));
    setMom((prev) => ({
      ...prev,
      title: prev.title || `MoM — ${m.title}`,
      meetingDate: prev.meetingDate || m.startsAt.slice(0, 10),
    }));
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

  async function addMinutes(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!meeting) return;
    const fd = new FormData(e.currentTarget);
    fd.set("title", mom.title);
    fd.set("meetingId", id);
    fd.set("meetingDate", mom.meetingDate);
    if (momMode === "type") {
      fd.set("attendees", mom.attendees);
      fd.set("discussion", mom.discussion);
      fd.set("decisions", mom.decisions);
      fd.set("actionSummary", mom.actionSummary);
      fd.delete("file");
    }

    const res = await fetch("/api/v1/meeting-minutes", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to save minutes");
      return;
    }

    e.currentTarget.reset();
    setMom({
      title: `MoM — ${meeting.title}`,
      meetingDate: meeting.startsAt.slice(0, 10),
      attendees: "",
      discussion: "",
      decisions: "",
      actionSummary: "",
    });
    await load();
  }

  if (!meeting) return <p className="text-sm text-[var(--muted-fg)]">Loading…</p>;

  return (
    <div>
      <PageHeader
        title={meeting.title}
        description={meeting.description || undefined}
        actions={
          <Link href="/meetings/minutes">
            <Button variant="secondary">All meeting minutes</Button>
          </Link>
        }
      />
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

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Meeting minutes (MoM)</h2>
          <Badge tone="info">{meeting.minutes?.length || 0} saved</Badge>
        </div>
        <div className="mb-4 space-y-3">
          {(meeting.minutes || []).map((m) => (
            <div key={m.id} className="rounded-lg bg-[var(--muted)]/40 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{m.title}</p>
                {m.filePath ? <Badge tone="info">File</Badge> : null}
                {m.discussion?.trim() ? <Badge>Typed</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-[var(--muted-fg)]">
                {m.meetingDate ? formatDate(m.meetingDate) : "No date"} ·{" "}
                {m.author.employee?.fullName || m.author.email}
              </p>
              {m.discussion?.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-sm">{m.discussion}</p>
              ) : null}
              {m.decisions?.trim() ? (
                <p className="mt-1 text-sm">
                  <span className="font-medium">Decisions: </span>
                  {m.decisions}
                </p>
              ) : null}
              {m.filePath ? (
                <a
                  href={`/api/v1/files/${m.filePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  Download {m.fileName || "file"}
                </a>
              ) : null}
            </div>
          ))}
          {(meeting.minutes || []).length === 0 ? (
            <p className="text-sm text-[var(--muted-fg)]">
              No minutes for this meeting yet — upload a file or type them below.
            </p>
          ) : null}
        </div>
        {canWrite ? (
          <form onSubmit={addMinutes} className="space-y-2 border-t border-[var(--border)] pt-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--muted)]/50 p-1">
              <button
                type="button"
                onClick={() => setMomMode("upload")}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  momMode === "upload"
                    ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm"
                    : "text-[var(--muted-fg)] hover:text-[var(--fg)]"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setMomMode("type")}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  momMode === "type"
                    ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm"
                    : "text-[var(--muted-fg)] hover:text-[var(--fg)]"
                }`}
              >
                Type minutes
              </button>
            </div>
            <Input
              placeholder="Title"
              value={mom.title}
              onChange={(e) => setMom({ ...mom, title: e.target.value })}
              required
            />
            <Input
              type="date"
              value={mom.meetingDate}
              onChange={(e) => setMom({ ...mom, meetingDate: e.target.value })}
              required
            />
            {momMode === "upload" ? (
              <Input name="file" type="file" accept=".pdf,.doc,.docx" required />
            ) : (
              <>
                <Input
                  placeholder="Attendees"
                  value={mom.attendees}
                  onChange={(e) => setMom({ ...mom, attendees: e.target.value })}
                />
                <Textarea
                  placeholder="Discussion / notes"
                  value={mom.discussion}
                  onChange={(e) => setMom({ ...mom, discussion: e.target.value })}
                  required
                />
                <Textarea
                  placeholder="Decisions"
                  value={mom.decisions}
                  onChange={(e) => setMom({ ...mom, decisions: e.target.value })}
                />
                <Textarea
                  placeholder="Action summary"
                  value={mom.actionSummary}
                  onChange={(e) => setMom({ ...mom, actionSummary: e.target.value })}
                />
              </>
            )}
            <Button type="submit">{momMode === "upload" ? "Upload minutes" : "Save minutes"}</Button>
          </form>
        ) : null}
      </Card>

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
