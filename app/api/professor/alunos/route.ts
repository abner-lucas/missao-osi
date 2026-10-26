import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { TEACHER_COOKIE, isUuid, teacherToken } from '@/lib/server-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deletes a student's session and everything recorded in it (foreign keys cascade to
// progress, hypotheses, tests, interventions, consolidations, concepts, scores and review).
// The student row goes too when no other session belongs to it.
export async function DELETE(request: NextRequest) {
  if (request.cookies.get(TEACHER_COOKIE)?.value !== teacherToken()) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!isUuid(sessionId)) {
    return NextResponse.json({ ok: false, error: 'Sessão inválida' }, { status: 400 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const db = await getDb();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [found] = await conn.query<RowDataPacket[]>(
      'SELECT s.aluno_id, a.nome_completo FROM sessoes s JOIN alunos a ON a.id = s.aluno_id WHERE s.id = ?',
      [sessionId]
    );
    // Tombstone even when nothing is stored yet, so a later sync from the student's browser is refused
    await conn.execute(
      'INSERT IGNORE INTO sessoes_excluidas (sessao_id, aluno_nome, excluida_em) VALUES (?, ?, ?)',
      [sessionId, found[0]?.nome_completo ?? null, new Date()]
    );
    if (found.length > 0) {
      const alunoId = found[0].aluno_id as string;
      await conn.execute('DELETE FROM sessoes WHERE id = ?', [sessionId]);
      await conn.execute('DELETE FROM alunos WHERE id = ? AND NOT EXISTS (SELECT 1 FROM sessoes WHERE aluno_id = ?)', [alunoId, alunoId]);
    }
    await conn.commit();
    return NextResponse.json({ ok: true, configured: true });
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    console.error('[MySQL] Falha ao excluir aluno:', err);
    return NextResponse.json({ ok: false, error: 'Falha ao excluir' }, { status: 500 });
  } finally {
    conn.release();
  }
}
