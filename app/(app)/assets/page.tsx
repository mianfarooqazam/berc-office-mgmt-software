"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const CATEGORIES = ["Laptop", "Computer", "Monitor", "Printer", "Furniture", "Office Equipment"];

type Employee = { id: string; fullName: string };
type Asset = {
  id: string;
  assetId: string;
  name: string;
  category: string;
  status: string;
  purchaseDate?: string | null;
  warrantyUntil?: string | null;
  assignedTo?: Employee | null;
  maintenance?: { id: string; description: string; cost?: number | null; performedAt: string }[];
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    assetId: "",
    name: "",
    category: "Laptop",
    assignedToId: "",
    purchaseDate: "",
    warrantyUntil: "",
  });
  const [maint, setMaint] = useState({ description: "", cost: "" });

  async function load() {
    const [a, e] = await Promise.all([
      api<Asset[]>(`/api/v1/assets?q=${encodeURIComponent(q)}`),
      api<Employee[]>("/api/v1/employees"),
    ]);
    setAssets(a);
    setEmployees(e);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/assets", {
      method: "POST",
      json: {
        ...form,
        assignedToId: form.assignedToId || null,
        purchaseDate: form.purchaseDate || null,
        warrantyUntil: form.warrantyUntil || null,
      },
    });
    setForm({
      assetId: "",
      name: "",
      category: "Laptop",
      assignedToId: "",
      purchaseDate: "",
      warrantyUntil: "",
    });
    await load();
  }

  async function open(id: string) {
    setSelected(await api<Asset>(`/api/v1/assets/${id}`));
  }

  async function addMaint(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await api(`/api/v1/assets/${selected.id}/maintenance`, {
      method: "POST",
      json: {
        description: maint.description,
        cost: maint.cost ? Number(maint.cost) : null,
      },
    });
    setMaint({ description: "", cost: "" });
    await open(selected.id);
    await load();
  }

  return (
    <div>
      <PageHeader title="Assets" description="Track office equipment and assignments" />
      <Card className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex gap-2"
        >
          <Input placeholder="Search assets…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Add asset</h2>
          <form onSubmit={create} className="space-y-3">
            <Input placeholder="Asset ID" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} required />
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
            <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            <Input type="date" value={form.warrantyUntil} onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })} />
            <Button type="submit">Save</Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--muted)]/30" onClick={() => open(a.id)}>
                  <td className="px-4 py-3">{a.assetId}</td>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3">{a.category}</td>
                  <td className="px-4 py-3">{a.assignedTo?.fullName || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge>{a.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {selected ? (
        <Card className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">
            {selected.assetId} · {selected.name}
          </h2>
          <p className="mb-4 text-sm text-[var(--muted-fg)]">
            Purchase {formatDate(selected.purchaseDate)} · Warranty until {formatDate(selected.warrantyUntil)}
          </p>
          <h3 className="mb-2 text-sm font-medium">Maintenance history</h3>
          <div className="mb-4 space-y-2 text-sm">
            {(selected.maintenance || []).map((m) => (
              <div key={m.id} className="flex justify-between gap-2">
                <span>{m.description}</span>
                <span className="text-[var(--muted-fg)]">
                  {formatDate(m.performedAt)}
                  {m.cost != null ? ` · ${m.cost}` : ""}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={addMaint} className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Maintenance description" value={maint.description} onChange={(e) => setMaint({ ...maint, description: e.target.value })} required />
            <Input placeholder="Cost" value={maint.cost} onChange={(e) => setMaint({ ...maint, cost: e.target.value })} />
            <Button type="submit">Add</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
