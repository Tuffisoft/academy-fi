const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidPlanDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  // Reject overflow dates such as 2026-02-31
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function todayPlanDate() {
  return new Date().toISOString().slice(0, 10);
}

export function shiftPlanDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
