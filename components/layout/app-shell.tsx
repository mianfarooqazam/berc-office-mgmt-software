"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  companyName,
  userName,
  unread,
}: {
  children: React.ReactNode;
  companyName?: string;
  userName?: string;
  unread?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} companyName={companyName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} userName={userName} unread={unread} />
        <main className="flex-1 px-4 py-6 md:px-7 md:py-8">
          <div className="page-enter mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
