"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useFocus, type Topic } from "./focus-provider";
import { EditIcon, PlusIcon, TrashIcon } from "./icons";
import { slotStyle } from "@/lib/topic-style";

const EMOJIS = ["💻", "📚", "🏀", "☕", "✍️", "🎨", "🎧", "🧘", "🧪", "📝", "🍳", "🌱", "🎮", "🚀", "💼", "🧹"];

async function call(url: string, init: RequestInit): Promise<{ topics?: Topic[]; error?: string }> {
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    return await res.json();
  } catch {
    return { error: "Bağlantı kurulamadı. Tekrar dene." };
  }
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-1" role="group" aria-label="Emoji seç">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          aria-pressed={value === e}
          className={`grid size-9 shrink-0 place-items-center rounded-xl text-lg ${value === e ? "clay-pressed" : "clay-sm"}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export function TopicManager() {
  const reduce = useReducedMotion();
  const { topics, topicsLoaded, setTopics, running, bump } = useFocus();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function apply(promise: Promise<{ topics?: Topic[]; error?: string }>) {
    setSaving(true);
    setError(null);
    const data = await promise;
    setSaving(false);
    if (data.error || !data.topics) {
      setError(data.error ?? "Bir hata oluştu");
      return false;
    }
    setTopics(data.topics);
    bump();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    const ok = await apply(call("/api/topics", { method: "POST", body: JSON.stringify({ name, emoji }) }));
    if (ok) setName("");
  }

  async function saveEdit(topic: Topic) {
    const ok = await apply(
      call(`/api/topics/${topic.id}`, { method: "PATCH", body: JSON.stringify({ name: editName, emoji: editEmoji }) })
    );
    if (ok) setEditing(null);
  }

  function archive(topic: Topic) {
    const warning = running?.topicId === topic.id ? " Çalışan zamanlayıcı da durdurulur." : "";
    if (!window.confirm(`“${topic.name}” arşivlensin mi? Geçmiş grafikler korunur.${warning}`)) return;
    apply(call(`/api/topics/${topic.id}`, { method: "DELETE" }));
  }

  return (
    <section className="clay flex min-h-[280px] flex-col p-4 sm:p-5 xl:min-h-0 xl:flex-1" aria-label="Konular">
      <h2 className="shrink-0 text-[16px] font-semibold">Konular</h2>
      <p className="mt-0.5 shrink-0 text-[12px] font-semibold text-faint">Her konunun rengi sabit kalır.</p>

      {topicsLoaded && topics.length === 0 && (
        <button
          type="button"
          onClick={() => apply(call("/api/topics", { method: "POST", body: JSON.stringify({ preset: true }) }))}
          disabled={saving}
          className="clay-button mt-4 w-full rounded-[18px] px-4 py-3 text-[14px] font-bold"
        >
          Önerilen konuları ekle · 💻 📚 🏀 ☕
        </button>
      )}

      <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {topics.map((t) => (
          <li key={t.id} className="clay-pressed rounded-[18px] p-2.5">
            {editing === t.id ? (
              <div className="flex flex-col gap-2.5">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={40}
                  aria-label="Konu adı"
                  className="clay-pressed w-full rounded-[14px] px-3 py-2 text-[14px] font-semibold outline-none"
                />
                <EmojiPicker value={editEmoji} onChange={setEditEmoji} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(t)}
                    disabled={saving || !editName.trim()}
                    className="clay-button rounded-[14px] px-4 py-2 text-[13px] font-bold"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="clay-sm rounded-[14px] px-4 py-2 text-[13px] font-bold text-muted"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span
                  className="slot-swatch grid size-9 shrink-0 place-items-center rounded-[12px] text-lg"
                  style={slotStyle(t.slot)}
                >
                  {t.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{t.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(t.id);
                    setEditName(t.name);
                    setEditEmoji(t.emoji);
                  }}
                  aria-label={`${t.name} konusunu düzenle`}
                  className="clay-sm grid size-9 place-items-center rounded-full text-muted hover:text-fg"
                >
                  <EditIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => archive(t)}
                  aria-label={`${t.name} konusunu arşivle`}
                  className="clay-sm grid size-9 place-items-center rounded-full text-muted hover:text-coral"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 flex shrink-0 flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Yeni konu adı"
            aria-label="Yeni konu adı"
            className="clay-pressed min-w-0 flex-1 rounded-[16px] px-3.5 py-2.5 text-[14px] font-semibold outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            aria-label="Konu ekle"
            className="clay-button grid size-11 shrink-0 place-items-center rounded-[16px]"
          >
            <PlusIcon className="size-5" />
          </button>
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} />
      </form>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-3 rounded-2xl bg-coral/10 px-3 py-2 text-[13px] font-semibold text-coral"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
