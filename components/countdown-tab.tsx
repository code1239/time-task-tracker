"use client";

import { useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatIstanbulDateTime } from "@/lib/date";
import {
  MAX_MINUTES,
  MIN_MINUTES,
  durationErrorMessage,
  formatDurationInput,
  formatDurationLabel,
  parseDuration,
} from "@/lib/duration";
import { unlockAudio } from "@/lib/alarm";
import { useNow } from "@/lib/use-now";
import { useCountdown } from "./countdown-provider";
import { BellIcon, CalendarIcon, EditIcon, HourglassIcon, SparkleIcon, TrashIcon } from "./icons";

const fieldClass =
  "h-12 w-full rounded-xl border border-line bg-surface/50 px-3 text-[16px] text-fg placeholder:text-faint/70 transition-colors hover:border-line-strong focus:border-accent/60";

const PRESETS = [
  { label: "5dk", value: "5m" },
  { label: "15dk", value: "15m" },
  { label: "30dk", value: "30m" },
  { label: "1sa", value: "1h" },
];

export function CountdownTab() {
  const now = useNow(1000);
  const reduce = useReducedMotion();
  const { countdown, loading, loadError, updateCountdown, replayAlarm } = useCountdown();

  const [mode, setMode] = useState<"view" | "form">("view");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const target = countdown ? new Date(countdown.targetAt).getTime() : null;
  const diff = target !== null && now !== null ? target - now : null;
  const expired = diff !== null && diff <= 0;
  const form = mode === "form" || (!loading && !countdown);

  const units =
    diff !== null && diff > 0
      ? [
          { label: "saat", value: Math.floor(diff / 3_600_000), pad: 2 },
          { label: "dakika", value: Math.floor(diff / 60_000) % 60, pad: 2 },
          { label: "saniye", value: Math.floor(diff / 1_000) % 60, pad: 2 },
        ]
      : [];

  function openForm() {
    if (countdown) {
      const remaining = Math.max(
        MIN_MINUTES,
        Math.ceil((new Date(countdown.targetAt).getTime() - Date.now()) / 60_000)
      );
      setInput(formatDurationInput(remaining));
    } else {
      setInput("");
    }
    setError(null);
    setMode("form");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function applyPreset(value: string) {
    setInput(value);
    setError(null);
    inputRef.current?.focus();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    // Ses kilidi yalnızca kullanıcı etkileşimiyle açılabilir.
    unlockAudio();

    const parsed = parseDuration(input);
    if (!parsed.ok) {
      setError(durationErrorMessage(parsed.error));
      return;
    }

    setError(null);
    setSaving(true);
    const targetAt = new Date(Date.now() + parsed.minutes * 60_000).toISOString();
    try {
      const res = await fetch("/api/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: null, targetAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "failed");
      updateCountdown({ title: null, targetAt });
      setMode("view");
    } catch {
      setError("Geri sayım kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/countdown", { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      updateCountdown(null);
      setMode("view");
      setConfirmClear(false);
    } catch {
      setError("Geri sayım silinemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full glass-inset px-3 py-1.5 text-[11px] font-medium text-muted">
          <HourglassIcon className="size-3.5 text-accent" />
          GERİ SAYIM
        </div>
        {countdown && !expired && (
          <span className="hidden font-mono text-[10px] text-faint sm:inline">
            {formatIstanbulDateTime(new Date(countdown.targetAt))}
          </span>
        )}
      </div>

      {loadError && !loading && (
        <p role="alert" className="mt-3 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-[12px] text-coral">
          {loadError}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid min-h-[260px] place-items-center"
          >
            <div className="h-20 w-64 animate-pulse rounded-2xl bg-fg/10" />
          </motion.div>
        ) : form || !countdown ? (
          <motion.form
            key="form"
            onSubmit={save}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="mx-auto mt-5 w-full max-w-md"
          >
            {!countdown && (
              <div className="mb-5 text-center">
                <h3 className="text-lg font-semibold tracking-tight">Ne kadar süre?</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">
                  Süreyi yaz, geri sayım hemen başlasın.
                </p>
              </div>
            )}

            <label
              htmlFor="cd-duration"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-faint"
            >
              Süre
            </label>
            <input
              ref={inputRef}
              id="cd-duration"
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="1h 30m"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="cd-duration-hint"
              aria-invalid={error ? true : undefined}
              className={`${fieldClass} font-mono`}
            />

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => applyPreset(preset.value)}
                  className="h-7 rounded-full border border-line px-2.5 font-mono text-[11px] text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-fg"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p id="cd-duration-hint" className="mt-2.5 text-[11px] leading-relaxed text-faint">
              <span className="font-mono">1h 30m</span>, <span className="font-mono">90m</span> veya{" "}
              <span className="font-mono">1sa 30dk</span> yazabilirsin. En az {MIN_MINUTES} dakika, en fazla{" "}
              {MAX_MINUTES / 60} saat.
            </p>

            {countdown && diff !== null && diff > 0 && (
              <p className="mt-1.5 text-[11px] text-faint/80">
                Şu an kalan: {formatDurationLabel(Math.max(MIN_MINUTES, Math.ceil(diff / 60_000)))}
              </p>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="mt-3 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-[12px] text-coral"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-5 flex items-center gap-2">
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={reduce || saving ? undefined : { scale: 1.015 }}
                whileTap={reduce || saving ? undefined : { scale: 0.98 }}
                className="accent-gradient relative h-11 flex-1 overflow-hidden rounded-xl text-[14px] font-medium text-white shadow-glow transition-[filter] hover:brightness-110 disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                <span className="relative inline-flex items-center gap-2">
                  {saving && (
                    <span className="size-3 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  )}
                  {saving ? "Kaydediliyor" : countdown ? "Güncelle" : "Geri sayım oluştur"}
                </span>
              </motion.button>
              {countdown && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("view");
                    setError(null);
                  }}
                  className="h-11 rounded-xl border border-line px-4 text-[13px] text-muted transition-colors hover:bg-surface/60 hover:text-fg"
                >
                  Vazgeç
                </button>
              )}
            </div>
          </motion.form>
        ) : expired ? (
          <motion.div
            key="expired"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="flex min-h-[260px] flex-col items-center justify-center text-center"
          >
            <div className="relative grid size-16 place-items-center rounded-3xl bg-accent/10">
              <span className="absolute inset-0 animate-breathe rounded-3xl bg-accent/20 blur-xl" />
              <SparkleIcon className="relative size-7 text-accent" />
            </div>
            <h3 className="text-gradient mt-4 text-[34px] font-semibold tracking-tight">Süre doldu</h3>
            <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-muted">
              Belirlediğin süre tamamlandı.{" "}
              <span className="text-faint">{formatIstanbulDateTime(new Date(countdown.targetAt))}</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={openForm}
                className="h-10 rounded-xl border border-line px-4 text-[13px] text-muted transition-colors hover:bg-surface/60 hover:text-fg"
              >
                Yeni süre
              </button>
              <button
                type="button"
                onClick={replayAlarm}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3.5 text-[13px] text-accent transition-colors hover:bg-accent/15"
              >
                <BellIcon className="size-3.5" />
                Sesi çal
              </button>
              <ClearButton
                confirmClear={confirmClear}
                onAsk={() => setConfirmClear(true)}
                onConfirm={clear}
                onCancel={() => setConfirmClear(false)}
                disabled={saving}
              />
            </div>
            {error && (
              <p role="alert" className="mt-3 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-[12px] text-coral">
                {error}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="timer"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="mt-6"
          >
            <div
              role="timer"
              aria-label={
                now === null
                  ? "Kalan süre hesaplanıyor"
                  : `${units[0]?.value ?? 0} saat ${units[1]?.value ?? 0} dakika ${units[2]?.value ?? 0} saniye kaldı`
              }
              className="grid grid-cols-3 gap-1.5 sm:gap-3"
            >
              {units.map((unit, i) => (
                <div
                  key={unit.label}
                  className="relative overflow-hidden rounded-2xl glass-inset px-1 py-3 text-center sm:py-4"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  {now === null ? (
                    <span className="block font-mono text-[26px] font-semibold text-faint/40 sm:text-[34px]">--</span>
                  ) : (
                    <NumberFlow
                      value={unit.value}
                      animated={!reduce}
                      format={{ minimumIntegerDigits: unit.pad }}
                      className="block font-mono text-[26px] font-semibold leading-none tracking-tight text-fg sm:text-[34px]"
                    />
                  )}
                  <span className="mt-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-faint sm:text-[10px]">
                    {unit.label}
                  </span>
                  {i === 0 && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-accent/10 to-transparent" />
                  )}
                </div>
              ))}
            </div>

            {countdown.title && (
              <p className="mt-4 text-center text-[12px] text-muted">{countdown.title}</p>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] text-faint">
                <CalendarIcon className="size-3.5" />
                {formatIstanbulDateTime(new Date(countdown.targetAt))}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openForm}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-[12px] text-muted transition-colors hover:bg-surface/60 hover:text-fg"
                >
                  <EditIcon className="size-3.5" />
                  Düzenle
                </button>
                <ClearButton
                  confirmClear={confirmClear}
                  onAsk={() => setConfirmClear(true)}
                  onConfirm={clear}
                  onCancel={() => setConfirmClear(false)}
                  disabled={saving}
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-[12px] text-coral">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClearButton({
  confirmClear,
  onAsk,
  onConfirm,
  onCancel,
  disabled,
}: {
  confirmClear: boolean;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  if (confirmClear) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1 rounded-xl border border-coral/30 bg-coral/10 p-1"
      >
        <span className="pl-1.5 text-[11px] text-coral">Emin misiniz?</span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="h-7 rounded-lg bg-coral px-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Evet
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-7 rounded-lg px-2 text-[11px] text-muted transition-colors hover:text-fg"
        >
          Hayır
        </button>
      </motion.div>
    );
  }
  return (
    <button
      type="button"
      onClick={onAsk}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-[12px] text-muted transition-colors hover:border-coral/30 hover:bg-coral/10 hover:text-coral"
    >
      <TrashIcon className="size-3.5" />
      Temizle
    </button>
  );
}
