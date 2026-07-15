"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/utils";

type Company = {
  name: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  primaryColor: string;
  accentColor: string;
};

type Role = {
  id: string;
  name: string;
  permissions: { permission: { id: string; code: string; name: string; module: string } }[];
  _count: { users: number };
};

type Permission = { id: string; code: string; name: string; module: string };
type Holiday = { id: string; name: string; date: string };
type Audit = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user?: { email: string; employee?: { fullName: string } | null } | null;
};

export default function SettingsPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });
  const [canRoles, setCanRoles] = useState(false);
  const [canAudit, setCanAudit] = useState(false);

  async function load() {
    const me = await api<{ role: { permissions: string[] } }>("/api/v1/auth/me");
    const write = me.role.permissions.includes("settings.write") || me.role.permissions.includes("settings.read");
    setCanRoles(me.role.permissions.includes("roles.write"));
    setCanAudit(me.role.permissions.includes("audit.read"));

    if (write) {
      setCompany(await api<Company>("/api/v1/settings/company"));
      setHolidays(await api<Holiday[]>("/api/v1/settings/holidays"));
    }
    if (me.role.permissions.includes("roles.write")) {
      const data = await api<{ roles: Role[]; permissions: Permission[] }>("/api/v1/settings/roles");
      setRoles(data.roles);
      setPermissions(data.permissions);
      if (data.roles[0]) {
        setSelectedRole(data.roles[0].id);
        setSelectedPerms(data.roles[0].permissions.map((p) => p.permission.id));
      }
    }
    if (me.role.permissions.includes("audit.read")) {
      setAudit(await api<Audit[]>("/api/v1/settings/audit"));
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useEffect(() => {
    const role = roles.find((r) => r.id === selectedRole);
    if (role) setSelectedPerms(role.permissions.map((p) => p.permission.id));
  }, [selectedRole, roles]);

  async function saveCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api("/api/v1/settings/company", {
      method: "PATCH",
      json: Object.fromEntries(fd.entries()),
    });
    await load();
  }

  async function saveRolePerms() {
    await api(`/api/v1/settings/roles/${selectedRole}/permissions`, {
      method: "PUT",
      json: { permissionIds: selectedPerms },
    });
    await load();
  }

  async function addHoliday(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/settings/holidays", { method: "POST", json: holidayForm });
    setHolidayForm({ name: "", date: "" });
    await load();
  }

  if (!company) {
    return <p className="text-sm text-[var(--muted-fg)]">Loading settings…</p>;
  }

  return (
    <div>
      <PageHeader title="Settings" description="Company branding, holidays, roles, and audit" />

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Company & branding</h2>
          <form onSubmit={saveCompany} className="grid gap-3 md:grid-cols-2">
            <Input name="name" defaultValue={company.name} required />
            <Input name="legalName" defaultValue={company.legalName || ""} placeholder="Legal name" />
            <Input name="email" defaultValue={company.email || ""} placeholder="Email" />
            <Input name="phone" defaultValue={company.phone || ""} placeholder="Phone" />
            <Input name="website" defaultValue={company.website || ""} placeholder="Website" />
            <Input name="address" defaultValue={company.address || ""} placeholder="Address" />
            <Input name="primaryColor" defaultValue={company.primaryColor} placeholder="Primary color" />
            <Input name="accentColor" defaultValue={company.accentColor} placeholder="Accent color" />
            <Button type="submit">Save company</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Holidays</h2>
          <div className="mb-3 space-y-1 text-sm">
            {holidays.map((h) => (
              <div key={h.id} className="flex justify-between">
                <span>{h.name}</span>
                <span className="text-[var(--muted-fg)]">{formatDate(h.date)}</span>
              </div>
            ))}
          </div>
          <form onSubmit={addHoliday} className="space-y-2 md:max-w-md">
            <Input placeholder="Holiday name" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} required />
            <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} required />
            <Button type="submit" variant="secondary">
              Add holiday
            </Button>
          </form>
        </Card>

        {canRoles ? (
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Roles & permissions</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    selectedRole === r.id ? "bg-[var(--brand)] text-white" : "bg-[var(--muted)]"
                  }`}
                >
                  {r.name} ({r._count.users})
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(p.id)}
                    onChange={(e) =>
                      setSelectedPerms((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <span>
                    {p.name}
                    <span className="ml-1 text-[var(--muted-fg)]">({p.module})</span>
                  </span>
                </label>
              ))}
            </div>
            <Button className="mt-4" onClick={saveRolePerms}>
              Save permissions
            </Button>
          </Card>
        ) : null}

        {canAudit ? (
          <Card className="overflow-x-auto p-0">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Audit logs</div>
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[var(--muted)]/40 text-[var(--muted-fg)]">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Entity</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2">{formatDateTime(a.createdAt)}</td>
                    <td className="px-4 py-2">{a.user?.employee?.fullName || a.user?.email || "—"}</td>
                    <td className="px-4 py-2">{a.action}</td>
                    <td className="px-4 py-2">{a.entity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
