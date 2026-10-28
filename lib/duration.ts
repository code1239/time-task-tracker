/** Geri sayım süresi ayrıştırma yardımcıları. Saf fonksiyonlar; DOM veya React yok. */

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 24 * 60;

export type DurationError = "empty" | "invalid" | "tooSmall" | "tooLarge";

export type ParseDurationResult =
  | { ok: true; minutes: number }
  | { ok: false; error: DurationError };

const UNIT_MINUTES: Record<string, number> = {
  saat: 60,
  sa: 60,
  h: 60,
  dakika: 1,
  dk: 1,
  m: 1,
};

const TOKEN = /(\d+)\s*(saat|dakika|sa|dk|h|m)?/g;

/**
 * "1h 30m", "1h30m", "90m", "90", "1sa 30dk" gibi girişleri dakikaya çevirir.
 * Yalnız saat ve dakika birimleri vardır; birimsiz sayı dakika sayılır.
 */
export function parseDuration(raw: string): ParseDurationResult {
  const input = raw.trim().toLowerCase();
  if (!input) return { ok: false, error: "empty" };

  let minutes = 0;
  let tokens = 0;
  const leftover = input.replace(TOKEN, (_match, digits: string, unit?: string) => {
    tokens += 1;
    minutes += Number(digits) * (unit ? UNIT_MINUTES[unit] : 1);
    return " ";
  });

  if (tokens === 0) return { ok: false, error: "invalid" };
  // Kalan karakterler yalnızca boşluk olabilir; "1.5h" veya "abc" reddedilir.
  if (/[^\s]/.test(leftover)) return { ok: false, error: "invalid" };

  return validate(minutes);
}

function validate(minutes: number): ParseDurationResult {
  if (!Number.isFinite(minutes)) return { ok: false, error: "invalid" };
  if (minutes < MIN_MINUTES) return { ok: false, error: "tooSmall" };
  if (minutes > MAX_MINUTES) return { ok: false, error: "tooLarge" };
  return { ok: true, minutes };
}

export function durationErrorMessage(error: DurationError): string {
  switch (error) {
    case "empty":
      return "Bir süre yazın, örneğin 1h 30m.";
    case "tooSmall":
      return "En az 1 dakika olmalı.";
    case "tooLarge":
      return "En fazla 24 saat olabilir.";
    default:
      return "Süreyi anlayamadım. 1h 30m veya 90m gibi yazın.";
  }
}

/** 90 → "1h 30m", 45 → "45m", 120 → "2h" (form alanını doldurmak için). */
export function formatDurationInput(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

/** 90 → "1 sa 30 dk", 45 → "45 dk" (Türkçe kısa etiket). */
export function formatDurationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} sa ${rest} dk`;
  if (hours) return `${hours} sa`;
  return `${rest} dk`;
}
