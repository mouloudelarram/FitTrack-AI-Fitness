import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface WeightEntryCardProps {
  isSubmitting: boolean;
  onSubmit: (input: { weight: number; unit: "kg" | "lbs"; notes?: string }) => Promise<void>;
}

export function WeightEntryCard({ isSubmitting, onSubmit }: WeightEntryCardProps) {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedWeight = Number(weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 700) {
      setError("Enter a valid weight in the backend's accepted range.");
      return;
    }

    await onSubmit({
      weight: parsedWeight,
      unit,
      notes: notes.trim() || undefined,
    });

    setWeight("");
    setNotes("");
  }

  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-950/40">Quick entry</p>
        <h3 className="mt-2 text-2xl font-semibold text-ink-950">Log today&apos;s weight</h3>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-[1fr_160px_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-950">Weight</span>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="72.4"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-950">Unit</span>
            <Select value={unit} onChange={(event) => setUnit(event.target.value as "kg" | "lbs")}>
              <option value="kg">Kilograms</option>
              <option value="lbs">Pounds</option>
            </Select>
          </label>

          <div className="self-end">
            <Button className="w-full md:w-auto" size="lg" isLoading={isSubmitting} type="submit">
              Save
            </Button>
          </div>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-950">Notes</span>
          <Textarea
            className="min-h-[96px]"
            placeholder="Optional context like hydration, workout intensity, or how you felt."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      </form>
    </Card>
  );
}
