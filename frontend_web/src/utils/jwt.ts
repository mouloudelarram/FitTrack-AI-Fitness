export interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  username?: string;
  "cognito:username"?: string;
  [key: string]: unknown;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);

  try {
    return decodeURIComponent(
      Array.from(decoded)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  } catch {
    return decoded;
  }
}

export function parseJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT");
  }

  return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
}

export function isTokenExpired(token: string, skewMs = 60_000) {
  try {
    const payload = parseJwt(token);
    if (!payload.exp) {
      return true;
    }

    return payload.exp * 1000 <= Date.now() + skewMs;
  } catch {
    return true;
  }
}
