import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/utils/cn";

type NavItem = {
  label: string;
  to: string;
  accent: string;
  icon: "dashboard" | "meals" | "progress" | "profile";
};

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/app/dashboard", accent: "bg-glow-lime", icon: "dashboard" },
  { label: "Meals", to: "/app/meals", accent: "bg-glow-mint", icon: "meals" },
  { label: "Progress", to: "/app/progress", accent: "bg-glow-ember", icon: "progress" },
  { label: "Profile", to: "/app/profile", accent: "bg-emerald-200", icon: "profile" },
];

function ShellIcon({ kind, className }: { kind: NavItem["icon"] | "menu" | "close"; className?: string }) {
  if (kind === "menu") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "close") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
      </svg>
    );
  }

  const commonProps = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
  } as const;

  switch (kind) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <path d="M4 13.5 12 5l8 8.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 11.5v7.5h11v-7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "meals":
      return (
        <svg {...commonProps}>
          <path d="M7 4v7M10 4v7M8.5 11v9" strokeLinecap="round" />
          <path d="M15 4c1.8 0 3 1.6 3 4s-1.2 4-3 4v8" strokeLinecap="round" />
        </svg>
      );
    case "progress":
      return (
        <svg {...commonProps}>
          <path d="M4 17.5 9 12l4 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6.5v11h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "profile":
      return (
        <svg {...commonProps}>
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M5.5 19c1.2-2.8 3.5-4.2 6.5-4.2S17.3 16.2 18.5 19" strokeLinecap="round" />
        </svg>
      );
  }
}

function currentPageLabel(pathname: string) {
  const matched = navItems.find((item) => pathname.startsWith(item.to));
  return matched?.label ?? "FitTrack";
}

export function AppShell() {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pageLabel = useMemo(() => currentPageLabel(location.pathname), [location.pathname]);

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-[290px] shrink-0 lg:block">
          <div className="sticky top-4 space-y-5">
            <div className="overflow-hidden rounded-[30px] bg-ink-950 p-6 text-white shadow-panel">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-glow-lime font-bold text-ink-950">
                  FT
                </div>
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-white/55">
                FitTrack Web
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                Build momentum, not just streaks.
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Track meals, stay on your calorie target, and keep your weight trend visible in one place.
              </p>
              <div className="mt-6 rounded-[24px] bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">Signed in as</p>
                <p className="mt-2 text-sm font-medium text-white/90">{session?.user.email ?? "Unknown user"}</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-4 rounded-[24px] border px-4 py-4 transition",
                      isActive
                        ? "border-transparent bg-white shadow-soft"
                        : "border-transparent bg-white/45 hover:border-white/80 hover:bg-white/70",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl text-ink-950 transition",
                          item.accent,
                          isActive ? "scale-100" : "opacity-75 group-hover:opacity-100",
                        )}
                      >
                        <ShellIcon kind={item.icon} className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-ink-950">{item.label}</p>
                        <p className="text-sm text-ink-950/45">
                          {item.label === "Dashboard"
                            ? "Daily calorie pulse"
                            : item.label === "Meals"
                              ? "Log and review entries"
                              : item.label === "Progress"
                                ? "Weight trends and stats"
                                : "Goals and personal info"}
                        </p>
                      </div>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-4 z-30 mb-6 rounded-[28px] border border-white/70 bg-white/75 px-4 py-3 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-950/10 bg-white lg:hidden"
                  onClick={() => setIsMobileMenuOpen((value) => !value)}
                  aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
                >
                  <ShellIcon kind={isMobileMenuOpen ? "close" : "menu"} className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">
                    Active Workspace
                  </p>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">{pageLabel}</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl bg-glow-mist px-4 py-2 text-right sm:block">
                  <p className="text-xs uppercase tracking-[0.24em] text-ink-950/35">Cognito User</p>
                  <p className="text-sm font-semibold text-ink-950">{session?.user.email ?? "Signed in"}</p>
                </div>
                <Button variant="secondary" onClick={() => void handleSignOut()}>
                  Sign out
                </Button>
              </div>
            </div>

            {isMobileMenuOpen ? (
              <div className="mt-4 grid gap-2 border-t border-ink-950/8 pt-4 lg:hidden">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-[22px] px-3 py-3 text-sm font-medium transition",
                        isActive ? "bg-ink-950 text-white" : "bg-white/60 text-ink-950",
                      )
                    }
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
                      <ShellIcon kind={item.icon} className="h-4 w-4" />
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </header>

          <main className="flex-1 pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
