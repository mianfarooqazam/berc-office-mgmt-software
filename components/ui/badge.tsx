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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        tone === "neutral" &&
          "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted-fg)]",
        tone === "success" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        tone === "warning" &&
          "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300",
        tone === "danger" && "border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-300",
        tone === "info" && "border-sky-500/20 bg-sky-500/10 text-sky-800 dark:text-sky-300",
      )}
    >
      {children}
    </span>
  );
}
