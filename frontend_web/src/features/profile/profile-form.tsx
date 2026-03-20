import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ActivityLevel, Gender } from "@/types/auth";
import type { UpdateProfileInput, UserProfile } from "@/types/api";

interface ProfileFormProps {
  email: string;
  initialProfile: UserProfile | null;
  isSaving: boolean;
  onSubmit: (input: UpdateProfileInput & { calorieGoal?: number }) => Promise<void>;
}

export function ProfileForm({ email, initialProfile, isSaving, onSubmit }: ProfileFormProps) {
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialProfile) {
      return;
    }

    setAge(String(initialProfile.age));
    setHeight(String(initialProfile.height));
    setWeight(String(initialProfile.weight));
    setGender(initialProfile.gender);
    setActivityLevel(initialProfile.activityLevel);
    setCalorieGoal(String(initialProfile.calorieGoal));
  }, [initialProfile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedAge = Number(age);
    const parsedHeight = Number(height);
    const parsedWeight = Number(weight);
    const parsedCalorieGoal = calorieGoal.trim() ? Number(calorieGoal) : undefined;

    if (
      !Number.isFinite(parsedAge) ||
      parsedAge < 10 ||
      parsedAge > 120 ||
      !Number.isFinite(parsedHeight) ||
      parsedHeight < 50 ||
      parsedHeight > 300 ||
      !Number.isFinite(parsedWeight) ||
      parsedWeight < 20 ||
      parsedWeight > 700
    ) {
      setError("Please enter valid stats within the backend's allowed ranges.");
      return;
    }

    await onSubmit({
      age: parsedAge,
      height: parsedHeight,
      weight: parsedWeight,
      gender,
      activityLevel,
      calorieGoal: parsedCalorieGoal,
    });
  }

  return (
    <Card className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Profile payload</p>
        <h3 className="mt-2 text-2xl font-semibold text-ink-950">
          {initialProfile ? "Update your goals" : "Create your profile"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-950/60">
          These fields map directly to the backend&apos;s `POST /profile` and `PUT /profile` requests. Leave calorie goal blank
          if you want the backend to recompute it from your stats.
        </p>
      </div>

      <form className="grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-ink-950">Email</span>
          <Input value={email} disabled />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-950">Age</span>
          <Input type="number" min={10} max={120} value={age} onChange={(event) => setAge(event.target.value)} required />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-950">Height (cm)</span>
          <Input
            type="number"
            min={50}
            max={300}
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-950">Weight (kg)</span>
          <Input
            type="number"
            min={20}
            max={700}
            step="0.1"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-950">Gender</span>
          <Select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-ink-950">Activity level</span>
          <Select value={activityLevel} onChange={(event) => setActivityLevel(event.target.value as ActivityLevel)}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
          </Select>
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-medium text-ink-950">Calorie goal (optional)</span>
          <Input
            type="number"
            min={1}
            placeholder="Leave blank to auto-calculate"
            value={calorieGoal}
            onChange={(event) => setCalorieGoal(event.target.value)}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:col-span-2">
            {error}
          </div>
        ) : null}

        <div className="lg:col-span-2">
          <Button size="lg" isLoading={isSaving} type="submit">
            {initialProfile ? "Save profile" : "Create profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
