import sql from "mssql";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { errorMessage } from "./utils";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ quiet: true });

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Kullanım: npm run user:create -- <kullanıcıadı> <şifre>");
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
    try {
      await request.query(`INSERT INTO dbo.Users (Username, PasswordHash) VALUES (@username, @hash)`);
      console.log(`Kullanıcı oluşturuldu: ${username}`);
    } catch (e) {
      if (errorMessage(e).includes("UNIQUE")) {
        console.error("Hata: Bu kullanıcı adı zaten mevcut.");
      } else {
        console.error("Hata:", errorMessage(e));
      }
      process.exit(1);
    }
    await pool.close();
  } catch (e) {
    console.error("Bağlantı hatası:", errorMessage(e));
    process.exit(1);
  }
}

main();
