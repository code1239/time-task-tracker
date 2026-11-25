"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellIcon, StopIcon } from "./icons";

/** Rings-while-visible banner shown when a timed focus session reaches its time. */
export function AlarmBanner({
  open,
  title,
  onDismiss,
}: {
  open: boolean;
  title: string;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  const stopRef = useRef<HTMLButtonElement>(null);

  // Move focus to the stop button so the alarm can be silenced from the keyboard.
  useEffect(() => {
    if (open) stopRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="alarm"
          role="alert"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="clay fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 p-3 lg:bottom-6"
        >
          <span className="clay-pressed relative grid size-11 shrink-0 place-items-center rounded-2xl text-accent">
            <span className="animate-breathe absolute inset-0 rounded-2xl bg-accent/20 blur-md" />
            <BellIcon className="relative size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold">Süre doldu</p>
            <p className="truncate text-[13px] font-semibold text-muted">{title}</p>
          </div>
          <button
            type="button"
            ref={stopRef}
            onClick={onDismiss}
            className="clay-button inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold"
          >
            <StopIcon className="size-3.5" />
            Sesi durdur
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
