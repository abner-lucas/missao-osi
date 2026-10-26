import type { Pool, RowDataPacket } from 'mysql2/promise';
import { LEGACY_TABLES } from './db-schema';
import { MISSIONS_CONFIG, calculateRubricScore } from './simulation-engine';

// One-time migration from the first schema (English table names, dates in UTC)
// into the Portuguese tables. Runs only while `student_profiles` exists; the old
// tables are dropped only after every row was copied.

const RUBRIC_TITLES: Record<string, string> = Object.fromEntries(
  Object.values(
    calculateRubricScore({ completedMissions: [], hypotheses: [], tests: [], savedConceptIds: [], consolidations: {} })
  ).map((c) => [c.criterionKey, c.title])
);

function testLabel(missionNumber: number, key: string): string {
  return MISSIONS_CONFIG[missionNumber]?.availableTests.find((t) => t.key === key)?.label || key;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Old rows were written in UTC; the pool now reads them as UTC-3, so shift back 3h.
function fixDate(value: unknown): Date | null {
  if (!(value instanceof Date) || isNaN(value.getTime())) return null;
  return new Date(value.getTime() - 3 * 60 * 60 * 1000);
}

export async function migrateLegacyTables(pool: Pool): Promise<void> {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles'`
  );
  if (existing.length === 0) return;

  const all = async (table: string) => {
    try {
      return (await pool.query<RowDataPacket[]>(`SELECT * FROM ${table}`))[0];
    } catch {
      return [] as RowDataPacket[];
    }
  };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const p of await all('student_profiles')) {
      await conn.execute(
        `INSERT IGNORE INTO alunos (id, nome_completo, turma, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)`,
        [p.id, p.full_name, p.class_name, fixDate(p.created_at), fixDate(p.updated_at)]
      );
    }

    for (const s of await all('activity_sessions')) {
      const done = parseJson<number[]>(s.completed_missions, []);
      await conn.execute(
        `INSERT IGNORE INTO sessoes
           (id, aluno_id, versao_atividade, etapa_atual, missoes_concluidas, qtd_missoes_concluidas, situacao, iniciada_em, ultima_atividade_em, concluida_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id, s.student_id, s.activity_version, s.current_stage, JSON.stringify(done), done.length, s.status,
          fixDate(s.started_at), fixDate(s.last_activity_at), fixDate(s.completed_at)
        ]
      );
    }

    for (const m of await all('mission_progress')) {
      const state = parseJson<any>(m.simulation_state, null);
      await conn.execute(
        `INSERT IGNORE INTO progresso_missoes
           (sessao_id, missao, situacao, problema_resolvido, estado_simulacao, iniciada_em, concluida_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.session_id, m.mission_number, m.status, state?.isResolved ? 1 : 0, JSON.stringify(state),
          fixDate(m.started_at) || fixDate(m.updated_at), fixDate(m.completed_at), fixDate(m.updated_at)
        ]
      );
    }

    for (const e of await all('investigation_entries')) {
      await conn.execute(
        `INSERT IGNORE INTO hipoteses (id, sessao_id, missao, enunciado, conceitos_relacionados, situacao, criada_em)
         VALUES (?, ?, ?, ?, ?, 'ativa', ?)`,
        [e.id, e.session_id, e.mission_number, e.content, JSON.stringify(parseJson(e.related_concepts, [])), fixDate(e.created_at)]
      );
    }

    for (const t of await all('test_executions')) {
      await conn.execute(
        `INSERT IGNORE INTO testes_executados
           (id, sessao_id, missao, codigo_teste, nome_teste, resultado_previsto, resultado_obtido, interpretacao, sucesso, executado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id, t.session_id, t.mission_number, t.test_key, testLabel(t.mission_number, t.test_key),
          t.predicted_result, t.actual_result, t.interpretation, t.success ? 1 : 0, fixDate(t.executed_at)
        ]
      );
    }

    for (const ev of await all('simulation_events')) {
      const state = parseJson<any>(ev.payload, null);
      await conn.execute(
        `INSERT INTO intervencoes (sessao_id, missao, codigo_intervencao, nome_intervencao, problema_resolvido, estado_simulacao, aplicada_em)
         VALUES (?, ?, NULL, NULL, ?, ?, ?)`,
        [ev.session_id, ev.mission_number, state?.isResolved ? 1 : 0, JSON.stringify(state), fixDate(ev.created_at)]
      );
    }

    for (const r of await all('student_responses')) {
      const data = parseJson<any>(r.answer_data, null);
      if (r.question_key === 'saved_atlas_concepts') {
        for (const id of data?.savedConceptIds || []) {
          await conn.execute(
            `INSERT IGNORE INTO conceitos_salvos (sessao_id, conceito_id, salvo_em) VALUES (?, ?, ?)`,
            [r.session_id, String(id), fixDate(r.updated_at)]
          );
        }
      } else if (r.question_key === 'mission_consolidation' && data) {
        await conn.execute(
          `INSERT IGNORE INTO consolidacoes
             (sessao_id, missao, causa_identificada, evidencias_utilizadas, camadas_relacionadas, justificativa, verificacao_confirmada, enviada_em, atualizada_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.session_id, r.mission_number, data.identifiedCause || null, JSON.stringify(data.evidenceUsed || []),
            JSON.stringify(data.relatedLayers || []), data.justificationText || '', data.verificationConfirmed ? 1 : 0,
            fixDate(r.submitted_at), fixDate(r.updated_at)
          ]
        );
      }
    }

    for (const sc of await all('assessment_scores')) {
      const reviewed = sc.grading_source === 'revisado_professor';
      const when = fixDate(sc.reviewed_at) || new Date();
      await conn.execute(
        `INSERT IGNORE INTO notas_rubrica
           (sessao_id, criterio, titulo_criterio, nota_automatica, nota_professor, nota_maxima, origem, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sc.session_id, sc.criterion_key, RUBRIC_TITLES[sc.criterion_key] || sc.criterion_key,
          reviewed ? 0 : sc.score, reviewed ? sc.score : null, sc.max_score, reviewed ? 'revisado_professor' : 'auto', when
        ]
      );
      if (sc.teacher_feedback || sc.reviewed_by) {
        await conn.execute(
          `INSERT IGNORE INTO avaliacoes_professor (sessao_id, parecer, avaliador, avaliado_em) VALUES (?, ?, ?, ?)`,
          [sc.session_id, sc.teacher_feedback, sc.reviewed_by, when]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    console.error('[MySQL] Migração das tabelas antigas falhou; nada foi removido:', err);
    return;
  } finally {
    conn.release();
  }

  for (const table of LEGACY_TABLES) {
    await pool.query(`DROP TABLE IF EXISTS ${table}`);
  }
  console.log('[MySQL] Tabelas antigas migradas para o schema em português.');
}
