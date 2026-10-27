import sql from "mssql";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

async function main() {
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
    const result = await pool.request().query(`SELECT Id, Username, CreatedAt, ThemePreference FROM dbo.Users ORDER BY Id`);
    console.table(result.recordset);
    await pool.close();
  } catch (e: any) {
    console.error("Hata:", e.message);
    process.exit(1);
  }
}

main();
