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
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { CheckSquare } from "lucide-react";

type Employee = { id: string; fullName: string };
type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  assignees: { employee: Employee }[];
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assigneeIds: [] as string[],
  });

  async function load() {
    const [t, e] = await Promise.all([
      api<Task[]>(`/api/v1/tasks${status ? `?status=${status}` : ""}`),
      api<Employee[]>("/api/v1/employees"),
    ]);
    setTasks(t);
    setEmployees(e);
  }

  useEffect(() => {
    load().catch(console.error);
  }, [status]);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/tasks", {
      method: "POST",
      json: { ...form, dueDate: form.dueDate || null },
    });
    setForm({ title: "", description: "", priority: "MEDIUM", dueDate: "", assigneeIds: [] });
    await load();
  }

  return (
    <div>
      <PageHeader title="Tasks" description="Assign work, track progress, and keep teams aligned." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Create task</CardTitle>
              <CardDescription>Assign owners and set priority</CardDescription>
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
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
            <Select
              multiple
              className="h-28"
              value={form.assigneeIds}
              onChange={(e) =>
                setForm({
                  ...form,
                  assigneeIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                })
              }
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </Select>
            <Button type="submit">Create</Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>All tasks</CardTitle>
              <CardDescription>{tasks.length} items in this view</CardDescription>
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
              <option value="">All statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </CardHeader>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="No tasks yet" description="Create a task to get started." />
            ) : (
              tasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 transition hover:border-[var(--brand)]/25 hover:bg-[var(--brand)]/5"
                >
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-fg)]">
                      Due {formatDate(t.dueDate)} ·{" "}
                      {t.assignees.map((a) => a.employee.fullName).join(", ") || "Unassigned"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={t.priority === "HIGH" ? "danger" : "neutral"}>{t.priority}</Badge>
                    <Badge tone={t.status === "COMPLETED" ? "success" : "info"}>
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
