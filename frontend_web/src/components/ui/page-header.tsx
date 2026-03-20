import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink-950/45">FitTrack Web</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-950/65 sm:text-base">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
