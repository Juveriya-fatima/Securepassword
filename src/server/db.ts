import { Pool, type QueryResultRow } from "pg";
import { env } from "./env";

// A single pool is reused across requests/hot-reloads. Every query below uses
// parameterized placeholders ($1, $2, ...) — never string-concatenated SQL —
// so user input can't change query structure (SQL injection protection).
declare global {
  // eslint-disable-next-line no-var
  var __securepassPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: env.databaseUrl,
    max: 10,
  });
}

export const pool = globalThis.__securepassPool ?? createPool();
if (!env.isProduction) {
  globalThis.__securepassPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return pool.query<T>(text, params);
}
