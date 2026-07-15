import Link from "next/link";
import {
  Users,
  CheckSquare,
  Video,
  Megaphone,
  Activity,
  ArrowUpRight,
  Plus,
  BarChart3,
  AlertTriangle,
  CircleDot,
  Plug,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toCamel } from "@/lib/mappers";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const now = new Date().toISOString();
  const greetingName = user?.employee?.fullName?.split(" ")[0] || "there";
  const db = getSupabaseAdmin();

  const myTasksQuery = user?.employee
    ? db
        .from("tasks")
        .select("*, assignees:task_assignees!inner(*)")
        .eq("assignees.employee_id", user.employee.id)
        .neq("status", "COMPLETED")
        .order("due_date")
        .limit(6)
    : db
        .from("tasks")
        .select("*")
        .neq("status", "COMPLETED")
        .order("due_date")
        .limit(6);

  const [
    totalEmployeesRes,
    openTasksRes,
    inProgressTasksRes,
    highPriorityTasksRes,
    upcomingMeetingsRes,
    announcementsRes,
    myTasksRes,
    recentAuditRes,
    connectedIntegrationsRes,
  ] = await Promise.all([
    db.from("employees").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    db.from("tasks").select("*", { count: "exact", head: true }).neq("status", "COMPLETED"),
    db.from("tasks").select("*", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
    db
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("priority", "HIGH")
      .neq("status", "COMPLETED"),
    db.from("meetings").select("*").gte("starts_at", now).order("starts_at").limit(5),
    db
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(4),
    myTasksQuery,
    db
      .from("audit_logs")
      .select("*, user:users(*, employee:employees(*))")
      .order("created_at", { ascending: false })
      .limit(6),
    db.from("integrations").select("*", { count: "exact", head: true }).eq("status", "CONNECTED"),
  ]);

  const totalEmployees = totalEmployeesRes.count ?? 0;
  const openTasks = openTasksRes.count ?? 0;
  const inProgressTasks = inProgressTasksRes.count ?? 0;
  const highPriorityTasks = highPriorityTasksRes.count ?? 0;
  const connectedIntegrations = connectedIntegrationsRes.count ?? 0;

  const upcomingMeetings = toCamel<
    { id: string; title: string; startsAt: string; platform?: string | null }[]
  >(upcomingMeetingsRes.data || []);
  const announcements = toCamel<
    { id: string; title: string; body: string; pinned: boolean }[]
  >(announcementsRes.data || []);
  const myTasks = toCamel<
    { id: string; title: string; dueDate?: string | null; priority: string; status: string }[]
  >(myTasksRes.data || []);
  const recentAudit = toCamel<
    {
      id: string;
      action: string;
      entity: string;
      createdAt: string;
      user?: { email?: string; employee?: { fullName?: string } | null } | null;
    }[]
  >(recentAuditRes.data || []);

  const actions = [
    { href: "/tasks", label: "Create task", icon: CheckSquare },
    { href: "/reports", label: "Open reports", icon: BarChart3 },
    { href: "/meetings", label: "Schedule meeting", icon: Video },
    { href: "/integrations", label: "Connect apps", icon: Plug },
  ];

  return (
    <div>
      <PageHeader
        title={`Good day, ${greetingName}`}
        description="Focus on tasks and reports. Meetings sync with Meet and Teams when connected."
        actions={
          <div className="flex gap-2">
            <Link href="/reports">
              <Button variant="secondary">
                <BarChart3 className="h-4 w-4" />
                Reports
              </Button>
            </Link>
            <Link href="/tasks">
              <Button>
                <Plus className="h-4 w-4" />
                New task
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={openTasks} icon={CheckSquare} tone="brand" hint="Needs attention" />
        <StatCard label="In progress" value={inProgressTasks} icon={CircleDot} tone="accent" hint="Active work" />
        <StatCard
          label="High priority"
          value={highPriorityTasks}
          icon={AlertTriangle}
          tone="warning"
          hint="Open & urgent"
        />
        <StatCard label="Team size" value={totalEmployees} icon={Users} tone="success" hint="Active employees" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>My tasks</CardTitle>
              <CardDescription>Your assigned work, prioritized for today</CardDescription>
            </div>
            <Link href="/tasks" className="text-xs font-medium text-[var(--brand)] hover:underline">
              View all
            </Link>
          </CardHeader>
          <div className="space-y-2">
            {myTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="No open tasks" description="Create a task to get started." />
            ) : (
              myTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 transition hover:border-[var(--brand)]/25 hover:bg-[var(--brand)]/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-fg)]">Due {formatDate(t.dueDate)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={t.priority === "HIGH" ? "danger" : "neutral"}>{t.priority}</Badge>
                    <Badge tone={t.status === "IN_PROGRESS" ? "info" : "neutral"}>
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Jump into key workflows</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-2">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm transition hover:border-[var(--brand)]/30 hover:bg-[var(--brand)]/5"
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--brand)] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    {a.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[var(--muted-fg)] transition group-hover:text-[var(--brand)]" />
                </Link>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-3 text-xs text-[var(--muted-fg)]">
            {connectedIntegrations} integration{connectedIntegrations === 1 ? "" : "s"} connected
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Reports hub</CardTitle>
              <CardDescription>Export task and ops insights</CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-[var(--muted-fg)]" />
          </CardHeader>
          <div className="space-y-2 text-sm">
            <Link href="/reports" className="block rounded-xl border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--muted)]/40">
              Task detail report
            </Link>
            <Link href="/reports" className="block rounded-xl border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--muted)]/40">
              Task summary
            </Link>
            <Link href="/reports" className="block rounded-xl border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--muted)]/40">
              Meetings & assets
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming meetings</CardTitle>
              <CardDescription>Meet & Teams ready when connected</CardDescription>
            </div>
            <Link href="/meetings" className="text-xs font-medium text-[var(--brand)] hover:underline">
              View all
            </Link>
          </CardHeader>
          <div className="space-y-2">
            {upcomingMeetings.length === 0 ? (
              <EmptyState icon={Video} title="No upcoming meetings" />
            ) : (
              upcomingMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="block rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:bg-[var(--muted)]/50"
                >
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-fg)]">
                    {formatDateTime(m.startsAt)}
                    {m.platform ? ` · ${m.platform.replace("_", " ")}` : ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Latest company updates</CardDescription>
            </div>
            <Megaphone className="h-4 w-4 text-[var(--muted-fg)]" />
          </CardHeader>
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-xl border border-[var(--border)] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.pinned ? <Badge tone="info">Pinned</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-fg)]">{a.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Audit trail across the system</CardDescription>
          </div>
          <Activity className="h-4 w-4 text-[var(--muted-fg)]" />
        </CardHeader>
        <div className="space-y-1">
          {recentAudit.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-xl px-2 py-2.5 text-sm hover:bg-[var(--muted)]/40"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {a.action} · {a.entity}
                </p>
                <p className="text-xs text-[var(--muted-fg)]">
                  {a.user?.employee?.fullName || a.user?.email || "System"}
                </p>
              </div>
              <p className="shrink-0 text-xs text-[var(--muted-fg)]">{formatDateTime(a.createdAt)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
