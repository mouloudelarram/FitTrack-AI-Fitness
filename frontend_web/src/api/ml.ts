import axios from "axios";
import type { PredictCaloriesInput, PredictCaloriesResponse } from "@/types/api";
import { env, isMlConfigured } from "@/utils/env";

const mlClient = axios.create({
  baseURL: env.mlApiBaseUrl || undefined,
  timeout: 15_000,
});

export async function estimateCalories(input: PredictCaloriesInput) {
  if (!isMlConfigured) {
    throw new Error("ML calorie prediction is not configured.");
  }

  const response = await mlClient.post("/predict-calories", {
    food_name: input.foodName,
    protein_g: input.proteinG ?? 0,
    fat_g: input.fatG ?? 0,
    carbs_g: input.carbsG ?? 0,
    fiber_g: input.fiberG ?? 0,
    sugar_g: input.sugarG ?? 0,
    sodium_mg: input.sodiumMg ?? 0,
    saturated_fat_g: input.saturatedFatG ?? 0,
  });

  return {
    foodName: String(response.data.food_name ?? input.foodName),
    predictedCalories: Number(response.data.predicted_calories ?? 0),
    unit: String(response.data.unit ?? "kcal per 100g"),
    macrosProvided: Boolean(response.data.macros_provided),
    modelMae: Number(response.data.model_mae ?? 0),
  } satisfies PredictCaloriesResponse;
}
