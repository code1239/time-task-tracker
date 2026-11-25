import type { CSSProperties } from "react";

/** CSS colour for a topic's fixed slot (1–8). */
export const slotColor = (slot: number) => `var(--series-${Math.min(8, Math.max(1, slot))})`;

/** Inline style that feeds `.slot-swatch` and anything using `var(--slot)`. */
export const slotStyle = (slot: number): CSSProperties => ({ ["--slot" as string]: slotColor(slot) });

/** "1 sa 25 dk", "25 dk", "0 dk" */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} dk`;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}

/** "12:34" or "1:02:03" */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
