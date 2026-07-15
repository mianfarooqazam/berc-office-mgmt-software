"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api-client";
import { VIEW_MODULES, type PermissionCode } from "@/lib/permissions";
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

type ManagedUser = {
  id: string;
  email: string;
  roleName: string;
  isActive: boolean;
  permissionCodes: string[];
  fullName: string;
  employeeId: string;
  phone?: string | null;
  designation?: string | null;
};

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
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [defaultViews, setDefaultViews] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedViews, setSelectedViews] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    password: "",
    designation: "",
    phone: "",
  });
  const [createViews, setCreateViews] = useState<string[]>([]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  async function load() {
    setError("");
    const me = await api<{ role: { permissions: string[]; name: string } }>("/api/v1/auth/me");
    const canSettings = me.role.permissions.includes("settings.read");
    if (!canSettings) {
      setError("You do not have access to settings.");
      return;
    }

    setCompany(await api<Company>("/api/v1/settings/company"));
    setHolidays(await api<Holiday[]>("/api/v1/settings/holidays"));

    if (me.role.permissions.includes("roles.write")) {
      const data = await api<{
        users: ManagedUser[];
        defaultViews: string[];
      }>("/api/v1/settings/users");
      setUsers(data.users);
      setDefaultViews(data.defaultViews);
      setCreateViews((prev) => (prev.length ? prev : data.defaultViews));
      const firstEmployee = data.users.find((u) => u.roleName !== "Admin") || data.users[0];
      if (firstEmployee) {
        setSelectedUserId((id) => id || firstEmployee.id);
        setSelectedViews(
          firstEmployee.roleName === "Admin"
            ? firstEmployee.permissionCodes
            : firstEmployee.permissionCodes,
        );
      }
    }
    if (me.role.permissions.includes("audit.read")) {
      setAudit(await api<Audit[]>("/api/v1/settings/audit"));
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load settings"));
  }, []);

  useEffect(() => {
    if (selectedUser) setSelectedViews(selectedUser.permissionCodes);
  }, [selectedUser]);

  function toggleView(codes: PermissionCode[], checked: boolean, target: "create" | "edit") {
    const setter = target === "create" ? setCreateViews : setSelectedViews;
    setter((prev) => {
      if (checked) return [...new Set([...prev, ...codes])];
      return prev.filter((c) => !codes.includes(c as PermissionCode));
    });
  }

  async function saveCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api("/api/v1/settings/company", {
      method: "PATCH",
      json: Object.fromEntries(fd.entries()),
    });
    await load();
  }

  async function addHoliday(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/settings/holidays", { method: "POST", json: holidayForm });
    setHolidayForm({ name: "", date: "" });
    await load();
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/settings/users", {
        method: "POST",
        json: {
          ...createForm,
          permissionCodes: createViews,
        },
      });
      setCreateForm({
        fullName: "",
        email: "",
        employeeId: "",
        password: "",
        designation: "",
        phone: "",
      });
      setCreateViews(defaultViews);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
    }
  }

  async function saveUserAccess() {
    if (!selectedUser || selectedUser.roleName === "Admin") return;
    setError("");
    try {
      await api(`/api/v1/settings/users/${selectedUser.id}`, {
        method: "PATCH",
        json: {
          permissionCodes: selectedViews,
          password: newPassword || undefined,
        },
      });
      setNewPassword("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    }
  }

  if (error && !company) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!company) {
    return <p className="text-sm text-[var(--muted-fg)]">Loading settings…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Admin controls company settings and decides what each user can see."
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-base font-semibold">
            Company & branding
          </h2>
          <form onSubmit={saveCompany} className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="ui-label">Company name</label>
              <Input name="name" defaultValue={company.name} required />
            </div>
            <div>
              <label className="ui-label">Legal name</label>
              <Input name="legalName" defaultValue={company.legalName || ""} />
            </div>
            <div>
              <label className="ui-label">Email</label>
              <Input name="email" defaultValue={company.email || ""} />
            </div>
            <div>
              <label className="ui-label">Phone</label>
              <Input name="phone" defaultValue={company.phone || ""} />
            </div>
            <div>
              <label className="ui-label">Website</label>
              <Input name="website" defaultValue={company.website || ""} />
            </div>
            <div>
              <label className="ui-label">Address</label>
              <Input name="address" defaultValue={company.address || ""} />
            </div>
            <div>
              <label className="ui-label">Primary color</label>
              <Input name="primaryColor" defaultValue={company.primaryColor} />
            </div>
            <div>
              <label className="ui-label">Accent color</label>
              <Input name="accentColor" defaultValue={company.accentColor} />
            </div>
            <Button type="submit">Save company</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-base font-semibold">
            Users & access
          </h2>
          <p className="mb-4 text-sm text-[var(--muted-fg)]">
            Only Admin creates logins, sets passwords, and chooses which modules each employee can
            see.
          </p>

          <form onSubmit={createUser} className="mb-6 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-sm font-semibold">Create new user</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Full name"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                required
              />
              <Input
                placeholder="Employee ID (e.g. BERC-010)"
                value={createForm.employeeId}
                onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="Login email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
              <Input
                type="password"
                placeholder="Temporary password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
              />
              <Input
                placeholder="Designation"
                value={createForm.designation}
                onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </div>
            <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
              Views they can see
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {VIEW_MODULES.map((mod) => {
                const checked = mod.codes.every((c) => createViews.includes(c));
                return (
                  <label key={mod.module} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-[var(--brand)]"
                      checked={checked}
                      onChange={(e) => toggleView(mod.codes, e.target.checked, "create")}
                    />
                    {mod.label}
                  </label>
                );
              })}
            </div>
            <Button type="submit">Create user login</Button>
          </form>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="space-y-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    selectedUserId === u.id
                      ? "bg-[var(--brand)] text-[var(--brand-fg)]"
                      : "hover:bg-[var(--muted)]"
                  }`}
                >
                  <span className="truncate font-medium">{u.fullName}</span>
                  <Badge tone={u.roleName === "Admin" ? "info" : "neutral"}>{u.roleName}</Badge>
                </button>
              ))}
            </div>

            {selectedUser ? (
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{selectedUser.fullName}</p>
                  <Badge>{selectedUser.roleName}</Badge>
                  {!selectedUser.isActive ? <Badge tone="danger">Inactive</Badge> : null}
                </div>
                <p className="text-sm text-[var(--muted-fg)]">{selectedUser.email}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">
                  ID {selectedUser.employeeId || "—"}
                </p>

                {selectedUser.roleName === "Admin" ? (
                  <p className="mt-4 rounded-xl bg-[var(--brand)]/8 px-3 py-2 text-sm text-[var(--muted-fg)]">
                    Admin has full access to every module. Views cannot be restricted.
                  </p>
                ) : (
                  <>
                    <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
                      Module access
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {VIEW_MODULES.map((mod) => {
                        const checked = mod.codes.every((c) => selectedViews.includes(c));
                        return (
                          <label key={mod.module} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="accent-[var(--brand)]"
                              checked={checked}
                              onChange={(e) => toggleView(mod.codes, e.target.checked, "edit")}
                            />
                            {mod.label}
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                      <label className="ui-label">Reset password (optional)</label>
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <Button className="mt-4" onClick={saveUserAccess}>
                      Save access
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-base font-semibold">
            Holidays
          </h2>
          <div className="mb-3 space-y-1 text-sm">
            {holidays.map((h) => (
              <div key={h.id} className="flex justify-between">
                <span>{h.name}</span>
                <span className="text-[var(--muted-fg)]">{formatDate(h.date)}</span>
              </div>
            ))}
          </div>
          <form onSubmit={addHoliday} className="space-y-2 md:max-w-md">
            <Input
              placeholder="Holiday name"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              required
            />
            <Input
              type="date"
              value={holidayForm.date}
              onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              required
            />
            <Button type="submit" variant="secondary">
              Add holiday
            </Button>
          </form>
        </Card>

        {audit.length || users.length ? (
          <Card className="overflow-x-auto p-0">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
              Audit logs
            </div>
            <table className="ui-table min-w-[700px]">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDateTime(a.createdAt)}</td>
                    <td>{a.user?.employee?.fullName || a.user?.email || "—"}</td>
                    <td>{a.action}</td>
                    <td>{a.entity}</td>
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
