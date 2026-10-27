"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ttt-theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme, systemDark: boolean) {
  if (typeof document === "undefined") return;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);
  const interacted = useRef(false);

  useEffect(() => {
    const dark = systemPrefersDark();
    setSystemDark(dark);

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const initial: Theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setThemeState(initial);
    applyTheme(initial, dark);
    setReady(true);

    // Server-side preference wins on a fresh device, localStorage wins if it exists.
    fetch("/api/theme", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.theme || interacted.current) return;
        if (stored) return;
        const next = data.theme as Theme;
        if (next !== "light" && next !== "dark" && next !== "system") return;
        setThemeState(next);
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
        applyTheme(next, systemPrefersDark());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setSystemDark(mq.matches);
      if (theme === "system") applyTheme("system", mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, ready]);

  const setTheme = useCallback((next: Theme) => {
    interacted.current = true;
    setThemeState(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next, systemPrefersDark());
    fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light",
      setTheme,
    }),
    [theme, systemDark, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
