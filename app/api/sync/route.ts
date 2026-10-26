import { NextResponse } from 'next/server';
import type { PoolConnection } from 'mysql2/promise';
import { getDb, isDatabaseConfigured, toDbDate, toDbDateOrNull, toDbJson } from '@/lib/db';
import { asMissionNumber, asNumber, asText, isUuid } from '@/lib/server-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload = Record<string, any>;

// Every request carries the active student + session so the parent rows always exist
// before the dependent insert (requests may arrive after a failed first sync).
async function upsertStudentAndSession(conn: PoolConnection, student: Payload, session: Payload): Promise<void> {
  await conn.execute(
    `INSERT INTO student_profiles (id, full_name, class_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), class_name = VALUES(class_name), updated_at = VALUES(updated_at)`,
    [
      student.id,
      asText(student.fullName, 255, 'Estudante'),
      asText(student.className, 255, '1º Ano Informática'),
      toDbDate(student.createdAt),
      toDbDate(student.updatedAt)
    ]
  );

  const completed = Array.isArray(session.completedMissions)
    ? session.completedMissions.map(Number).filter((n: number) => asMissionNumber(n) !== null)
    : [];

  await conn.execute(
    `INSERT INTO activity_sessions
       (id, student_id, activity_version, current_stage, completed_missions, status, started_at, last_activity_at, completed_at)
     VALUES (?, ?, '1.0.0', ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       current_stage = VALUES(current_stage),
       completed_missions = VALUES(completed_missions),
       status = VALUES(status),
       last_activity_at = VALUES(last_activity_at),
       completed_at = VALUES(completed_at)`,
    [
      session.id,
      student.id,
      asMissionNumber(session.currentStage) ?? 1,
      toDbJson(completed),
      session.status === 'concluido' ? 'concluido' : 'em_andamento',
      toDbDate(session.startedAt),
      toDbDate(session.lastActivityAt),
      toDbDateOrNull(session.completedAt)
    ]
  );
}

async function upsertMissionProgress(
  conn: PoolConnection,
  sessionId: string,
  missionNumber: number,
  status: string,
  simulationState: unknown,
  completedAt: Date | null
): Promise<void> {
  await conn.execute(
    `INSERT INTO mission_progress (session_id, mission_number, status, simulation_state, completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       simulation_state = VALUES(simulation_state),
       completed_at = COALESCE(VALUES(completed_at), completed_at),
       updated_at = VALUES(updated_at)`,
    [sessionId, missionNumber, status, toDbJson(simulationState), completedAt, new Date()]
  );
}

async function upsertStudentResponse(
  conn: PoolConnection,
  sessionId: string,
  missionNumber: number,
  questionKey: string,
  answerData: unknown,
  submittedAt: Date
): Promise<void> {
  await conn.execute(
    `INSERT INTO student_responses (session_id, mission_number, question_key, answer_data, submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE answer_data = VALUES(answer_data), updated_at = VALUES(updated_at)`,
    [sessionId, missionNumber, questionKey, toDbJson(answerData), submittedAt, new Date()]
  );
}

