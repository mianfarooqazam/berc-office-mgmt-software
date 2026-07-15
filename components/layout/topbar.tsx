"use client";

import { Menu, Moon, Sun, LogOut, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";

export function Topbar({
  onMenu,
  userName,
  unread = 0,
}: {
  onMenu: () => void;
  userName?: string;
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 backdrop-blur-md md:px-6">
      <button
        className="rounded-xl p-2 text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">Workspace</p>
        <p className="truncate text-xs text-[var(--muted-fg)]">Daily operations at a glance</p>
      </div>

      <div className="flex items-center gap-1.5">
        <Link
          href="/notifications"
          className="relative rounded-xl p-2 text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>

        <button
          className="rounded-xl p-2 text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </button>

        <div className="ml-1 hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-1.5 pr-3 sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)]/15 text-[11px] font-semibold text-[var(--brand)]">
            {initials}
          </span>
          <span className="max-w-[140px] truncate text-sm font-medium">{userName}</span>
        </div>

        <button
          className="rounded-xl p-2 text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={logout}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
