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
    brand: "bg-[var(--brand)]/10 text-[var(--brand)]",
    accent: "bg-[var(--accent)]/10 text-[var(--accent)]",
    warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  }[tone];

  return (
    <Card hover className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--muted)]/70" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--muted-fg)]">{label}</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-[var(--muted-fg)]">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
