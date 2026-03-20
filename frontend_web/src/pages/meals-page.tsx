import { useCallback, useEffect, useState } from "react";
import { fittrackApi } from "@/api/fittrack";
import { getErrorMessage } from "@/api/http";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBlock } from "@/components/ui/status-block";
import { MealFormDialog } from "@/features/meals/meal-form-dialog";
import type { FoodLog, MealFormValues } from "@/types/api";
import { formatLongDate, toYmd } from "@/utils/date";
import { titleCase } from "@/utils/format";

function MealImagePreview({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadImage() {
      if (!imageUrl) {
        setSrc("");
        return;
      }

      try {
        const signedUrl = await fittrackApi.getImageDownloadUrl(imageUrl);
        if (isMounted) {
          setSrc(signedUrl);
        }
      } catch {
        if (isMounted) {
          setSrc("");
        }
      }
    }

    void loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-glow-mist text-xs font-semibold uppercase tracking-[0.22em] text-ink-950/45">
        No photo
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-glow-mist text-xs font-semibold uppercase tracking-[0.22em] text-ink-950/45">
        Loading
      </div>
    );
  }

  return <img alt={alt} className="h-24 w-24 rounded-[22px] object-cover" src={src} />;
}

export function MealsPage() {
  const [selectedDate, setSelectedDate] = useState(toYmd(new Date()));
  const [meals, setMeals] = useState<FoodLog[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<FoodLog | null>(null);

  const loadMeals = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fittrackApi.getFoodLogs(selectedDate);
      setMeals(response.foodLogs);
      setTotalCalories(response.totalCalories);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load food logs."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadMeals();
  }, [loadMeals]);

  async function handleDeleteMeal(logId: string) {
    const confirmed = window.confirm("Delete this meal entry?");
    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await fittrackApi.deleteFoodLog(logId);
      setNotice("Meal deleted.");
      await loadMeals();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Unable to delete the meal."));
    }
  }

  async function handleSaveMeal(values: MealFormValues) {
    setError("");
    setNotice("");
    setIsSaving(true);

    try {
      let imageUrl = values.removeExistingImage ? "" : values.existingImageUrl;
      if (values.imageFile) {
        imageUrl = await fittrackApi.uploadMealImage(values.imageFile, editingMeal?.logId ?? "pending");
      }

      const payload = {
        foodName: values.foodName,
        calories: values.calories,
        mealType: values.mealType,
        date: selectedDate,
        imageUrl: imageUrl || undefined,
        notes: values.notes || undefined,
        servingSize: values.servingSize || undefined,
      };

      if (!editingMeal) {
        await fittrackApi.addFoodLog(payload);
        setNotice("Meal logged successfully.");
      } else {
        await fittrackApi.addFoodLog(payload);

        try {
          await fittrackApi.deleteFoodLog(editingMeal.logId);
          setNotice("Meal updated by replacing the original entry.");
        } catch (deleteOriginalError) {
          setNotice(
            `Replacement meal was saved, but the original entry could not be removed: ${getErrorMessage(
              deleteOriginalError,
              "delete failed",
            )}`,
          );
        }
      }

      setIsDialogOpen(false);
      setEditingMeal(null);
      await loadMeals();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save the meal."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meal Logging"
        description="Create food entries, upload meal photos through presigned S3 requests, and optionally use the separate local calorie predictor when it is configured."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="h-12 rounded-2xl border border-ink-950/10 bg-white px-4 text-sm text-ink-950 outline-none"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Button
              size="lg"
              onClick={() => {
                setEditingMeal(null);
                setIsDialogOpen(true);
              }}
            >
              Add meal
            </Button>
          </div>
        }
      />

      <Card className="border-dashed border-amber-200 bg-amber-50/70">
        <p className="text-sm font-semibold text-amber-900">Editing uses replacement mode</p>
        <p className="mt-2 text-sm leading-6 text-amber-900/70">
          The current backend exposes `POST /food-logs` and `DELETE /food-logs/{'{log_id}'}` but no update endpoint. This web app
          therefore edits meals by saving a new entry and then removing the old one.
        </p>
      </Card>

      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <StatusBlock title="Meal log unavailable" description={error} actionLabel="Retry" onAction={() => void loadMeals()} tone="error" /> : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Daily total</p>
          <h2 className="text-4xl font-bold tracking-tight text-ink-950">{totalCalories.toLocaleString()}</h2>
          <p className="text-sm leading-6 text-ink-950/62">Calories logged for {formatLongDate(selectedDate)} from `GET /food-logs`.</p>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Entries</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink-950">Meals for {selectedDate}</h2>
            </div>
            <p className="text-sm text-ink-950/55">{meals.length} entries</p>
          </div>

          {isLoading ? (
            <div className="text-sm text-ink-950/58">Loading meals…</div>
          ) : meals.length > 0 ? (
            <div className="space-y-4">
              {meals.map((meal) => (
                <div key={meal.logId} className="rounded-[26px] border border-ink-950/8 bg-white px-4 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <MealImagePreview alt={meal.foodName} imageUrl={meal.imageUrl} />
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-ink-950">{meal.foodName}</h3>
                          <span className="rounded-full bg-glow-mist px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-950/60">
                            {titleCase(meal.mealType)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink-950/58">
                          {meal.servingSize ? `Serving: ${meal.servingSize}` : "No serving size"}
                          {meal.notes ? ` · ${meal.notes}` : ""}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-950/38">
                          Logged {new Date(meal.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <p className="text-2xl font-semibold text-ink-950">{meal.calories} kcal</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setEditingMeal(meal);
                            setIsDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button type="button" variant="danger" onClick={() => void handleDeleteMeal(meal.logId)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-ink-950/12 bg-white/65 p-8 text-sm text-ink-950/58">
              No food has been logged for this day yet. Use the button above to add a meal.
            </div>
          )}
        </Card>
      </div>

      <MealFormDialog
        open={isDialogOpen}
        mode={editingMeal ? "edit" : "create"}
        selectedDate={selectedDate}
        initialMeal={editingMeal}
        isSaving={isSaving}
        onClose={() => {
          if (isSaving) {
            return;
          }

          setIsDialogOpen(false);
          setEditingMeal(null);
        }}
        onSubmit={handleSaveMeal}
      />
    </div>
  );
}
