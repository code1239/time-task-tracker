"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircleIcon, ClockIcon, HourglassIcon } from "./icons";

export type TabId = "clock" | "tasks" | "countdown";

export const TABS: { id: TabId; label: string; Icon: typeof ClockIcon }[] = [
  { id: "clock", label: "Türkiye Saati", Icon: ClockIcon },
  { id: "tasks", label: "Yapılan Görev", Icon: CheckCircleIcon },
  { id: "countdown", label: "Geri Sayım", Icon: HourglassIcon },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Ana bölümler"
      onKeyDown={onKeyDown}
      className="glass-pill mx-auto flex w-full max-w-[400px] items-center gap-0.5 rounded-full p-1.5"
    >
      {TABS.map(({ id, label, Icon }, i) => {
        const selected = active === id;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${id}`}
            aria-selected={selected}
            aria-controls={`panel-${id}`}
            tabIndex={selected ? 0 : -1}
            type="button"
            onClick={() => onChange(id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[11.5px] font-medium tracking-tight transition-colors duration-200 sm:px-3 sm:text-[13px] ${
              selected ? "text-accent" : "text-muted hover:text-fg"
            }`}
          >
            {selected && (
              <motion.span
                layoutId="main-tab-indicator"
                className="absolute inset-0 rounded-full bg-accent-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_18px_-10px_var(--glow)] ring-1 ring-inset ring-white/10"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className="relative z-10 hidden size-[15px] sm:block" />
            <span className="relative z-10 whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
