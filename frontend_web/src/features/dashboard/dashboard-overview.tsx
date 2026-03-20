import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DailyDashboard, UserProfile, WeightLog } from "@/types/api";
import { formatCalories, formatWeight, titleCase } from "@/utils/format";
import { formatDayTick, formatLongDate, formatMonthDay, isToday } from "@/utils/date";

interface DashboardOverviewProps {
  dashboard: DailyDashboard;
  profile: UserProfile | null;
  weightLogs: WeightLog[];
  selectedDate: string;
  onDateChange: (value: string) => void;
}

export function DashboardOverview({
  dashboard,
  profile,
  weightLogs,
  selectedDate,
  onDateChange,
}: DashboardOverviewProps) {
  const breakdownEntries = Object.entries(dashboard.mealBreakdown).filter(([, value]) => Number(value) > 0);
  const recentMeals = [...dashboard.foodLogs].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-ink-950 p-0 text-white">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                {isToday(selectedDate) ? "Today" : formatLongDate(selectedDate)}
              </div>
              <label className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/80">
                <span>Date</span>
                <input
                  className="rounded-full border border-white/15 bg-transparent px-3 py-1 text-white outline-none"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => onDateChange(event.target.value)}
                />
              </label>
            </div>

            <div>
              <h2 className="font-display text-4xl font-bold tracking-tight lg:text-5xl">
                {dashboard.totalCaloriesConsumed.toLocaleString()} kcal logged
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                You are{" "}
                <span className="font-semibold text-white">
                  {dashboard.remainingCalories >= 0
                    ? `${dashboard.remainingCalories} kcal under`
                    : `${Math.abs(dashboard.remainingCalories)} kcal over`}
                </span>{" "}
                your current goal of {dashboard.calorieGoal} kcal. FitTrack is reading the same backend contract as the
                mobile app, so these values come straight from `GET /dashboard`.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Eaten", formatCalories(dashboard.totalCaloriesConsumed), "bg-glow-lime text-ink-950"],
                [
                  dashboard.remainingCalories >= 0 ? "Remaining" : "Over goal",
                  formatCalories(Math.abs(dashboard.remainingCalories)),
                  dashboard.remainingCalories >= 0 ? "bg-glow-mint text-ink-950" : "bg-rose-500 text-white",
                ],
                ["Weight", profile ? formatWeight(profile.weight) : "No profile", "bg-white/10 text-white"],
              ].map(([label, value, accent]) => (
                <div key={label} className="rounded-[24px] bg-white/8 p-4">
                  <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>{label}</div>
                  <p className="mt-4 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-white/8 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">7-day calorie pulse</p>
            <div className="mt-4 h-[260px]">
              {dashboard.weekSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.weekSummary}>
                    <defs>
                      <linearGradient id="caloriesArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#c7ff6b" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#c7ff6b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDayTick} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} width={42} />
                    <Tooltip
                      contentStyle={{ borderRadius: 18, border: "none", background: "rgba(8,17,31,0.95)", color: "white" }}
                      formatter={(value: number) => [`${value} kcal`, "Calories"]}
                      labelFormatter={(label) => formatLongDate(label)}
                    />
                    <Area type="monotone" dataKey="goal" stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" fill="none" />
                    <Area type="monotone" dataKey="calories" stroke="#c7ff6b" strokeWidth={3} fill="url(#caloriesArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-white/60">
                  Log meals across a few days to reveal your weekly calorie pattern.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {!profile ? (
        <Card className="border-dashed border-emerald-200 bg-emerald-50/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Profile still missing</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900/70">
                The backend accepts dashboard calls without a saved profile, but your weight and calorie goal stay more
                accurate once `GET /profile` returns real data.
              </p>
            </div>
            <Link to="/app/profile">
              <Button variant="secondary">Complete your profile</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Breakdown</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-950">Meals for {formatMonthDay(selectedDate)}</h3>
            </div>
            <Link to="/app/meals">
              <Button variant="secondary">Open meal log</Button>
            </Link>
          </div>

          {breakdownEntries.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {breakdownEntries.map(([mealType, calories]) => (
                <div key={mealType} className="rounded-[24px] bg-glow-mist p-4">
                  <p className="text-sm font-medium text-ink-950/55">{titleCase(mealType)}</p>
                  <p className="mt-3 text-2xl font-semibold text-ink-950">{Number(calories).toLocaleString()} kcal</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-ink-950/12 bg-white/65 p-6 text-sm text-ink-950/58">
              No meals have been logged for this day yet.
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-ink-950">Recent meals</h4>
              <Link className="text-sm font-semibold text-ink-950 underline-offset-4 hover:underline" to="/app/meals">
                Manage all entries
              </Link>
            </div>

            {recentMeals.length > 0 ? (
              recentMeals.map((meal) => (
                <div key={meal.logId} className="rounded-[22px] border border-ink-950/8 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink-950">{meal.foodName}</p>
                      <p className="mt-1 text-sm text-ink-950/55">
                        {titleCase(meal.mealType)}
                        {meal.servingSize ? ` · ${meal.servingSize}` : ""}
                        {meal.notes ? ` · ${meal.notes}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink-950">{meal.calories} kcal</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-ink-950/12 bg-white/65 p-6 text-sm text-ink-950/58">
                No recent meals for this day.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Weight trend</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-950">Recent progress</h3>
            </div>
            <Link to="/app/progress">
              <Button variant="secondary">Open progress</Button>
            </Link>
          </div>

          <div className="h-[320px]">
            {weightLogs.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightLogs}>
                  <CartesianGrid stroke="rgba(8,17,31,0.08)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatMonthDay} tick={{ fill: "rgba(8,17,31,0.45)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "rgba(8,17,31,0.45)", fontSize: 12 }} width={48} />
                  <Tooltip
                    contentStyle={{ borderRadius: 18, border: "1px solid rgba(8,17,31,0.08)", background: "rgba(255,255,255,0.97)" }}
                    formatter={(value: number) => [`${value.toFixed(1)} kg`, "Weight"]}
                    labelFormatter={(label) => formatLongDate(label)}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#13b981" strokeWidth={3} dot={weightLogs.length <= 12} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-ink-950/12 bg-white/65 text-center text-sm text-ink-950/58">
                Log at least two weight entries to unlock the trend chart.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
