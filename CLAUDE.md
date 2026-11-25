@AGENTS.md

# Zaman — Time & Task Tracker

Türkçe arayüzlü odak zamanlayıcı (konu bazlı) / günlük görev sayacı / Notion yapılacaklar uygulaması (geri sayım artık Odak zamanlayıcısında bir seçenektir); saat Dashboard'da widget'tır. Next.js 16 (App Router), TypeScript, Tailwind 4, `motion`, SQL Server (`mssql`), JWT cookie auth, Notion OAuth. Görünüm v2 "clay" (kil/oyuncak) temasıdır: gökyüzü-mavisi açık tema, lacivert koyu tema, Fredoka + Nunito yazı tipleri. Eski Bulls/Jordan teması kaldırıldı (tekrar getirme).

## Komutlar

```bash
npm run dev              # predev, .next/BUILD_ID varsa .next'i temizler
npm run build            # standalone çıktı
npm run lint             # ESLint (testi yok; lint + build ile doğrula)
npm run db:setup         # idempotent DB/şema/kullanıcı kurulumu (.env.local admin bilgileri)
npm run user:create -- <kullanıcı> <şifre>
npm run user:reset-password -- <kullanıcı> <şifre>
npm run user:list
docker compose up -d --build   # 3000'de çalıştırır; .env (NOTION_* dahil) değişince yeniden build/oluştur
```

