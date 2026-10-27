# Zaman — Türkiye Saati, Görev Takibi ve Geri Sayım

Tek sayfalık, Türkçe arayüzlü bir zaman çalışma alanı. Türkiye saatini canlı gösterir,
günlük görev sayısını tutar, geçmişi grafikleştirir ve hedeflere kalan süreyi sayar.
Kullanıcılar birbirinden tamamen izole çalışır; kayıt ekranı yoktur, hesaplar yönetici
tarafından açılır.

## Özellikler

- **Türkiye Saati** — dijital (animasyonlu rakamlar) ve analog saat, Türkçe tarih.
  Saat dilimi her zaman `Europe/Istanbul` (UTC+3), cihazın diliminden bağımsız.
- **Yapılan Görev** — iyimser (optimistic) atomik sayaç, 00:00'da İstanbul gününe göre
  sıfırlanma, 7/30 günlük animasyonlu geçmiş grafiği, 5'in katlarında kutlama efekti.
- **Geri Sayım** — Türkiye saatine göre tarih/saat girişi, UTC olarak saklama,
  animasyonlu gün/saat/dakika/saniye, süresi dolmuş durumu ve temizleme.
- **Tema** — açık / koyu / sistem; kullanıcı bazında `Users.ThemePreference` ve
  `localStorage` ile kalıcı, ilk boyamada parlama yok, giriş sayfası da temayı izler.
- **Aurora cam arayüz** — CSS değişkenleri, cam efektleri, hareket azaltma desteği,
  sekme görünürlüğünde animasyon duraklatma, klavyeyle gezilebilir sekmeler.
- **Güvenlik** — bcrypt hash, httpOnly + SameSite=Lax JWT çerezi, giriş hız sınırı,
  parametreli sorgular, kısıtlı veritabanı kullanıcısı, kayıt ekranı yok.

## Teknolojiler

| Katman | Seçim |
| --- | --- |
| Çatı | Next.js 16 (App Router, TypeScript, Turbopack) |
| Stil | Tailwind CSS 4 + el yazımı CSS değişkenleri |
| Veritabanı | Microsoft SQL Server (`mssql` / `tedious`) |
| Kimlik | `bcryptjs` + `jose` (HS256 JWT) |
| Hareket | `motion`, `@number-flow/react`, `canvas-confetti` |
| Doğrulama | `zod` |
| Tarih | `date-fns-tz` + `Intl` |

## Gereksinimler

- Node.js **20.9+** (Node 24 önerilir)
- Erişilebilir bir SQL Server (2019/2022; yerel, uzak veya Docker)
- SQL Authentication açık olmalı ve yönetici (ör. `sa`) bağlantısı yapılabilmeli

## Hızlı Başlangıç

```bash
npm install

# 1) Ortam değişkenlerini hazırla
cp .env.example .env.local
cp .env.example .env

# 2) .env.local içinde DB_ADMIN_USER / DB_ADMIN_PASSWORD ve JWT_SECRET doldur
#    (JWT_SECRET için: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")

# 3) Veritabanını kur (idempotent — tekrar çalıştırılabilir)
npm run db:setup

# 4) Kullanıcı oluştur
npm run user:create -- ayse "GucluBirSifre!"

# 5) Geliştirme sunucusu
npm run dev
```

`http://localhost:3000` adresinde giriş ekranı açılır.

### Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `DB_SERVER` | SQL Server adresi. Yerelde `localhost`, Docker'da `host.docker.internal` (veya `db`). |
| `DB_PORT` | SQL Server portu, varsayılan `1433`. |
| `DB_NAME` | Veritabanı adı, varsayılan `time_task_tracker`. |
| `DB_USER` | Uygulamanın kullandığı kısıtlı SQL login'i. |
| `DB_PASSWORD` | Uygulama login'inin şifresi. Boşsa `db:setup` üretir ve `.env.local`'e yazar. |
| `DB_TRUST_SERVER_CERTIFICATE` | Geliştirmede self-signed sertifika için `true`. |
| `DB_ADMIN_USER` | **Yalnızca kurulum scriptleri** için yönetici kullanıcı. Uygulamaya/Docker'a verilmez. |
| `DB_ADMIN_PASSWORD` | **Yalnızca kurulum scriptleri** için yönetici şifresi. |
| `JWT_SECRET` | Oturum imzalama anahtarı (en az 32 baytlık rastgele değer). |
| `COOKIE_SECURE` | HTTPS arkasında `true`; yerel HTTP geliştirmede `false`. |

