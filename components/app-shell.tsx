"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileNav } from "./sidebar";
import { FocusProvider } from "./focus-provider";
import { DashboardPage } from "./dashboard-page";
import { FocusPage } from "./focus-page";
import { NotionTab } from "./notion-tab";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { LogoutIcon } from "./icons";
import { useTheme, type Theme } from "./theme-provider";
import type { TabId } from "@/lib/tabs";

export function AppShell({
  username,
  themePreference,
  initialTab = "dashboard",
}: {
  username: string;
  themePreference: Theme | null;
  initialTab?: TabId;
}) {
  const [tab, setTabState] = useState<TabId>(initialTab);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
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

  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    window.history.replaceState(null, "", next === "dashboard" ? "/" : `/?tab=${next}`);
    window.scrollTo({ top: 0 });
  }, []);

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
    <FocusProvider>
        <Sidebar active={tab} onChange={setTab} username={username} onLogout={logout} loggingOut={loggingOut} />

        <div className="lg:pl-[264px]">
          {/* phone / tablet header: the sidebar is hidden below lg */}
          <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-6 lg:hidden">
            <Brand />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                aria-label="Oturumu kapat"
                className="clay-sm grid size-11 place-items-center rounded-full text-muted transition-colors hover:text-coral disabled:opacity-60"
              >
                <LogoutIcon className="size-[18px]" />
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1680px] px-4 pb-28 pt-4 sm:px-6 lg:h-dvh lg:overflow-y-auto lg:px-6 lg:py-4">
            {/* every page fills the screen on xl; a long Notion list scrolls inside its own card */}
            <div key={tab} role="region" aria-label="Aktif bölüm" className="xl:h-full">
              {tab === "dashboard" && <DashboardPage username={username} onNavigate={setTab} />}
              {tab === "focus" && <FocusPage />}
              {tab === "notion" && <NotionTab />}
            </div>
          </main>
        </div>

        <MobileNav active={tab} onChange={setTab} />
    </FocusProvider>
  );
}
