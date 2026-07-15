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
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--muted-fg)]">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {description ? <p className="max-w-sm text-[var(--muted-fg)]">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
