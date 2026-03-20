import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LoadingScreenProps {
  message: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="animate-float-in rounded-[32px] border border-white/80 bg-white/85 px-8 py-10 text-center shadow-panel backdrop-blur">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-ink-950 text-white">
          <LoadingSpinner className="h-7 w-7 border-white/25 border-t-white" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-ink-950/40">FitTrack</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-950">{message}</h1>
      </div>
    </div>
  );
}
