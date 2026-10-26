import mysql from 'mysql2/promise';
import { SCHEMA_STATEMENTS } from './db-schema';

// Server-only MySQL access (Hostinger). Never import this file from a 'use client' module.

const globalForDb = globalThis as unknown as {
  missaoOsiPool?: mysql.Pool;
  missaoOsiSchemaReady?: Promise<void> | null;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DB_NAME && process.env.DB_USER);
}

function getPool(): mysql.Pool {
  if (!globalForDb.missaoOsiPool) {
    globalForDb.missaoOsiPool = mysql.createPool({
      // On Hostinger the app connects to MySQL on the same server via 127.0.0.1 (not localhost/IPv6).
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      timezone: 'Z',
      connectionLimit: 5,
      waitForConnections: true
    });
  }
  return globalForDb.missaoOsiPool;
}

async function createSchema(pool: mysql.Pool): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
}

// Returns the pool, creating the tables on first use.
export async function getDb(): Promise<mysql.Pool> {
  if (!isDatabaseConfigured()) {
    throw new Error('Banco de dados não configurado (defina DB_NAME, DB_USER e DB_PASSWORD).');
  }
  const pool = getPool();
  if (!globalForDb.missaoOsiSchemaReady) {
    globalForDb.missaoOsiSchemaReady = createSchema(pool).catch((err) => {
      globalForDb.missaoOsiSchemaReady = null;
      throw err;
    });
  }
  await globalForDb.missaoOsiSchemaReady;
  return pool;
}

export function toDbDate(value: unknown): Date {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : new Date();
  return isNaN(date.getTime()) ? new Date() : date;
}

export function toDbDateOrNull(value: unknown): Date | null {
  return value ? toDbDate(value) : null;
}

export function toDbJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

// MariaDB returns JSON columns as strings; MySQL returns parsed values.
export function fromDbJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}
