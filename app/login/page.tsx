import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="relative flex min-h-dvh flex-col px-4 pb-10 pt-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Brand />
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-3xl glass">
              <div className="relative size-9">
                <span className="absolute inset-0 rounded-full border border-accent/30" />
                <span className="absolute inset-[7px] rounded-full border border-teal/40" />
                <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_18px_4px_var(--glow)]" />
                <span className="animate-breathe absolute inset-0 rounded-full bg-accent/10 blur-md" />
              </div>
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight sm:text-[28px]">
              Tekrar hoş geldin
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-muted">
              Türkiye saati, günlük görevler ve geri sayımın tek bir sakin alanda.
            </p>
          </div>

          <div className="glass rounded-[32px] p-5 sm:p-7">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-faint">
            Erişim yalnızca davetli kullanıcılar içindir.
            <br />
            Hesabınız yoksa yöneticinizle iletişime geçin.
          </p>
        </div>
      </div>
    </main>
  );
}
