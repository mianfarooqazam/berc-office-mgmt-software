"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  Video,
  Laptop,
  FolderOpen,
  Megaphone,
  MessageSquare,
  Calendar,
  Bell,
  BarChart3,
  Settings,
  Sparkles,
  Plug,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tasks", label: "Tasks", icon: CheckSquare, emphasis: true },
      { href: "/reports", label: "Reports", icon: BarChart3, emphasis: true },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/meetings", label: "Meetings", icon: Video },
      { href: "/announcements", label: "Announcements", icon: Megaphone },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "People & resources",
    items: [
      { href: "/employees", label: "Employees", icon: Users },
      { href: "/departments", label: "Departments", icon: Building2 },
      { href: "/assets", label: "Assets", icon: Laptop },
      { href: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/ai", label: "AI Assistant", icon: Sparkles },
    ],
  },
];

export function Sidebar({
  open,
  onClose,
  companyName = "BERC",
}: {
  open: boolean;
  onClose: () => void;
  companyName?: string;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-bold text-[var(--brand-fg)] shadow-sm">
              {companyName.slice(0, 1)}
            </span>
            <div className="leading-tight">
              <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight">
                {companyName}
              </p>
              <p className="text-[11px] text-[var(--muted-fg)]">Office Management</p>
            </div>
          </Link>
          <button
            className="rounded-lg p-1.5 text-[var(--muted-fg)] hover:bg-[var(--muted)] lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-fg)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                        active
                          ? "bg-[var(--brand)]/12 font-medium text-[var(--brand)] shadow-sm ring-1 ring-[var(--brand)]/15"
                          : "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                        item.emphasis && !active && "font-medium text-[var(--foreground)]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90" />
                      <span className="flex-1">{item.label}</span>
                      {item.emphasis ? (
                        <span className="rounded-md bg-[var(--brand)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">
                          Key
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <div className="rounded-xl bg-[var(--surface-2)] px-3 py-3 text-xs text-[var(--muted-fg)]">
            Tasks & reports first · Connect Drive, Meet & Teams
          </div>
        </div>
      </aside>
    </>
  );
}
