import sql from "mssql";

export type QueryParams = Record<string, unknown>;

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

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
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  pool = await new sql.ConnectionPool(config).connect();
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: QueryParams = {}
): Promise<T[]> {
  const p = await getPool();
  const request = p.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  const result = await request.query(text);
  return result.recordset as T[];
}

export async function execute(text: string, params: QueryParams = {}) {
  const p = await getPool();
  const request = p.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  const result = await request.query(text);
  return result;
}

export { sql };
