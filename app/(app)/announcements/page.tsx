"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: string;
  author: { employee?: { fullName: string } | null; email: string };
};

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [canWrite, setCanWrite] = useState(false);

  async function load() {
    const [list, me] = await Promise.all([
      api<Announcement[]>("/api/v1/announcements"),
      api<{ role: { permissions: string[] } }>("/api/v1/auth/me"),
    ]);
    setItems(list);
    setCanWrite(me.role.permissions.includes("announcements.write"));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/announcements", { method: "POST", json: form });
    setForm({ title: "", body: "", pinned: false });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete announcement?")) return;
    await api(`/api/v1/announcements/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Announcements" description="Company notice board for team-wide updates." />
      <div className="grid gap-4 lg:grid-cols-3">
        {canWrite ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Post announcement</CardTitle>
                <CardDescription>Share updates with everyone</CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={create} className="space-y-3.5">
              <div>
                <label className="ui-label">Title</label>
                <Input
                  placeholder="Announcement title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="ui-label">Message</label>
                <Textarea
                  placeholder="Write the update…"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
              </div>
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--brand)]"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                />
                Pin to top
              </label>
              <Button type="submit" className="w-full">
                Publish
              </Button>
            </form>
          </Card>
        ) : null}

        <div className={canWrite ? "lg:col-span-2 space-y-3" : "lg:col-span-3 space-y-3"}>
          {items.map((a) => (
            <Card key={a.id} hover>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
                      {a.title}
                    </h3>
                    {a.pinned ? <Badge tone="info">Pinned</Badge> : null}
                  </div>
                  <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted-fg)]">
                    {a.body}
                  </p>
                  <p className="mt-4 text-xs font-medium text-[var(--muted-fg)]">
                    {a.author.employee?.fullName || a.author.email} · {formatDateTime(a.publishedAt)}
                  </p>
                </div>
                {canWrite ? (
                  <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
