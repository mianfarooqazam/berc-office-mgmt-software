import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold tracking-tight transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-45",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-[15px]",
        variant === "primary" &&
          "bg-[var(--brand)] text-[var(--brand-fg)] shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,var(--shadow-sm)] hover:bg-[var(--brand-hover)] active:translate-y-px",
        variant === "secondary" &&
          "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:border-[var(--brand)]/30 hover:bg-[var(--surface-2)]",
        variant === "ghost" &&
          "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
        variant === "danger" &&
          "bg-[var(--danger)] text-white shadow-sm hover:brightness-110 active:brightness-95",
        className,
      )}
      {...props}
    />
  );
}
