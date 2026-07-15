import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "neutral" && "bg-[var(--muted)] text-[var(--muted-fg)]",
        tone === "success" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        tone === "warning" && "bg-amber-500/12 text-amber-700 dark:text-amber-300",
        tone === "danger" && "bg-red-500/12 text-red-700 dark:text-red-300",
        tone === "info" && "bg-sky-500/12 text-sky-700 dark:text-sky-300",
      )}
    >
      {children}
    </span>
  );
}
