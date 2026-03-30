import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

const pooledConnectionString = process.env.DATABASE_URL;
const directConnectionString = process.env.DIRECT_URL;
const connectionString =
  process.env.PRISMA_USE_DIRECT_URL === "true"
    ? directConnectionString ?? pooledConnectionString
    : pooledConnectionString ?? directConnectionString;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL (or DIRECT_URL) for Prisma");
}

function normalizePgConnectionString(raw: string) {
  try {
    const url = new URL(raw);
    // Prisma-specific query params that Postgres/pg may not understand.
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    url.searchParams.delete("pool_timeout");
    return url.toString();
  } catch {
    return raw;
  }
}

// PrismaPg creates a new pg.Pool when passed a PoolConfig. Cache an external pool
// to avoid creating many pools/connections in dev/HMR.
const poolMax =
  Number(process.env.PRISMA_PG_POOL_MAX) ||
  (process.env.NODE_ENV === "development" ? 1 : 5);

const pgPool =
  globalForPrisma.pgPool ??
  new pg.Pool({
    connectionString: normalizePgConnectionString(connectionString),
    max: poolMax,
  });

const adapter = new PrismaPg(pgPool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    adapter,
  });

// Last updated: 2026-03-31T03:55:00Z - Confirmed schema sync
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pgPool;
}