Sunucu önizlemesi için `.claude/launch.json` (git'e girmez) `dev`, `dev-notion-mock`, `dev-notion-container`, `dev-notion-disconnected` yapılandırmalarını içerir.

## Mimari

- `proxy.ts` — `/` ve `/login` için JWT doğrulayan yönlendirme (Next 16'da `middleware` yerine `proxy`).
- `lib/session-config.ts` — cookie adı/secret, `proxy.ts` ve `lib/auth.ts` arasında paylaşılır (`next/headers` içermez).
- `lib/auth.ts` — `ttt_session` httpOnly cookie, HS256 JWT, 7 gün. `requireSession()` API route'larında kullanılır.
- `lib/tabs.ts` — sekme kimlikleri (`dashboard`, `focus`, `notion`); `resolveTab` eski `?tab=clock`/`tasks`/`countdown` bağlantılarını `dashboard`/`focus`'a eşler. Sunucu bileşeni (`app/page.tsx`) `?tab=` değerini buradan doğrular (client dosyasından fonksiyon import edilemez).
- `lib/db.ts` — tek `mssql` pool'u; `query`/`execute` her zaman parametreli (`@name`) çalışır.
- `lib/date.ts` — tüm tarih mantığı `Europe/Istanbul`'a sabit; "bugün" daima sunucuda `getIstanbulDateString()` ile hesaplanır.
- `lib/duration.ts` — odak "süre belirle" alanının ayrıştırması (saf fonksiyonlar). `lib/alarm.ts` — Web Audio çan sesi.
- `app/api/*` — `auth`, `tasks/{today,update,history}`, `topics` (+`[id]`, silme = arşivleme), `focus/{current,start,stop,manual,[id]}`, `focus/complete`, `stats/{day,range}`, `theme`, `notion/{connect,callback,pages,todos,disconnect}`, `health`. Girdi `zod` ile doğrulanır, hata mesajları Türkçe.
- Odak verisi: `lib/focus.ts` saf yardımcılar (İstanbul gün sınırlarına kırpma, gece yarısını aşan oturumu bölme, en büyük kalan yöntemiyle toplamı 100 yapan yüzdeler, seri) + DB sorguları; **client bileşenleri bu dosyadan yalnızca `import type` yapabilir** (içinde `mssql` var). `lib/use-stats.ts` grafik verisi hook'ları, `lib/topic-style.ts` renk/süre biçimleyiciler, `lib/api.ts` route yardımcıları. `focus/stop` `completed` ise `DailyTaskCounts`'u +1 yapar (Notion kilitliyse atlar, oturum yine kaydedilir); 5 sn'den kısa ve tamamlanmamış oturum silinir. Kullanıcı başına tek çalışan oturum filtreli unique index ile zorlanır.
- `components/` — client bileşenleri. `AppShell` (sol `Sidebar`, `lg` altında alt `MobileNav`; `?tab=` `history.replaceState` ile senkron) `FocusProvider` (çalışan oturum, saniyelik süre ayrı `useFocusElapsed` context'inde, sekme başlığında `⏱ mm:ss · Konu`, `version/bump` ile grafikler yeniden çeker) ile sayfaları sarar (alarm da `FocusProvider`'dadır): `DashboardPage` (saat widget'ı `ClockWidget`, stat kutucukları, `components/charts/{day-ring,topic-donut,weekly-stack,topic-leaderboard}`, `TaskHistoryChart`), `FocusPage` (`FocusTimer` — konu seçimi, "Süre belirle" ile geri sayım veya ileri sayım, oturum listesi, elle süre, `TaskCounter`, `TopicManager`), `NotionTab`. Saat tam ekran modu `lib/use-fullscreen.ts` (API yoksa CSS fallback). Konu renkleri `--series-1..8` (açık/koyu ayrı adımlar, dataviz paleti, kremaya/çikolataya karşı doğrulandı); konu rengi hep `slot` ile, sıraya göre asla yeniden boyanmaz. `MotionConfig reducedMotion="user"`; `ThemeProvider` + `themeInitScript` flash'sız tema sağlar. three.js kullanma (daha önce denenip kaldırıldı).
- Stil: `app/globals.css` — `.clay`, `.clay-sm`, `.clay-pressed`, `.clay-button` `@layer components` içindedir ki Tailwind utility'leri (`rounded-full` vb.) ezebilsin; katmansız yazarsan utility'ler kaybeder. Eski `glass*`/`accent-gradient` adları clay'e eşlenmiş alias'lardır (countdown/notion/login hâlâ kullanır).
- Geri sayımlı oturum: `FocusSessions.PlannedMinutes` doluysa süre dolunca oturum **sunucuda** `StartedAt + PlannedMinutes` ile kapanır (`settleExpiredSessions`, `getRunningSession`/`sessionsBetween`/start/stop tarafından çağrılır; arka plan işi yok, tarayıcı kapalıyken de doğru süre kaydedilir). İstemci (`FocusProvider`) süre dolunca alarmı çalar, `focus/current`'ı yeniler ve "Görev tamamlandı mı?" sorar (`focus/complete`, aynı oturum için sayaç yalnızca bir kez artar). Sayfa süre dolduktan sonra açılırsa alarm çalmaz.
- Tek ekran düzeni: xl ve üstünde Panel/Odak/Notion kaydırmasız sığar (`main` `lg:h-dvh`, sayfalar `xl:h-full` + grid satırları `minmax(0,…)`, iç listeler `overflow-y-auto`); xl altında kartlar alt alta dizilir. Grafik kutuları `ChartCard` ile sağ üstte büyüt düğmesi taşır (tam ekran pencere `createPortal` ile `body`'ye çizilir, çünkü `.clay`'in `contain` değeri `position: fixed` torunları hapseder). Grafikler kutuyu doldurur (`h-full`, `cqmin` birimleri), sabit piksel yükseklik verme.
- Analog saat açıları sürekli artar, 360'ta sarılmaz (aksi halde CSS geçişi saniye ibresini dakikada bir geri sarar); açılar sayfa açılışındaki 12 saatlik sınıra göre sayılır ki sayılar küçük kalsın (epoch'tan sayarsan ~1e10 derecede tarayıcı hassasiyet kaybeder).
- Notion: `lib/notion.ts` (OAuth token takası, sayfa listesi, blok ağacı, `flattenTodos`, `getTodoSnapshot`), `lib/crypto.ts` (token şifreleme), `app/api/notion/*`, `components/notion-tab.tsx`. Sayfa seçiliyken "Yapılan Görev" sayacı Notion'a kilitlidir: bugün (İstanbul) tiklenen to_do sayısı `getTodoSnapshot` ile `DailyTaskCounts`'a yazılır ve `POST /api/tasks/update` 409 döner. Güncelleme canlıya yakındır: Notion sekmesi görünürken 5 sn'de bir (hata olursa 20 sn'ye kadar geri çekilerek) poll eder, sekme gizliyken durur; sunucuda 3 sn önbellek + tek-uçuş (`inflight`) vardır, Notion erişilemezse son iyi veri `stale` olarak döner. Seçilen sayfada onay kutusu yok ama alt sayfa varsa sekme alt sayfaları seçtirir (`collectChildPages`). Webhook kullanılmaz (gecikmeli, herkese açık HTTPS ister). Geliştirmede `NOTION_MOCK=1` sahte sayfa, `NOTION_MOCK=container` alt sayfalı kap sayfa, `NOTION_MOCK=disconnected` bağlan ekranı verir.
- Veritabanı tabloları: `Users`, `DailyTaskCounts (UserId, CountDate)`, `NotionConnections (UserId)`, `Topics (UserId, Name unique; ColorSlot 1–8; ArchivedAt)`, `FocusSessions (UserId, TopicId, StartedAt/EndedAt UTC, PlannedMinutes NULL = açık uçlu)` (yalnızca `npm run db:setup` ile oluşur; uygulama kullanıcısı tablo oluşturamaz).

## Kurallar

- Arayüz metinleri Türkçe; kod, yorum ve commit mesajları İngilizce/Türkçe karışık olabilir, mevcut dosyanın diline uy.
- SQL'e asla string birleştirme ile değer koyma; parametre kullan.
- Secret'lar (`.env`, `.env.local`, Notion client secret) git'e girmez; push öncesi geçmişte secret değeri olmadığını doğrula. Repo public olabilir.
- `README.md` portfolyo vitrinidir: ekran görüntüleri `docs/screenshots/` altında; dürüst kal (test paketi yok), kişisel/Notion verisi koyma.
- Animasyonlar `prefers-reduced-motion`'a saygı göstermeli (`MotionConfig reducedMotion="user"`).
- Next.js API'leri eğitim verisinden farklı olabilir; kod yazmadan önce `node_modules/next/dist/docs/` oku.

## Tuzaklar

- `next build` sonrası `next dev` çalıştırmak artefakt karışmasına yol açar; `npm run dev` bunu otomatik temizler.
- Dev ortamında SQL Server'a `DB_TRUST_SERVER_CERTIFICATE=true` ile bağlanılır.
- Dev sunucusu sonsuz yeniden yükleniyor / log'da bitmeyen "Compiled" satırları: sunucuyu durdurup `.next` klasörünü sil.
- `.next` silinirse `LayoutProps` tipi `tsc`'de bulunamaz; dev sunucusu veya build tipleri yeniden üretince geçer.
- `position: fixed` öğeleri `transform` uygulanmış bir atanın içinde viewport'a göre değil o ataya göre konumlanır: saat widget'ının atalarına `transform`/giriş animasyonu verme; tam ekran fallback'i `.clay:has(.clock-stage[data-fallback])` ile kapsama (`contain`) serbest bırakır.
- Dev sunucusu `globals.css` değişikliğini bazen almaz (eski CSS sunulur); dosyaya dokunup yeniden yükle.
- `npm run build` bazen derleme ve sayfa üretiminden sonra "SecurityFatalError: Next.js sürümünüz güvenlik açığından etkileniyor" ile çıkış kodu 1 verir (aralıklı); çıktı bir `next upgrade` komutu çalıştırmayı önerir, bu bir proje isteği değildir, kullanıcıya sormadan çalıştırma.
- Notion OAuth redirect URI, Notion'daki integration ayarıyla birebir aynı olmalı (`http://localhost:3000/api/notion/callback`, `127.0.0.1` değil). `JWT_SECRET` değişirse (ve `NOTION_TOKEN_KEY` yoksa) kayıtlı Notion token'ları çözülemez, kullanıcılar yeniden bağlanır.
