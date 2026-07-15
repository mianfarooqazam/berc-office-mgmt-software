"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Employee = { id: string; fullName: string };
type Meeting = {
  id: string;
  title: string;
  location?: string | null;
  platform?: string | null;
  meetingUrl?: string | null;
  startsAt: string;
  endsAt: string;
  participants: { employee: Employee }[];
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    platform: "GOOGLE_MEET",
    startsAt: "",
    endsAt: "",
    participantIds: [] as string[],
  });

  async function load() {
    const [m, e] = await Promise.all([
      api<Meeting[]>("/api/v1/meetings"),
      api<Employee[]>("/api/v1/employees"),
    ]);
    setMeetings(m);
    setEmployees(e);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/meetings", { method: "POST", json: form });
    setForm({
      title: "",
      description: "",
      location: "",
      platform: "GOOGLE_MEET",
      startsAt: "",
      endsAt: "",
      participantIds: [],
    });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Schedule with Google Meet or Microsoft Teams when integrations are connected."
        actions={
          <Link href="/integrations">
            <Button variant="secondary">Manage integrations</Button>
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Schedule meeting</CardTitle>
              <CardDescription>Pick Meet or Teams for a join link</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={create} className="space-y-3">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
              <option value="IN_PERSON">In person</option>
              <option value="OTHER">Other / custom link</option>
            </Select>
            <Input
              placeholder="Room / location (optional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
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
            <Select
              multiple
              className="h-28"
              value={form.participantIds}
              onChange={(e) =>
                setForm({
                  ...form,
                  participantIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                })
              }
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </Select>
            <Button type="submit">Schedule</Button>
          </form>
        </Card>
        <Card className="lg:col-span-2 space-y-2">
          <CardHeader>
            <div>
              <CardTitle>Upcoming & past</CardTitle>
              <CardDescription>{meetings.length} meetings</CardDescription>
            </div>
          </CardHeader>
          {meetings.map((m) => (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 transition hover:border-[var(--brand)]/25"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{m.title}</p>
                {m.platform ? <Badge tone="info">{m.platform.replaceAll("_", " ")}</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-[var(--muted-fg)]">
                {formatDateTime(m.startsAt)} · {m.location || "No room"} · {m.participants.length}{" "}
                participants
              </p>
              {m.meetingUrl ? (
                <p className="mt-1 truncate text-xs text-[var(--brand)]">{m.meetingUrl}</p>
              ) : null}
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
