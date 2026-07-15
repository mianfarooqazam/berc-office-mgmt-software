import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ui-empty">
      {Icon ? (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--brand)] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--foreground)]">
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-[var(--muted-fg)]">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
