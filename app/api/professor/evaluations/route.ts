import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { fromDbJson, getDb, isDatabaseConfigured } from '@/lib/db';
import { TEACHER_COOKIE, asNumber, asText, isUuid, teacherToken } from '@/lib/server-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isTeacher(request: NextRequest): boolean {
  return request.cookies.get(TEACHER_COOKIE)?.value === teacherToken();
}

// Returns the tables the dashboards need, in the same snake_case shape the client maps.
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
    const query = async (sql: string, where: string) =>
      (await db.query<RowDataPacket[]>(sessionId ? `${sql} WHERE ${where} = ?` : sql, sessionId ? [sessionId] : []))[0];

    const [sessions, profiles, entries, tests, responses, scores] = await Promise.all([
      query('SELECT * FROM activity_sessions', 'id').then((rows) =>
        rows.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
      ),
      query(
        'SELECT p.* FROM student_profiles p' +
          (sessionId ? ' JOIN activity_sessions s ON s.student_id = p.id' : ''),
        's.id'
      ),
      query('SELECT * FROM investigation_entries', 'session_id'),
      query('SELECT * FROM test_executions', 'session_id'),
      query('SELECT * FROM student_responses', 'session_id'),
      query('SELECT * FROM assessment_scores', 'session_id')
    ]);

    return NextResponse.json({
      ok: true,
      configured: true,
      sessions: sessions.map((s) => ({ ...s, completed_missions: fromDbJson<number[]>(s.completed_missions, []) })),
      profiles,
      entries: entries.map((e) => ({ ...e, related_concepts: fromDbJson<string[]>(e.related_concepts, []) })),
      tests,
      responses: responses.map((r) => ({ ...r, answer_data: fromDbJson<unknown>(r.answer_data, null) })),
      scores
    });
  } catch (err) {
    console.error('[MySQL] Falha ao buscar avaliações:', err);
    return NextResponse.json({ ok: false, configured: true, error: 'Banco indisponível' }, { status: 503 });
  }
}

// Teacher review: overwrites the rubric rows with the teacher's scores and feedback.
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

  try {
    const db = await getDb();
    const reviewedAt = new Date(body.reviewedAt || Date.now());
    const reviewer = asText(body.reviewedBy, 255) || null;
    const feedback = asText(body.feedback, 10000) || null;

    for (const crit of body.criteria) {
      const key = asText(crit?.criterionKey, 64);
      if (!key) continue;
      const reviewed = crit.teacherScore !== undefined && crit.teacherScore !== null;
      await db.execute(
        `INSERT INTO assessment_scores
           (session_id, criterion_key, score, max_score, grading_source, teacher_feedback, reviewed_by, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           score = VALUES(score),
           max_score = VALUES(max_score),
           grading_source = VALUES(grading_source),
           teacher_feedback = VALUES(teacher_feedback),
           reviewed_by = VALUES(reviewed_by),
           reviewed_at = VALUES(reviewed_at)`,
        [
          body.sessionId,
          key,
          asNumber(reviewed ? crit.teacherScore : crit.autoScore),
          asNumber(crit.maxScore),
          reviewed ? 'revisado_professor' : 'auto',
          feedback,
          reviewer,
          reviewedAt
        ]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // errno 1452: the session was never synced (e.g. demo/seed students)
    console.error('[MySQL] Falha ao gravar avaliação docente:', err);
    return NextResponse.json({ ok: false, error: 'Falha ao gravar' }, { status: 500 });
  }
}
