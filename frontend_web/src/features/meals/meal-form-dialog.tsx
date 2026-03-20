import { useEffect, useMemo, useState } from "react";
import { estimateCalories } from "@/api/ml";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FoodLog, MealFormValues, MealType } from "@/types/api";
import { isMlConfigured } from "@/utils/env";

interface MealFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  selectedDate: string;
  initialMeal?: FoodLog | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: MealFormValues) => Promise<void>;
}

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function getDefaultValues(meal?: FoodLog | null): MealFormValues {
  return {
    foodName: meal?.foodName ?? "",
    calories: meal?.calories ?? 0,
    mealType: meal?.mealType ?? "breakfast",
    servingSize: meal?.servingSize ?? "",
    notes: meal?.notes ?? "",
    imageFile: null,
    existingImageUrl: meal?.imageUrl ?? "",
    removeExistingImage: false,
  };
}

export function MealFormDialog({
  open,
  mode,
  selectedDate,
  initialMeal,
  isSaving,
  onClose,
  onSubmit,
}: MealFormDialogProps) {
  const [values, setValues] = useState<MealFormValues>(getDefaultValues(initialMeal));
  const [error, setError] = useState("");
  const [predictionNotice, setPredictionNotice] = useState("");
  const [predictionError, setPredictionError] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [proteinG, setProteinG] = useState("");
  const [fatG, setFatG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [sugarG, setSugarG] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [saturatedFatG, setSaturatedFatG] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(getDefaultValues(initialMeal));
    setError("");
    setPredictionError("");
    setPredictionNotice("");
    setProteinG("");
    setFatG("");
    setCarbsG("");
    setFiberG("");
    setSugarG("");
    setSodiumMg("");
    setSaturatedFatG("");
  }, [open, initialMeal]);

  const localPreviewUrl = useMemo(() => {
    if (!values.imageFile) {
      return "";
    }

    return URL.createObjectURL(values.imageFile);
  }, [values.imageFile]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  if (!open) {
    return null;
  }

  async function handleEstimateCalories() {
    setPredictionError("");
    setPredictionNotice("");
    setIsEstimating(true);

    try {
      const prediction = await estimateCalories({
        foodName: values.foodName,
        proteinG: proteinG ? Number(proteinG) : undefined,
        fatG: fatG ? Number(fatG) : undefined,
        carbsG: carbsG ? Number(carbsG) : undefined,
        fiberG: fiberG ? Number(fiberG) : undefined,
        sugarG: sugarG ? Number(sugarG) : undefined,
        sodiumMg: sodiumMg ? Number(sodiumMg) : undefined,
        saturatedFatG: saturatedFatG ? Number(saturatedFatG) : undefined,
      });

      setValues((current) => ({
        ...current,
        calories: Math.round(prediction.predictedCalories),
      }));
      setPredictionNotice(
        `Estimated ${prediction.predictedCalories.toFixed(1)} kcal per 100g. Adjust the calorie field if your serving size is different.`,
      );
    } catch (estimateError) {
      setPredictionError(estimateError instanceof Error ? estimateError.message : "Unable to estimate calories.");
    } finally {
      setIsEstimating(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!values.foodName.trim()) {
      setError("Food name is required.");
      return;
    }

    if (!Number.isFinite(values.calories) || values.calories < 0) {
      setError("Calories must be zero or a positive number.");
      return;
    }

    await onSubmit({
      ...values,
      foodName: values.foodName.trim(),
      servingSize: values.servingSize.trim(),
      notes: values.notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/45 p-4 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-4xl animate-float-in rounded-[32px] border border-white/70 bg-white p-6 shadow-panel sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-ink-950/40">
              {mode === "create" ? "New meal" : "Replace meal entry"}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950">
              {mode === "create" ? "Log a meal" : "Edit this meal"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-950/62">
              Saving for <span className="font-semibold text-ink-950">{selectedDate}</span>. When editing, the app creates
              a replacement entry and then deletes the old one, because the current backend does not expose an update
              endpoint for food logs.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-ink-950">Food name</span>
                  <Input
                    value={values.foodName}
                    onChange={(event) => setValues((current) => ({ ...current, foodName: event.target.value }))}
                    placeholder="Chicken breast, oatmeal, banana..."
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink-950">Calories</span>
                  <Input
                    type="number"
                    min={0}
                    value={values.calories}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        calories: Number(event.target.value || 0),
                      }))
                    }
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink-950">Meal type</span>
                  <Select
                    value={values.mealType}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        mealType: event.target.value as MealType,
                      }))
                    }
                  >
                    {mealTypes.map((mealType) => (
                      <option key={mealType} value={mealType}>
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-ink-950">Serving size</span>
                  <Input
                    value={values.servingSize}
                    onChange={(event) => setValues((current) => ({ ...current, servingSize: event.target.value }))}
                    placeholder="e.g. 150g or 1 bowl"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-ink-950">Notes</span>
                <Textarea
                  value={values.notes}
                  onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional notes about ingredients, restaurant, or context."
                />
              </label>

              <div className="rounded-[28px] border border-ink-950/8 bg-glow-mist p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Optional ML assist</p>
                    <h3 className="mt-2 text-xl font-semibold text-ink-950">Estimate calories with the local model</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-950/62">
                      This uses the standalone FastAPI predictor from `/models` when `VITE_ML_API_URL` is configured. Its
                      output is <span className="font-semibold text-ink-950">kcal per 100g</span>, not a full meal total.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={isEstimating}
                    onClick={() => void handleEstimateCalories()}
                    disabled={!isMlConfigured || !values.foodName.trim()}
                  >
                    Estimate kcal / 100g
                  </Button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Protein (g)", value: proteinG, setter: setProteinG },
                    { label: "Fat (g)", value: fatG, setter: setFatG },
                    { label: "Carbs (g)", value: carbsG, setter: setCarbsG },
                    { label: "Fiber (g)", value: fiberG, setter: setFiberG },
                    { label: "Sugar (g)", value: sugarG, setter: setSugarG },
                    { label: "Sodium (mg)", value: sodiumMg, setter: setSodiumMg },
                    { label: "Saturated fat (g)", value: saturatedFatG, setter: setSaturatedFatG },
                  ].map(({ label, value, setter }) => (
                    <label key={label} className="space-y-2">
                      <span className="text-sm font-medium text-ink-950">{label}</span>
                      <Input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(event) => setter(event.target.value)}
                      />
                    </label>
                  ))}
                </div>

                {!isMlConfigured ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    VITE_ML_API_URL is not configured, so calorie estimation is currently unavailable.
                  </div>
                ) : null}

                {predictionNotice ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {predictionNotice}
                  </div>
                ) : null}

                {predictionError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {predictionError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-ink-950/8 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Meal photo</p>
                <h3 className="mt-2 text-xl font-semibold text-ink-950">Attach an image</h3>
                <p className="mt-2 text-sm leading-6 text-ink-950/62">
                  Uploads use the backend&apos;s presigned S3 workflow through `POST /images/upload`.
                </p>

                <label className="mt-4 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-ink-950/14 bg-glow-mist px-5 py-6 text-center">
                  {localPreviewUrl ? (
                    <img alt="Meal preview" className="h-[220px] w-full rounded-[18px] object-cover" src={localPreviewUrl} />
                  ) : values.existingImageUrl && !values.removeExistingImage ? (
                    <>
                      <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-950/45">
                        Existing image attached
                      </div>
                      <p className="mt-4 text-sm text-ink-950/62">
                        Keep it as-is, replace it with a new upload, or remove it before saving.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-950/45">
                        Choose image
                      </div>
                      <p className="mt-4 text-sm text-ink-950/62">JPEG, PNG, GIF, and WebP are accepted by the backend.</p>
                    </>
                  )}

                  <input
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setValues((current) => ({
                        ...current,
                        imageFile: file,
                        removeExistingImage: file ? false : current.removeExistingImage,
                      }));
                    }}
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-3">
                  {values.imageFile ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setValues((current) => ({ ...current, imageFile: null }))}
                    >
                      Remove new image
                    </Button>
                  ) : null}

                  {values.existingImageUrl ? (
                    <Button
                      type="button"
                      variant={values.removeExistingImage ? "danger" : "secondary"}
                      onClick={() =>
                        setValues((current) => ({
                          ...current,
                          removeExistingImage: !current.removeExistingImage,
                        }))
                      }
                    >
                      {values.removeExistingImage ? "Image will be removed" : "Remove existing image"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-ink-950/8 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Save summary</p>
                <div className="mt-4 space-y-3 text-sm text-ink-950/65">
                  <div className="flex items-center justify-between gap-3">
                    <span>Food name</span>
                    <span className="font-medium text-ink-950">{values.foodName || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Calories</span>
                    <span className="font-medium text-ink-950">{values.calories} kcal</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Meal type</span>
                    <span className="font-medium text-ink-950">{values.mealType}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Serving size</span>
                    <span className="font-medium text-ink-950">{values.servingSize || "Not set"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="lg" isLoading={isSaving} type="submit">
              {mode === "create" ? "Save meal" : "Save replacement meal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
