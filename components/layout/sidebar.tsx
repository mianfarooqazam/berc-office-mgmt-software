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
          "fixed inset-0 z-40 bg-[#0c1222]/45 backdrop-blur-[3px] transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[68px] items-center justify-between border-b border-[var(--border)] px-4">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)] font-[family-name:var(--font-display)] text-base font-bold text-[var(--brand-fg)] shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,var(--shadow-sm)]">
              {companyName.slice(0, 1)}
            </span>
            <div className="leading-tight">
              <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight">
                {companyName}
              </p>
              <p className="text-[11px] font-medium text-[var(--muted-fg)]">Office Management</p>
            </div>
          </Link>
          <button
            className="rounded-xl p-2 text-[var(--muted-fg)] hover:bg-[var(--muted)] lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-fg)]">
                {group.label}
              </p>
              <div className="space-y-1">
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
                        "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition duration-150",
                        active
                          ? "bg-[var(--brand)] font-semibold text-[var(--brand-fg)] shadow-[var(--shadow-sm)]"
                          : "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                        item.emphasis && !active && "font-semibold text-[var(--foreground)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "opacity-100" : "opacity-80 group-hover:opacity-100",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.emphasis ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            active
                              ? "bg-white/20 text-[var(--brand-fg)]"
                              : "bg-[var(--brand)]/10 text-[var(--brand)]",
                          )}
                        >
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
          <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--brand)_8%,var(--surface-2)),var(--surface-2))] px-3.5 py-3.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">Operations focus</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-fg)]">
              Tasks & reports first · Connect Drive, Meet & Teams
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
