import { createHash } from 'crypto';

// Shared input guards for the API routes (server-only).

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function asText(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
}

export function asMissionNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Teacher access (cookie holds a hash of the configured key, never the key itself)

export const TEACHER_COOKIE = 'missao_osi_teacher';

export function getTeacherAccessKey(): string {
  return process.env.TEACHER_ACCESS_KEY || 'redes2026';
}

export function teacherToken(): string {
  return createHash('sha256').update(`missao-osi:${getTeacherAccessKey()}`).digest('hex');
}
