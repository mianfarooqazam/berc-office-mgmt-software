import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--foreground)] shadow-[inset_0_1px_2px_rgb(12_18_34/0.03)] outline-none transition duration-150 placeholder:text-[var(--muted-fg)]/80 hover:border-[var(--border-strong)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}
