"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  companyName,
  userName,
  roleName,
  permissions,
  unread,
}: {
  children: React.ReactNode;
  companyName?: string;
  userName?: string;
  roleName?: string;
  permissions?: string[];
  unread?: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isCalendar = pathname === "/calendar";

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        companyName={companyName}
        permissions={permissions}
        roleName={roleName}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar
          onMenu={() => setOpen(true)}
          userName={userName}
          roleName={roleName}
          unread={unread}
        />
        <main
          className={cn(
            "min-h-0 flex-1",
            isCalendar
              ? "overflow-hidden p-0"
              : "overflow-y-auto px-4 py-6 md:px-7 md:py-8",
          )}
        >
          <div
            className={cn(
              "page-enter mx-auto w-full",
              isCalendar ? "h-full max-w-none" : "max-w-7xl",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
