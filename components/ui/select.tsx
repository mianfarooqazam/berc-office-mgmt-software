import { cn } from "@/lib/utils";
import { SelectHTMLAttributes } from "react";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgb(12_18_34/0.03)] outline-none transition duration-150 hover:border-[var(--border-strong)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--ring)]",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%235a6573%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
