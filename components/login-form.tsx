"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EyeIcon, EyeOffIcon } from "./icons";

export function LoginForm() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Giriş yapılamadı. Lütfen tekrar deneyin.");
        setShakeKey((k) => k + 1);
        setPassword("");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-faint"
        >
          Kullanıcı adı
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="kullaniciadi"
          disabled={loading}
          className="h-12 w-full rounded-2xl border border-line bg-surface/40 px-4 text-[15px] text-fg placeholder:text-faint/70 transition-colors duration-200 hover:border-line-strong focus:border-accent/60 focus:bg-surface/60 disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-faint"
        >
          Şifre
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="h-12 w-full rounded-2xl border border-line bg-surface/40 px-4 pr-12 text-[15px] text-fg placeholder:text-faint/70 transition-colors duration-200 hover:border-line-strong focus:border-accent/60 focus:bg-surface/60 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-xl text-faint transition-colors hover:bg-accent-soft hover:text-fg"
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            key={shakeKey}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            role="alert"
            aria-live="polite"
            className="animate-shake rounded-xl border border-coral/25 bg-coral/10 px-3.5 py-2.5 text-[13px] leading-snug text-coral"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={loading || !username.trim() || !password}
        whileHover={reduce || loading ? undefined : { scale: 1.012 }}
        whileTap={reduce || loading ? undefined : { scale: 0.985 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="accent-gradient relative h-12 w-full overflow-hidden rounded-2xl text-[15px] font-medium text-white shadow-glow transition-[filter] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100"
      >
        <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        <span className="relative flex items-center justify-center gap-2">
          {loading && (
            <span className="size-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
          )}
          {loading ? "Giriş yapılıyor" : "Giriş yap"}
        </span>
      </motion.button>

      <p className="pt-1 text-center text-[11px] text-faint">
        Oturumunuz 7 gün boyunca güvenle açık kalır.
      </p>
    </form>
  );
}
