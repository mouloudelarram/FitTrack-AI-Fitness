import { http } from "@/api/http";
import type {
  CreateProfileInput,
  DailyDashboard,
  FoodLog,
  FoodLogInput,
  FoodLogList,
  LogWeightInput,
  MealType,
  UpdateProfileInput,
  UploadUrlResponse,
  UserProfile,
  WeightLog,
  WeightLogList,
  WeightStats,
  WeekSummaryItem,
} from "@/types/api";

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapProfile(payload: Record<string, unknown>): UserProfile {
  return {
    userId: String(payload.user_id ?? ""),
    email: String(payload.email ?? ""),
    age: toNumber(payload.age, 30),
    height: toNumber(payload.height, 170),
    weight: toNumber(payload.weight, 70),
    gender: (String(payload.gender ?? "male") as UserProfile["gender"]) ?? "male",
    activityLevel: (String(payload.activity_level ?? "moderate") as UserProfile["activityLevel"]) ?? "moderate",
    calorieGoal: toNumber(payload.calorie_goal, 2000),
    createdAt: String(payload.created_at ?? ""),
    updatedAt: String(payload.updated_at ?? ""),
  };
}

function mapFoodLog(payload: Record<string, unknown>): FoodLog {
  return {
    logId: String(payload.log_id ?? ""),
    userId: String(payload.user_id ?? ""),
    foodName: String(payload.food_name ?? ""),
    calories: toNumber(payload.calories, 0),
    mealType: (String(payload.meal_type ?? "snack") as MealType) ?? "snack",
    date: String(payload.date ?? ""),
    imageUrl: String(payload.image_url ?? ""),
    notes: String(payload.notes ?? ""),
    servingSize: String(payload.serving_size ?? ""),
    createdAt: String(payload.created_at ?? ""),
  };
}

function mapWeightLog(payload: Record<string, unknown>): WeightLog {
  return {
    logId: String(payload.log_id ?? ""),
    userId: String(payload.user_id ?? ""),
    weight: toNumber(payload.weight, 0),
    weightOriginal: toNumber(payload.weight_original, 0),
    unit: (String(payload.unit ?? "kg") as WeightLog["unit"]) ?? "kg",
    date: String(payload.date ?? ""),
    notes: String(payload.notes ?? ""),
    createdAt: String(payload.created_at ?? ""),
  };
}

function mapWeightStats(payload: Record<string, unknown>): WeightStats {
  return {
    currentWeight: toNumber(payload.current_weight, 0),
    startWeight: toNumber(payload.start_weight, 0),
    minWeight: toNumber(payload.min_weight, 0),
    maxWeight: toNumber(payload.max_weight, 0),
    change: toNumber(payload.change, 0),
    entriesCount: toNumber(payload.entries_count, 0),
  };
}

function mapWeekSummary(payload: Record<string, unknown>): WeekSummaryItem {
  return {
    date: String(payload.date ?? ""),
    calories: toNumber(payload.calories, 0),
    goal: toNumber(payload.goal, 2000),
  };
}

function serializeProfile(input: CreateProfileInput | UpdateProfileInput) {
  return {
    ...(input.age !== undefined ? { age: input.age } : {}),
    ...(input.height !== undefined ? { height: input.height } : {}),
    ...(input.weight !== undefined ? { weight: input.weight } : {}),
    ...(input.gender !== undefined ? { gender: input.gender } : {}),
    ...(input.activityLevel !== undefined ? { activity_level: input.activityLevel } : {}),
    ...(input.calorieGoal !== undefined ? { calorie_goal: input.calorieGoal } : {}),
    ...("email" in input && input.email ? { email: input.email } : {}),
  };
}

export function imageUrlToObjectKey(imageUrl: string) {
  if (!imageUrl) {
    return "";
  }

  try {
    const url = new URL(imageUrl);
    return url.pathname.replace(/^\/+/, "");
  } catch {
    return "";
  }
}

