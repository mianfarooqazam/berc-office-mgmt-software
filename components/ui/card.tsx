import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "ui-card p-5 md:p-6",
        hover &&
          "transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--brand)_22%,var(--border))] hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-3", className)}>{children}</div>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("mt-1 text-sm leading-relaxed text-[var(--muted-fg)]", className)}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(className)}>{children}</div>;
}
