import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface StatusBlockProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "error";
  visual?: ReactNode;
}

export function StatusBlock({
  title,
  description,
  actionLabel,
  onAction,
  tone = "neutral",
  visual,
}: StatusBlockProps) {
  return (
    <Card className="flex flex-col items-start gap-5 bg-white/75 p-8">
      <div
        className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
          tone === "error" ? "bg-rose-100 text-rose-700" : "bg-glow-mist text-ink-950"
        }`}
      >
        {visual ?? <span className="text-xl font-semibold">{tone === "error" ? "!" : "?"}</span>}
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-ink-950">{title}</h2>
        <p className="max-w-xl text-sm leading-6 text-ink-950/65">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant={tone === "error" ? "danger" : "secondary"} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
