import axios, { AxiosError } from "axios";
import { env } from "@/utils/env";
import { useAuthStore } from "@/store/auth-store";

type RetriableConfig = {
  _retry?: boolean;
};

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use(async (config) => {
  // ── FIX 1: Use the ID token, not the access token ─────────────────────
  // API Gateway Cognito authorizers validate the ID token (contains email,
  // sub, cognito:username). The access token is for calling Cognito APIs
  // directly, not for authorizing your own backend endpoints.
  //
  // ── FIX 2: No "Bearer " prefix ────────────────────────────────────────
  // Cognito authorizers expect the raw JWT in the Authorization header.
  // Adding "Bearer " causes a 401 because the authorizer tries to validate
  // "Bearer eyJ..." as a JWT and fails — the raw token is "eyJ...".
  const token = await useAuthStore.getState().getValidIdToken();
  if (token) {
    config.headers.Authorization = token; // raw JWT, no "Bearer " prefix
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as typeof error.config & RetriableConfig;

    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;

      try {
        const refreshed = await useAuthStore.getState().refreshSession();
        config.headers = config.headers ?? {};
        config.headers.Authorization = refreshed.idToken; // ← ID token, no Bearer
        return http(config);
      } catch {
        useAuthStore.getState().clearSession();
        if (window.location.pathname.startsWith("/app")) {
          window.location.assign("/login");
        }
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string; message?: string } | undefined;
    return payload?.error ?? payload?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function getStatusCode(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}