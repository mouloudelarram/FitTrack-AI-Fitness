import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { DashboardPage } from "@/pages/dashboard-page";
import { LoginPage } from "@/pages/login-page";
import { MealsPage } from "@/pages/meals-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { ProfilePage } from "@/pages/profile-page";
import { ProgressPage } from "@/pages/progress-page";
import { SignupPage } from "@/pages/signup-page";
import { useAuthStore } from "@/store/auth-store";

function RootRedirect() {
  const status = useAuthStore((state) => state.status);

  if (status === "checking") {
    return <LoadingScreen message="Loading FitTrack Web..." />;
  }

  return <Navigate replace to={status === "authenticated" ? "/app/dashboard" : "/login"} />;
}

function PublicOnly() {
  const status = useAuthStore((state) => state.status);

  if (status === "checking") {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (status === "authenticated") {
    return <Navigate replace to="/app/dashboard" />;
  }

  return <Outlet />;
}

function RequireAuth() {
  const status = useAuthStore((state) => state.status);

  if (status === "checking") {
    return <LoadingScreen message="Securing your workspace..." />;
  }

  if (status !== "authenticated") {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    element: <PublicOnly />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/signup",
        element: <SignupPage />,
      },
    ],
  },
  {
    path: "/app",
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Navigate replace to="/app/dashboard" />,
          },
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "meals",
            element: <MealsPage />,
          },
          {
            path: "progress",
            element: <ProgressPage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
