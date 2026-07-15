"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api-client";

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  status: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    phone: "",
    designation: "",
    createLogin: true,
  });

  async function load() {
    setEmployees(await api<Employee[]>(`/api/v1/employees?q=${encodeURIComponent(q)}`));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/employees", {
      method: "POST",
      json: form,
    });
    setShowForm(false);
    setForm({
      employeeId: "",
      fullName: "",
      email: "",
      phone: "",
      designation: "",
      createLogin: true,
    });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage profiles and employment records."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? "Close form" : "Add employee"}
          </Button>
        }
      />

      <Card className="mb-4">
        <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-fg)]" />
            <Input
              className="pl-9"
              placeholder="Search name, email, or employee ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {showForm ? (
        <Card className="mb-4">
          <CardHeader>
            <div>
              <CardTitle>New employee</CardTitle>
              <CardDescription>Create a profile and optional login access</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Employee ID"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
            />
            <Input
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              placeholder="Designation"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              className="md:col-span-2"
            />
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.createLogin}
                onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
              />
              Create login (default password Welcome@123)
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Save employee</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <CardTitle>Directory</CardTitle>
          <CardDescription>{employees.length} people in the organization</CardDescription>
        </div>
        {employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description="Try a different search or add your first employee."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table min-w-[760px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td className="font-medium text-[var(--muted-fg)]">{e.employeeId}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-xs font-semibold text-[var(--brand)]">
                          {e.fullName
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <div>
                          <Link
                            href={`/employees/${e.id}`}
                            className="font-medium text-[var(--foreground)] hover:text-[var(--brand)]"
                          >
                            {e.fullName}
                          </Link>
                          <div className="text-xs text-[var(--muted-fg)]">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{e.designation || "—"}</td>
                    <td>
                      <Badge tone={e.status === "ACTIVE" ? "success" : "neutral"}>{e.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
