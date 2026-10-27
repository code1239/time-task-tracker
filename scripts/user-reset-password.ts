import sql from "mssql";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Kullanım: npm run user:reset-password -- <kullanıcıadı> <yenişifre>");
    process.exit(1);
  }
  const username = args[0];
  const password = args[1];

  const config: sql.config = {
    server: process.env.DB_SERVER || "localhost",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
    database: process.env.DB_NAME || "time_task_tracker",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
      encrypt: false,
    },
  };

  try {
    const pool = await new sql.ConnectionPool(config).connect();
    const hash = await bcrypt.hash(password, 10);
    const request = pool.request();
    request.input("username", sql.NVarChar(50), username);
    request.input("hash", sql.NVarChar(255), hash);
    const result = await request.query(`UPDATE dbo.Users SET PasswordHash = @hash WHERE Username = @username`);
    if (result.rowsAffected[0] === 0) {
      console.error("Kullanıcı bulunamadı.");
      process.exit(1);
    }
    console.log(`Şifre güncellendi: ${username}`);
    await pool.close();
  } catch (e: any) {
    console.error("Hata:", e.message);
    process.exit(1);
  }
}

main();
