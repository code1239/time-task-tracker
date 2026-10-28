"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { TabBar, type TabId } from "./tab-bar";
import { ClockTab } from "./clock-tab";
import { TasksTab } from "./tasks-tab";
import { CountdownTab } from "./countdown-tab";
import { CountdownProvider } from "./countdown-provider";
import { LogoutIcon } from "./icons";
import { useTheme, type Theme } from "./theme-provider";

export function Dashboard({
  username,
  themePreference,
}: {
  username: string;
  themePreference: Theme | null;
}) {
  const [tab, setTab] = useState<TabId>("clock");
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const reduce = useReducedMotion();
  const { theme, setTheme } = useTheme();
  const syncedTheme = useRef(false);

  // Apply this user's saved theme, replacing a theme left over from another
  // account on the same browser.
  useEffect(() => {
    if (syncedTheme.current) return;
    syncedTheme.current = true;
    const preference = themePreference ?? "system";
    if (theme !== preference) setTheme(preference);
  }, [theme, themePreference, setTheme]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <CountdownProvider>
      <div className="relative flex min-h-dvh flex-col px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
        <header className="relative z-20 mx-auto flex w-full max-w-[980px] items-center justify-between gap-3">
          <Brand />

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full glass-pill py-1.5 pl-1.5 pr-3 sm:flex">
              <span className="grid size-6 place-items-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold uppercase text-accent">
                {username.slice(0, 1)}
              </span>
              <span className="max-w-[120px] truncate text-[12px] font-medium text-muted">{username}</span>
            </div>

            <ThemeToggle />

            <motion.button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              whileHover={reduce || loggingOut ? undefined : { scale: 1.03 }}
              whileTap={reduce || loggingOut ? undefined : { scale: 0.96 }}
              aria-label="Oturumu kapat"
              className="glass-pill inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-muted transition-colors hover:text-coral disabled:opacity-60"
            >
              {loggingOut ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-muted/30 border-t-muted" />
              ) : (
                <LogoutIcon className="size-4" />
              )}
              <span className="hidden sm:inline">Çıkış</span>
            </motion.button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[660px] flex-1 flex-col justify-center pb-4 pt-12 sm:pt-16">
          <div className="-translate-y-1 sm:-translate-y-6">
            <div className="mb-3 sm:mb-4">
              <TabBar active={tab} onChange={setTab} />
            </div>

            <section
              className="glass relative overflow-hidden rounded-[26px] p-4 sm:rounded-[32px] sm:p-7"
              aria-label="Aktif bölüm"
            >
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="pointer-events-none absolute -right-16 -top-24 size-48 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative" role="tabpanel" aria-label={tab === "clock" ? "Türkiye Saati" : tab === "tasks" ? "Yapılan Görev" : "Geri Sayım"}>
                {tab === "clock" && <ClockTab />}
                {tab === "tasks" && <TasksTab />}
                {tab === "countdown" && <CountdownTab />}
              </div>
            </section>

            <p className="mt-5 text-center text-[10px] uppercase tracking-[0.18em] text-faint/80">
              Zaman · Europe/Istanbul · UTC+3
            </p>
          </div>
        </main>
      </div>
    </CountdownProvider>
  );
}
