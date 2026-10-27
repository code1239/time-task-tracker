import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Istanbul";

export function getIstanbulNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function getIstanbulDateString(date: Date = new Date()): string {
  // Returns YYYY-MM-DD in Istanbul timezone
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

export function getIstanbulDate(date: Date = new Date()): Date {
  const s = getIstanbulDateString(date);
  // Construct date at start of Istanbul day in UTC terms for SQL DATE
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatIstanbul(date: Date, fmt: string): string {
  return formatInTimeZone(date, TIMEZONE, fmt);
}

export function getIstanbulStartOfDay(date: Date = new Date()): Date {
  const s = getIstanbulDateString(date);
  const [y, m, d] = s.split("-").map(Number);
  // Create midnight in Istanbul as UTC equivalent? Easier to pass date string to SQL
  return new Date(y, m - 1, d);
}

export function istanbulToUtc(dateStr: string, timeStr: string): Date {
  // Interpret dateStr (YYYY-MM-DD) and timeStr (HH:mm) as Europe/Istanbul
  const iso = `${dateStr}T${timeStr}:00`;
  // date-fns-tz can parse in zone
  const { zonedTimeToUtc } = require("date-fns-tz");
  return zonedTimeToUtc(iso, TIMEZONE);
}

export { TIMEZONE };
