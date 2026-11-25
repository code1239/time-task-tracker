"use client";

import { useState } from "react";
import { FocusTimer } from "./focus-timer";
import { TaskCounter } from "./task-counter";
import { TopicManager } from "./topic-manager";
import { useFocus } from "./focus-provider";
import { TrashIcon } from "./icons";
import { useDayStats } from "@/lib/use-stats";
import { formatIstanbul, getIstanbulDateString, istanbulToUtc } from "@/lib/date";
import { formatMinutes, slotStyle } from "@/lib/topic-style";

function SessionList() {
  const { topics, version, bump } = useFocus();
  const { data, loading, error } = useDayStats(version);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function remove(id: number) {
    setDeleting(id);
    setFailed(null);
    try {
      const res = await fetch(`/api/focus/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      bump();
    } catch {
      setFailed("Oturum silinemedi. Tekrar dene.");
    } finally {
      setDeleting(null);
    }
  }

  const segments = data ? [...data.segments].reverse() : [];

  return (
    <section className="clay flex min-h-[260px] flex-col p-4 sm:p-5 xl:min-h-0 xl:flex-1" aria-label="Bugünün oturumları">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-semibold">Bugünün oturumları</h2>
        {data && (
          <span className="tabular text-[15px] font-semibold text-accent">{formatMinutes(data.totalMinutes)}</span>
        )}
      </div>

      {loading && !data && <div className="clay-pressed mt-3 h-16 animate-pulse rounded-[18px]" />}
      {error && <p className="mt-3 text-[13px] font-bold text-coral">{error}</p>}
      {failed && (
        <p role="alert" className="mt-3 text-[13px] font-bold text-coral">
          {failed}
        </p>
      )}

      {data && segments.length === 0 && (
        <p className="mt-3 rounded-[18px] bg-sunk px-4 py-5 text-center text-[14px] font-semibold text-muted">
          Bugün henüz oturum yok. Bir konu seçip ▶ Başlat’a bas.
        </p>
      )}

      <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {segments.map((s) => {
          const topic = topics.find((t) => t.id === s.topicId);
          return (
            <li key={`${s.id}-${s.start}`} className="clay-pressed flex items-center gap-3 rounded-[18px] p-2.5">
              <span
                className="slot-swatch grid size-10 shrink-0 place-items-center rounded-[13px] text-lg"
                style={slotStyle(topic?.slot ?? 1)}
              >
                {topic?.emoji ?? "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">
                  {s.title || topic?.name || "Arşivlenmiş konu"}
                  {s.completed && <span className="ml-1.5 text-teal">✓</span>}
                </p>
                <p className="text-[12px] font-semibold text-faint">
                  {formatIstanbul(new Date(s.start), "HH:mm")}–
                  {s.running ? "şimdi" : formatIstanbul(new Date(s.end), "HH:mm")}
                  {s.source === "manual" && " · elle eklendi"}
                </p>
              </div>
              <span className="tabular shrink-0 text-[15px] font-semibold">{formatMinutes(s.minutes)}</span>
              {!s.running && (
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  disabled={deleting === s.id}
                  aria-label="Oturumu sil"
                  className="clay-sm grid size-9 shrink-0 place-items-center rounded-full text-muted hover:text-coral disabled:opacity-50"
                >
                  <TrashIcon className="size-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ManualEntry() {
  const { topics, bump } = useFocus();
  const [topicId, setTopicId] = useState<number | "">("");
  const [minutes, setMinutes] = useState("");
  const [endTime, setEndTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const effectiveTopic: number | "" = topicId === "" ? (topics[0]?.id ?? "") : topicId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const mins = Number(minutes);
    if (effectiveTopic === "" || !Number.isInteger(mins) || mins < 1 || mins > 720) {
      setMessage({ ok: false, text: "Konu seç ve 1–720 dakika arası bir süre gir." });
      return;
    }
    const endedAt = endTime ? istanbulToUtc(getIstanbulDateString(), endTime).toISOString() : undefined;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/focus/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: effectiveTopic, minutes: mins, endedAt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error ?? "Süre eklenemedi." });
        return;
      }
      setMinutes("");
      setEndTime("");
      setMessage({ ok: true, text: "Süre eklendi." });
      bump();
    } catch {
      setMessage({ ok: false, text: "Bağlantı kurulamadı. Tekrar dene." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="clay shrink-0 p-4 sm:p-5" aria-label="Süre ekle">
      <h2 className="text-[16px] font-semibold">Unuttuğun süreyi ekle</h2>
      <p className="mt-0.5 text-[13px] font-semibold text-faint">Zamanlayıcıyı açmadan çalıştıysan buradan gir.</p>

      <form onSubmit={submit} className="mt-3 grid grid-cols-2 gap-2.5">
        <label className="col-span-2 flex flex-col gap-1 text-[12px] font-bold text-muted">
          Konu
          <select
            value={effectiveTopic}
            onChange={(e) => setTopicId(Number(e.target.value))}
            className="clay-pressed rounded-[14px] px-3 py-2 text-[14px] font-semibold text-fg outline-none"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-bold text-muted">
          Süre (dakika)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={720}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="25"
            className="clay-pressed rounded-[14px] px-3 py-2 text-[14px] font-semibold text-fg outline-none placeholder:text-faint"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-bold text-muted">
          Bitiş saati (boşsa şimdi)
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="clay-pressed rounded-[14px] px-3 py-2 text-[14px] font-semibold text-fg outline-none"
          />
        </label>
        <div className="col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || topics.length === 0}
            className="clay-button rounded-full px-5 py-2 text-[14px] font-bold"
          >
            Süreyi ekle
          </button>
          {message && (
            <p role="status" className={`text-[13px] font-bold ${message.ok ? "text-teal" : "text-coral"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

/** On xl screens the three columns fill the screen; the lists inside scroll on their own. */
export function FocusPage() {
  return (
    <div className="grid gap-4 xl:h-full xl:min-h-[680px] xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)]">
      <div className="min-w-0 xl:col-span-5 xl:min-h-0">
        <FocusTimer />
      </div>
      <div className="flex min-w-0 flex-col gap-4 xl:col-span-4 xl:min-h-0">
        <SessionList />
        <ManualEntry />
      </div>
      <div className="flex min-w-0 flex-col gap-4 xl:col-span-3 xl:min-h-0">
        <TaskCounter />
        <TopicManager />
      </div>
    </div>
  );
}
