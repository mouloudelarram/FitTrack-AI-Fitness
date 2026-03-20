import { useCallback, useEffect, useState } from "react";
import { fittrackApi } from "@/api/fittrack";
import { getErrorMessage, getStatusCode } from "@/api/http";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/features/profile/profile-form";
import { useAuth } from "@/hooks/use-auth";
import type { UpdateProfileInput, UserProfile } from "@/types/api";

export function ProfilePage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const data = await fittrackApi.getProfile();
      setProfile(data);
    } catch (loadError) {
      if (getStatusCode(loadError) === 404) {
        setProfile(null);
      } else {
        setError(getErrorMessage(loadError, "Unable to load profile."));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSubmit(input: UpdateProfileInput & { calorieGoal?: number }) {
    setError("");
    setNotice("");
    setIsSaving(true);

    try {
      const saved = profile
        ? await fittrackApi.updateProfile(input)
        : await fittrackApi.createProfile({
            email: session?.user.email ?? "",
            age: input.age ?? 25,
            height: input.height ?? 170,
            weight: input.weight ?? 70,
            gender: input.gender ?? "male",
            activityLevel: input.activityLevel ?? "moderate",
            calorieGoal: input.calorieGoal,
          });

      setProfile(saved);
      setNotice(profile ? "Profile updated successfully." : "Profile created successfully.");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save profile."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile & Goals"
        description="Edit the personal stats that power your calorie goal calculation and keep your backend profile aligned with the web and mobile experiences."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProfileForm email={session?.user.email ?? ""} initialProfile={profile} isSaving={isSaving} onSubmit={handleSubmit} />

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Backend notes</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-950">What this page controls</h3>
            </div>
            <ul className="space-y-3 text-sm leading-6 text-ink-950/62">
              <li>The backend recalculates `calorie_goal` with the Mifflin-St Jeor formula when you leave the goal blank.</li>
              <li>Saving weight here also affects the current weight shown by the dashboard and progress endpoints.</li>
              <li>The profile record is keyed to your Cognito `sub`, not your email address.</li>
            </ul>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Status</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-950">Profile request state</h3>
            </div>

            {isLoading ? <p className="text-sm text-ink-950/58">Loading profile…</p> : null}
            {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            {profile ? (
              <div className="rounded-[24px] bg-glow-mist p-5">
                <p className="text-sm font-medium text-ink-950/55">Current goal</p>
                <p className="mt-2 text-3xl font-semibold text-ink-950">{profile.calorieGoal} kcal</p>
                <p className="mt-2 text-sm leading-6 text-ink-950/58">Last updated: {new Date(profile.updatedAt).toLocaleString()}</p>
              </div>
            ) : !isLoading ? (
              <div className="rounded-[24px] border border-dashed border-ink-950/12 bg-white/65 p-6 text-sm text-ink-950/58">
                No profile record exists yet. Creating one here will make your dashboard and weight tracking more personalized.
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
