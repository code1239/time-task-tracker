import sql from "mssql";
import dotenv from "dotenv";
import path from "path";
import { errorMessage, generatePassword, updateEnvLocal } from "./utils";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ quiet: true });

async function main() {
  const adminUser = process.env.DB_ADMIN_USER;
  const adminPass = process.env.DB_ADMIN_PASSWORD;
  const dbServer = process.env.DB_SERVER || "localhost";
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433;
  const dbName = process.env.DB_NAME || "time_task_tracker";
  const trust = process.env.DB_TRUST_SERVER_CERTIFICATE === "true";

  if (!adminUser || !adminPass) {
    console.error("Hata: DB_ADMIN_USER ve DB_ADMIN_PASSWORD .env.local/.env içinde tanımlı olmalı.");
    process.exit(1);
  }

  const appUser = process.env.DB_USER || "ttt_app";
  let appPass = process.env.DB_PASSWORD;

  // Identifiers cannot be parameterized in T-SQL, so restrict them to a safe set.
  const safeIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (!safeIdentifier.test(dbName) || !safeIdentifier.test(appUser)) {
    console.error("Hata: DB_NAME ve DB_USER yalnızca harf, rakam ve alt çizgi içerebilir.");
    process.exit(1);
  }

  if (!appPass) {
    appPass = generatePassword(32);
    updateEnvLocal("DB_USER", appUser);
    updateEnvLocal("DB_PASSWORD", appPass);
    console.log(`DB_PASSWORD .env.local dosyasına yazıldı (kullanıcı: ${appUser})`);
  }

  // Connect to master as admin
  const masterConfig: sql.config = {
    server: dbServer,
    port: dbPort,
    database: "master",
    user: adminUser,
    password: adminPass,
    options: { trustServerCertificate: trust, encrypt: false },
  };

  let masterPool: sql.ConnectionPool;
  try {
    masterPool = await new sql.ConnectionPool(masterConfig).connect();
  } catch (e) {
    console.error("Yönetici bağlantısı başarısız.");
    console.error("Lütfen şunları kontrol edin:");
    console.error("- SQL Server çalışıyor mu?");
    console.error("- TCP/IP etkin mi (SQL Server Configuration Manager)?");
    console.error("- SQL Authentication etkin mi?");
    console.error("- Güvenlik duvarı 1433 portunu açtı mı?");
    console.error("- DB_SERVER/DB_PORT doğru mu?");
    console.error(`Hata: ${errorMessage(e)}`);
    process.exit(1);
  }

  try {
    // Create database if not exists
    await masterPool.request().query(`
      IF DB_ID('${dbName}') IS NULL
      BEGIN
        CREATE DATABASE [${dbName}];
      END
    `);
    console.log(`Veritabanı hazır: ${dbName}`);

    // Create login if not exists
    await masterPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'${appUser.replace(/'/g, "''")}')
      BEGIN
        CREATE LOGIN [${appUser}] WITH PASSWORD = N'${appPass.replace(/'/g, "''")}', CHECK_POLICY = OFF;
      END
      ELSE
      BEGIN
        ALTER LOGIN [${appUser}] WITH PASSWORD = N'${appPass.replace(/'/g, "''")}';
      END
    `);
    console.log(`SQL login hazır: ${appUser}`);

    await masterPool.close();
  } catch (e) {
    console.error("Veritabanı/login oluşturma hatası:", errorMessage(e));
    process.exit(1);
  }

  // Connect to target DB
  const dbConfig: sql.config = {
    server: dbServer,
    port: dbPort,
    database: dbName,
    user: adminUser,
    password: adminPass,
    options: { trustServerCertificate: trust, encrypt: false },
  };

  let dbPool: sql.ConnectionPool;
  try {
    dbPool = await new sql.ConnectionPool(dbConfig).connect();
  } catch (e) {
    console.error("Hedef veritabanına bağlantı hatası:", errorMessage(e));
    process.exit(1);
  }

  try {
    // Create user and grant permissions
    await dbPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'${appUser.replace(/'/g, "''")}')
      BEGIN
        CREATE USER [${appUser}] FOR LOGIN [${appUser}];
      END
      ALTER ROLE db_datareader ADD MEMBER [${appUser}];
      ALTER ROLE db_datawriter ADD MEMBER [${appUser}];
    `);
    console.log("Veritabanı kullanıcısı ve yetkileri ayarlandı (db_datareader, db_datawriter)");

    // Create tables
    await dbPool.request().query(`
      IF OBJECT_ID('dbo.Users', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Users (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          Username NVARCHAR(50) NOT NULL UNIQUE,
          PasswordHash NVARCHAR(255) NOT NULL,
          ThemePreference NVARCHAR(10) NULL CHECK (ThemePreference IN ('light','dark','system')),
          CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
        CREATE INDEX IX_Users_Username ON dbo.Users(Username);
      END
    `);

    await dbPool.request().query(`
      IF OBJECT_ID('dbo.DailyTaskCounts', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.DailyTaskCounts (
          UserId INT NOT NULL,
          CountDate DATE NOT NULL,
          Count INT NOT NULL CHECK (Count >= 0),
          CONSTRAINT PK_DailyTaskCounts PRIMARY KEY (UserId, CountDate),
          CONSTRAINT FK_DailyTaskCounts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
        );
        CREATE INDEX IX_DailyTaskCounts_UserId_CountDate ON dbo.DailyTaskCounts(UserId, CountDate);
      END
    `);

    await dbPool.request().query(`
      IF OBJECT_ID('dbo.NotionConnections', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.NotionConnections (
          UserId INT NOT NULL PRIMARY KEY,
          AccessCipher NVARCHAR(MAX) NOT NULL,
          WorkspaceName NVARCHAR(200) NULL,
          PageId NVARCHAR(64) NULL,
          PageTitle NVARCHAR(300) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT FK_NotionConnections_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
        );
      END
    `);

    await dbPool.request().query(`
      IF OBJECT_ID('dbo.Topics', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Topics (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          UserId INT NOT NULL,
          Name NVARCHAR(40) NOT NULL,
          Emoji NVARCHAR(16) NOT NULL,
          ColorSlot TINYINT NOT NULL CHECK (ColorSlot BETWEEN 1 AND 8),
          SortOrder INT NOT NULL DEFAULT 0,
          ArchivedAt DATETIME2 NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT FK_Topics_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
          CONSTRAINT UQ_Topics_UserId_Name UNIQUE (UserId, Name)
        );
      END
    `);

    // TopicId has no cascade: SQL Server rejects multiple cascade paths from Users.
    // Topics are archived, never deleted, so sessions always keep their topic.
    await dbPool.request().query(`
      IF OBJECT_ID('dbo.FocusSessions', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.FocusSessions (
          Id BIGINT IDENTITY(1,1) PRIMARY KEY,
          UserId INT NOT NULL,
          TopicId INT NOT NULL,
          Title NVARCHAR(200) NULL,
          StartedAt DATETIME2 NOT NULL,
          EndedAt DATETIME2 NULL,
          Completed BIT NOT NULL DEFAULT 0,
          Source NVARCHAR(10) NOT NULL DEFAULT 'timer' CHECK (Source IN ('timer','manual')),
          CONSTRAINT FK_FocusSessions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
          CONSTRAINT FK_FocusSessions_Topics FOREIGN KEY (TopicId) REFERENCES dbo.Topics(Id),
          CONSTRAINT CK_FocusSessions_Range CHECK (EndedAt IS NULL OR EndedAt >= StartedAt)
        );
        CREATE INDEX IX_FocusSessions_UserId_StartedAt ON dbo.FocusSessions(UserId, StartedAt);
        CREATE UNIQUE INDEX UX_FocusSessions_Running ON dbo.FocusSessions(UserId) WHERE EndedAt IS NULL;
      END
    `);

    // Timed focus sessions count down from this many minutes (NULL = open-ended).
    await dbPool.request().query(`
      IF COL_LENGTH('dbo.FocusSessions', 'PlannedMinutes') IS NULL
        ALTER TABLE dbo.FocusSessions ADD PlannedMinutes INT NULL;
    `);

    console.log("Tüm tablolar hazır.");
    await dbPool.close();
    console.log("Kurulum tamamlandı.");
  } catch (e) {
    console.error("Tablo oluşturma hatası:", errorMessage(e));
    process.exit(1);
  }
}

main();
