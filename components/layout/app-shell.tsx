"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

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
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-7 md:py-8">
          <div className="page-enter mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
