export function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDayTick(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date(value));
}

export function formatMonthDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function isToday(value: string) {
  return toYmd(new Date()) === value;
}
