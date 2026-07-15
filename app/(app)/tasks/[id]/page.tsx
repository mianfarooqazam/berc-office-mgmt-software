"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  assignees: { employee: { id: string; fullName: string } }[];
  comments: { id: string; body: string; createdAt: string; user: { employee?: { fullName: string } | null; email: string } }[];
  attachments: { id: string; name: string; filePath: string }[];
  activities: { id: string; message: string; createdAt: string }[];
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [comment, setComment] = useState("");

  async function load() {
    setTask(await api<Task>(`/api/v1/tasks/${id}`));
  }

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  async function updateStatus(status: string) {
    await api(`/api/v1/tasks/${id}`, { method: "PATCH", json: { status } });
    await load();
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    await api(`/api/v1/tasks/${id}/comments`, { method: "POST", json: { body: comment } });
    setComment("");
    await load();
  }

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/v1/tasks/${id}/attachments`, { method: "POST", body: fd, credentials: "include" });
    e.currentTarget.reset();
    await load();
  }

  if (!task) return <p className="text-sm text-[var(--muted-fg)]">Loading…</p>;

  return (
    <div>
      <PageHeader
        title={task.title}
        description={task.description || "No description"}
        actions={
          <Select value={task.status} onChange={(e) => updateStatus(e.target.value)} className="w-44">
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>{task.priority}</Badge>
        <Badge tone="info">{task.status}</Badge>
        <Badge tone="neutral">
          {task.assignees.map((a) => a.employee.fullName).join(", ") || "Unassigned"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Comments</h2>
          <div className="mb-4 space-y-3">
            {task.comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-[var(--muted)]/40 px-3 py-2 text-sm">
                <p className="font-medium">{c.user.employee?.fullName || c.user.email}</p>
                <p className="mt-1">{c.body}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">{formatDateTime(c.createdAt)}</p>
              </div>
            ))}
          </div>
          <form onSubmit={addComment} className="space-y-2">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} required />
            <Button type="submit">Add comment</Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Attachments</h2>
            <form onSubmit={upload} className="mb-3 space-y-2">
              <Input type="file" name="file" required />
              <Button type="submit" variant="secondary" size="sm">
                Upload
              </Button>
            </form>
            <div className="space-y-1 text-sm">
              {task.attachments.map((a) => (
                <a key={a.id} href={`/api/v1/files/${a.filePath}`} className="block text-[var(--brand)] hover:underline" target="_blank">
                  {a.name}
                </a>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Activity</h2>
            <div className="space-y-2 text-sm">
              {task.activities.map((a) => (
                <div key={a.id}>
                  <p>{a.message}</p>
                  <p className="text-xs text-[var(--muted-fg)]">{formatDateTime(a.createdAt)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
