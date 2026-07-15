"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  BarChart3,
  CheckSquare,
  Users,
  Laptop,
  Video,
  HardDrive,
  Megaphone,
  FolderOpen,
  ExternalLink,
  Link2,
  Trash2,
  Cloud,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type ReportDef = {
  type: string;
  label: string;
  description: string;
  icon: typeof BarChart3;
};

const CATEGORIES: { id: string; label: string; reports: ReportDef[] }[] = [
  {
    id: "operations",
    label: "Operations",
    reports: [
      {
        type: "tasks",
        label: "Task detail",
        description: "All tasks with priority, status, assignees, and attachments",
        icon: CheckSquare,
      },
      {
        type: "task-summary",
        label: "Task summary",
        description: "Counts by status and open high-priority work",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "people",
    label: "People",
    reports: [
      {
        type: "employees",
        label: "Employee directory",
        description: "Staff list with designation and status",
        icon: Users,
      },
    ],
  },
  {
    id: "work",
    label: "Work & communication",
    reports: [
      {
        type: "meetings",
        label: "Meetings",
        description: "Schedules, platforms, participants, and join links",
        icon: Video,
      },
      {
        type: "announcements",
        label: "Announcements",
        description: "Company notices with publish dates and authors",
        icon: Megaphone,
      },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    reports: [
      {
        type: "assets",
        label: "Assets inventory",
        description: "Office assets and current assignments",
        icon: Laptop,
      },
      {
        type: "documents",
        label: "Documents index",
        description: "Document library listing by folder",
        icon: FolderOpen,
      },
    ],
  },
];

type DriveState = {
  connected: boolean;
  accountEmail?: string | null;
  connectedAt?: string | null;
};

type ReportLink = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  reportType?: string | null;
  driveUrl: string;
  createdAt: string;
};

function ReportCard({
  report,
  driveConnected,
  onSaveToDrive,
  busy,
}: {
  report: ReportDef;
  driveConnected: boolean;
  onSaveToDrive: (type: string) => void;
  busy: string | null;
}) {
  const Icon = report.icon;
  return (
    <Card hover>
      <CardHeader>
        <div>
          <CardTitle>{report.label}</CardTitle>
          <CardDescription>{report.description}</CardDescription>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        <a href={`/api/v1/reports/${report.type}?format=excel`}>
          <Button variant="secondary" size="sm">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </a>
        <a href={`/api/v1/reports/${report.type}?format=pdf`}>
          <Button size="sm">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </a>
        <Button
          size="sm"
          variant="ghost"
          disabled={!driveConnected || busy === report.type}
          onClick={() => onSaveToDrive(report.type)}
          title={driveConnected ? "Link this report in Google Drive" : "Connect Google Drive first"}
        >
          <HardDrive className="h-4 w-4" />
          {busy === report.type ? "Saving…" : "Drive"}
        </Button>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const [drive, setDrive] = useState<DriveState>({ connected: false });
  const [links, setLinks] = useState<ReportLink[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({
    title: "",
    description: "",
    category: "operations",
    driveUrl: "",
  });

  async function load() {
    const data = await api<{ drive: DriveState; links: ReportLink[] }>("/api/v1/reports/library");
    setDrive(data.drive);
    setLinks(data.links);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function connectDrive() {
    setBusy("drive");
    setError("");
    setMessage("");
    try {
      await api("/api/v1/integrations/GOOGLE_DRIVE/connect", {
        method: "POST",
        json: { mode: "local" },
      });
      setMessage("Google Drive connected. You can save and link office reports.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to connect Drive");
    } finally {
      setBusy(null);
    }
  }

  async function saveToDrive(type: string) {
    setBusy(type);
    setError("");
    setMessage("");
    try {
      await api(`/api/v1/reports/${type}/drive`, { method: "POST" });
      setMessage("Report linked to Google Drive library.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save to Drive");
    } finally {
      setBusy(null);
    }
  }

  async function addLink(e: FormEvent) {
    e.preventDefault();
    setBusy("link");
    setError("");
    try {
      await api("/api/v1/reports/library", { method: "POST", json: linkForm });
      setLinkForm({ title: "", description: "", category: "operations", driveUrl: "" });
      setShowLinkForm(false);
      setMessage("Drive report link added to the hub.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add link");
    } finally {
      setBusy(null);
    }
  }

  async function removeLink(id: string) {
    await api(`/api/v1/reports/library?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Office reports"
        description="All office reports in one place — export locally or keep them linked with Google Drive."
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-base font-semibold">
                Google Drive
              </p>
              <p className="mt-1 text-sm text-[var(--muted-fg)]">
                {drive.connected
                  ? `Connected${drive.accountEmail ? ` as ${drive.accountEmail}` : ""}. Reports can be saved and linked here.`
                  : "Connect Drive to store and open office reports from one library."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {drive.connected ? (
              <>
                <Badge tone="success">Connected</Badge>
                <Button variant="secondary" size="sm" onClick={() => setShowLinkForm((v) => !v)}>
                  <Link2 className="h-4 w-4" />
                  Link Drive file
                </Button>
                <a href="https://drive.google.com" target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                    Open Drive
                  </Button>
                </a>
              </>
            ) : (
              <>
                <Button size="sm" onClick={connectDrive} disabled={busy === "drive"}>
                  <Cloud className="h-4 w-4" />
                  {busy === "drive" ? "Connecting…" : "Connect Google Drive"}
                </Button>
                <Link href="/integrations">
                  <Button size="sm" variant="ghost">
                    Integrations
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {showLinkForm ? (
          <form onSubmit={addLink} className="mt-5 space-y-3 border-t border-[var(--border)] pt-5">
            <p className="text-sm font-semibold">Link an existing Drive file or folder</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Title"
                value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                required
              />
              <Select
                value={linkForm.category}
                onChange={(e) => setLinkForm({ ...linkForm, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                <option value="general">General</option>
              </Select>
              <Input
                className="md:col-span-2"
                placeholder="Google Drive URL"
                value={linkForm.driveUrl}
                onChange={(e) => setLinkForm({ ...linkForm, driveUrl: e.target.value })}
                required
              />
              <Textarea
                className="md:col-span-2"
                placeholder="Description (optional)"
                value={linkForm.description}
                onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy === "link"}>
                Add to library
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowLinkForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      {CATEGORIES.map((cat) => (
        <section key={cat.id} className="mb-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
            {cat.label}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cat.reports.map((r) => (
              <ReportCard
                key={r.type}
                report={r}
                driveConnected={drive.connected}
                onSaveToDrive={saveToDrive}
                busy={busy}
              />
            ))}
          </div>
        </section>
      ))}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
            Drive report library
          </h2>
          <Badge tone={links.length ? "info" : "neutral"}>{links.length} linked</Badge>
        </div>

        {links.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--muted-fg)]">
              No Drive-linked reports yet. Connect Google Drive, then use <strong>Drive</strong> on
              any report or link an existing Drive file.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <Card key={link.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{link.title}</p>
                    <Badge tone="neutral">{link.category}</Badge>
                  </div>
                  {link.description ? (
                    <p className="mt-1 text-sm text-[var(--muted-fg)]">{link.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--muted-fg)]">
                    {formatDateTime(link.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={link.driveUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="secondary">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => removeLink(link.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
