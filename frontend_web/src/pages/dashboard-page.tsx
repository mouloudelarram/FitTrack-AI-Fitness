import { useCallback, useEffect, useState } from "react";
import { fittrackApi } from "@/api/fittrack";
import { getErrorMessage, getStatusCode } from "@/api/http";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBlock } from "@/components/ui/status-block";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import type { DailyDashboard, UserProfile, WeightLog } from "@/types/api";
import { toYmd } from "@/utils/date";

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(toYmd(new Date()));
  const [dashboard, setDashboard] = useState<DailyDashboard | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const [dashboardData, weightData, profileData] = await Promise.all([
        fittrackApi.getDashboard(selectedDate, true),
        fittrackApi.getWeightLogs(30),
        fittrackApi.getProfile().catch((profileError) => {
          if (getStatusCode(profileError) === 404) {
            return null;
          }

          throw profileError;
        }),
      ]);

      setDashboard(dashboardData);
      setWeightLogs(weightData.weightLogs);
      setProfile(profileData);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load dashboard data."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Dashboard"
        description="A browser-first view of your calorie goal, logged meals, and recent progress using the repository's existing backend endpoints."
      />

      {isLoading ? (
        <StatusBlock title="Loading dashboard" description="Pulling your dashboard summary, recent weights, and profile data." />
      ) : error ? (
        <StatusBlock title="Dashboard unavailable" description={error} actionLabel="Retry" onAction={() => void loadData()} tone="error" />
      ) : dashboard ? (
        <DashboardOverview
          dashboard={dashboard}
          profile={profile}
          weightLogs={weightLogs}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      ) : (
        <StatusBlock title="No dashboard data" description="The backend returned no usable dashboard payload for this date." />
      )}
    </div>
  );
}
