"use client";

import { Menu, Moon, Sun, LogOut, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";

export function Topbar({
  onMenu,
  userName,
  roleName,
  unread = 0,
}: {
  onMenu: () => void;
  userName?: string;
  roleName?: string;
  unread?: number;
}) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const initials = (userName || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await api("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="z-30 flex h-[68px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] px-4 backdrop-blur-xl md:px-7">
      <button
        className="rounded-xl p-2.5 text-[var(--muted-fg)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--foreground)]">
          Workspace
        </p>
        <p className="truncate text-xs text-[var(--muted-fg)]">Daily operations at a glance</p>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          className="relative rounded-xl p-2.5 text-[var(--muted-fg)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white shadow-sm">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>

        <button
          className="rounded-xl p-2.5 text-[var(--muted-fg)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </button>

        <div className="ml-1.5 hidden items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-1.5 pr-3 shadow-sm sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand)]/12 text-[11px] font-bold text-[var(--brand)] ring-1 ring-[var(--brand)]/15">
            {initials}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="max-w-[150px] truncate text-sm font-semibold">{userName}</p>
            {roleName ? (
              <p className="truncate text-[11px] font-medium text-[var(--muted-fg)]">{roleName}</p>
            ) : null}
          </div>
        </div>

        <button
          className="rounded-xl p-2.5 text-[var(--muted-fg)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={logout}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