async function applyOperation(conn: PoolConnection, op: string, sessionId: string, data: Payload): Promise<void> {
  switch (op) {
    case 'session': {
      const mission = asMissionNumber(data.missionNumber) ?? 1;
      await upsertMissionProgress(conn, sessionId, mission, 'em_investigacao', data.simulationState ?? null, null);
      return;
    }
    case 'simulation': {
      const mission = asMissionNumber(data.missionNumber);
      if (!mission) return;
      await upsertMissionProgress(
        conn,
        sessionId,
        mission,
        data.completed ? 'concluida' : 'em_investigacao',
        data.simulationState ?? null,
        null
      );
      await conn.execute(
        `INSERT INTO simulation_events (session_id, mission_number, event_key, payload, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          sessionId,
          mission,
          data.simulationState?.isResolved ? 'intervention_resolved' : 'state_updated',
          toDbJson(data.simulationState ?? null),
          new Date()
        ]
      );
      return;
    }
    case 'hypothesis': {
      const mission = asMissionNumber(data.missionNumber);
      if (!mission || !isUuid(data.id)) return;
      await conn.execute(
        `INSERT IGNORE INTO investigation_entries (id, session_id, mission_number, entry_type, content, related_concepts, created_at)
         VALUES (?, ?, ?, 'hipotese', ?, ?, ?)`,
        [
          data.id,
          sessionId,
          mission,
          asText(data.statement, 5000),
          toDbJson(Array.isArray(data.selectedConceptIds) ? data.selectedConceptIds : []),
          toDbDate(data.createdAt)
        ]
      );
      return;
    }
    case 'test': {
      const mission = asMissionNumber(data.missionNumber);
      if (!mission || !isUuid(data.id)) return;
      await conn.execute(
        `INSERT IGNORE INTO test_executions
           (id, session_id, mission_number, test_key, predicted_result, actual_result, interpretation, success, executed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          sessionId,
          mission,
          asText(data.testKey, 100),
          asText(data.predictedResult, 5000),
          asText(data.actualResult, 5000),
          asText(data.interpretation, 5000) || null,
          data.success ? 1 : 0,
          toDbDate(data.executedAt)
        ]
      );
      return;
    }
    case 'concepts': {
      const ids = Array.isArray(data.savedConceptIds) ? data.savedConceptIds.map(String) : [];
      await upsertStudentResponse(conn, sessionId, 1, 'saved_atlas_concepts', { savedConceptIds: ids }, new Date());
      return;
    }
    case 'consolidation': {
      const mission = asMissionNumber(data.consolidation?.missionNumber);
      if (!mission) return;
      const now = new Date();
      await upsertStudentResponse(
        conn,
        sessionId,
        mission,
        'mission_consolidation',
        data.consolidation,
        toDbDate(data.consolidation.submittedAt || now)
      );
      await upsertMissionProgress(conn, sessionId, mission, 'concluida', data.simulationState ?? null, now);
      return;
    }
    case 'rubric': {
      // Automatic scores only: rows already reviewed by the teacher are never overwritten here.
      const criteria = Array.isArray(data.criteria) ? data.criteria : [];
      for (const crit of criteria) {
        const key = asText(crit?.criterionKey, 64);
        if (!key) continue;
        await conn.execute(
          `INSERT INTO assessment_scores (session_id, criterion_key, score, max_score, grading_source)
           VALUES (?, ?, ?, ?, 'auto')
           ON DUPLICATE KEY UPDATE
             score = IF(grading_source = 'revisado_professor', score, VALUES(score)),
             max_score = VALUES(max_score)`,
          [sessionId, key, asNumber(crit.autoScore), asNumber(crit.maxScore)]
        );
      }
      return;
    }
    default:
      throw new Error(`Operação desconhecida: ${op}`);
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const { op, student, session, data } = body || {};
  if (
    typeof op !== 'string' ||
    !student ||
    !session ||
    !isUuid(student.id) ||
    !isUuid(session.id) ||
    session.studentId !== student.id
  ) {
    return NextResponse.json({ ok: false, error: 'Dados de sessão inválidos' }, { status: 400 });
  }

  const pool = await getDb().catch((err) => {
    console.error('[MySQL] Falha de conexão:', err);
    return null;
  });
  if (!pool) {
    return NextResponse.json({ ok: false, error: 'Banco indisponível' }, { status: 503 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await upsertStudentAndSession(conn, student, session);
    await applyOperation(conn, op, session.id, data || {});
    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    console.error(`[MySQL] Falha na operação "${op}":`, err);
    return NextResponse.json({ ok: false, error: 'Falha ao gravar' }, { status: 500 });
  } finally {
    conn.release();
  }
}
