import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgb(12_18_34/0.03)] outline-none transition duration-150 placeholder:text-[var(--muted-fg)]/80 hover:border-[var(--border-strong)] focus:border-[var(--brand)] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}
