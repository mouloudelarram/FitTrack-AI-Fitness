import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { appRouter } from "@/router";
import { useAuthStore } from "@/store/auth-store";

export default function App() {
  const boot = useAuthStore((state) => state.boot);

  useEffect(() => {
    void boot();
  }, [boot]);

  return <RouterProvider router={appRouter} />;
}
