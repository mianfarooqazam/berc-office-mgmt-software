"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  cnic?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  designation?: string | null;
  joiningDate?: string | null;
  status: string;
  bankDetails?: string | null;
  profilePhoto?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  employeeDocs: { id: string; name: string; category?: string | null; filePath: string }[];
  assets: { id: string; assetId: string; name: string; status: string }[];
};

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState(false);

  async function load() {
    const [emp, deps] = await Promise.all([
      api<Employee>(`/api/v1/employees/${id}`),
      api<{ id: string; name: string }[]>("/api/v1/departments"),
    ]);
    setEmployee(emp);
    setDepartments(deps);
  }

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!employee) return;
    const data = new FormData(e.currentTarget);
    await api(`/api/v1/employees/${id}`, {
      method: "PATCH",
      json: {
        fullName: data.get("fullName"),
        phone: data.get("phone"),
        cnic: data.get("cnic"),
        address: data.get("address"),
        emergencyContact: data.get("emergencyContact"),
        designation: data.get("designation"),
        departmentId: data.get("departmentId") || null,
        status: data.get("status"),
        bankDetails: data.get("bankDetails"),
        joiningDate: data.get("joiningDate") || null,
      },
    });
    setEditing(false);
    await load();
  }

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/v1/employees/${id}/photo`, { method: "POST", body: fd, credentials: "include" });
    await load();
  }

  async function uploadDoc(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/v1/employees/${id}/documents`, { method: "POST", body: fd, credentials: "include" });
    e.currentTarget.reset();
    await load();
  }

  async function remove() {
    if (!confirm("Delete this employee?")) return;
    await api(`/api/v1/employees/${id}`, { method: "DELETE" });
    router.push("/employees");
  }

  if (!employee) return <p className="text-sm text-[var(--muted-fg)]">Loading…</p>;

  return (
    <div>
      <PageHeader
        title={employee.fullName}
        description={`${employee.employeeId} · ${employee.email}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3">
            {employee.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/v1/files/${employee.profilePhoto}`}
                alt={employee.fullName}
                className="h-28 w-28 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--muted)] text-2xl font-semibold">
                {employee.fullName.slice(0, 1)}
              </div>
            )}
            <Badge tone={employee.status === "ACTIVE" ? "success" : "neutral"}>{employee.status}</Badge>
            <label className="cursor-pointer text-sm text-[var(--brand)] hover:underline">
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
            </label>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-[var(--muted-fg)]">Department:</span>{" "}
              {employee.department?.name || "—"}
            </p>
            <p>
              <span className="text-[var(--muted-fg)]">Designation:</span> {employee.designation || "—"}
            </p>
            <p>
              <span className="text-[var(--muted-fg)]">Joined:</span> {formatDate(employee.joiningDate)}
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {editing ? (
            <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
              <Input name="fullName" defaultValue={employee.fullName} required />
              <Input name="phone" defaultValue={employee.phone || ""} placeholder="Phone" />
              <Input name="cnic" defaultValue={employee.cnic || ""} placeholder="CNIC" />
              <Input name="designation" defaultValue={employee.designation || ""} placeholder="Designation" />
              <Input name="emergencyContact" defaultValue={employee.emergencyContact || ""} placeholder="Emergency contact" />
              <Input name="joiningDate" type="date" defaultValue={employee.joiningDate?.slice(0, 10) || ""} />
              <Select name="departmentId" defaultValue={employee.departmentId || ""}>
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <Select name="status" defaultValue={employee.status}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="TERMINATED">TERMINATED</option>
              </Select>
              <Input name="address" className="md:col-span-2" defaultValue={employee.address || ""} placeholder="Address" />
              <Input name="bankDetails" className="md:col-span-2" defaultValue={employee.bankDetails || ""} placeholder="Bank details (JSON or text)" />
              <Button type="submit">Save changes</Button>
            </form>
          ) : (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <p><span className="text-[var(--muted-fg)]">Phone:</span> {employee.phone || "—"}</p>
              <p><span className="text-[var(--muted-fg)]">CNIC:</span> {employee.cnic || "—"}</p>
              <p><span className="text-[var(--muted-fg)]">Emergency:</span> {employee.emergencyContact || "—"}</p>
              <p><span className="text-[var(--muted-fg)]">Bank:</span> {employee.bankDetails || "—"}</p>
              <p className="md:col-span-2"><span className="text-[var(--muted-fg)]">Address:</span> {employee.address || "—"}</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Assigned assets</h2>
        {employee.assets.length === 0 ? (
          <p className="text-sm text-[var(--muted-fg)]">None</p>
        ) : (
          <div className="space-y-2 text-sm">
            {employee.assets.map((a) => (
              <div key={a.id} className="flex justify-between">
                <span>
                  {a.assetId} · {a.name}
                </span>
                <Badge>{a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Documents</h2>
        <form onSubmit={uploadDoc} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input name="category" placeholder="Category" defaultValue="General" />
          <Input name="file" type="file" required />
          <Button type="submit" variant="secondary">
            Upload
          </Button>
        </form>
        <div className="space-y-2 text-sm">
          {employee.employeeDocs.map((d) => (
            <a
              key={d.id}
              href={`/api/v1/files/${d.filePath}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-[var(--muted)]"
              target="_blank"
            >
              <span>{d.name}</span>
              <span className="text-[var(--muted-fg)]">{d.category}</span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
