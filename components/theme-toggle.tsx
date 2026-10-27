"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTheme, type Theme } from "./theme-provider";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const options: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: "system", label: "Sistem teması", Icon: MonitorIcon },
  { value: "light", label: "Açık tema", Icon: SunIcon },
  { value: "dark", label: "Koyu tema", Icon: MoonIcon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const reduce = useReducedMotion();

  return (
    <div
      role="group"
      aria-label="Tema seçimi"
      className={`glass-pill flex items-center gap-0.5 rounded-full p-1 ${className}`}
    >
      {options.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className="relative grid size-8 place-items-center rounded-full text-muted transition-colors duration-200 hover:text-fg"
          >
            {active && (
              <motion.span
                layoutId="theme-indicator"
                className="absolute inset-0 rounded-full bg-accent-soft ring-1 ring-inset ring-white/10"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <motion.span
              className="relative z-10"
              animate={{
                rotate: active ? 0 : -12,
                scale: active ? 1 : 0.88,
                opacity: active ? 1 : 0.72,
              }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 26 }}
            >
              <Icon className={`size-[15px] ${active ? "text-accent" : ""}`} />
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
