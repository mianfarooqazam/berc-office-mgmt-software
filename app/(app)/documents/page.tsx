"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Folder = { id: string; name: string; _count: { documents: number } };
type Doc = {
  id: string;
  title: string;
  category?: string | null;
  updatedAt: string;
  folder?: { name: string } | null;
  versions: { version: number; filePath: string; createdAt: string }[];
};

export default function DocumentsPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [q, setQ] = useState("");
  const [folderName, setFolderName] = useState("");
  const [upload, setUpload] = useState({ title: "", category: "HR Policies", folderId: "" });

  async function load() {
    const [f, d] = await Promise.all([
      api<Folder[]>("/api/v1/documents/folders"),
      api<Doc[]>(`/api/v1/documents?q=${encodeURIComponent(q)}`),
    ]);
    setFolders(f);
    setDocs(d);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createFolder(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/documents/folders", { method: "POST", json: { name: folderName } });
    setFolderName("");
    await load();
  }

  async function createDoc(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("title", upload.title);
    fd.set("category", upload.category);
    if (upload.folderId) fd.set("folderId", upload.folderId);
    await fetch("/api/v1/documents", { method: "POST", body: fd, credentials: "include" });
    e.currentTarget.reset();
    setUpload({ title: "", category: "HR Policies", folderId: "" });
    await load();
  }

  async function open(id: string) {
    setSelected(await api<Doc>(`/api/v1/documents/${id}`));
  }

  async function newVersion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/v1/documents/${selected.id}`, { method: "POST", body: fd, credentials: "include" });
    e.currentTarget.reset();
    await open(selected.id);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Policies, contracts, and company files. Connect Google Drive under Integrations for cloud sync."
        actions={
          <a href="/integrations">
            <Button variant="secondary">Google Drive</Button>
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Folders</h2>
          <form onSubmit={createFolder} className="mb-3 flex gap-2">
            <Input placeholder="New folder" value={folderName} onChange={(e) => setFolderName(e.target.value)} required />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
          <div className="space-y-1 text-sm">
            {folders.map((f) => (
              <div key={f.id} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--muted)]">
                <span>{f.name}</span>
                <span className="text-[var(--muted-fg)]">{f._count.documents}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="mb-4 flex gap-2"
          >
            <Input placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <form onSubmit={createDoc} className="mb-4 grid gap-2 md:grid-cols-2">
            <Input placeholder="Title" value={upload.title} onChange={(e) => setUpload({ ...upload, title: e.target.value })} required />
            <Select value={upload.category} onChange={(e) => setUpload({ ...upload, category: e.target.value })}>
              <option>HR Policies</option>
              <option>Company Documents</option>
              <option>Contracts</option>
              <option>Employee Documents</option>
              <option>General</option>
            </Select>
            <Select value={upload.folderId} onChange={(e) => setUpload({ ...upload, folderId: e.target.value })}>
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Input type="file" name="file" required />
            <Button type="submit" className="md:col-span-2">
              Upload document
            </Button>
          </form>

          <div className="space-y-2">
            {docs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => open(d.id)}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--muted)]/40"
              >
                <span>
                  <span className="font-medium">{d.title}</span>
                  <span className="ml-2 text-[var(--muted-fg)]">{d.category}</span>
                </span>
                <span className="text-xs text-[var(--muted-fg)]">v{d.versions[0]?.version || 1}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {selected ? (
        <Card className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">{selected.title}</h2>
          <p className="mb-4 text-sm text-[var(--muted-fg)]">
            {selected.category} · Updated {formatDateTime(selected.updatedAt)}
          </p>
          <h3 className="mb-2 text-sm font-medium">Version history</h3>
          <div className="mb-4 space-y-2 text-sm">
            {selected.versions.map((v) => (
              <a
                key={v.version}
                href={`/api/v1/files/${v.filePath}`}
                target="_blank"
                className="flex justify-between rounded-lg px-2 py-2 hover:bg-[var(--muted)]"
              >
                <span>Version {v.version}</span>
                <span className="text-[var(--muted-fg)]">{formatDateTime(v.createdAt)}</span>
              </a>
            ))}
          </div>
          <form onSubmit={newVersion} className="flex gap-2">
            <Input type="file" name="file" required />
            <Button type="submit" variant="secondary">
              Upload new version
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
