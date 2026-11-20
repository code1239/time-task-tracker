"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useReducedMotion } from "motion/react";
import { ChecklistIcon, LinkIcon, RefreshIcon, SearchIcon } from "./icons";

type TodoItem = { id: string; text: string; checked: boolean; depth: number; doneToday: boolean };
type PageSummary = { id: string; title: string; icon: string | null; editedAt: string };

type Snapshot =
  | { status: "disconnected" }
  | { status: "unavailable" }
  | { status: "needs_page"; workspace: string | null }
  | {
      status: "ok";
      workspace: string | null;
      pageTitle: string;
      todo: TodoItem[];
      done: TodoItem[];
      todayDone: number;
      partial: boolean;
      childPages: { id: string; title: string }[];
      stale?: boolean;
      fetchedAt: string;
    }
  | { status: "error"; workspace: string | null; pageTitle: string | null; message: string };

// Near-live updates: poll while the tab is visible, back off when Notion errors.
const POLL_MS = 5_000;
const POLL_MAX_MS = 20_000;

const buttonClass =
  "glass-pill inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50";

const primaryClass =
  "accent-gradient inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-[13px] font-medium text-white shadow-glow transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function NotionTab() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** Returns whether the request succeeded. Background polls do not flash the spinner. */
  const load = useCallback(async (fresh = false, background = false): Promise<boolean> => {
    if (!background) setRefreshing(true);
    try {
      const res = await fetch(`/api/notion/todos${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      setSnapshot((await res.json()) as Snapshot);
      setLoadFailed(false);
      return true;
    } catch {
      setLoadFailed(true);
      return false;
    } finally {
      if (!background) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data fetch
    load();
  }, [load]);

  // Message left by the OAuth redirect (?notion=error|config), then clean the URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get("notion");
    if (!flag) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the redirect result
    setNotice(
      flag === "config"
        ? "Notion bağlantısı henüz yapılandırılmamış (NOTION_CLIENT_ID / NOTION_CLIENT_SECRET)."
        : "Notion bağlantısı tamamlanamadı. Lütfen tekrar dene."
    );
    url.searchParams.delete("notion");
    window.history.replaceState(null, "", url);
  }, []);

  const showingList = snapshot?.status === "ok" && !picking;
  // Sequential polling: one request at a time, paused while the tab is hidden,
  // immediate refresh when it becomes visible again.
  useEffect(() => {
    if (!showingList) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let stopped = false;

    const schedule = () => {
      if (stopped || document.visibilityState !== "visible") return;
      const delay = Math.min(POLL_MAX_MS, POLL_MS * 2 ** failures);
      timer = setTimeout(run, delay);
    };
    const run = async () => {
      const ok = await load(false, true);
      failures = ok ? 0 : failures + 1;
      schedule();
    };
    const onVisibility = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") run();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [showingList, load]);

  async function selectPage(id: string): Promise<boolean> {
    try {
      const res = await fetch("/api/notion/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: id }),
      });
      if (!res.ok) return false;
      await load(true);
      return true;
    } catch {
      return false;
    }
  }

  async function disconnect() {
    await fetch("/api/notion/disconnect", { method: "DELETE" }).catch(() => {});
    setPicking(false);
    await load(true);
  }

  const needsPicker = snapshot?.status === "needs_page" || picking;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full glass-inset px-3 py-1.5 text-[11px] font-medium text-muted">
          <ChecklistIcon className="size-3.5 text-accent" />
          NOTION
        </div>
        {snapshot && snapshot.status !== "disconnected" && snapshot.status !== "unavailable" && (
          <div className="flex items-center gap-2">
            {!needsPicker && (
              <button type="button" onClick={() => load(true)} disabled={refreshing} className={buttonClass}>
                <RefreshIcon className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Yenile
              </button>
            )}
            <DisconnectButton onConfirm={disconnect} />
          </div>
        )}
      </div>

      {notice && (
        <p role="alert" className="rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-center text-[12px] text-coral">
          {notice}
        </p>
      )}

      {!snapshot && !loadFailed && <LoadingState />}

      {loadFailed && !snapshot && (
        <div className="grid gap-3 py-6 text-center">
          <p className="text-[13px] text-muted">Notion bilgileri yüklenemedi.</p>
          <button type="button" onClick={() => load(true)} className={`${buttonClass} mx-auto`}>
            <RefreshIcon className="size-3.5" />
            Tekrar dene
          </button>
        </div>
      )}

      {snapshot?.status === "disconnected" && <ConnectState />}

      {snapshot?.status === "unavailable" && (
        <p role="alert" className="rounded-xl border border-coral/25 bg-coral/10 px-3 py-3 text-center text-[12px] leading-relaxed text-coral">
          Notion kurulumu tamamlanmamış: veritabanı tablosu eksik. Yöneticinin <code className="font-mono">npm run db:setup</code>{" "}
          çalıştırması gerekiyor.
        </p>
      )}

      {needsPicker && snapshot && snapshot.status !== "disconnected" && snapshot.status !== "unavailable" && (
        <PagePicker
          onDone={async () => {
            setPicking(false);
            await load(true);
          }}
          onCancel={snapshot.status === "ok" ? () => setPicking(false) : undefined}
        />
      )}

      {snapshot?.status === "error" && !picking && (
        <p role="alert" className="rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-center text-[12px] text-coral">
          {snapshot.message} Son bilinen sayı gösteriliyor.
        </p>
      )}

      {snapshot?.status === "ok" && !picking && (
        <TodoView snapshot={snapshot} onChangePage={() => setPicking(true)} onSelectPage={selectPage} />
      )}
    </div>
  );
}

function DisconnectButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button type="button" onClick={onConfirm} className={`${buttonClass} !text-coral`}>
          Kes
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={buttonClass}>
          Vazgeç
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} className={buttonClass}>
      Bağlantıyı kes
    </button>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3 py-2" aria-busy="true" aria-label="Notion yükleniyor">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-fg/10" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

function ConnectState() {
  return (
    <div className="grid justify-items-center gap-4 py-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <ChecklistIcon className="size-7" />
      </span>
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight">Notion sayfanı bağla</h3>
        <p className="mx-auto mt-2 max-w-[340px] text-[13px] leading-relaxed text-muted">
          Yapılacaklar sayfanı seç; tiklenenler ve tiklenmeyenler burada ayrı listelensin, bugün
          tiklediklerin <strong className="font-semibold text-fg">Yapılan Görev</strong> sayacına işlensin.
        </p>
      </div>
      <a href="/api/notion/connect" className={primaryClass}>
        <LinkIcon className="size-4" />
        Notion ile Bağlan
      </a>
      <p className="text-[11px] text-faint">Yalnızca okuma izni istenir; Notion&apos;a hiçbir şey yazılmaz.</p>
    </div>
  );
}

function PagePicker({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notion/pages", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error("failed");
        if (!cancelled) {
          setPages(data.pages ?? []);
          setSelected(data.selected ?? null);
        }
      } catch {
        if (!cancelled) setError("Sayfalar alınamadı. Lütfen tekrar dene.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return (pages ?? []).filter((p) => !q || p.title.toLocaleLowerCase("tr-TR").includes(q));
  }, [pages, search]);

  async function choose(id: string) {
    setSaving(id);
    setError(null);
    try {
      const res = await fetch("/api/notion/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: id }),
      });
      if (!res.ok) throw new Error("failed");
      onDone();
    } catch {
      setError("Sayfa seçilemedi. Lütfen tekrar dene.");
      setSaving(null);
    }
  }

  return (
    <section aria-label="Sayfa seç" className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">Hangi sayfayı kullanalım?</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            İçindeki yapılacaklar (onay kutuları) listelenir. Listede yoksa Notion&apos;da sayfayı bu uygulamayla paylaş.
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass}>
            Vazgeç
          </button>
        )}
      </div>

      <label className="glass-inset flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] focus-within:ring-2 focus-within:ring-[var(--ring)]">
        <SearchIcon className="size-4 text-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sayfa ara…"
          aria-label="Sayfa ara"
          className="w-full bg-transparent outline-none placeholder:text-faint"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-center text-[12px] text-coral">
          {error}
        </p>
      )}

      {!pages && !error && <LoadingState />}

      {pages && (
        <ul className="grid max-h-[320px] gap-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-[12px] text-faint">
              {pages.length === 0 ? "Paylaşılmış sayfa yok." : "Eşleşen sayfa yok."}
            </li>
          )}
          {filtered.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => choose(page.id)}
                disabled={saving !== null}
                aria-current={selected === page.id ? "true" : undefined}
                className="glass-inset flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
              >
                <span className="grid size-7 shrink-0 place-items-center text-[16px]" aria-hidden="true">
                  {page.icon ?? "📄"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{page.title}</span>
                <span className="shrink-0 text-[11px] text-faint">
                  {saving === page.id ? "Seçiliyor…" : selected === page.id ? "Seçili" : formatEdited(page.editedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatEdited(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }).format(
    new Date(iso)
  );
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}

function TodoView({
  snapshot,
  onChangePage,
  onSelectPage,
}: {
  snapshot: Extract<Snapshot, { status: "ok" }>;
  onChangePage: () => void;
  onSelectPage: (id: string) => Promise<boolean>;
}) {
  const reduce = useReducedMotion();
  const total = snapshot.todo.length + snapshot.done.length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{snapshot.pageTitle}</h3>
          <button
            type="button"
            onClick={onChangePage}
            className="text-[11px] text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Sayfayı değiştir
          </button>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-faint" role="status">
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${snapshot.stale ? "bg-coral" : "bg-teal"} ${
                snapshot.stale || reduce ? "" : "animate-pulse"
              }`}
            />
            {snapshot.stale ? "Bağlantı sorunu · son güncelleme" : "Canlı · güncellendi"}{" "}
            <time dateTime={snapshot.fetchedAt} className="font-mono">
              {formatClock(snapshot.fetchedAt)}
            </time>
          </p>
        </div>
        <div className="glass-inset inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-muted">
          Bugün tiklenen
          <NumberFlow
            value={snapshot.todayDone}
            animated={!reduce}
            className="font-mono text-[15px] font-semibold text-accent"
          />
        </div>
      </div>

      {total === 0 && snapshot.childPages.length > 0 ? (
        <ChildPagesHint snapshot={snapshot} onSelectPage={onSelectPage} />
      ) : total === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">
          Bu sayfada henüz yapılacak (onay kutusu) yok.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <TodoList title="Yapılacaklar" items={snapshot.todo} empty="Hepsi tamam 🎉" />
          <TodoList title="Yapılanlar" items={snapshot.done} empty="Henüz tiklenen yok" done />
        </div>
      )}

      {snapshot.partial && (
        <p className="text-center text-[11px] text-faint">
          Sayfa çok büyük olduğu için bazı iç içe maddeler gösterilmedi.
        </p>
      )}
    </div>
  );
}

