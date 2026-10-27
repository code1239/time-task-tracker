"use client";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  addDaysToDateString,
  formatIstanbul,
  formatIstanbulDateTime,
  getIstanbulDateString,
  istanbulToUtc,
} from "@/lib/date";
import { useNow } from "@/lib/use-now";
import { CalendarIcon, EditIcon, HourglassIcon, SparkleIcon, TrashIcon } from "./icons";

type Countdown = { title: string | null; targetAt: string };

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-surface/50 px-3 text-[14px] text-fg placeholder:text-faint/70 transition-colors hover:border-line-strong focus:border-accent/60";

export function CountdownTab() {
  const now = useNow(1000);
  const reduce = useReducedMotion();
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"view" | "form">("view");
  const [confirmClear, setConfirmClear] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(addDaysToDateString(getIstanbulDateString(), 1));
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/countdown", { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setCountdown(data.countdown ?? null);
      } catch {
        if (!cancelled) setError("Geri sayım yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const target = countdown ? new Date(countdown.targetAt).getTime() : null;
  const diff = target !== null && now !== null ? target - now : null;
  const expired = diff !== null && diff <= 0;

  const units =
    diff !== null && diff > 0
      ? [
          { label: "gün", value: Math.floor(diff / 86_400_000), pad: 1 },
          { label: "saat", value: Math.floor(diff / 3_600_000) % 24, pad: 2 },
          { label: "dakika", value: Math.floor(diff / 60_000) % 60, pad: 2 },
          { label: "saniye", value: Math.floor(diff / 1_000) % 60, pad: 2 },
        ]
      : [];

  function openForm() {
    if (countdown) {
      const d = new Date(countdown.targetAt);
      setTitle(countdown.title ?? "");
      setDate(formatIstanbul(d, "yyyy-MM-dd"));
      setTime(formatIstanbul(d, "HH:mm"));
    } else {
      setTitle("");
      setDate(addDaysToDateString(getIstanbulDateString(), 1));
      setTime("09:00");
    }
    setError(null);
    setMode("form");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    if (!date || !time) {
      setError("Lütfen bir tarih ve saat seçin.");
      return;
    }
    const targetDate = istanbulToUtc(date, time);
    if (isNaN(targetDate.getTime())) {
      setError("Geçersiz bir tarih seçtiniz.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() ? title.trim() : null,
          targetAt: targetDate.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "failed");
      setCountdown({ title: title.trim() || null, targetAt: targetDate.toISOString() });
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
      setCountdown(null);
      setMode("view");
      setConfirmClear(false);
    } catch {
      setError("Geri sayım silinemedi.");
    } finally {
      setSaving(false);
    }
  }

  const form = mode === "form";

  return (
    <div>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full glass-inset px-3 py-1.5 text-[11px] font-medium text-muted">
          <HourglassIcon className="size-3.5 text-accent" />
          {countdown?.title ? countdown.title : "GERİ SAYIM"}
        </div>
        {countdown && !expired && (
          <span className="hidden font-mono text-[10px] text-faint sm:inline">
            {formatIstanbulDateTime(new Date(countdown.targetAt))}
          </span>
        )}
      </div>

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
        ) : form ? (
          <motion.form
            key="form"
            onSubmit={save}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="mx-auto mt-5 w-full max-w-md"
          >
            <div className="space-y-3.5">
              <div>
                <label htmlFor="cd-title" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                  Başlık <span className="normal-case tracking-normal text-faint/70">(isteğe bağlı)</span>
                </label>
                <input
                  id="cd-title"
                  type="text"
                  value={title}
                  maxLength={100}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn. Proje teslimi"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label htmlFor="cd-date" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                    Tarih
                  </label>
                  <input
                    id="cd-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="cd-time" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                    Saat
                  </label>
                  <input
                    id="cd-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className={`${fieldClass} w-[118px] font-mono`}
                  />
                </div>
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-faint">
                <CalendarIcon className="size-3.5" />
                Tarih ve saat Türkiye saatine (UTC+3) göre yorumlanır.
              </p>

              {now !== null && date && time && istanbulToUtc(date, time).getTime() < now && (
                <p className="rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-[12px] text-coral">
                  Seçtiğiniz zaman geçmişte. Kaydederseniz &quot;Süre doldu&quot; görünür.
                </p>
              )}
            </div>

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
                  {saving && <span className="size-3 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
                  {saving ? "Kaydediliyor" : "Kaydet"}
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
        ) : !countdown ? (
          <motion.div
            key="empty"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="flex min-h-[260px] flex-col items-center justify-center text-center"
          >
            <div className="grid size-16 place-items-center rounded-3xl glass-inset">
              <HourglassIcon className="size-7 text-accent" />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">Bir hedef belirle</h3>
            <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-muted">
              Önemli bir tarih seç; kalan gün, saat, dakika ve saniyeyi canlı takip et.
            </p>
            <motion.button
              type="button"
              onClick={openForm}
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="accent-gradient mt-5 h-11 rounded-xl px-5 text-[13px] font-medium text-white shadow-glow transition-[filter] hover:brightness-110"
            >
              Geri sayım oluştur
            </motion.button>
          </motion.div>
        ) : expired ? (
          <motion.div
            key="expired"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="flex min-h-[260px] flex-col items-center justify-center text-center"
          >
            <div className="relative grid size-16 place-items-center rounded-3xl bg-accent-soft">
              <span className="absolute inset-0 animate-breathe rounded-3xl bg-accent/20 blur-xl" />
              <SparkleIcon className="relative size-7 text-accent" />
            </div>
            <h3 className="text-gradient mt-4 text-[34px] font-semibold tracking-tight">Süre doldu</h3>
            <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-muted">
              {countdown.title ? `${countdown.title} için belirlenen an geldi.` : "Belirlediğin an geldi."}{" "}
              <span className="text-faint">{formatIstanbulDateTime(new Date(countdown.targetAt))}</span>
            </p>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={openForm}
                className="h-10 rounded-xl border border-line px-4 text-[13px] text-muted transition-colors hover:bg-surface/60 hover:text-fg"
              >
                Yeni hedef
              </button>
              <ClearButton confirmClear={confirmClear} onAsk={() => setConfirmClear(true)} onConfirm={clear} onCancel={() => setConfirmClear(false)} disabled={saving} />
            </div>
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
                  : `${units[0]?.value ?? 0} gün ${units[1]?.value ?? 0} saat ${units[2]?.value ?? 0} dakika ${units[3]?.value ?? 0} saniye kaldı`
              }
              className="grid grid-cols-4 gap-1.5 sm:gap-3"
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
                <ClearButton confirmClear={confirmClear} onAsk={() => setConfirmClear(true)} onConfirm={clear} onCancel={() => setConfirmClear(false)} disabled={saving} />
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