> `.env.local` yerel geliştirme ve scriptler içindir; `.env` ise Docker Compose'un
> `env_file` kaynağıdır. İki dosya da `.gitignore` kapsamındadır — **asla commit etmeyin**.
> Next.js `.env.local`'i `.env`'den önce okur.

### `db:setup` ne yapar?

1. Yönetici hesabıyla `master` veritabanına bağlanır.
2. `DB_NAME` yoksa oluşturur.
3. `DB_USER` login'ini oluşturur veya şifresini günceller.
4. Veritabanında kullanıcıyı oluşturur ve yalnızca `db_datareader` + `db_datawriter`
   rollerine ekler (DDL yetkisi vermez).
5. `Users`, `DailyTaskCounts`, `Countdowns` tablolarını ve indekslerini oluşturur.
6. `DB_PASSWORD` boşsa güvenli bir şifre üretip `.env.local`'e yazar.

Script idempotenttir; tekrar çalıştırmak veriyi silmez.

### Kullanıcı yönetimi

Kayıt (register) ekranı yoktur. Kullanıcılar terminalden yönetilir:

```bash
npm run user:create -- <kullaniciadi> <sifre>
npm run user:reset-password -- <kullaniciadi> <yeniSifre>
npm run user:list
```

Şifreler bcrypt (10 tur) ile hash'lenir. Kullanıcı adı benzersizdir.

## Docker

```bash
# Ana makinede çalışan SQL Server'a bağlanarak uygulamayı ayağa kaldır
docker compose up --build -d

# Günlükler
docker compose logs -f app

# Durdur
docker compose down
```

- Compose, uygulama ortamını `.env` dosyasından okur. Docker imajına `.env*`
  dosyaları **kopyalanmaz**.
- Konteyner içinden ana makinedeki SQL Server'a erişim `host.docker.internal`
  üzerinden sağlanır (`extra_hosts: host.docker.internal:host-gateway`).
- İmaj çok aşamalıdır, `standalone` çıktısı kullanır ve `nextjs` (UID 1001) adlı
  kök olmayan kullanıcıyla çalışır.
- Sağlık kontrolü `GET /api/health` üzerinden yapılır.

### Ana makinedeki SQL Server'a erişim

- SQL Server TCP/IP dinlemeli ve 1433 portu güvenlik duvarında açık olmalı.
- Windows'ta SQL Server Configuration Manager → *SQL Server Network Configuration* →
  *Protocols* → **TCP/IP = Enabled**, IPAll → **TCP Port = 1433**.
- Docker Desktop kullanılıyorsa `host.docker.internal` otomatik çözümlenir.
  Linux'ta compose dosyasındaki `extra_hosts` bunu sağlar.
- SQL Server yalnızca `127.0.0.1`'e bağlıysa konteynerden erişilemez; `0.0.0.0`
  dinlemesi veya ayrı bir konteyner gerekir.

### İsteğe bağlı `db` profili

Depoda hazır bir SQL Server servisi vardır ancak varsayılan olarak **kapalıdır**.
Ana makinede 1433 dolu olabileceği için host portu **14333**'tür.

```bash
# PowerShell
$env:DB_ADMIN_PASSWORD = "GucluBirSAParolasi!"
docker compose --profile db up -d db

# Kurulumu konteynerdeki SQL'e yap (host portu 14333)
npm run db:setup   # .env.local içinde DB_SERVER=localhost, DB_PORT=14333 olmalı

# Uygulamayı compose ağından db servisine bağla
$env:DB_SERVER = "db"; $env:DB_PORT = "1433"
docker compose up --build -d
```

> `.env.local` (host/scriptler) ile `.env` (Compose uygulaması) farklı `DB_SERVER`
> değerleri taşıyabilir: host'tan `localhost:14333`, konteynerden `db:1433`.

## Zaman ve gün dönümü davranışı

