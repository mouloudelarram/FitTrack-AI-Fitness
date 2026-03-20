import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-2xl border border-ink-950/10 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition placeholder:text-ink-950/35 focus:border-ink-950/30 focus:ring-4 focus:ring-glow-mint/15",
        className,
      )}
      {...props}
    />
  );
}
