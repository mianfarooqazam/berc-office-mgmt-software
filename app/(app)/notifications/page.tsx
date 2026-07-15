"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    setItems(await api<Notification[]>("/api/v1/notifications"));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function markAll() {
    await api("/api/v1/notifications", { method: "PATCH" });
    await load();
  }

  async function markOne(id: string) {
    await api(`/api/v1/notifications/${id}`, { method: "PATCH" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="In-app alerts for tasks, meetings, and announcements"
        actions={
          <Button variant="secondary" onClick={markAll}>
            Mark all read
          </Button>
        }
      />
      <div className="space-y-2">
        {items.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--muted-fg)]">No notifications yet</p>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} className={n.isRead ? "opacity-70" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.isRead ? <Badge tone="info">New</Badge> : null}
                  </div>
                  {n.body ? <p className="mt-1 text-sm text-[var(--muted-fg)]">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-[var(--muted-fg)]">{formatDateTime(n.createdAt)}</p>
                  {n.link ? (
                    <Link href={n.link} className="mt-2 inline-block text-sm text-[var(--brand)] hover:underline">
                      Open
                    </Link>
                  ) : null}
                </div>
                {!n.isRead ? (
                  <Button size="sm" variant="ghost" onClick={() => markOne(n.id)}>
                    Mark read
                  </Button>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
