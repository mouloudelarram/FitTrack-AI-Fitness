import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as authService from "@/features/auth/auth-service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmStep, setIsConfirmStep] = useState(searchParams.get("step") === "confirm");

  const helperCopy = useMemo(
    () =>
      isConfirmStep
        ? "Enter the reset code from Cognito and choose a new password for your FitTrack account."
        : "We'll send a password reset code to the email address connected to your Cognito account.",
    [isConfirmStep],
  );
  const trimmedEmail = email.trim();
  const loginHref = trimmedEmail ? `/login?email=${encodeURIComponent(trimmedEmail)}` : "/login";

  function updateStepUrl(nextEmail: string, nextStep: boolean) {
    const params = new URLSearchParams();
    const normalizedEmail = nextEmail.trim();

    if (normalizedEmail) {
      params.set("email", normalizedEmail);
    }

    if (nextStep) {
      params.set("step", "confirm");
    }

    setSearchParams(params, { replace: true });
  }

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const normalizedEmail = email.trim();

    if (!normalizedEmail.includes("@")) {
      setError("Enter a valid email.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setIsConfirmStep(true);
      updateStepUrl(normalizedEmail, true);
      setSuccess(`A confirmation code has been sent to ${normalizedEmail}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send a reset code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const normalizedEmail = email.trim();

    if (!normalizedEmail.includes("@")) {
      setError("Enter a valid email.");
      return;
    }

    if (!confirmationCode.trim()) {
      setError("Enter the confirmation code.");
      return;
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("Password must be at least 8 characters and include an uppercase letter and a number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.confirmForgotPassword(normalizedEmail, confirmationCode.trim(), newPassword);
      navigate(`/login?email=${encodeURIComponent(normalizedEmail)}&reset=success`, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset password.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setSuccess("");
    const normalizedEmail = email.trim();

    if (!normalizedEmail.includes("@")) {
      setError("Enter a valid email.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      updateStepUrl(normalizedEmail, true);
      setSuccess(`A fresh confirmation code has been sent to ${normalizedEmail}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to resend the reset code.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1380px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card
          className={`animate-float-in overflow-hidden border-none p-8 lg:p-10 ${isConfirmStep ? "bg-hero-dark text-white" : "bg-white/80"}`}
        >
          <p className={isConfirmStep ? "text-xs font-semibold uppercase tracking-[0.28em] text-white/48" : "eyebrow"}>
            {isConfirmStep ? "Reset password" : "Password help"}
          </p>
          <h1 className={`mt-3 font-display text-4xl font-bold tracking-tight ${isConfirmStep ? "text-white" : "text-ink-950"}`}>
            {isConfirmStep ? "Choose a new password." : "Get back into FitTrack."}
          </h1>
          <p className={`mt-4 text-sm leading-7 ${isConfirmStep ? "text-white/68" : "text-ink-950/65"}`}>{helperCopy}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["One account everywhere", "Use the same Cognito identity across web and mobile."],
              ["Secure reset flow", "Reset codes and password rules are handled directly by Cognito."],
            ].map(([title, description]) => (
              <div key={title} className={isConfirmStep ? "rounded-[24px] bg-white/8 p-4" : "rounded-[24px] bg-glow-mist p-4"}>
                <p className={`font-semibold ${isConfirmStep ? "text-white" : "text-ink-950"}`}>{title}</p>
                <p className={`mt-2 text-sm leading-6 ${isConfirmStep ? "text-white/60" : "text-ink-950/60"}`}>{description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-float-in p-8 sm:p-10">
          <p className="eyebrow">{isConfirmStep ? "Confirmation" : "Recovery"}</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950">
            {isConfirmStep ? "Enter your code." : "Request a reset code."}
          </h2>
          <p className="mt-3 text-sm leading-7 text-ink-950/62">
            {isConfirmStep
              ? "Once confirmed, you'll be sent back to sign in with your updated password."
              : "We'll send the code to the email address on your account."}
          </p>

          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {isConfirmStep ? (
            <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
              <label className="block space-y-2">
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
                <span className="text-sm font-medium text-ink-950">Confirmation code</span>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={confirmationCode}
                  onChange={(event) => setConfirmationCode(event.target.value)}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink-950">New password</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink-950">Confirm new password</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" size="lg" isLoading={isLoading} type="submit">
                  Reset password
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  type="button"
                  variant="secondary"
                  onClick={() => void handleResendCode()}
                  disabled={isLoading}
                >
                  Resend code
                </Button>
              </div>

              <Button
                className="w-full"
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsConfirmStep(false);
                  setConfirmationCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                  setSuccess("");
                  updateStepUrl(email, false);
                }}
              >
                Use a different email
              </Button>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleSendCode}>
              <label className="block space-y-2">
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

              <Button className="w-full" size="lg" isLoading={isLoading} type="submit">
                Send reset code
              </Button>
            </form>
          )}

          <p className="mt-6 text-sm text-ink-950/58">
            Remembered your password?{" "}
            <Link className="font-semibold text-ink-950 underline-offset-4 hover:underline" to={loginHref}>
              Back to sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
