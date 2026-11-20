import sql from "mssql";

export type QueryParams = Record<string, unknown>;

// Cache the connection *promise* so concurrent first requests share one pool.
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    const config: sql.config = {
      server: process.env.DB_SERVER || "localhost",
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433,
      database: process.env.DB_NAME || "time_task_tracker",
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
        encrypt: false,
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };

    const pool = new sql.ConnectionPool(config);
    // Drop a broken pool so the next request reconnects.
    pool.on("error", () => {
      poolPromise = null;
    });
    poolPromise = pool.connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

async function run(text: string, params: QueryParams) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(text);
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: QueryParams = {}
): Promise<T[]> {
  const result = await run(text, params);
  return result.recordset as T[];
}

export async function execute(text: string, params: QueryParams = {}) {
  return run(text, params);
}

export { sql };
