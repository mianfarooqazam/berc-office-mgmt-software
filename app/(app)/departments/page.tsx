"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";

type Employee = { id: string; fullName: string };
type Department = {
  id: string;
  name: string;
  description?: string | null;
  manager?: Employee | null;
  _count: { employees: number };
  employees?: Employee[];
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "", managerId: "" });

  async function load() {
    const [deps, emps] = await Promise.all([
      api<Department[]>("/api/v1/departments"),
      api<Employee[]>("/api/v1/employees"),
    ]);
    setDepartments(deps);
    setEmployees(emps);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createDept(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/departments", {
      method: "POST",
      json: { ...form, managerId: form.managerId || null },
    });
    setForm({ name: "", description: "", managerId: "" });
    await load();
  }

  async function openDept(id: string) {
    const dept = await api<Department>(`/api/v1/departments/${id}`);
    setSelected(dept);
  }

  async function saveSelected(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const data = new FormData(e.currentTarget);
    await api(`/api/v1/departments/${selected.id}`, {
      method: "PATCH",
      json: {
        name: data.get("name"),
        description: data.get("description"),
        managerId: data.get("managerId") || null,
      },
    });
    await load();
    await openDept(selected.id);
  }

  async function remove(id: string) {
    if (!confirm("Delete department?")) return;
    await api(`/api/v1/departments/${id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  return (
    <div>
      <PageHeader title="Departments" description="Organize teams and managers" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold">Add department</h2>
          <form onSubmit={createDept} className="space-y-3">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Select
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
            >
              <option value="">No manager</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
            <Button type="submit">Create</Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Employees</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr
                  key={d.id}
                  className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--muted)]/40"
                  onClick={() => openDept(d.id)}
                >
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">{d.manager?.fullName || "—"}</td>
                  <td className="px-4 py-3">{d._count.employees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {selected ? (
        <Card className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{selected.name}</h2>
            <Button variant="danger" size="sm" onClick={() => remove(selected.id)}>
              Delete
            </Button>
          </div>
          <form onSubmit={saveSelected} className="mb-4 grid gap-3 md:grid-cols-3">
            <Input name="name" defaultValue={selected.name} required />
            <Input name="description" defaultValue={selected.description || ""} />
            <Select name="managerId" defaultValue={selected.manager?.id || ""}>
              <option value="">No manager</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
            <Button type="submit">Save</Button>
          </form>
          <h3 className="mb-2 text-sm font-medium">Employees in department</h3>
          <ul className="space-y-1 text-sm">
            {(selected.employees || []).map((e) => (
              <li key={e.id}>{e.fullName}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
