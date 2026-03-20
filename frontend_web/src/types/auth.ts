export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export type AuthStatus = "checking" | "authenticated" | "anonymous";

export type Gender = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface SignUpDraftProfile {
  age: number;
  height: number;
  weight: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  calorieGoal?: number;
}

export interface SignUpDraft {
  email: string;
  password: string;
  profile: SignUpDraftProfile;
}
