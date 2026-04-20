import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
  prismaArtifactMark: string | undefined;
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

// AWS Lambda → RDS: Node.js doesn't trust Amazon's CA by default.
// SSL is still used (encrypted); only certificate chain verification is skipped.
// Scoped to RDS hostnames so external API calls are unaffected.
if (connectionString.includes("rds.amazonaws.com")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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

/** Changes after `prisma generate`; used to drop a stale cached PrismaClient (e.g. dev HMR). */
function readPrismaClientArtifactMark(): string {
  try {
    const schemaPath = path.join(
      process.cwd(),
      "node_modules",
      ".prisma",
      "client",
      "schema.prisma",
    );
    const stat = fs.statSync(schemaPath);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return "0";
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

function createPrisma(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    adapter,
  });
}

function getPrisma(): PrismaClient {
  const mark = readPrismaClientArtifactMark();
  if (globalForPrisma.prisma && globalForPrisma.prismaArtifactMark === mark) {
    return globalForPrisma.prisma;
  }
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  const client = createPrisma();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaArtifactMark = mark;
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pgPool;
  }
  return client;
}

/**
 * Lazy singleton: after `prisma generate`, the next access sees an updated artifact mark,
 * disconnects the old client, and builds a new one (avoids UNKNOWN_ARGUMENT on new fields until full dev restart).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
