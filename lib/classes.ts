'use client';

export type Turma = { id: number; nome: string; alunos: number };

export const FALLBACK_CLASSES = [
  '1º Ano Informática Integrado - Breves',
  'Turma A - Redes de Computadores',
  'Turma B - Redes de Computadores',
];

export async function fetchClasses(): Promise<{ turmas: Turma[]; controlled: boolean }> {
  try {
    const res = await fetch('/api/turmas', { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(payload?.turmas)) throw new Error('turmas');
    return { turmas: payload.turmas, controlled: Boolean(payload.configured) };
  } catch {
    return { turmas: FALLBACK_CLASSES.map((nome, i) => ({ id: -(i + 1), nome, alunos: 0 })), controlled: false };
  }
}

// Returns null on success, or the message to show the teacher.
async function send(method: 'POST' | 'PUT' | 'DELETE', body?: unknown, query = ''): Promise<string | null> {
  try {
    const res = await fetch(`/api/turmas${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return null;
    const payload = await res.json().catch(() => null);
    return payload?.error || 'Não foi possível salvar. Tente de novo.';
  } catch {
    return 'Sem conexão com o servidor. Tente de novo.';
  }
}

export const createClass = (nome: string) => send('POST', { nome });
export const renameClass = (id: number, nome: string) => send('PUT', { id, nome });
export const deleteClass = (id: number) => send('DELETE', undefined, `?id=${id}`);
