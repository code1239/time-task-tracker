"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  "clay-sm inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-muted transition-colors hover:text-fg disabled:opacity-50";

const primaryClass =
  "clay-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-bold";

const alertClass = "rounded-2xl bg-coral/10 px-4 py-3 text-center text-[13px] font-bold text-coral";

/** Centered card for the connect, picker and loading states. */
function Panel({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section className="clay mx-auto w-full max-w-[680px] p-6 sm:p-8" aria-label={label}>
      {children}
    </section>
  );
}

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

  const connected = snapshot && snapshot.status !== "disconnected" && snapshot.status !== "unavailable";
  const needsPicker = snapshot?.status === "needs_page" || picking;

  return (
    <div className="flex flex-col gap-4 xl:h-full xl:min-h-[620px]">
      {notice && (
        <p role="alert" className={alertClass}>
          {notice}
        </p>
      )}

      {!snapshot && !loadFailed && (
        <Panel label="Notion yükleniyor">
          <LoadingState />
        </Panel>
      )}

      {loadFailed && !snapshot && (
        <Panel>
          <div className="grid justify-items-center gap-3 py-4 text-center">
            <p className="text-[14px] font-semibold text-muted">Notion bilgileri yüklenemedi.</p>
            <button type="button" onClick={() => load(true)} className={buttonClass}>
              <RefreshIcon className="size-4" />
              Tekrar dene
            </button>
          </div>
        </Panel>
      )}

      {snapshot?.status === "disconnected" && (
        <Panel>
          <ConnectState />
        </Panel>
      )}

      {snapshot?.status === "unavailable" && (
        <Panel>
          <p role="alert" className={alertClass}>
            Notion kurulumu tamamlanmamış: veritabanı tablosu eksik. Yöneticinin{" "}
            <code className="font-display">npm run db:setup</code> çalıştırması gerekiyor.
          </p>
        </Panel>
      )}

      {connected && needsPicker && (
        <Panel label="Sayfa seç">
          <PagePicker
            onDone={async () => {
              setPicking(false);
              await load(true);
            }}
            onCancel={snapshot.status === "ok" ? () => setPicking(false) : undefined}
            onDisconnect={disconnect}
          />
        </Panel>
      )}

      {snapshot?.status === "error" && !picking && (
        <p role="alert" className={alertClass}>
          {snapshot.message} Son bilinen sayı gösteriliyor.
        </p>
      )}

      {snapshot?.status === "ok" && !picking && (
        <TodoView
          snapshot={snapshot}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          onChangePage={() => setPicking(true)}
          onSelectPage={selectPage}
          onDisconnect={disconnect}
        />
      )}
    </div>
  );
}

function DisconnectButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
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
        <div key={i} className="clay-pressed h-11 animate-pulse rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

function ConnectState() {
  return (
    <div className="grid justify-items-center gap-5 py-4 text-center">
      <span className="clay-button grid size-16 place-items-center rounded-[22px]">
        <ChecklistIcon className="size-8" />
      </span>
      <div>
        <h2 className="text-[22px] font-semibold">Notion sayfanı bağla</h2>
        <p className="mx-auto mt-2 max-w-[400px] text-[14px] font-semibold leading-relaxed text-muted">
          Yapılacaklar sayfanı seç; tiklenenler ve tiklenmeyenler burada ayrı listelensin, bugün tiklediklerin{" "}
          <strong className="font-bold text-fg">Yapılan görev</strong> sayacına işlensin.
        </p>
      </div>
      <a href="/api/notion/connect" className={primaryClass}>
        <LinkIcon className="size-4" />
        Notion ile bağlan
      </a>
      <p className="text-[12px] font-semibold text-faint">
        Yalnızca okuma izni istenir; Notion&apos;a hiçbir şey yazılmaz.
      </p>
    </div>
  );
}

