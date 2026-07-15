"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/utils";

type CalendarData = {
  holidays: { id: string; name: string; date: string }[];
  meetings: { id: string; title: string; startsAt: string; endsAt: string; platform?: string | null }[];
  events: { id: string; title: string; description?: string | null; startsAt: string; endsAt: string }[];
  tasks: { id: string; title: string; dueDate?: string | null; priority: string; status: string }[];
};

export default function CalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [form, setForm] = useState({ title: "", description: "", startsAt: "", endsAt: "" });

  async function load() {
    setData(await api<CalendarData>("/api/v1/calendar"));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createEvent(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/calendar/events", { method: "POST", json: form });
    setForm({ title: "", description: "", startsAt: "", endsAt: "" });
    await load();
  }

  if (!data) return <p className="text-sm text-[var(--muted-fg)]">Loading…</p>;

  return (
    <div>
      <PageHeader title="Calendar" description="Holidays, meetings, task due dates, and office events" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Task due dates</CardTitle>
              <CardDescription>Open work on the calendar</CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-2 text-sm">
            {data.tasks.length === 0 ? (
              <p className="text-[var(--muted-fg)]">No upcoming task due dates</p>
            ) : (
              data.tasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 hover:bg-[var(--muted)]/40"
                >
                  <span className="font-medium">{t.title}</span>
                  <span className="text-[var(--muted-fg)]">{formatDate(t.dueDate)}</span>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Holidays</CardTitle>
              <CardDescription>Company holidays</CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-2 text-sm">
            {data.holidays.map((h) => (
              <div key={h.id} className="flex justify-between">
                <span>{h.name}</span>
                <Badge tone="info">{formatDate(h.date)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Meetings</CardTitle>
              <CardDescription>Scheduled sessions</CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-2 text-sm">
            {data.meetings.map((m) => (
              <div key={m.id}>
                <p className="font-medium">{m.title}</p>
                <p className="text-[var(--muted-fg)]">
                  {formatDateTime(m.startsAt)}
                  {m.platform ? ` · ${m.platform.replaceAll("_", " ")}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Office events</CardTitle>
              <CardDescription>Internal events</CardDescription>
            </div>
          </CardHeader>
          <div className="mb-4 space-y-2 text-sm">
            {data.events.map((e) => (
              <div key={e.id}>
                <p className="font-medium">{e.title}</p>
                <p className="text-[var(--muted-fg)]">{formatDateTime(e.startsAt)}</p>
              </div>
            ))}
          </div>
          <form onSubmit={createEvent} className="space-y-2 border-t border-[var(--border)] pt-3">
            <Input
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              required
            />
            <Button type="submit">Add event</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
