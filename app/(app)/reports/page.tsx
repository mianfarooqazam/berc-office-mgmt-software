"use client";

import { FileSpreadsheet, FileText, BarChart3, CheckSquare, Users, Laptop, Building2, Video } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURED = [
  {
    type: "tasks",
    label: "Task detail report",
    description: "All tasks with priority, status, assignees, comments, and attachments",
    icon: CheckSquare,
  },
  {
    type: "task-summary",
    label: "Task summary",
    description: "Counts by status and open high-priority work",
    icon: BarChart3,
  },
];

const OTHER = [
  { type: "meetings", label: "Meetings report", description: "Schedules, platforms, and join links", icon: Video },
  { type: "employees", label: "Employee list", description: "Staff directory with department and status", icon: Users },
  { type: "assets", label: "Assets report", description: "Inventory and assignments", icon: Laptop },
  { type: "departments", label: "Departments report", description: "Managers and headcount", icon: Building2 },
];

function ReportCard({
  type,
  label,
  description,
  icon: Icon,
  featured,
}: {
  type: string;
  label: string;
  description: string;
  icon: typeof BarChart3;
  featured?: boolean;
}) {
  return (
    <Card hover className={featured ? "border-[var(--brand)]/25 bg-[var(--brand)]/[0.03]" : undefined}>
      <CardHeader>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CardTitle>{label}</CardTitle>
            {featured ? <Badge tone="info">Featured</Badge> : null}
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <div className="flex gap-2">
        <a href={`/api/v1/reports/${type}?format=excel`}>
          <Button variant="secondary">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </a>
        <a href={`/api/v1/reports/${type}?format=pdf`}>
          <Button>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </a>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Task intelligence first — then people, meetings, and assets exports."
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
        Priority reports
      </h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {FEATURED.map((r) => (
          <ReportCard key={r.type} {...r} featured />
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
        More reports
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {OTHER.map((r) => (
          <ReportCard key={r.type} {...r} />
        ))}
      </div>
    </div>
  );
}
