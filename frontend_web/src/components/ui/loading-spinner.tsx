import { cn } from "@/utils/cn";

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 animate-spin rounded-full border-2 border-ink-950/10 border-t-ink-950",
        className,
      )}
      aria-hidden="true"
    />
  );
}
