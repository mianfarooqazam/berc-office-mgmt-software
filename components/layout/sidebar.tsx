"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Video,
  Laptop,
  FolderOpen,
  FileText,
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
import { isAdminRole, ROUTE_PERMISSIONS, type PermissionCode } from "@/lib/permissions";

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
      { href: "/meetings/minutes", label: "Meeting Minutes", icon: FileText },
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
  permissions = [],
  roleName,
}: {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  permissions?: string[];
  roleName?: string;
}) {
  const pathname = usePathname();
  const can = (href: string) => {
    const needed = ROUTE_PERMISSIONS[href];
    if (needed === null || needed === undefined) return true;
    if (isAdminRole(roleName)) return true;
    return permissions.includes(needed as PermissionCode);
  };

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.href)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#0c1222]/45 backdrop-blur-[3px] transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[68px] items-center justify-between border-b border-[var(--border)] px-4">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)] font-[family-name:var(--font-display)] text-base font-bold text-[var(--brand-fg)] shadow-sm">
              {companyName.slice(0, 1)}
            </span>
            <div className="leading-tight">
              <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight">
                {companyName}
              </p>
              <p className="text-[11px] font-medium text-[var(--muted-fg)]">
                {roleName || "Office Management"}
              </p>
            </div>
          </Link>
          <button
            className="rounded-lg p-1.5 text-[var(--muted-fg)] hover:bg-[var(--muted)] lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-fg)]">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href === "/meetings"
                      ? pathname.startsWith("/meetings/") &&
                        !pathname.startsWith("/meetings/minutes")
                      : pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                        active
                          ? "bg-[var(--brand)] font-semibold text-[var(--brand-fg)] shadow-sm"
                          : "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                        item.emphasis && !active && "font-semibold text-[var(--foreground)]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
