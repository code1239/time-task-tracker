import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TIMEZONE = "Europe/Istanbul";

export function getIstanbulDateString(date: Date = new Date()): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

export function getIstanbulTimeString(date: Date = new Date()): string {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
}

export function istanbulToUtc(dateStr: string, timeStr: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, TIMEZONE);
}

export function formatIstanbul(date: Date, fmt: string): string {
  return formatInTimeZone(date, TIMEZONE, fmt);
}

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
  weekday: "long",
});

export function formatTurkishDate(date: Date): string {
  const parts = dateFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}, ${get("weekday")}`;
}

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function getIstanbulTimeParts(date: Date) {
  const parts = timeFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    second: parseInt(get("second"), 10),
  };
}

export function formatIstanbulDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIMEZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function formatShortDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = new Intl.DateTimeFormat("tr-TR", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date);
  return `${weekday} ${d}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
