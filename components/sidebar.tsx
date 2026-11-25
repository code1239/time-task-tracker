"use client";

import { motion, useReducedMotion } from "motion/react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { LogoutIcon } from "./icons";
import { timerView, useFocus, useFocusElapsed } from "./focus-provider";
import { slotStyle, formatClock } from "@/lib/topic-style";
import type { TabId } from "@/lib/tabs";

export const NAV: { id: TabId; label: string; emoji: string }[] = [
  { id: "dashboard", label: "Panel", emoji: "🏠" },
  { id: "focus", label: "Odak", emoji: "🎯" },
  { id: "notion", label: "Notion", emoji: "📝" },
];

type Props = {
  active: TabId;
  onChange: (id: TabId) => void;
  username: string;
  onLogout: () => void;
  loggingOut: boolean;
};

/** Running-timer card at the bottom of the sidebar; jumps to the Odak page. */
function MiniTimer({ onOpen }: { onOpen: () => void }) {
  const { running, runningTopic } = useFocus();
  const elapsed = useFocusElapsed();
  if (!running) return null;
  const view = timerView(running, elapsed);
  const clock = formatClock(view.ms);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="clay-pressed flex w-full items-center gap-3 rounded-[20px] p-3 text-left"
      aria-label={`Çalışan zamanlayıcı: ${runningTopic?.name ?? "Odak"}, ${clock}`}
    >
      <span
        className="slot-swatch grid size-10 shrink-0 place-items-center rounded-[14px] text-lg"
        style={slotStyle(runningTopic?.slot ?? 1)}
      >
        {runningTopic?.emoji ?? "⏱️"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-fg">{runningTopic?.name ?? "Odak"}</span>
        <span className="tabular block text-[18px] font-semibold leading-tight text-accent">
          {clock}
        </span>
      </span>
    </button>
  );
}

export function Sidebar({ active, onChange, username, onLogout, loggingOut }: Props) {
  const reduce = useReducedMotion();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col gap-5 p-4 lg:flex">
      <div className="clay flex h-full flex-col gap-6 p-5">
        <Brand />

        <nav aria-label="Ana bölümler" className="flex flex-col gap-2">
          {NAV.map(({ id, label, emoji }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                aria-current={selected ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-[20px] px-3.5 py-3 text-[15px] font-bold transition-colors ${
                  selected ? "text-on-accent" : "text-muted hover:text-fg"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="nav-bean"
                    className="clay-button absolute inset-0 rounded-[20px]"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
                  />
                )}
                <span className="relative z-10 text-[20px] leading-none" aria-hidden="true">
                  {emoji}
                </span>
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <MiniTimer onOpen={() => onChange("focus")} />

          <ThemeToggle className="self-start" />

          <div className="flex items-center gap-2.5">
            <span className="clay-sm grid size-10 shrink-0 place-items-center rounded-full font-display text-[16px] font-semibold uppercase text-accent">
              {username.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-fg">{username}</span>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              aria-label="Oturumu kapat"
              title="Çıkış"
              className="clay-sm grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-coral disabled:opacity-60"
            >
              {loggingOut ? (
                <span className="size-4 animate-spin rounded-full border-2 border-muted/30 border-t-muted" />
              ) : (
                <LogoutIcon className="size-[18px]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Bottom tab bar for screens narrower than `lg`. */
export function MobileNav({ active, onChange }: Pick<Props, "active" | "onChange">) {
  const reduce = useReducedMotion();
  return (
    <nav
      aria-label="Ana bölümler"
      className="clay fixed inset-x-4 bottom-4 z-30 flex items-center gap-1 rounded-[26px] p-1.5 lg:hidden"
    >
      {NAV.map(({ id, label, emoji }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={selected ? "page" : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[20px] px-1 py-2 text-[11px] font-bold ${
              selected ? "text-on-accent" : "text-muted"
            }`}
          >
            {selected && (
              <motion.span
                layoutId="mobile-nav-bean"
                className="clay-button absolute inset-0 rounded-[20px]"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
              />
            )}
            <span className="relative z-10 text-[19px] leading-none" aria-hidden="true">
              {emoji}
            </span>
            <span className="relative z-10 truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
