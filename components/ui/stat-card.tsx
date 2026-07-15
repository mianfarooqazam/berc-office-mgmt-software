import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Card } from "./card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "brand" | "accent" | "warning" | "success";
}) {
  const toneClass = {
    brand: "bg-[var(--brand)]/12 text-[var(--brand)] ring-1 ring-[var(--brand)]/15",
    accent: "bg-[var(--accent)]/12 text-[var(--accent)] ring-1 ring-[var(--accent)]/15",
    warning: "bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/15 dark:text-amber-300",
    success: "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300",
  }[tone];

  return (
    <Card hover className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/35 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[var(--muted)]/80 blur-xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[var(--muted-fg)]">{label}</p>
          <p className="mt-2.5 font-[family-name:var(--font-display)] text-[2rem] font-semibold tracking-tight">
            {value}
          </p>
          {hint ? <p className="mt-1.5 text-xs text-[var(--muted-fg)]">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
