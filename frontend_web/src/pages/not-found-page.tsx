import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-xl p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink-950/42">404</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-950">This route is off track.</h1>
        <p className="mt-4 text-sm leading-7 text-ink-950/62">
          The page you asked for does not exist in the FitTrack web app. Head back to the dashboard or sign-in flow.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/app/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Go to login</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
