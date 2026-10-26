import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { fromDbJson, getDb, isDatabaseConfigured } from '@/lib/db';
import { TEACHER_COOKIE, asNumber, asText, isUuid, teacherToken } from '@/lib/server-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isTeacher(request: NextRequest): boolean {
  return request.cookies.get(TEACHER_COOKIE)?.value === teacherToken();
}

// Returns the Portuguese tables the dashboards need (mapped on the client by lib/storage.ts).
// Teacher (cookie): every session. Student: only `?sessionId=<own session uuid>`.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (sessionId !== null ? !isUuid(sessionId) : !isTeacher(request)) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  try {
    const db = await getDb();
    const query = async (sql: string, column: string) =>
      (await db.query<RowDataPacket[]>(sessionId ? `${sql} WHERE ${column} = ?` : sql, sessionId ? [sessionId] : []))[0];

    const [sessoes, alunos, hipoteses, testes, consolidacoes, conceitos, notas, avaliacoes] = await Promise.all([
      query('SELECT * FROM sessoes', 'id').then((rows) =>
        rows.sort((a, b) => new Date(b.ultima_atividade_em).getTime() - new Date(a.ultima_atividade_em).getTime())
      ),
      query('SELECT a.* FROM alunos a' + (sessionId ? ' JOIN sessoes s ON s.aluno_id = a.id' : ''), 's.id'),
      query('SELECT * FROM hipoteses', 'sessao_id'),
      query('SELECT * FROM testes_executados', 'sessao_id'),
      query('SELECT * FROM consolidacoes', 'sessao_id'),
      query('SELECT * FROM conceitos_salvos', 'sessao_id'),
      query('SELECT * FROM notas_rubrica', 'sessao_id'),
      query('SELECT * FROM avaliacoes_professor', 'sessao_id')
    ]);

    return NextResponse.json({
      ok: true,
      configured: true,
      sessoes: sessoes.map((s) => ({ ...s, missoes_concluidas: fromDbJson<number[]>(s.missoes_concluidas, []) })),
      alunos,
      hipoteses: hipoteses.map((h) => ({ ...h, conceitos_relacionados: fromDbJson<string[]>(h.conceitos_relacionados, []) })),
      testes,
      consolidacoes: consolidacoes.map((c) => ({
        ...c,
        evidencias_utilizadas: fromDbJson<string[]>(c.evidencias_utilizadas, []),
        camadas_relacionadas: fromDbJson<number[]>(c.camadas_relacionadas, [])
      })),
      conceitos,
      notas,
      avaliacoes
    });
  } catch (err) {
    console.error('[MySQL] Falha ao buscar avaliações:', err);
    return NextResponse.json({ ok: false, configured: true, error: 'Banco indisponível' }, { status: 503 });
  }
}

// Teacher review: stores the teacher's score per criterion (keeping the automatic one) and the general feedback.
export async function POST(request: NextRequest) {
  if (!isTeacher(request)) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !isUuid(body.sessionId) || !Array.isArray(body.criteria)) {
    return NextResponse.json({ ok: false, error: 'Dados inválidos' }, { status: 400 });
  }

  const db = await getDb().catch(() => null);
  if (!db) {
    return NextResponse.json({ ok: false, error: 'Banco indisponível' }, { status: 503 });
  }

  const conn = await db.getConnection();
  try {
    const [found] = await conn.query<RowDataPacket[]>('SELECT id FROM sessoes WHERE id = ?', [body.sessionId]);
    if (found.length === 0) {
      // Demo/seed students exist only in the browser
      return NextResponse.json({ ok: false, error: 'Sessão não encontrada no banco' }, { status: 404 });
    }

    const reviewedAt = new Date(body.reviewedAt || Date.now());
    await conn.beginTransaction();

    for (const crit of body.criteria) {
      const key = asText(crit?.criterionKey, 64);
      if (!key) continue;
      const reviewed = crit.teacherScore !== undefined && crit.teacherScore !== null;
      await conn.execute(
        `INSERT INTO notas_rubrica (sessao_id, criterio, titulo_criterio, nota_automatica, nota_professor, nota_maxima, origem, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           titulo_criterio = VALUES(titulo_criterio),
           nota_automatica = VALUES(nota_automatica),
           nota_professor = VALUES(nota_professor),
           nota_maxima = VALUES(nota_maxima),
           origem = VALUES(origem),
           atualizado_em = VALUES(atualizado_em)`,
        [
          body.sessionId,
          key,
          asText(crit.title, 255) || key,
          asNumber(crit.autoScore),
          reviewed ? asNumber(crit.teacherScore) : null,
          asNumber(crit.maxScore),
          reviewed ? 'revisado_professor' : 'auto',
          reviewedAt
        ]
      );
    }

    await conn.execute(
      `INSERT INTO avaliacoes_professor (sessao_id, parecer, avaliador, avaliado_em) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE parecer = VALUES(parecer), avaliador = VALUES(avaliador), avaliado_em = VALUES(avaliado_em)`,
      [body.sessionId, asText(body.feedback, 10000) || null, asText(body.reviewedBy, 255) || null, reviewedAt]
    );

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    console.error('[MySQL] Falha ao gravar avaliação docente:', err);
    return NextResponse.json({ ok: false, error: 'Falha ao gravar' }, { status: 500 });
  } finally {
    conn.release();
  }
}
