import { NextResponse } from 'next/server';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getDb, isDatabaseConfigured, toDbDate, toDbDateOrNull, toDbJson } from '@/lib/db';
import { asMissionNumber, asNumber, asText, isUuid } from '@/lib/server-validation';
import { MISSIONS_CONFIG } from '@/lib/simulation-engine';
import { OSI_LAYERS_DATA } from '@/lib/atlas-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload = Record<string, any>;

const CONCEPTS = new Map(
  OSI_LAYERS_DATA.flatMap((layer) => layer.keyConcepts.map((c) => [c.id, { title: c.title, layer: layer.number }] as const))
);

function testLabel(missionNumber: number, key: string): string {
  return MISSIONS_CONFIG[missionNumber]?.availableTests.find((t) => t.key === key)?.label || key;
}

// Every request carries the active student + session so the parent rows always exist
// before the dependent insert (requests may arrive after a failed first sync).
async function upsertStudentAndSession(conn: PoolConnection, student: Payload, session: Payload): Promise<void> {
  await conn.execute(
    `INSERT INTO alunos (id, nome_completo, turma, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nome_completo = VALUES(nome_completo), turma = VALUES(turma), atualizado_em = VALUES(atualizado_em)`,
    [
      student.id,
      asText(student.fullName, 255, 'Estudante'),
      asText(student.className, 255, '1º Ano Informática'),
      toDbDate(student.createdAt),
      toDbDate(student.updatedAt)
    ]
  );

  const completed: number[] = Array.isArray(session.completedMissions)
    ? Array.from(new Set<number>(session.completedMissions.map(Number))).filter((n) => asMissionNumber(n) !== null)
    : [];

  await conn.execute(
    `INSERT INTO sessoes
       (id, aluno_id, versao_atividade, etapa_atual, missoes_concluidas, qtd_missoes_concluidas, situacao, iniciada_em, ultima_atividade_em, concluida_em)
     VALUES (?, ?, '1.0.0', ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       etapa_atual = VALUES(etapa_atual),
       missoes_concluidas = VALUES(missoes_concluidas),
       qtd_missoes_concluidas = VALUES(qtd_missoes_concluidas),
       situacao = VALUES(situacao),
       ultima_atividade_em = VALUES(ultima_atividade_em),
       concluida_em = VALUES(concluida_em)`,
    [
      session.id,
      student.id,
      asMissionNumber(session.currentStage) ?? 1,
      toDbJson(completed),
      completed.length,
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
  simulationState: any,
  completedAt: Date | null
): Promise<void> {
  const now = new Date();
  await conn.execute(
    `INSERT INTO progresso_missoes (sessao_id, missao, situacao, problema_resolvido, estado_simulacao, iniciada_em, concluida_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       situacao = IF(situacao = 'concluida', situacao, VALUES(situacao)),
       problema_resolvido = VALUES(problema_resolvido),
       estado_simulacao = VALUES(estado_simulacao),
       concluida_em = COALESCE(concluida_em, VALUES(concluida_em)),
       atualizado_em = VALUES(atualizado_em)`,
    [sessionId, missionNumber, status, simulationState?.isResolved ? 1 : 0, toDbJson(simulationState), now, completedAt, now]
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
        `INSERT INTO intervencoes (sessao_id, missao, codigo_intervencao, nome_intervencao, problema_resolvido, estado_simulacao, aplicada_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          mission,
          asText(data.interventionKey, 100) || null,
          asText(data.interventionLabel, 255) || null,
          data.simulationState?.isResolved ? 1 : 0,
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
        `INSERT IGNORE INTO hipoteses (id, sessao_id, missao, enunciado, conceitos_relacionados, situacao, criada_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          sessionId,
          mission,
          asText(data.statement, 5000),
          toDbJson(Array.isArray(data.selectedConceptIds) ? data.selectedConceptIds.map(String) : []),
          asText(data.status, 20) || 'ativa',
          toDbDate(data.createdAt)
        ]
      );
      return;
    }
    case 'test': {
      const mission = asMissionNumber(data.missionNumber);
      if (!mission || !isUuid(data.id)) return;
      const testKey = asText(data.testKey, 100);
      await conn.execute(
        `INSERT IGNORE INTO testes_executados
           (id, sessao_id, missao, codigo_teste, nome_teste, resultado_previsto, resultado_obtido, interpretacao, sucesso, executado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          sessionId,
          mission,
          testKey,
          asText(data.testName, 255) || testLabel(mission, testKey),
          asText(data.predictedResult, 5000),
          asText(data.actualResult, 5000),
          asText(data.interpretation, 5000) || null,
          data.success ? 1 : 0,
          toDbDate(data.executedAt)
        ]
      );
      return;
    }
    case 'interpretation': {
      if (!isUuid(data.testId)) return;
      await conn.execute(`UPDATE testes_executados SET interpretacao = ? WHERE id = ? AND sessao_id = ?`, [
        asText(data.interpretation, 5000) || null,
        data.testId,
        sessionId
      ]);
      return;
    }
    case 'concepts': {
      // The client sends the full current list: remove unchecked concepts, keep the original save date of the rest.
      const ids: string[] = Array.isArray(data.savedConceptIds)
        ? Array.from(new Set<string>(data.savedConceptIds.map((id: unknown) => asText(id, 100)))).filter(Boolean)
        : [];
      if (ids.length === 0) {
        await conn.execute(`DELETE FROM conceitos_salvos WHERE sessao_id = ?`, [sessionId]);
        return;
      }
      await conn.query(`DELETE FROM conceitos_salvos WHERE sessao_id = ? AND conceito_id NOT IN (?)`, [sessionId, ids]);
      for (const id of ids) {
        const concept = CONCEPTS.get(id);
        await conn.execute(
          `INSERT IGNORE INTO conceitos_salvos (sessao_id, conceito_id, titulo_conceito, camada_numero, salvo_em) VALUES (?, ?, ?, ?, ?)`,
          [sessionId, id, concept?.title ?? null, concept?.layer ?? null, new Date()]
        );
      }
      return;
    }
    case 'consolidation': {
      const c = data.consolidation;
      const mission = asMissionNumber(c?.missionNumber);
      if (!mission) return;
      const now = new Date();
      await conn.execute(
        `INSERT INTO consolidacoes
           (sessao_id, missao, causa_identificada, evidencias_utilizadas, camadas_relacionadas, justificativa, verificacao_confirmada, enviada_em, atualizada_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           causa_identificada = VALUES(causa_identificada),
           evidencias_utilizadas = VALUES(evidencias_utilizadas),
           camadas_relacionadas = VALUES(camadas_relacionadas),
           justificativa = VALUES(justificativa),
           verificacao_confirmada = VALUES(verificacao_confirmada),
           atualizada_em = VALUES(atualizada_em)`,
        [
          sessionId,
          mission,
          asText(c.identifiedCause, 5000) || null,
          toDbJson(Array.isArray(c.evidenceUsed) ? c.evidenceUsed : []),
          toDbJson(Array.isArray(c.relatedLayers) ? c.relatedLayers : []),
          asText(c.justificationText, 10000),
          c.verificationConfirmed ? 1 : 0,
          toDbDate(c.submittedAt || now),
          now
        ]
      );
      await upsertMissionProgress(conn, sessionId, mission, 'concluida', data.simulationState ?? null, now);
      return;
    }
    case 'rubric': {
      // Automatic scores only: the teacher's score column is never touched here.
      const criteria = Array.isArray(data.criteria) ? data.criteria : [];
      for (const crit of criteria) {
        const key = asText(crit?.criterionKey, 64);
        if (!key) continue;
        await conn.execute(
          `INSERT INTO notas_rubrica (sessao_id, criterio, titulo_criterio, nota_automatica, nota_maxima, origem, atualizado_em)
           VALUES (?, ?, ?, ?, ?, 'auto', ?)
           ON DUPLICATE KEY UPDATE
             titulo_criterio = VALUES(titulo_criterio),
             nota_automatica = VALUES(nota_automatica),
             nota_maxima = VALUES(nota_maxima),
             atualizado_em = VALUES(atualizado_em)`,
          [sessionId, key, asText(crit.title, 255) || key, asNumber(crit.autoScore), asNumber(crit.maxScore), new Date()]
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
    // Session deleted by the teacher: do not recreate it from the student's browser
    const [deleted] = await conn.query<RowDataPacket[]>('SELECT 1 FROM sessoes_excluidas WHERE sessao_id = ?', [session.id]);
    if (deleted.length > 0) {
      return NextResponse.json({ ok: false, error: 'Sessão excluída pelo professor' }, { status: 410 });
    }
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
