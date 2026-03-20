import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fittrackApi } from "@/api/fittrack";
import { getErrorMessage } from "@/api/http";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBlock } from "@/components/ui/status-block";
import { WeightEntryCard } from "@/features/progress/weight-entry-card";
import type { WeightLog, WeightStats } from "@/types/api";
import { formatLongDate, formatMonthDay, toYmd } from "@/utils/date";
import { formatSigned, formatWeight } from "@/utils/format";

export function ProgressPage() {
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [stats, setStats] = useState<WeightStats | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fittrackApi.getWeightLogs(selectedDays);
      setWeightLogs(response.weightLogs);
      setStats(response.stats);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load weight history."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateWeight(input: { weight: number; unit: "kg" | "lbs"; notes?: string }) {
    setError("");
    setIsSubmitting(true);

    try {
      await fittrackApi.logWeight({
        ...input,
        date: toYmd(new Date()),
      });
      await loadData();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Unable to save weight."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress Tracking"
        description="Log weight, watch the recent trend line, and review the same weight stats the mobile app derives from the backend."
      />

      <WeightEntryCard isSubmitting={isSubmitting} onSubmit={handleCreateWeight} />

      <div className="flex flex-wrap gap-3">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedDays === days ? "bg-ink-950 text-white" : "bg-white/70 text-ink-950"
            }`}
            onClick={() => setSelectedDays(days)}
          >
            Last {days} days
          </button>
        ))}
      </div>

      {error ? <StatusBlock title="Progress unavailable" description={error} actionLabel="Retry" onAction={() => void loadData()} tone="error" /> : null}

      <div className="grid gap-6 lg:grid-cols-4">
        {[
          ["Current", stats ? formatWeight(stats.currentWeight) : "No data"],
          ["Change", stats ? `${formatSigned(stats.change)} kg` : "No data"],
          ["Lowest", stats ? formatWeight(stats.minWeight) : "No data"],
          ["Highest", stats ? formatWeight(stats.maxWeight) : "No data"],
        ].map(([label, value]) => (
          <Card key={label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">{label}</p>
            <p className="text-2xl font-semibold text-ink-950">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Trend chart</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink-950">Weight history</h3>
        </div>
        <div className="h-[320px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-ink-950/58">Loading chart data…</div>
          ) : weightLogs.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightLogs}>
                <defs>
                  <linearGradient id="weightArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#13b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#13b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(8,17,31,0.08)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatMonthDay} tick={{ fill: "rgba(8,17,31,0.45)", fontSize: 12 }} />
                <YAxis tick={{ fill: "rgba(8,17,31,0.45)", fontSize: 12 }} width={48} />
                <Tooltip
                  contentStyle={{ borderRadius: 18, border: "1px solid rgba(8,17,31,0.08)", background: "rgba(255,255,255,0.97)" }}
                  formatter={(value: number) => [`${value.toFixed(1)} kg`, "Weight"]}
                  labelFormatter={(label) => formatLongDate(label)}
                />
                <Area type="monotone" dataKey="weight" stroke="#13b981" strokeWidth={3} fill="url(#weightArea)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-ink-950/12 bg-white/65 text-sm text-ink-950/58">
              Add at least two entries to unlock the chart.
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">History</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink-950">Latest entries</h3>
        </div>

        {isLoading ? (
          <div className="text-sm text-ink-950/58">Loading entries…</div>
        ) : weightLogs.length > 0 ? (
          <div className="space-y-3">
            {[...weightLogs].reverse().map((log) => (
              <div key={log.logId} className="rounded-[22px] border border-ink-950/8 bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink-950">{formatWeight(log.weight)}</p>
                    <p className="mt-1 text-sm text-ink-950/55">{log.notes || "No notes recorded"}</p>
                  </div>
                  <p className="text-sm text-ink-950/55">{formatLongDate(log.date)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-ink-950/12 bg-white/65 p-6 text-sm text-ink-950/58">
            Your weight history will appear here once you start logging entries.
          </div>
        )}
      </Card>
    </div>
  );
}
