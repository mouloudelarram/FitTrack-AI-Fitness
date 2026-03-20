import type { ActivityLevel, Gender } from "@/types/auth";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface UserProfile {
  userId: string;
  email: string;
  age: number;
  height: number;
  weight: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  calorieGoal: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileInput {
  email: string;
  age: number;
  height: number;
  weight: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  calorieGoal?: number;
}

export interface UpdateProfileInput {
  age?: number;
  height?: number;
  weight?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  calorieGoal?: number;
}

export interface FoodLog {
  logId: string;
  userId: string;
  foodName: string;
  calories: number;
  mealType: MealType;
  date: string;
  imageUrl: string;
  notes: string;
  servingSize: string;
  createdAt: string;
}

export interface FoodLogList {
  date: string;
  foodLogs: FoodLog[];
  totalCalories: number;
}

export interface FoodLogInput {
  foodName: string;
  calories: number;
  mealType: MealType;
  date: string;
  imageUrl?: string;
  notes?: string;
  servingSize?: string;
}

export interface WeekSummaryItem {
  date: string;
  calories: number;
  goal: number;
}

export interface DailyDashboard {
  date: string;
  calorieGoal: number;
  totalCaloriesConsumed: number;
  remainingCalories: number;
  percentageConsumed: number;
  mealBreakdown: Partial<Record<MealType, number>>;
  foodLogs: FoodLog[];
  status: "under_goal" | "over_goal";
  weekSummary: WeekSummaryItem[];
}

export interface WeightLog {
  logId: string;
  userId: string;
  weight: number;
  weightOriginal: number;
  unit: "kg" | "lbs";
  date: string;
  notes: string;
  createdAt: string;
}

export interface WeightStats {
  currentWeight: number;
  startWeight: number;
  minWeight: number;
  maxWeight: number;
  change: number;
  entriesCount: number;
}

export interface WeightLogList {
  weightLogs: WeightLog[];
  stats: WeightStats | null;
  periodDays: number;
}

export interface LogWeightInput {
  weight: number;
  date: string;
  unit?: "kg" | "lbs";
  notes?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  uploadFields: Record<string, string>;
  objectKey: string;
  publicUrl: string;
  expiresIn: number;
  maxSizeBytes: number;
}

export interface PredictCaloriesInput {
  foodName: string;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  saturatedFatG?: number;
}

export interface PredictCaloriesResponse {
  foodName: string;
  predictedCalories: number;
  unit: string;
  macrosProvided: boolean;
  modelMae: number;
}

export interface MealFormValues {
  foodName: string;
  calories: number;
  mealType: MealType;
  servingSize: string;
  notes: string;
  imageFile: File | null;
  existingImageUrl: string;
  removeExistingImage: boolean;
}
