import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { AuthSession } from "@/types/auth";
import { env } from "@/utils/env";
import { parseJwt } from "@/utils/jwt";

const cognitoClient = new CognitoIdentityProviderClient({
  region: env.cognitoRegion,
});

function friendlyAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Authentication request failed.";
  }

  switch ((error as Error & { name?: string }).name) {
    case "NotAuthorizedException":
      return "Invalid email or password.";
    case "UserNotConfirmedException":
      return "Your email address is not confirmed yet.";
    case "UsernameExistsException":
      return "An account already exists for this email.";
    case "CodeMismatchException":
      return "The confirmation code is invalid.";
    case "ExpiredCodeException":
      return "The confirmation code has expired. Request a new one.";
    case "UserNotFoundException":
      return "No account was found for this email.";
    case "LimitExceededException":
      return "Too many attempts. Please wait a moment and try again.";
    case "TooManyRequestsException":
      return "Too many requests. Please try again shortly.";
    default:
      return error.message || "Authentication request failed.";
  }
}

function buildSession(
  authResult: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
  },
  fallbackEmail = "",
) {
  if (!authResult.AccessToken || !authResult.IdToken || !authResult.RefreshToken) {
    throw new Error("Cognito did not return a full session.");
  }

  const accessPayload = parseJwt(authResult.AccessToken);
  const idPayload = parseJwt(authResult.IdToken);

  return {
    accessToken: authResult.AccessToken,
    idToken: authResult.IdToken,
    refreshToken: authResult.RefreshToken,
    expiresAt: (accessPayload.exp ?? 0) * 1000,
    user: {
      id:
        String(accessPayload.sub ?? idPayload.sub ?? accessPayload["cognito:username"] ?? "").trim() ||
        "unknown",
      email:
        String(idPayload.email ?? fallbackEmail ?? accessPayload.username ?? "").trim() || fallbackEmail,
    },
  } satisfies AuthSession;
}

export async function signUp(email: string, password: string) {
  try {
    await cognitoClient.send(
      new SignUpCommand({
        ClientId: env.cognitoClientId,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      }),
    );
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function confirmSignUp(email: string, confirmationCode: string) {
  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: env.cognitoClientId,
        Username: email,
        ConfirmationCode: confirmationCode,
      }),
    );
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function resendConfirmationCode(email: string) {
  try {
    await cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: env.cognitoClientId,
        Username: email,
      }),
    );
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function signIn(email: string, password: string) {
  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: env.cognitoClientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );

    if (!response.AuthenticationResult) {
      throw new Error("Cognito returned an incomplete sign-in response.");
    }

    return buildSession(response.AuthenticationResult, email);
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function refreshSession(session: AuthSession) {
  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: env.cognitoClientId,
        AuthParameters: {
          REFRESH_TOKEN: session.refreshToken,
        },
      }),
    );

    if (!response.AuthenticationResult?.AccessToken) {
      throw new Error("Unable to refresh session.");
    }

    return buildSession(
      {
        AccessToken: response.AuthenticationResult.AccessToken,
        IdToken: response.AuthenticationResult.IdToken ?? session.idToken,
        RefreshToken: session.refreshToken,
      },
      session.user.email,
    );
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function signOut(session: AuthSession | null) {
  if (!session?.accessToken) {
    return;
  }

  try {
    await cognitoClient.send(
      new GlobalSignOutCommand({
        AccessToken: session.accessToken,
      }),
    );
  } catch {
    // Clearing the local session is enough if the token is already stale.
  }
}