function detectContentType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export const fittrackApi = {
  async getProfile() {
    const response = await http.get<Record<string, unknown>>("/profile");
    return mapProfile(response.data);
  },

  async createProfile(input: CreateProfileInput) {
    const response = await http.post<Record<string, unknown>>("/profile", serializeProfile(input));
    return mapProfile(response.data);
  },

  async updateProfile(input: UpdateProfileInput) {
    const response = await http.put<Record<string, unknown>>("/profile", serializeProfile(input));
    return mapProfile(response.data);
  },

  async getDashboard(date: string, includeWeek = false) {
    const response = await http.get<Record<string, unknown>>("/dashboard", {
      params: {
        date,
        ...(includeWeek ? { include_week: true } : {}),
      },
    });

    return {
      date: String(response.data.date ?? date),
      calorieGoal: toNumber(response.data.calorie_goal, 2000),
      totalCaloriesConsumed: toNumber(response.data.total_calories_consumed, 0),
      remainingCalories: toNumber(response.data.remaining_calories, 0),
      percentageConsumed: toNumber(response.data.percentage_consumed, 0),
      mealBreakdown: Object.fromEntries(
        Object.entries((response.data.meal_breakdown as Record<string, unknown>) ?? {}).map(([key, value]) => [
          key,
          toNumber(value, 0),
        ]),
      ) as DailyDashboard["mealBreakdown"],
      foodLogs: ((response.data.food_logs as Record<string, unknown>[] | undefined) ?? []).map(mapFoodLog),
      status: String(response.data.status ?? "under_goal") as DailyDashboard["status"],
      weekSummary: ((response.data.week_summary as Record<string, unknown>[] | undefined) ?? []).map(mapWeekSummary),
    } satisfies DailyDashboard;
  },

  async getFoodLogs(date: string) {
    const response = await http.get<Record<string, unknown>>("/food-logs", {
      params: { date },
    });

    return {
      date: String(response.data.date ?? date),
      foodLogs: ((response.data.food_logs as Record<string, unknown>[] | undefined) ?? []).map(mapFoodLog),
      totalCalories: toNumber(response.data.total_calories, 0),
    } satisfies FoodLogList;
  },

  async addFoodLog(input: FoodLogInput) {
    const response = await http.post<Record<string, unknown>>("/food-logs", {
      food_name: input.foodName,
      calories: input.calories,
      meal_type: input.mealType,
      date: input.date,
      ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.servingSize ? { serving_size: input.servingSize } : {}),
    });

    return mapFoodLog(response.data);
  },

  async deleteFoodLog(logId: string) {
    await http.delete(`/food-logs/${logId}`);
  },

  async getWeightLogs(days = 30) {
    const response = await http.get<Record<string, unknown>>("/weight-logs", {
      params: { days },
    });

    const rawStats = response.data.stats as Record<string, unknown> | undefined;

    return {
      weightLogs: ((response.data.weight_logs as Record<string, unknown>[] | undefined) ?? []).map(mapWeightLog),
      stats: rawStats && Object.keys(rawStats).length > 0 ? mapWeightStats(rawStats) : null,
      periodDays: toNumber(response.data.period_days, days),
    } satisfies WeightLogList;
  },

  async logWeight(input: LogWeightInput) {
    const response = await http.post<Record<string, unknown>>("/weight-logs", {
      weight: input.weight,
      date: input.date,
      unit: input.unit ?? "kg",
      ...(input.notes ? { notes: input.notes } : {}),
    });

    return mapWeightLog(response.data);
  },

  async getUploadUrl(file: File, logId = "pending") {
    const response = await http.post<Record<string, unknown>>("/images/upload", {
      content_type: detectContentType(file),
      file_name: file.name,
      log_id: logId,
    });

    return {
      uploadUrl: String(response.data.upload_url ?? ""),
      uploadFields: (response.data.upload_fields as Record<string, string>) ?? {},
      objectKey: String(response.data.object_key ?? ""),
      publicUrl: String(response.data.public_url ?? ""),
      expiresIn: toNumber(response.data.expires_in, 300),
      maxSizeBytes: toNumber(response.data.max_size_bytes, 10 * 1024 * 1024),
    } satisfies UploadUrlResponse;
  },

  async uploadMealImage(file: File, logId = "pending") {
    const upload = await this.getUploadUrl(file, logId);
    const formData = new FormData();

    Object.entries(upload.uploadFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    if (!upload.uploadFields["Content-Type"]) {
      formData.append("Content-Type", detectContentType(file));
    }

    formData.append("file", file);

    const response = await fetch(upload.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Image upload failed with status ${response.status}.`);
    }

    return upload.publicUrl;
  },

  async getImageDownloadUrl(imageUrl: string) {
    const objectKey = imageUrlToObjectKey(imageUrl);
    if (!objectKey) {
      return imageUrl;
    }

    const response = await http.get<{ url: string }>("/images/download", {
      params: { key: objectKey },
    });

    return response.data.url;
  },
};
