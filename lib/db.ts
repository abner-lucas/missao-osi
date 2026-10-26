import mysql from 'mysql2/promise';
import { SCHEMA_STATEMENTS } from './db-schema';
import { migrateLegacyTables } from './db-legacy-migration';
import { MISSIONS_CONFIG } from './simulation-engine';

// Server-only MySQL access (Hostinger). Never import this file from a 'use client' module.

// Datas gravadas e lidas no horário de Brasília (Pará não tem horário de verão)
export const DB_TIMEZONE = '-03:00';

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
      host: !process.env.DB_HOST || process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      timezone: DB_TIMEZONE,
      connectionLimit: 5,
      waitForConnections: true
    });
  }
  return globalForDb.missaoOsiPool;
}

async function seedMissions(pool: mysql.Pool): Promise<void> {
  for (const mission of Object.values(MISSIONS_CONFIG)) {
    await pool.execute(
      `INSERT INTO missoes (numero, titulo, camada_numero, camada_nome) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), camada_numero = VALUES(camada_numero), camada_nome = VALUES(camada_nome)`,
      [mission.missionNumber, mission.title, mission.layerNumber || null, mission.layerName || 'Integrada']
    );
  }
}

export const DEFAULT_CLASSES = [
  '1º Ano Informática Integrado - Breves',
  'Turma A - Redes de Computadores',
  'Turma B - Redes de Computadores',
];

// Only when the turmas table is created: the classes that used to be fixed in the access form
async function seedClasses(pool: mysql.Pool): Promise<void> {
  for (const nome of DEFAULT_CLASSES) {
    await pool.execute('INSERT IGNORE INTO turmas (nome, criada_em) VALUES (?, ?)', [nome, new Date()]);
  }
}

// Columns added after the first deploy: CREATE TABLE IF NOT EXISTS does not add them to existing tables.
const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ['missoes', 'disponivel', 'TINYINT(1) NOT NULL DEFAULT 1'],
  ['missoes', 'disponibilidade_alterada_em', 'DATETIME(3) NULL'],
];

async function addMissingColumns(pool: mysql.Pool): Promise<void> {
  for (const [table, column, definition] of ADDED_COLUMNS) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (rows.length === 0) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

async function tableExists(pool: mysql.Pool, table: string): Promise<boolean> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  return rows.length > 0;
}

async function createSchema(pool: mysql.Pool): Promise<void> {
  const classesTableIsNew = !(await tableExists(pool, 'turmas'));
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
  await addMissingColumns(pool);
  await seedMissions(pool);
  if (classesTableIsNew) await seedClasses(pool);
  await migrateLegacyTables(pool);
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
