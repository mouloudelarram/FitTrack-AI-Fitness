export function formatCalories(value: number) {
  return `${Math.round(value).toLocaleString()} kcal`;
}

export function formatWeight(value: number) {
  return `${value.toFixed(1)} kg`;
}

export function formatSigned(value: number, precision = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(precision)}`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function titleCase(value: string) {
  return value
    .split("_")
    .join(" ")
    .replace(/\w\S*/g, (segment) => segment.charAt(0).toUpperCase() + segment.slice(1));
}