- Günlük sayaç anahtarı `(UserId, CountDate)`'tir ve `CountDate` **İstanbul** günüdür.
- Gece 00:00 (UTC+3) geçildiğinde istemci yeni günü algılar, sayaç sıfırdan okunur;
  sunucu da her istekte tarihi yeniden hesapladığı için istemci kapalı olsa bile
  yeni gün 0'dan başlar.
- Geri sayım girişi İstanbul saatiyle yorumlanır, UTC'ye çevrilip `DATETIME2` olarak
  saklanır; gösterim yine Türkçe yerel biçimdedir.
- `Count >= 0` veritabanı seviyesinde kısıtlanmıştır; azaltma 0'ın altına inmez.

## API

Tüm veri uçları oturum çerezini doğrular; kullanıcı kimliği sunucuda çerezden
okunur, istemciden `userId` kabul edilmez.

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Giriş; 5 deneme/dakika hız sınırı |
| `POST` | `/api/auth/logout` | Çıkış |
| `GET` | `/api/auth/me` | Oturum bilgisi |
| `GET` | `/api/tasks/today` | Bugünkü görev sayısı (İstanbul günü) |
| `POST` | `/api/tasks/update` | `{ delta }` ile atomik artır/azalt |
| `GET` | `/api/tasks/history?days=7\|30` | Günlük geçmiş, boş günler 0 |
| `GET/POST/DELETE` | `/api/countdown` | Kullanıcının tek geri sayımı |
| `GET/POST` | `/api/theme` | Tema tercihi |
| `GET` | `/api/health` | Docker sağlık kontrolü (kimlik gerektirmez) |

## Klasör yapısı

```
app/
  api/               route handler'lar
  login/             giriş sayfası
  globals.css        tasarım token'ları, aurora, cam, hareket
  layout.tsx         tema başlatma, fontlar, arka plan
components/          dashboard, sekmeler, saat, sayaç, grafik, geri sayım
lib/                 db, auth, tarih yardımcıları, useNow
scripts/             db-setup, user-create/reset/list
proxy.ts             Next.js 16 proxy (oturum koruması)
docker-compose.yml   app + isteğe bağlı db profili
```

## Sorun giderme

| Belirti | Çözüm |
| --- | --- |
| `Yönetici bağlantısı başarısız` | SQL Server çalışıyor mu, TCP/IP açık mı, 1433 erişilebilir mi, `DB_*` doğru mu? |
| `ENOTFOUND host.docker.internal` (scriptler) | Scriptler `.env.local` okur; orada `DB_SERVER=localhost` olmalı. |
| Docker'da uygulama DB'ye ulaşamıyor | `DB_SERVER=host.docker.internal`, güvenlik duvarı 1433, SQL Server'ın `0.0.0.0` dinlemesi. |
| `db` profili başlamıyor | `DB_ADMIN_PASSWORD` tanımlı olmalı; host portu 1433 doluysa 14333 kullanılır. |
| Girişte 401 | Kullanıcı adı/şifre; hesap `user:create` ile açılmış mı? |
| Tema diğer kullanıcıdan kaldı | Giriş sonrası sunucudan gelen tercih uygulanır; sayfayı yenileyin. |
| Sayfa sürekli kendini yeniliyor | `next build` sonrası dev'e geçildiyse `.next` karışmış olabilir. `npm run dev` artık üretim `BUILD_ID`'sini görüp `.next`'i kendisi temizler. Tarayıcıda sekmeyi kapatıp yeniden açın (Ctrl+Shift+R). |
| Saat yanlış | Saat dilimi sabittir; cihaz saati yanlışsa dijital saat de yanlış görünür. |

## Güvenlik notları

- Yönetici kimlik bilgileri yalnızca `scripts/` tarafından okunur; uygulama kodu ve
  Docker imajı bu değerleri görmez.
- Tüm sorgular parametrelidir. Tanımlayıcılar (DB/kullanıcı adı) desenle doğrulanır.
- Oturum çerezi `httpOnly`, `SameSite=Lax`, 7 gün; üretimde `COOKIE_SECURE=true` kullanın.
- Giriş denemeleri IP başına dakikada 5 ile sınırlıdır.
- Üretimde TLS sonlandırmayı ters vekil (reverse proxy) ile yapın.
