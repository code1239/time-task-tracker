@AGENTS.md

# Zaman — Time & Task Tracker

Türkçe arayüzlü saat / günlük görev sayacı / geri sayım uygulaması. Next.js 16 (App Router), TypeScript, Tailwind 4, `motion`, SQL Server (`mssql`), JWT cookie auth.

## Komutlar

```bash
npm run dev              # predev, .next/BUILD_ID varsa .next'i temizler
npm run build            # standalone çıktı
npm run lint             # ESLint (testi yok; lint + build ile doğrula)
npm run db:setup         # idempotent DB/şema/kullanıcı kurulumu (.env.local admin bilgileri)
npm run user:create -- <kullanıcı> <şifre>
npm run user:reset-password -- <kullanıcı> <şifre>
npm run user:list
```

## Mimari

- `proxy.ts` — `/` ve `/login` için JWT doğrulayan yönlendirme (Next 16'da `middleware` yerine `proxy`).
- `lib/auth.ts` — `ttt_session` httpOnly cookie, HS256 JWT, 7 gün. `requireSession()` API route'larında kullanılır.
- `lib/db.ts` — tek `mssql` pool'u; `query`/`execute` her zaman parametreli (`@name`) çalışır.
- `lib/date.ts` — tüm tarih mantığı `Europe/Istanbul`'a sabit; "bugün" daima sunucuda `getIstanbulDateString()` ile hesaplanır.
- `lib/duration.ts` — geri sayım süresi ayrıştırma (saf fonksiyonlar). `lib/alarm.ts` — Web Audio çan sesi.
- `app/api/*` — `auth`, `tasks/{today,update,history}`, `countdown`, `theme`, `health`. Girdi `zod` ile doğrulanır, hata mesajları Türkçe.
- `components/` — client bileşenleri. `Dashboard` sekmeleri (`clock`, `tasks`, `countdown`) taşır; `CountdownProvider` alarmı uygulama genelinde yönetir; `ThemeProvider` + `themeInitScript` flash'sız tema sağlar.
- Veritabanı tabloları: `Users`, `DailyTaskCounts (UserId, CountDate)`, `Countdowns (UserId)`.

## Kurallar

- Arayüz metinleri Türkçe; kod, yorum ve commit mesajları İngilizce/Türkçe karışık olabilir, mevcut dosyanın diline uy.
- SQL'e asla string birleştirme ile değer koyma; parametre kullan.
- Secret'lar (`.env`, `.env.local`) git'e girmez.
- Animasyonlar `prefers-reduced-motion`'a saygı göstermeli (`MotionConfig reducedMotion="user"`).
- Next.js API'leri eğitim verisinden farklı olabilir; kod yazmadan önce `node_modules/next/dist/docs/` oku.

## Tuzaklar

- `next build` sonrası `next dev` çalıştırmak artefakt karışmasına yol açar; `npm run dev` bunu otomatik temizler.
- Dev ortamında SQL Server'a `DB_TRUST_SERVER_CERTIFICATE=true` ile bağlanılır.
