type EnvMap = Record<string, string | undefined>;

const rawEnv = import.meta.env as EnvMap;

function readRequired(key: string) {
  const value = rawEnv[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required. Copy .env.example to .env.local and fill it in.`);
  }

  return value.replace(/\/$/, "");
}

function readOptional(key: string) {
  const value = rawEnv[key]?.trim();
  return value ? value.replace(/\/$/, "") : "";
}

export const env = {
  apiBaseUrl: readRequired("VITE_API_BASE_URL"),
  cognitoRegion: readRequired("VITE_COGNITO_REGION"),
  cognitoUserPoolId: readRequired("VITE_COGNITO_USER_POOL_ID"),
  cognitoClientId: readRequired("VITE_COGNITO_CLIENT_ID"),
  mlApiBaseUrl: readOptional("VITE_ML_API_URL"),
};

export const isMlConfigured = Boolean(env.mlApiBaseUrl);
