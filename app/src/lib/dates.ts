// Calendar days are stored at 12:00 UTC so they never shift a day across time zones.
export const TZ = process.env.APP_TIMEZONE || "America/Chicago";

export function parseDay(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00Z");
  return isNaN(+d) ? null : d;
}
export const dayStr = (d: Date) => d.toISOString().slice(0, 10);
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export const today = () => parseDay(todayStr())!;
export const addDays = (d: Date, n: number) => new Date(+d + n * 864e5);
export const daysUntil = (d: Date) => Math.round((+d - +today()) / 864e5);
export const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
