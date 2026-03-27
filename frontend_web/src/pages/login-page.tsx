import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const resetSuccess = searchParams.get("reset") === "success";
  const forgotPasswordHref = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : "/forgot-password";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn(email.trim(), password);
      navigate("/app/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1320px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="animate-float-in overflow-hidden border-none bg-ink-950 p-8 text-white lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">FitTrack Web</p>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            A sharper home for your daily calorie rhythm.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/72">
            Use the same Cognito identity and AWS-backed APIs as the mobile app to review meals, weight trends, and
            your personal calorie goal from the browser.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Real backend", "Live API Gateway + Lambda calls"],
              ["Protected routes", "Cognito access tokens with refresh"],
              ["Image uploads", "Presigned S3 uploads, no mock data"],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[26px] bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-float-in self-center p-8 sm:p-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-ink-950 text-sm font-bold text-white">
            FT
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-ink-950/40">Welcome back</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950">Sign in to continue.</h2>
          <p className="mt-3 text-sm leading-6 text-ink-950/62">
            This uses the existing Cognito user pool from the repo, so the same account works here and in the Flutter
            app.
          </p>

          {resetSuccess ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Password updated. Sign in with your new password.
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
              <span className="flex items-center justify-between gap-3 text-sm font-medium text-ink-950">
                <span>Password</span>
                <Link
                  className="text-xs font-semibold text-ink-950/70 underline-offset-4 transition hover:text-ink-950 hover:underline"
                  to={forgotPasswordHref}
                >
                  Forgot password?
                </Link>
              </span>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <Button className="w-full" size="lg" isLoading={isLoading} type="submit">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-950/58">
            Need an account?{" "}
            <Link className="font-semibold text-ink-950 underline-offset-4 hover:underline" to="/signup">
              Create one
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
