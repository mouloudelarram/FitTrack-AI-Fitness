import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fittrackApi } from "@/api/fittrack";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import * as authService from "@/features/auth/auth-service";
import type { ActivityLevel, Gender } from "@/types/auth";

const activityOptions: Array<{ label: string; value: ActivityLevel }> = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
  { label: "Very active", value: "very_active" },
];

export function SignupPage() {
  const navigate = useNavigate();
  const { pendingSignup, setPendingSignup, clearPendingSignup, signIn } = useAuth();
  const [email, setEmail] = useState(pendingSignup?.email ?? "");
  const [password, setPassword] = useState(pendingSignup?.password ?? "");
  const [confirmPassword, setConfirmPassword] = useState(pendingSignup?.password ?? "");
  const [age, setAge] = useState(String(pendingSignup?.profile.age ?? 25));
  const [height, setHeight] = useState(String(pendingSignup?.profile.height ?? 170));
  const [weight, setWeight] = useState(String(pendingSignup?.profile.weight ?? 70));
  const [gender, setGender] = useState<Gender>(pendingSignup?.profile.gender ?? "male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(pendingSignup?.profile.activityLevel ?? "moderate");
  const [calorieGoal, setCalorieGoal] = useState(
    pendingSignup?.profile.calorieGoal ? String(pendingSignup.profile.calorieGoal) : "",
  );
  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfirmStep = Boolean(pendingSignup);

  const helperCopy = useMemo(
    () =>
      isConfirmStep
        ? "Confirm the code Cognito emailed you, then we will create your FitTrack profile through the existing backend API."
        : "Create the same kind of account the Flutter app expects: Cognito sign-up first, then a FitTrack profile record.",
    [isConfirmStep],
  );

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const parsedAge = Number(age);
    const parsedHeight = Number(height);
    const parsedWeight = Number(weight);
    const parsedCalorieGoal = calorieGoal ? Number(calorieGoal) : undefined;

    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must be at least 8 characters and include an uppercase letter and a number.");
      return;
    }

    if (parsedAge < 10 || parsedAge > 120 || parsedHeight < 50 || parsedHeight > 300 || parsedWeight < 20 || parsedWeight > 700) {
      setError("Body stats are outside the allowed backend ranges.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.signUp(email.trim(), password);
      setPendingSignup({
        email: email.trim(),
        password,
        profile: {
          age: parsedAge,
          height: parsedHeight,
          weight: parsedWeight,
          gender,
          activityLevel,
          calorieGoal: parsedCalorieGoal,
        },
      });
      setSuccess("Confirmation code sent to your email.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create your account.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingSignup) {
      setError("Your sign-up draft has expired. Please start again.");
      return;
    }

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await authService.confirmSignUp(pendingSignup.email, confirmationCode.trim());
      await signIn(pendingSignup.email, pendingSignup.password);
      await fittrackApi.createProfile({
        email: pendingSignup.email,
        age: pendingSignup.profile.age,
        height: pendingSignup.profile.height,
        weight: pendingSignup.profile.weight,
        gender: pendingSignup.profile.gender,
        activityLevel: pendingSignup.profile.activityLevel,
        calorieGoal: pendingSignup.profile.calorieGoal,
      });
      clearPendingSignup();
      navigate("/app/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to confirm the account.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingSignup) {
      return;
    }

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await authService.resendConfirmationCode(pendingSignup.email);
      setSuccess("A fresh confirmation code is on its way.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to resend the code.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1320px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="animate-float-in overflow-hidden border-none bg-white/75 p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink-950/42">
            {isConfirmStep ? "Verify account" : "Create account"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-950">
            {isConfirmStep ? "One last confirmation step." : "Build your FitTrack baseline."}
          </h1>
          <p className="mt-4 text-sm leading-7 text-ink-950/65">{helperCopy}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["Age, height, weight", "These fields map directly to the existing profile payload."],
              ["Activity level", "The backend uses it to auto-calculate your calorie goal."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[24px] bg-glow-mist p-4">
                <p className="font-semibold text-ink-950">{title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-950/60">{description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-float-in p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-ink-950/40">
            {isConfirmStep ? "Confirmation" : "Onboarding"}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950">
            {isConfirmStep ? "Enter your code." : "Tell FitTrack about you."}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-950/62">
            {isConfirmStep
              ? `Code destination: ${pendingSignup?.email ?? email}`
              : "This mirrors the Flutter app’s sign-up form and profile creation flow."}
          </p>

          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {isConfirmStep ? (
            <form className="mt-8 space-y-5" onSubmit={handleConfirm}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink-950">Confirmation code</span>
                <Input
                  inputMode="numeric"
                  placeholder="000000"
                  value={confirmationCode}
                  onChange={(event) => setConfirmationCode(event.target.value)}
                  required
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" size="lg" isLoading={isLoading} type="submit">
                  Confirm and continue
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  type="button"
                  variant="secondary"
                  isLoading={false}
                  onClick={() => void handleResend()}
                >
                  Resend code
                </Button>
              </div>

              <Button
                className="w-full"
                type="button"
                variant="ghost"
                onClick={() => {
                  clearPendingSignup();
                  setConfirmationCode("");
                  setSuccess("");
                }}
              >
                Start over
              </Button>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleSignUp}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-ink-950">Email</span>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-950">Password</span>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-950">Confirm password</span>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-950">Age</span>
                  <Input type="number" min={10} max={120} value={age} onChange={(event) => setAge(event.target.value)} required />
                </label>

                <label className="block space-y-2">
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

                <label className="block space-y-2">
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

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink-950">Gender</span>
                  <Select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-ink-950">Activity level</span>
                  <Select
                    value={activityLevel}
                    onChange={(event) => setActivityLevel(event.target.value as ActivityLevel)}
                  >
                    {activityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-ink-950">Calorie goal (optional)</span>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Leave blank to let the backend calculate it"
                    value={calorieGoal}
                    onChange={(event) => setCalorieGoal(event.target.value)}
                  />
                </label>
              </div>

              <Button className="w-full" size="lg" isLoading={isLoading} type="submit">
                Create account
              </Button>
            </form>
          )}

          <p className="mt-6 text-sm text-ink-950/58">
            Already have an account?{" "}
            <Link className="font-semibold text-ink-950 underline-offset-4 hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
