"use client";

import { FormEvent, useEffect, useState } from "react";
import { FileText, Paperclip, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/utils";

type Minutes = {
  id: string;
  title: string;
  meetingDate?: string | null;
  attendees?: string | null;
  discussion?: string | null;
  decisions?: string | null;
  actionSummary?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  createdAt: string;
  author: { employee?: { fullName: string } | null; email: string };
};

type EntryMode = "upload" | "type";

const emptyForm = {
  title: "",
  meetingDate: "",
  attendees: "",
  discussion: "",
  decisions: "",
  actionSummary: "",
};

function formatBytes(size?: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function preview(text?: string | null, max = 180) {
  if (!text?.trim()) return "";
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export default function MeetingMinutesPage() {
  const [items, setItems] = useState<Minutes[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<EntryMode>("upload");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function load(search = q) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const qs = params.toString();
    const [list, me] = await Promise.all([
      api<Minutes[]>(`/api/v1/meeting-minutes${qs ? `?${qs}` : ""}`),
      api<{ role: { permissions: string[] } }>("/api/v1/auth/me"),
    ]);
    setItems(list);
    setCanWrite(me.role.permissions.includes("meetings.write"));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("title", form.title);
      fd.set("meetingDate", form.meetingDate);
      if (mode === "type") {
        fd.set("attendees", form.attendees);
        fd.set("discussion", form.discussion);
        fd.set("decisions", form.decisions);
        fd.set("actionSummary", form.actionSummary);
        fd.delete("file");
      } else {
        fd.delete("attendees");
        fd.delete("discussion");
        fd.delete("decisions");
        fd.delete("actionSummary");
      }

      const res = await fetch("/api/v1/meeting-minutes", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save minutes");
      }

      e.currentTarget.reset();
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save minutes");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete these meeting minutes?")) return;
    await api(`/api/v1/meeting-minutes/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Meeting Minutes"
        description="Upload a Word/PDF or type minutes here — everything lands in one searchable archive."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {canWrite ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Add minutes</CardTitle>
                <CardDescription>Upload a file or type MoM yourself</CardDescription>
              </div>
            </CardHeader>
            <div className="mb-3.5 grid grid-cols-2 gap-1 rounded-lg bg-[var(--muted)]/50 p-1">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  mode === "upload"
                    ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm"
                    : "text-[var(--muted-fg)] hover:text-[var(--fg)]"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setMode("type")}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  mode === "type"
                    ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm"
                    : "text-[var(--muted-fg)] hover:text-[var(--fg)]"
                }`}
              >
                Type minutes
              </button>
            </div>
            <form onSubmit={create} className="space-y-3.5">
              <div>
                <label className="ui-label">Title</label>
                <Input
                  placeholder="e.g. Weekly ops review — 15 Jul"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="ui-label">Meeting date</label>
                <Input
                  type="date"
                  value={form.meetingDate}
                  onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                  required
                />
              </div>

              {mode === "upload" ? (
                <div>
                  <label className="ui-label">Minutes file</label>
                  <Input name="file" type="file" accept=".pdf,.doc,.docx" required />
                  <p className="mt-1 text-xs text-[var(--muted-fg)]">Word or PDF · max 10MB</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="ui-label">Attendees</label>
                    <Input
                      placeholder="Names, comma-separated"
                      value={form.attendees}
                      onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ui-label">Discussion / notes</label>
                    <Textarea
                      rows={5}
                      placeholder="What was discussed…"
                      value={form.discussion}
                      onChange={(e) => setForm({ ...form, discussion: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="ui-label">Decisions</label>
                    <Textarea
                      rows={3}
                      placeholder="Key decisions…"
                      value={form.decisions}
                      onChange={(e) => setForm({ ...form, decisions: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ui-label">Action summary</label>
                    <Textarea
                      rows={3}
                      placeholder="Follow-ups…"
                      value={form.actionSummary}
                      onChange={(e) => setForm({ ...form, actionSummary: e.target.value })}
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : mode === "upload" ? "Upload minutes" : "Save minutes"}
              </Button>
            </form>
          </Card>
        ) : null}

        <div className={canWrite ? "lg:col-span-2 space-y-3" : "lg:col-span-3 space-y-3"}>
          <Card>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                load().catch(console.error);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-fg)]" />
                <Input
                  className="pl-9"
                  placeholder="Search title, notes, decisions, file name…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
          </Card>

          {items.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title={q.trim() ? "No matching minutes" : "No meeting minutes yet"}
                description={
                  q.trim()
                    ? "Try a different search term."
                    : "Upload a Word/PDF or type minutes to get started."
                }
              />
            </Card>
          ) : (
            items.map((m) => {
              const hasText = Boolean(
                m.discussion?.trim() || m.decisions?.trim() || m.actionSummary?.trim(),
              );
              return (
                <Card key={m.id} hover>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
                          {m.title}
                        </h3>
                        {m.filePath ? <Badge tone="info">File</Badge> : null}
                        {hasText ? <Badge>Typed</Badge> : null}
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-[var(--muted-fg)]">
                        {m.meetingDate ? formatDate(m.meetingDate) : "No date"} ·{" "}
                        {m.author.employee?.fullName || m.author.email} ·{" "}
                        {formatDateTime(m.createdAt)}
                      </p>
                      {m.attendees?.trim() ? (
                        <p className="mt-2 text-xs text-[var(--muted-fg)]">
                          Attendees: {m.attendees}
                        </p>
                      ) : null}
                      {m.discussion?.trim() ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--fg)]">
                          {preview(m.discussion)}
                        </p>
                      ) : null}
                      {m.decisions?.trim() ? (
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Decisions: </span>
                          {preview(m.decisions, 120)}
                        </p>
                      ) : null}
                      {m.actionSummary?.trim() ? (
                        <p className="mt-1 text-sm">
                          <span className="font-medium">Actions: </span>
                          {preview(m.actionSummary, 120)}
                        </p>
                      ) : null}
                      {m.filePath ? (
                        <a
                          href={`/api/v1/files/${m.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {m.fileName || "Download file"}
                          {m.fileSize ? (
                            <span className="font-normal text-[var(--muted-fg)]">
                              ({formatBytes(m.fileSize)})
                            </span>
                          ) : null}
                        </a>
                      ) : null}
                    </div>
                    {canWrite ? (
                      <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