function PagePicker({
  onDone,
  onCancel,
  onDisconnect,
}: {
  onDone: () => void;
  onCancel?: () => void;
  onDisconnect: () => void;
}) {
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
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold">Hangi sayfayı kullanalım?</h2>
          <p className="mt-1 text-[13px] font-semibold leading-relaxed text-muted">
            İçindeki yapılacaklar (onay kutuları) listelenir. Listede yoksa Notion&apos;da sayfayı bu uygulamayla paylaş.
          </p>
        </div>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={buttonClass}>
            Vazgeç
          </button>
        ) : (
          <DisconnectButton onConfirm={onDisconnect} />
        )}
      </div>

      <label className="clay-pressed flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[14px] font-semibold focus-within:ring-2 focus-within:ring-[var(--ring)]">
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
        <p role="alert" className={alertClass}>
          {error}
        </p>
      )}

      {!pages && !error && <LoadingState />}

      {pages && (
        <ul className="grid max-h-[360px] gap-2 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-[13px] font-semibold text-faint">
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
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors disabled:opacity-60 ${
                  selected === page.id ? "clay-pressed" : "clay-sm hover:text-accent"
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center text-[19px]" aria-hidden="true">
                  {page.icon ?? "📄"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{page.title}</span>
                <span className="shrink-0 text-[12px] font-semibold text-faint">
                  {saving === page.id ? "Seçiliyor…" : selected === page.id ? "Seçili" : formatEdited(page.editedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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

/** Done share of all to-dos as a ring with the percentage in the middle. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const C = 2 * Math.PI * 42;
  return (
    <div className="relative size-[88px] shrink-0" role="img" aria-label={`Tamamlanan: yüzde ${pct}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--chart-track)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <span className="tabular absolute inset-0 grid place-items-center text-[20px] font-semibold">%{pct}</span>
    </div>
  );
}

function TodoView({
  snapshot,
  refreshing,
  onRefresh,
  onChangePage,
  onSelectPage,
  onDisconnect,
}: {
  snapshot: Extract<Snapshot, { status: "ok" }>;
  refreshing: boolean;
  onRefresh: () => void;
  onChangePage: () => void;
  onSelectPage: (id: string) => Promise<boolean>;
  onDisconnect: () => void;
}) {
  const reduce = useReducedMotion();
  const total = snapshot.todo.length + snapshot.done.length;

  return (
    <div className="flex flex-col gap-4 xl:min-h-0 xl:flex-1">
      {/* page header */}
      <section className="clay flex flex-wrap items-center gap-x-6 gap-y-4 p-5 sm:p-6" aria-label="Sayfa özeti">
        <span className="clay-button grid size-14 shrink-0 place-items-center rounded-[20px]" aria-hidden="true">
          <ChecklistIcon className="size-7" />
        </span>

        <div className="min-w-0 flex-1 basis-[240px]">
          <h1 className="truncate font-display text-[24px] font-semibold leading-tight">{snapshot.pageTitle}</h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-faint" role="status">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${snapshot.stale ? "bg-coral" : "bg-teal"} ${
                snapshot.stale || reduce ? "" : "animate-pulse"
              }`}
            />
            {snapshot.stale ? "Bağlantı sorunu · son güncelleme" : "Canlı · güncellendi"}{" "}
            <time dateTime={snapshot.fetchedAt} className="tabular">
              {formatClock(snapshot.fetchedAt)}
            </time>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onRefresh} disabled={refreshing} className={buttonClass}>
              <RefreshIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Yenile
            </button>
            <button type="button" onClick={onChangePage} className={buttonClass}>
              Sayfayı değiştir
            </button>
            <DisconnectButton onConfirm={onDisconnect} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="clay-pressed rounded-[22px] px-5 py-3 text-center">
            <NumberFlow
              value={snapshot.todayDone}
              animated={!reduce}
              className="tabular text-[34px] font-semibold leading-none text-accent"
            />
            <p className="mt-1 text-[12px] font-bold text-muted">bugün tiklenen</p>
          </div>
          <ProgressRing done={snapshot.done.length} total={total} />
        </div>
      </section>

      {total === 0 && snapshot.childPages.length > 0 ? (
        <ChildPagesHint snapshot={snapshot} onSelectPage={onSelectPage} />
      ) : total === 0 ? (
        <section className="clay grid place-items-center gap-2 p-10 text-center">
          <span className="text-[40px]" aria-hidden="true">
            📭
          </span>
          <p className="text-[14px] font-semibold text-muted">Bu sayfada henüz yapılacak (onay kutusu) yok.</p>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:min-h-0 xl:flex-1">
          <TodoList title="Yapılacaklar" emoji="⏳" items={snapshot.todo} empty="Hepsi tamam 🎉" />
          <TodoList title="Yapılanlar" emoji="✅" items={snapshot.done} empty="Henüz tiklenen yok" done />
        </div>
      )}

      {snapshot.partial && (
        <p className="text-center text-[12px] font-semibold text-faint">
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
    <section aria-label="Alt sayfalar" className="clay grid gap-4 p-5 sm:p-6 xl:min-h-0 xl:flex-1">
      <div>
        <h2 className="text-[18px] font-semibold">
          &ldquo;{snapshot.pageTitle}&rdquo; sayfasında yapılacak yok
        </h2>
        <p className="mt-1 max-w-[60ch] text-[13px] font-semibold leading-relaxed text-muted">
          Bu sayfanın kendisinde onay kutusu bulunmuyor, ama içinde alt sayfalar var. Yapılacaklarının olduğu sayfayı
          seç. Sayaç, seçtiğin sayfadaki bugün tiklenenlerden hesaplanır.
        </p>
      </div>

      {failed && (
        <p role="alert" className={alertClass}>
          Sayfa seçilemedi. Lütfen tekrar dene.
        </p>
      )}

      <ul className="grid gap-2 overflow-y-auto p-1 md:grid-cols-2 xl:min-h-0">
        {snapshot.childPages.map((page) => (
          <li key={page.id}>
            <button
              type="button"
              onClick={() => choose(page.id)}
              disabled={busy !== null}
              className="clay-sm flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors hover:text-accent disabled:opacity-60"
            >
              <span aria-hidden="true" className="text-[18px]">
                📄
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{page.title}</span>
              <span className="shrink-0 text-[12px] font-bold text-accent">
                {busy === page.id ? "Seçiliyor…" : "Bunu kullan"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TodoList({
  title,
  emoji,
  items,
  empty,
  done = false,
}: {
  title: string;
  emoji: string;
  items: TodoItem[];
  empty: string;
  done?: boolean;
}) {
  return (
    <section aria-label={title} className="clay flex max-h-[520px] min-h-[220px] flex-col p-4 sm:p-5 xl:max-h-none xl:min-h-0">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="clay-sm grid size-10 place-items-center rounded-2xl text-[19px]" aria-hidden="true">
          {emoji}
        </span>
        <h2 className="flex-1 text-[18px] font-semibold">{title}</h2>
        <span className="clay-pressed tabular rounded-full px-3.5 py-1 text-[14px] font-semibold">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="clay-pressed mt-4 grid flex-1 place-items-center rounded-[20px] px-4 py-8 text-center text-[14px] font-bold text-muted">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-semibold leading-snug transition-colors hover:bg-sunk"
              style={{ marginLeft: `${Math.min(item.depth, 4) * 1.1}rem` }}
            >
              <span
                aria-hidden="true"
                className={`mt-px grid size-[22px] shrink-0 place-items-center rounded-full ${
                  done ? "clay-button" : "clay-pressed"
                }`}
              >
                {done && (
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3.5 8.5 3 3 6-6.5" />
                  </svg>
                )}
              </span>
              <span className={`min-w-0 flex-1 ${done ? "text-muted line-through decoration-faint/60" : "text-fg"}`}>
                {item.text}
                <span className="sr-only">{done ? " (yapıldı)" : " (yapılmadı)"}</span>
              </span>
              {item.doneToday && (
                <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-bold text-accent">
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