/** The selected page is a container: it has sub-pages but no to-dos of its own. */
function ChildPagesHint({
  snapshot,
  onSelectPage,
}: {
  snapshot: Extract<Snapshot, { status: "ok" }>;
  onSelectPage: (id: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function choose(id: string) {
    setBusy(id);
    setFailed(false);
    const ok = await onSelectPage(id);
    if (!ok) {
      setFailed(true);
      setBusy(null);
    }
  }

  return (
    <section aria-label="Alt sayfalar" className="glass-inset grid gap-3 rounded-2xl p-4">
      <div>
        <h4 className="text-[14px] font-semibold tracking-tight">
          &ldquo;{snapshot.pageTitle}&rdquo; sayfasında yapılacak yok
        </h4>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Bu sayfanın kendisinde onay kutusu bulunmuyor, ama içinde alt sayfalar var. Yapılacaklarının olduğu
          sayfayı seç. Sayaç, seçtiğin sayfadaki bugün tiklenenlerden hesaplanır.
        </p>
      </div>

      {failed && (
        <p role="alert" className="rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-center text-[12px] text-coral">
          Sayfa seçilemedi. Lütfen tekrar dene.
        </p>
      )}

      <ul className="grid max-h-[300px] gap-1.5 overflow-y-auto pr-1">
        {snapshot.childPages.map((page) => (
          <li key={page.id}>
            <button
              type="button"
              onClick={() => choose(page.id)}
              disabled={busy !== null}
              className="glass-inset flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
            >
              <span aria-hidden="true" className="text-[15px]">
                📄
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{page.title}</span>
              <span className="shrink-0 text-[11px] text-accent">{busy === page.id ? "Seçiliyor…" : "Bunu kullan"}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TodoList({ title, items, empty, done = false }: { title: string; items: TodoItem[]; empty: string; done?: boolean }) {
  return (
    <section aria-label={title} className="glass-inset rounded-2xl p-3">
      <h4 className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
        {title}
        <span className="font-mono text-[12px] normal-case tracking-normal text-muted">{items.length}</span>
      </h4>
      {items.length === 0 ? (
        <p className="px-1 py-4 text-center text-[12px] text-faint">{empty}</p>
      ) : (
        <ul className="grid max-h-[340px] gap-0.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-[13px] leading-snug"
              style={{ paddingLeft: `${0.375 + item.depth * 1.1}rem` }}
            >
              <span
                aria-hidden="true"
                className={`mt-[3px] grid size-4 shrink-0 place-items-center rounded-[5px] border ${
                  done ? "border-accent bg-accent text-white" : "border-line-strong"
                }`}
              >
                {done && (
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3.5 8.5 3 3 6-6.5" />
                  </svg>
                )}
              </span>
              <span className={done ? "text-muted line-through decoration-faint/60" : "text-fg"}>
                {item.text}
                <span className="sr-only">{done ? " (yapıldı)" : " (yapılmadı)"}</span>
              </span>
              {item.doneToday && (
                <span className="ml-auto shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                  bugün
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
