"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { timerView, useFocus, useFocusElapsed } from "./focus-provider";
import { celebrateFrom } from "@/lib/celebrate";
import { durationErrorMessage, formatDurationLabel, parseDuration } from "@/lib/duration";
import { formatClock, slotColor, slotStyle } from "@/lib/topic-style";

const PRESETS = [15, 25, 45, 60];
const RING_C = 2 * Math.PI * 46;

export function FocusTimer() {
  const reduce = useReducedMotion();
  const {
    topics,
    topicsLoaded,
    running,
    runningTopic,
    busy,
    error,
    clearError,
    start,
    stop,
    finished,
    completeFinished,
    dismissFinished,
  } = useFocus();
  const elapsed = useFocusElapsed();
  const [selected, setSelected] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [timed, setTimed] = useState(false);
  const [durationText, setDurationText] = useState("25");
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const celebrateRef = useRef<HTMLDivElement>(null);
  const showConfirm = confirming && running !== null;

  // Keep the selection valid as topics load or get archived.
  const topicId = selected !== null && topics.some((t) => t.id === selected) ? selected : (topics[0]?.id ?? null);
  const parsed = parseDuration(durationText);
  const plannedMinutes = timed && parsed.ok ? parsed.minutes : null;
  const durationError = timed && !parsed.ok ? durationErrorMessage(parsed.error) : null;

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [note]);

  async function begin() {
    if (topicId === null || busy) return;
    if (timed && !parsed.ok) return;
    clearError();
    const ok = await start(topicId, title.trim() || null, plannedMinutes);
    if (ok) setTitle("");
  }

  async function finish(completed: boolean) {
    const result = await stop(completed);
    setConfirming(false);
    if (!result) return;
    if (result.discarded) {
      setNote("5 saniyeden kısa oturum kaydedilmedi.");
    } else if (completed) {
      celebrateFrom(celebrateRef.current, true);
      setNote(result.locked ? "Oturum kaydedildi. Görev sayısı Notion’dan geliyor." : "Görev tamamlandı, sayaç arttı. 🎉");
    } else {
      setNote("Oturum kaydedildi.");
    }
  }

  async function completeCountdown() {
    const result = await completeFinished();
    if (!result) return;
    celebrateFrom(celebrateRef.current, true);
    setNote(result.locked ? "Görev tamamlandı. Sayı Notion’dan geliyor." : "Görev tamamlandı, sayaç arttı. 🎉");
  }

  const idleTopic = topics.find((t) => t.id === topicId);
  const color = slotColor(runningTopic?.slot ?? idleTopic?.slot ?? 1);
  const view = timerView(running, elapsed);
  const progress =
    running?.plannedMinutes ? Math.min(1, elapsed / (running.plannedMinutes * 60_000)) : plannedMinutes ? 0 : null;

  const dialText = running
    ? formatClock(view.ms)
    : plannedMinutes
      ? formatClock(plannedMinutes * 60_000)
      : "00:00";
  const dialLabel = running
    ? (running.title ?? runningTopic?.name ?? "Odak")
    : plannedMinutes
      ? "geri sayım"
      : "Hazır mısın?";

  return (
    <section
      className="clay relative flex min-h-0 flex-col overflow-y-auto p-5 sm:p-7 xl:h-full xl:p-5"
      aria-label="Odak zamanlayıcı"
    >
      <div className="m-auto flex w-full flex-col items-center gap-4 text-center xl:gap-3">
        {/* the dial */}
        <div
          ref={celebrateRef}
          className="relative grid size-[clamp(190px,27dvh,290px)] shrink-0 place-items-center"
          style={{ containerType: "size" }}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-full ${running ? "focus-breath" : ""}`}
            style={{ background: `color-mix(in oklab, ${color} 30%, transparent)` }}
          />
          <span className="clay absolute inset-[14px] rounded-full" aria-hidden="true" />
          <span className="clay-pressed absolute inset-[34px] rounded-full" aria-hidden="true" />
          {progress !== null && (
            <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-[22px] -rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--chart-track)" strokeWidth="3" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={color}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${progress * RING_C} ${RING_C}`}
                style={{ transition: reduce ? "none" : "stroke-dasharray 1s linear" }}
              />
            </svg>
          )}
          <div className="relative z-10 flex flex-col items-center px-6">
            <span className="leading-none" style={{ fontSize: "clamp(26px, 14cqmin, 44px)" }} aria-hidden="true">
              {running ? (runningTopic?.emoji ?? "⏱️") : (idleTopic?.emoji ?? "🎯")}
            </span>
            <span
              className="tabular mt-1.5 font-semibold leading-none text-fg"
              style={{ fontSize: "clamp(28px, 17cqmin, 54px)" }}
              role="timer"
              aria-label={
                running
                  ? `${view.timed ? "Kalan süre" : "Geçen süre"} ${formatClock(view.ms)}`
                  : "Zamanlayıcı hazır"
              }
            >
              {dialText}
            </span>
            <span
              className="mt-1.5 max-w-[60cqmin] truncate font-bold text-muted"
              style={{ fontSize: "clamp(11px, 5.4cqmin, 15px)" }}
            >
              {dialLabel}
            </span>
          </div>
        </div>

        {/* idle: pick a topic and a mode */}
        {!running && (
          <>
            {topicsLoaded && topics.length === 0 ? (
              <p className="max-w-sm text-[14px] font-semibold text-muted">
                Başlamak için önce bir konu ekle. Sağdaki “Konular” kartından önerilenleri tek tıkla ekleyebilirsin.
              </p>
            ) : (
              <>
                <div className="flex max-w-xl flex-wrap justify-center gap-2.5" role="radiogroup" aria-label="Konu seç">
                  {topics.map((t) => {
                    const on = t.id === topicId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setSelected(t.id)}
                        className={`flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-[14px] font-bold ${
                          on ? "clay-pressed text-fg" : "clay-sm text-muted"
                        }`}
                      >
                        <span
                          className="slot-swatch grid size-7 place-items-center rounded-full text-[15px]"
                          style={slotStyle(t.slot)}
                        >
                          {t.emoji}
                        </span>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Ne üzerinde çalışacaksın? (isteğe bağlı)"
                  aria-label="Oturum başlığı"
                  className="clay-pressed w-full max-w-md rounded-[18px] px-4 py-3 text-center text-[14px] font-semibold outline-none placeholder:text-faint"
                />

                {/* mode: open-ended count-up, or a countdown of the chosen length */}
                <div className="flex w-full max-w-md flex-col items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={timed}
                    onClick={() => setTimed((v) => !v)}
                    className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-[14px] font-bold text-fg"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-7 place-items-center rounded-[10px] text-[15px] ${
                        timed ? "clay-button" : "clay-pressed text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    Süre belirle
                    <span className="text-[13px] font-semibold text-faint">
                      {timed ? "geri sayar, bitince çalar" : "0’dan ileri sayar"}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {timed && (
                      <motion.div
                        initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        className="w-full overflow-hidden"
                      >
                        <div className="flex flex-col items-center gap-3 px-1 pb-2 pt-1">
                          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Hazır süreler">
                            {PRESETS.map((m) => {
                              const on = parsed.ok && parsed.minutes === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setDurationText(String(m))}
                                  aria-pressed={on}
                                  className={`rounded-full px-4 py-2 text-[14px] font-bold ${
                                    on ? "clay-pressed text-accent" : "clay-sm text-muted"
                                  }`}
                                >
                                  {formatDurationLabel(m)}
                                </button>
                              );
                            })}
                          </div>
                          <label className="flex items-center gap-2.5 text-[13px] font-bold text-muted">
                            Süre
                            <input
                              value={durationText}
                              onChange={(e) => setDurationText(e.target.value)}
                              inputMode="text"
                              placeholder="1h 30m"
                              aria-invalid={Boolean(durationError)}
                              className="clay-pressed w-32 rounded-[14px] px-3 py-2 text-center text-[14px] font-semibold text-fg outline-none placeholder:text-faint"
                            />
                          </label>
                          <p
                            role={durationError ? "alert" : undefined}
                            className={`min-h-5 text-[13px] font-semibold ${durationError ? "text-coral" : "text-faint"}`}
                          >
                            {durationError ?? "Dakika yaz (25), ya da 1h 30m / 90m gibi."}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            <motion.button
              type="button"
              onClick={begin}
              disabled={topicId === null || busy || (timed && !parsed.ok)}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
              className="clay-button min-w-[220px] rounded-full px-10 py-3.5 font-display text-[19px] font-semibold"
            >
              ▶ {plannedMinutes ? `${formatDurationLabel(plannedMinutes)} başlat` : "Başlat"}
            </motion.button>
          </>
        )}

        {/* a countdown ended on its own: it is already saved */}
        <AnimatePresence>
          {finished && !running && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="clay-pressed flex w-full max-w-md flex-col items-center gap-3 rounded-[24px] p-4"
              role="group"
              aria-label="Süre doldu"
            >
              <p className="font-display text-[17px] font-semibold">⏰ {finished.minutes} dk doldu ve kaydedildi</p>
              <p className="text-[14px] font-semibold text-muted">Görev tamamlandı mı?</p>
              <div className="flex w-full flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={completeCountdown}
                  disabled={busy}
                  className="clay-button flex-1 rounded-full px-5 py-3 text-[15px] font-bold"
                >
                  Tamamlandı ✓
                </button>
                <button
                  type="button"
                  onClick={dismissFinished}
                  disabled={busy}
                  className="clay-sm flex-1 rounded-full px-5 py-3 text-[15px] font-bold text-fg"
                >
                  Hayır
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* running: stop flow */}
        {running && !showConfirm && (
          <motion.button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            whileTap={reduce ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className="clay-button min-w-[220px] rounded-full px-10 py-3.5 font-display text-[19px] font-semibold"
          >
            ⏸ Durdur
          </motion.button>
        )}

        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="clay-pressed flex w-full max-w-md flex-col items-center gap-3 rounded-[24px] p-4"
              role="group"
              aria-label="Oturumu bitir"
            >
              <p className="font-display text-[17px] font-semibold">Görev tamamlandı mı?</p>
              <div className="flex w-full flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => finish(true)}
                  disabled={busy}
                  className="clay-button flex-1 rounded-full px-5 py-3 text-[15px] font-bold"
                >
                  Tamamlandı ✓
                </button>
                <button
                  type="button"
                  onClick={() => finish(false)}
                  disabled={busy}
                  className="clay-sm flex-1 rounded-full px-5 py-3 text-[15px] font-bold text-fg"
                >
                  Sadece durdur
                </button>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[13px] font-bold text-muted underline-offset-4 hover:underline"
              >
                Devam et
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-h-6" role="status" aria-live="polite">
          {error ? (
            <p role="alert" className="text-[13px] font-bold text-coral">
              {error}
            </p>
          ) : (
            note && <p className="text-[13px] font-bold text-accent">{note}</p>
          )}
        </div>
      </div>
    </section>
  );
}
