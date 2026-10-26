import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { DEFAULT_CLASSES, getDb, isDatabaseConfigured } from '@/lib/db';
import { TEACHER_COOKIE, asText, teacherToken } from '@/lib/server-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Turma = { id: number; nome: string; alunos: number };

function isTeacher(request: NextRequest): boolean {
  return request.cookies.get(TEACHER_COOKIE)?.value === teacherToken();
}

function cleanName(value: unknown): string {
  return asText(value, 255).replace(/\s+/g, ' ').trim();
}

// Public: the access form lists these classes. Without a database, the original fixed list is used.
export async function GET() {
  if (!isDatabaseConfigured()) {
    const turmas: Turma[] = DEFAULT_CLASSES.map((nome, i) => ({ id: -(i + 1), nome, alunos: 0 }));
    return NextResponse.json({ ok: true, configured: false, turmas });
  }
  try {
    const db = await getDb();
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT t.id, t.nome, COUNT(a.id) AS alunos
       FROM turmas t LEFT JOIN alunos a ON a.turma = t.nome
       GROUP BY t.id, t.nome ORDER BY t.nome`
    );
    const turmas: Turma[] = rows.map((r) => ({ id: Number(r.id), nome: r.nome, alunos: Number(r.alunos) }));
    return NextResponse.json({ ok: true, configured: true, turmas });
  } catch (err) {
    console.error('[MySQL] Falha ao listar turmas:', err);
    return NextResponse.json({ ok: false, configured: true, turmas: [] }, { status: 503 });
  }
}

async function guard(request: NextRequest) {
  if (!isTeacher(request)) return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: 'Banco de dados não configurado' }, { status: 503 });
  return null;
}

const duplicate = (err: unknown) => (err as { code?: string })?.code === 'ER_DUP_ENTRY';

// Create
export async function POST(request: NextRequest) {
  const denied = await guard(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const nome = cleanName(body?.nome);
  if (nome.length < 2) return NextResponse.json({ ok: false, error: 'Informe o nome da turma.' }, { status: 400 });
  try {
    const db = await getDb();
    await db.execute('INSERT INTO turmas (nome, criada_em) VALUES (?, ?)', [nome, new Date()]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (duplicate(err)) return NextResponse.json({ ok: false, error: 'Já existe uma turma com esse nome.' }, { status: 409 });
    console.error('[MySQL] Falha ao criar turma:', err);
    return NextResponse.json({ ok: false, error: 'Falha ao gravar' }, { status: 500 });
  }
}

// Rename: students keep the class name as text, so their rows are renamed too
export async function PUT(request: NextRequest) {
  const denied = await guard(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const nome = cleanName(body?.nome);
  if (!Number.isInteger(id) || id <= 0 || nome.length < 2) {
    return NextResponse.json({ ok: false, error: 'Informe o novo nome da turma.' }, { status: 400 });
  }
  const db = await getDb();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [found] = await conn.query<RowDataPacket[]>('SELECT nome FROM turmas WHERE id = ? FOR UPDATE', [id]);
    if (found.length === 0) {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: 'Turma não encontrada.' }, { status: 404 });
    }
    const antigo = found[0].nome as string;
    await conn.execute('UPDATE turmas SET nome = ? WHERE id = ?', [nome, id]);
    await conn.execute('UPDATE alunos SET turma = ? WHERE turma = ?', [nome, antigo]);
    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    if (duplicate(err)) return NextResponse.json({ ok: false, error: 'Já existe uma turma com esse nome.' }, { status: 409 });
    console.error('[MySQL] Falha ao renomear turma:', err);
    return NextResponse.json({ ok: false, error: 'Falha ao gravar' }, { status: 500 });
  } finally {
    conn.release();
  }
}

// Delete: blocked while students are enrolled, so nobody is left without a class
export async function DELETE(request: NextRequest) {
  const denied = await guard(request);
  if (denied) return denied;
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false, error: 'Turma inválida.' }, { status: 400 });
  try {
    const db = await getDb();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(a.id) AS alunos FROM turmas t LEFT JOIN alunos a ON a.turma = t.nome WHERE t.id = ?',
      [id]
    );
    const alunos = Number(rows[0]?.alunos || 0);
    if (alunos > 0) {
      return NextResponse.json(
        { ok: false, error: `A turma tem ${alunos} ${alunos === 1 ? 'aluno' : 'alunos'}. Exclua ou renomeie antes de apagar.` },
        { status: 409 }
      );
    }
    await db.execute('DELETE FROM turmas WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MySQL] Falha ao excluir turma:', err);
    return NextResponse.json({ ok: false, error: 'Falha ao excluir' }, { status: 500 });
  }
}
