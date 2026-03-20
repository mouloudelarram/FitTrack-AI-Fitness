import type { SelectHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-2xl border border-ink-950/10 bg-white px-4 text-sm text-ink-950 outline-none transition focus:border-ink-950/30 focus:ring-4 focus:ring-glow-mint/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
