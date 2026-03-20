import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-950 text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-ink-900 disabled:bg-ink-950/45",
  secondary:
    "bg-white/80 text-ink-950 ring-1 ring-ink-950/10 transition hover:-translate-y-0.5 hover:bg-white",
  ghost:
    "bg-transparent text-ink-950 transition hover:bg-white/70",
  danger:
    "bg-rose-600 text-white transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:bg-rose-600/45",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leading?: ReactNode;
}

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-ink-950/35 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <LoadingSpinner className="h-4 w-4 border-white/30 border-t-current" /> : leading}
      <span>{children}</span>
    </button>
  );
}
