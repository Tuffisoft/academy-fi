import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient } from "@neondatabase/serverless";
import { exchangeSchema } from "./schema";

export const onlineStorage = () => process.env.EXCHANGE_STORAGE === "postgres" || process.env.VERCEL === "1";
const context = new AsyncLocalStorage<PoolClient>();
const cache = globalThis as typeof globalThis & { exchangePool?: Pool; exchangeReady?: Promise<void> };
function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL fehlt für den Online-Speicher.");
  return cache.exchangePool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10_000 });
}
export async function transaction<T>(operation: () => Promise<T>, lock = 710061) {
  if (context.getStore()) return operation();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [lock]);
    const result = await context.run(client, operation);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}
export async function databaseReady() {
  cache.exchangeReady ??= transaction(async () => { await context.getStore()!.query(exchangeSchema); }, 710060).catch(error => {
    cache.exchangeReady = undefined;
    throw error;
  });
  await cache.exchangeReady;
}
export async function query<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> {
  const result = await (context.getStore() ?? pool()).query(sql, args);
  return result.rows as T[];
}
export async function closeExchangeDatabase() {
  await cache.exchangePool?.end();
  cache.exchangePool=undefined; cache.exchangeReady=undefined;
}
