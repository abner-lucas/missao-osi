'use client';

import {
  StudentProfile,
  ActivitySession,
  EvidenceNotebook,
  MissionSimulationState,
  InvestigationHypothesis,
  TestExecutionRecord,
  MissionConsolidation,
  StudentFullEvaluation,
  RubricCriteriaScore
} from './types';
import { MISSIONS_CONFIG, calculateRubricScore, getTotalScore } from './simulation-engine';
import { supabase, isSupabaseConfigured } from './supabase-client';

const STORAGE_KEYS = {
  CURRENT_STUDENT: 'missao_osi_current_student',
  CURRENT_SESSION: 'missao_osi_current_session',
  SIMULATION_STATES: 'missao_osi_sim_states',
  EVIDENCE_NOTEBOOK: 'missao_osi_evidence_notebook',
  ALL_STUDENTS_REGISTRY: 'missao_osi_all_students_registry',
  TEACHER_EVALUATIONS: 'missao_osi_teacher_evaluations',
  REDUCED_MOTION: 'missao_osi_reduced_motion'
};

// Seed demo data for the teacher dashboard
const DEFAULT_STUDENT_SEEDS: StudentFullEvaluation[] = [
  {
    sessionId: 'sess-seed-01',
    student: {
      id: 'stud-seed-01',
      fullName: 'Mariana Santos Pinheiro',
      className: '1º Ano Informática - Breves',
      createdAt: '2026-10-14T08:30:00Z',
      updatedAt: '2026-10-15T10:00:00Z'
    },
    session: {
      id: 'sess-seed-01',
      studentId: 'stud-seed-01',
      currentStage: 8,
      completedMissions: [1, 2, 3, 4, 5, 6, 7, 8],
      status: 'concluido',
      startedAt: '2026-10-14T08:30:00Z',
      lastActivityAt: '2026-10-15T10:15:00Z',
      completedAt: '2026-10-15T10:15:00Z'
    },
    notebook: {
      hypotheses: [
        {
          id: 'h1',
          missionNumber: 1,
          statement: 'O cabo de par trançado estava desconectado do computador.',
          selectedConceptIds: ['l1-link-status', 'l1-medium-vs-connector'],
          createdAt: '2026-10-14T08:35:00Z',
          status: 'confirmada'
        },
        {
          id: 'h3',
          missionNumber: 3,
          statement: 'A estação não tinha o Default Gateway 192.168.10.1 configurado.',
          selectedConceptIds: ['l3-default-gateway', 'l3-ip-addressing'],
          createdAt: '2026-10-14T09:10:00Z',
          status: 'confirmada'
        }
      ],
      tests: [
        {
          id: 't1',
          missionNumber: 1,
          testKey: 'test_link_carrier',
          testName: 'Verificar Portadora de Link',
          predictedResult: 'Esperava 0V por falta de contato físico',
          actualResult: 'Tensão 0.0V. LINK DOWN.',
          interpretation: 'Confirmou que a camada física estava inoperante.',
          executedAt: '2026-10-14T08:38:00Z',
          success: false
        },
        {
          id: 't2',
          missionNumber: 3,
          testKey: 'test_ping_remote',
          testName: 'Ping para Servidor Remoto',
          predictedResult: 'Falha de rota para 10.0.20.10',
          actualResult: 'Destino inacessível',
          interpretation: 'O PC descartava pacotes por não conhecer a porta de saída do roteador.',
          executedAt: '2026-10-14T09:12:00Z',
          success: false
        }
      ],
      savedConceptIds: ['l1-medium-vs-connector', 'l1-link-status', 'l2-mac-address', 'l3-default-gateway', 'l4-ports', 'l5-session-expiry', 'l6-encoding', 'l7-status-codes'],
      consolidations: {
        1: {
          missionNumber: 1,
          identifiedCause: 'Cabo desconectado',
          evidenceUsed: ['Tensão 0V', 'LED apagado'],
          relatedLayers: [1],
          justificationText: 'A camada física é a base da transmissão. Sem sinais elétricos no par trançado, nenhuma camada superior consegue transmitir.',
          verificationConfirmed: true,
          submittedAt: '2026-10-14T08:45:00Z'
        },
        3: {
          missionNumber: 3,
          identifiedCause: 'Gateway Padrão ausente',
          evidenceUsed: ['Ping local funcionava', 'Ping remoto falhava'],
          relatedLayers: [3],
          justificationText: 'Como a sub-rede destino (10.0.20.0/24) difere da local (192.168.10.0/24), o pacote obrigatoriamente depende do roteador indicado pelo Gateway.',
          verificationConfirmed: true,
          submittedAt: '2026-10-14T09:20:00Z'
        }
      }
    },
    rubric: {
      evidencias: { criterionKey: 'evidencias', title: 'Interpretação de Evidências', maxScore: 2.0, autoScore: 2.0, teacherScore: 2.0, status: 'revisado_professor' },
      hipoteses: { criterionKey: 'hipoteses', title: 'Formulação de Hipóteses', maxScore: 2.0, autoScore: 2.0, teacherScore: 2.0, status: 'revisado_professor' },
      testes: { criterionKey: 'testes', title: 'Seleção e Interpretação dos Testes', maxScore: 2.0, autoScore: 2.0, teacherScore: 1.8, status: 'revisado_professor' },
      conceitos_osi: { criterionKey: 'conceitos_osi', title: 'Aplicação dos Conceitos do Modelo OSI', maxScore: 2.0, autoScore: 2.0, teacherScore: 2.0, status: 'revisado_professor' },
      justificativas: { criterionKey: 'justificativas', title: 'Revisão e Justificativa das Soluções', maxScore: 1.0, autoScore: 1.0, teacherScore: 1.0, status: 'revisado_professor' },
      desafio_final: { criterionKey: 'desafio_final', title: 'Desafio Final Integrador', maxScore: 1.0, autoScore: 1.0, teacherScore: 1.0, status: 'revisado_professor' }
    },
    finalTotalScore: 9.8,
    teacherFeedbackGeneral: 'Excelente argumentação técnica e distinção exemplar entre enlace e rede.',
    reviewedAt: '2026-10-15T11:00:00Z',
    reviewedBy: 'Prof. Me. Ábner Lucas - IFPA Breves'
  }
];

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function getReducedMotionPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === 'true';
}

export function setReducedMotionPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.REDUCED_MOTION, String(enabled));
  window.dispatchEvent(new CustomEvent('missao-osi-motion-change', { detail: enabled }));
}

export function getActiveStudent(): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getActiveSession(): ActivitySession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearActiveStudentSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  localStorage.removeItem(STORAGE_KEYS.SIMULATION_STATES);
  localStorage.removeItem(STORAGE_KEYS.EVIDENCE_NOTEBOOK);
}

async function syncInitialSessionToSupabase(student: StudentProfile, session: ActivitySession): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !isValidUuid(student.id) || !isValidUuid(session.id)) return;
  try {
    const { error: profileErr } = await supabase.from('student_profiles').upsert({
      id: student.id,
      full_name: student.fullName,
      class_name: student.className,
      created_at: student.createdAt,
      updated_at: student.updatedAt
    });
    if (profileErr) {
      console.warn('[Supabase] Falha ao sincronizar student_profiles:', profileErr.message);
      return;
    }

    const { error: sessionErr } = await supabase.from('activity_sessions').upsert({
      id: session.id,
      student_id: student.id,
      activity_version: '1.0.0',
      current_stage: session.currentStage,
      completed_missions: session.completedMissions,
      status: session.status,
      started_at: session.startedAt,
      last_activity_at: session.lastActivityAt,
      completed_at: session.completedAt || null
    });
    if (sessionErr) {
      console.warn('[Supabase] Falha ao sincronizar activity_sessions:', sessionErr.message);
      return;
    }

    await supabase.from('mission_progress').upsert(
      {
        session_id: session.id,
        mission_number: session.currentStage <= 8 ? session.currentStage : 8,
        status: 'em_investigacao',
        simulation_state: getMissionSimulationState(session.currentStage <= 8 ? session.currentStage : 8),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'session_id,mission_number' }
    );
  } catch (err) {
    console.warn('[Supabase] Erro de rede na sincronização inicial:', err);
  }
}

async function syncRubricScoresToSupabase(
  sessionId: string,
  rubric: Record<string, RubricCriteriaScore>,
  teacherFeedback?: string,
  reviewedBy?: string,
  reviewedAt?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !isValidUuid(sessionId)) return;
  try {
    const rows = Object.values(rubric).map((crit) => ({
      session_id: sessionId,
      criterion_key: crit.criterionKey,
      score: crit.teacherScore !== undefined ? crit.teacherScore : crit.autoScore,
      max_score: crit.maxScore,
      grading_source: crit.status,
      teacher_feedback: teacherFeedback || crit.teacherComment || null,
      reviewed_by: reviewedBy || null,
      reviewed_at: reviewedAt || null
    }));
    await supabase.from('assessment_scores').upsert(rows, {
      onConflict: 'session_id,criterion_key'
    });
  } catch (err) {
    console.warn('[Supabase] Erro ao sincronizar assessment_scores:', err);
  }
}

export function createOrResumeStudentSession(fullName: string, className: string = '1º Ano Informática - IFPA Breves'): {
  student: StudentProfile;
  session: ActivitySession;
} {
  const existingStudent = getActiveStudent();
  const existingSession = getActiveSession();

  // If already active with same name, resume (upgrading legacy non-UUID IDs if needed)
  if (existingStudent && existingSession && existingStudent.fullName.trim().toLowerCase() === fullName.trim().toLowerCase()) {
    if (!isValidUuid(existingStudent.id)) {
      existingStudent.id = generateUuid();
      existingSession.studentId = existingStudent.id;
    }
    if (!isValidUuid(existingSession.id)) {
      existingSession.id = generateUuid();
    }
    existingStudent.className = className.trim() || existingStudent.className;
    existingStudent.updatedAt = new Date().toISOString();
    existingSession.lastActivityAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(existingStudent));
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(existingSession));
    syncSessionToRegistry(existingStudent, existingSession);
    void syncInitialSessionToSupabase(existingStudent, existingSession);
    return { student: existingStudent, session: existingSession };
  }

  // Create new student with valid UUIDs for Supabase compatibility
  const studentId = generateUuid();
  const sessionId = generateUuid();
  const now = new Date().toISOString();

  const student: StudentProfile = {
    id: studentId,
    fullName: fullName.trim(),
    className: className.trim() || '1º Ano Informática - IFPA Breves',
    createdAt: now,
    updatedAt: now
  };

  const session: ActivitySession = {
    id: sessionId,
    studentId: studentId,
    currentStage: 1,
    completedMissions: [],
    status: 'em_andamento',
    startedAt: now,
    lastActivityAt: now
  };

  localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(student));
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));

  // Initialize initial simulation states
  const initialStates: Record<number, MissionSimulationState> = {};
  for (let m = 1; m <= 8; m++) {
    initialStates[m] = { ...MISSIONS_CONFIG[m].initialState };
  }
  localStorage.setItem(STORAGE_KEYS.SIMULATION_STATES, JSON.stringify(initialStates));

  // Initialize notebook
  const initialNotebook: EvidenceNotebook = {
    hypotheses: [],
    tests: [],
    savedConceptIds: [],
    consolidations: {}
  };
  localStorage.setItem(STORAGE_KEYS.EVIDENCE_NOTEBOOK, JSON.stringify(initialNotebook));

  syncSessionToRegistry(student, session);
  void syncInitialSessionToSupabase(student, session);

  return { student, session };
}

export function getMissionSimulationState(missionNumber: number): MissionSimulationState {
  if (typeof window === 'undefined') return MISSIONS_CONFIG[missionNumber].initialState;
  const raw = localStorage.getItem(STORAGE_KEYS.SIMULATION_STATES);
  if (!raw) return MISSIONS_CONFIG[missionNumber].initialState;
  try {
    const states = JSON.parse(raw);
    return states[missionNumber] || MISSIONS_CONFIG[missionNumber].initialState;
  } catch {
    return MISSIONS_CONFIG[missionNumber].initialState;
  }
}

export function updateMissionSimulationState(missionNumber: number, newState: MissionSimulationState): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEYS.SIMULATION_STATES);
  const states = raw ? JSON.parse(raw) : {};
  states[missionNumber] = newState;
  localStorage.setItem(STORAGE_KEYS.SIMULATION_STATES, JSON.stringify(states));

  // Sync session
  const student = getActiveStudent();
  const session = getActiveSession();
  if (student && session) {
    const now = new Date().toISOString();
    session.lastActivityAt = now;
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    syncSessionToRegistry(student, session);

    if (isSupabaseConfigured && supabase && isValidUuid(session.id)) {
      void (async () => {
        try {
          await supabase.from('mission_progress').upsert(
            {
              session_id: session.id,
              mission_number: missionNumber,
              status: session.completedMissions.includes(missionNumber) ? 'concluida' : 'em_investigacao',
              simulation_state: newState,
              updated_at: now
            },
            { onConflict: 'session_id,mission_number' }
          );
          await supabase.from('simulation_events').insert({
            session_id: session.id,
            mission_number: missionNumber,
            event_key: newState.isResolved ? 'intervention_resolved' : 'state_updated',
            payload: newState,
            created_at: now
          });
          await supabase
            .from('activity_sessions')
            .update({ last_activity_at: now })
            .eq('id', session.id);
        } catch (err) {
          console.warn('[Supabase] Erro ao atualizar estado da simulação:', err);
        }
      })();
    }
  }
}

export function getEvidenceNotebook(): EvidenceNotebook {
  if (typeof window === 'undefined') {
    return { hypotheses: [], tests: [], savedConceptIds: [], consolidations: {} };
  }
  const raw = localStorage.getItem(STORAGE_KEYS.EVIDENCE_NOTEBOOK);
  if (!raw) {
    return { hypotheses: [], tests: [], savedConceptIds: [], consolidations: {} };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { hypotheses: [], tests: [], savedConceptIds: [], consolidations: {} };
  }
}

export function saveEvidenceNotebook(notebook: EvidenceNotebook): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.EVIDENCE_NOTEBOOK, JSON.stringify(notebook));
  const student = getActiveStudent();
  const session = getActiveSession();
  if (student && session) {
    syncSessionToRegistry(student, session);
  }
}

export function addHypothesisToNotebook(missionNumber: number, statement: string, selectedConceptIds: string[]): InvestigationHypothesis {
  const notebook = getEvidenceNotebook();
  const now = new Date().toISOString();
  const newHypo: InvestigationHypothesis = {
    id: generateUuid(),
    missionNumber,
    statement: statement.trim(),
    selectedConceptIds,
    createdAt: now,
    status: 'ativa'
  };
  notebook.hypotheses.push(newHypo);
  saveEvidenceNotebook(notebook);

  const session = getActiveSession();
  if (isSupabaseConfigured && supabase && session && isValidUuid(session.id)) {
    void (async () => {
      try {
        await supabase.from('investigation_entries').insert({
          id: newHypo.id,
          session_id: session.id,
          mission_number: missionNumber,
          entry_type: 'hipotese',
          content: newHypo.statement,
          related_concepts: selectedConceptIds,
          created_at: now
        });
      } catch (err) {
        console.warn('[Supabase] Erro ao gravar hipótese:', err);
      }
    })();
  }

  return newHypo;
}

export function recordTestExecution(record: Omit<TestExecutionRecord, 'id' | 'executedAt'>): TestExecutionRecord {
  const notebook = getEvidenceNotebook();
  const now = new Date().toISOString();
  const fullRecord: TestExecutionRecord = {
    ...record,
    id: generateUuid(),
    executedAt: now
  };
  notebook.tests.push(fullRecord);
  saveEvidenceNotebook(notebook);

  const session = getActiveSession();
  if (isSupabaseConfigured && supabase && session && isValidUuid(session.id)) {
    void (async () => {
      try {
        await supabase.from('test_executions').insert({
          id: fullRecord.id,
          session_id: session.id,
          mission_number: fullRecord.missionNumber,
          test_key: fullRecord.testKey,
          predicted_result: fullRecord.predictedResult,
          actual_result: fullRecord.actualResult,
          interpretation: fullRecord.interpretation || null,
          success: fullRecord.success,
          executed_at: now
        });
      } catch (err) {
        console.warn('[Supabase] Erro ao gravar execução de teste:', err);
      }
    })();
  }

  return fullRecord;
}

export function toggleConceptInNotebook(conceptId: string): boolean {
  const notebook = getEvidenceNotebook();
  const idx = notebook.savedConceptIds.indexOf(conceptId);
  let added = false;
  if (idx >= 0) {
    notebook.savedConceptIds.splice(idx, 1);
  } else {
    notebook.savedConceptIds.push(conceptId);
    added = true;
  }
  saveEvidenceNotebook(notebook);

  const session = getActiveSession();
  if (isSupabaseConfigured && supabase && session && isValidUuid(session.id)) {
    const now = new Date().toISOString();
    void (async () => {
      try {
        await supabase.from('student_responses').upsert(
          {
            session_id: session.id,
            mission_number: 1,
            question_key: 'saved_atlas_concepts',
            answer_data: { savedConceptIds: notebook.savedConceptIds },
            submitted_at: now,
            updated_at: now
          },
          { onConflict: 'session_id,mission_number,question_key' }
        );
      } catch (err) {
        console.warn('[Supabase] Erro ao sincronizar conceitos salvos:', err);
      }
    })();
  }

  return added;
}

export function consolidateMission(consolidation: MissionConsolidation): void {
  const notebook = getEvidenceNotebook();
  notebook.consolidations[consolidation.missionNumber] = consolidation;
  saveEvidenceNotebook(notebook);

  const session = getActiveSession();
  const student = getActiveStudent();
  if (session && student) {
    const now = new Date().toISOString();
    if (!session.completedMissions.includes(consolidation.missionNumber)) {
      session.completedMissions.push(consolidation.missionNumber);
      session.completedMissions.sort((a, b) => a - b);
    }
    // Advance current stage if this was the active stage
    if (session.currentStage <= consolidation.missionNumber && consolidation.missionNumber < 8) {
      session.currentStage = consolidation.missionNumber + 1;
    }
    if (session.completedMissions.length >= 8) {
      session.status = 'concluido';
      session.completedAt = now;
    }
    session.lastActivityAt = now;
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    syncSessionToRegistry(student, session);

    if (isSupabaseConfigured && supabase && isValidUuid(session.id)) {
      const simState = getMissionSimulationState(consolidation.missionNumber);
      void (async () => {
        try {
          await supabase.from('student_responses').upsert(
            {
              session_id: session.id,
              mission_number: consolidation.missionNumber,
              question_key: 'mission_consolidation',
              answer_data: consolidation,
              submitted_at: consolidation.submittedAt || now,
              updated_at: now
            },
            { onConflict: 'session_id,mission_number,question_key' }
          );

          await supabase.from('mission_progress').upsert(
            {
              session_id: session.id,
              mission_number: consolidation.missionNumber,
              status: 'concluida',
              simulation_state: simState,
              completed_at: now,
              updated_at: now
            },
            { onConflict: 'session_id,mission_number' }
          );

          await supabase
            .from('activity_sessions')
            .update({
              current_stage: session.currentStage,
              completed_missions: session.completedMissions,
              status: session.status,
              last_activity_at: session.lastActivityAt,
              completed_at: session.completedAt || null
            })
            .eq('id', session.id);
        } catch (err) {
          console.warn('[Supabase] Erro ao consolidar missão:', err);
        }
      })();
    }
  }
}

function syncSessionToRegistry(student: StudentProfile, session: ActivitySession): void {
  if (typeof window === 'undefined') return;
  const rawRegistry = localStorage.getItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY);
  let registry: StudentFullEvaluation[] = rawRegistry ? JSON.parse(rawRegistry) : [...DEFAULT_STUDENT_SEEDS];

  const notebook = getEvidenceNotebook();
  const rubric = calculateRubricScore({
    completedMissions: session.completedMissions,
    hypotheses: notebook.hypotheses,
    tests: notebook.tests,
    savedConceptIds: notebook.savedConceptIds,
    consolidations: notebook.consolidations
  });

  const totalScore = getTotalScore(rubric);

  const evaluation: StudentFullEvaluation = {
    sessionId: session.id,
    student,
    session,
    notebook,
    rubric,
    finalTotalScore: totalScore
  };

  const existingIdx = registry.findIndex(item => item.sessionId === session.id);
  if (existingIdx >= 0) {
    // Preserve any teacher scores already assigned
    const currentRubric = registry[existingIdx].rubric;
    if (currentRubric) {
      for (const key of Object.keys(currentRubric)) {
        if (currentRubric[key]?.teacherScore !== undefined) {
          evaluation.rubric[key].teacherScore = currentRubric[key].teacherScore;
          evaluation.rubric[key].status = 'revisado_professor';
        }
      }
      evaluation.teacherFeedbackGeneral = registry[existingIdx].teacherFeedbackGeneral;
      evaluation.reviewedAt = registry[existingIdx].reviewedAt;
      evaluation.reviewedBy = registry[existingIdx].reviewedBy;
      evaluation.finalTotalScore = getTotalScore(evaluation.rubric);
    }
    registry[existingIdx] = evaluation;
  } else {
    registry.unshift(evaluation);
  }

  localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY, JSON.stringify(registry));

  // Sync calculated rubric scores to Supabase
  if (isSupabaseConfigured && supabase && isValidUuid(session.id)) {
    void syncRubricScoresToSupabase(
      session.id,
      evaluation.rubric,
      evaluation.teacherFeedbackGeneral,
      evaluation.reviewedBy,
      evaluation.reviewedAt
    );
  }
}

export function getAllStudentEvaluations(): StudentFullEvaluation[] {
  if (typeof window === 'undefined') return DEFAULT_STUDENT_SEEDS;
  const raw = localStorage.getItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY, JSON.stringify(DEFAULT_STUDENT_SEEDS));
    return DEFAULT_STUDENT_SEEDS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STUDENT_SEEDS;
  }
}

export async function fetchAllStudentEvaluationsFromCloud(): Promise<StudentFullEvaluation[]> {
  const localEvaluations = getAllStudentEvaluations();
  if (!isSupabaseConfigured || !supabase) {
    return localEvaluations;
  }

  try {
    const [
      { data: sessionsData, error: sessErr },
      { data: profilesData },
      { data: entriesData },
      { data: testsData },
      { data: responsesData },
      { data: scoresData }
    ] = await Promise.all([
      supabase.from('activity_sessions').select('*').order('last_activity_at', { ascending: false }),
      supabase.from('student_profiles').select('*'),
      supabase.from('investigation_entries').select('*'),
      supabase.from('test_executions').select('*'),
      supabase.from('student_responses').select('*'),
      supabase.from('assessment_scores').select('*')
    ]);

    if (sessErr || !sessionsData) {
      return localEvaluations;
    }

    const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
    const cloudEvaluations: StudentFullEvaluation[] = [];

    for (const sRow of sessionsData) {
      const pRow: any = profilesMap.get(sRow.student_id);
      if (!pRow) continue;

      const student: StudentProfile = {
        id: pRow.id,
        fullName: pRow.full_name,
        className: pRow.class_name,
        createdAt: pRow.created_at,
        updatedAt: pRow.updated_at
      };

      const session: ActivitySession = {
        id: sRow.id,
        studentId: sRow.student_id,
        currentStage: sRow.current_stage,
        completedMissions: sRow.completed_missions || [],
        status: sRow.status,
        startedAt: sRow.started_at,
        lastActivityAt: sRow.last_activity_at,
        completedAt: sRow.completed_at || undefined
      };

      const sessHypotheses: InvestigationHypothesis[] = (entriesData || [])
        .filter((e: any) => e.session_id === sRow.id && e.entry_type === 'hipotese')
        .map((e: any) => ({
          id: e.id,
          missionNumber: e.mission_number,
          statement: e.content,
          selectedConceptIds: e.related_concepts || [],
          createdAt: e.created_at,
          status: 'ativa' as const
        }));

      const sessTests: TestExecutionRecord[] = (testsData || [])
        .filter((t: any) => t.session_id === sRow.id)
        .map((t: any) => ({
          id: t.id,
          missionNumber: t.mission_number,
          testKey: t.test_key,
          testName: t.test_key,
          predictedResult: t.predicted_result,
          actualResult: t.actual_result,
          interpretation: t.interpretation || '',
          executedAt: t.executed_at,
          success: Boolean(t.success)
        }));

      const sessResponses = (responsesData || []).filter((r: any) => r.session_id === sRow.id);
      const consolidations: Record<number, MissionConsolidation> = {};
      let savedConceptIds: string[] = [];

      for (const r of sessResponses) {
        if (r.question_key === 'mission_consolidation' && r.answer_data) {
          consolidations[r.mission_number] = r.answer_data as MissionConsolidation;
        } else if (r.question_key === 'saved_atlas_concepts' && r.answer_data?.savedConceptIds) {
          savedConceptIds = r.answer_data.savedConceptIds;
        }
      }

      const notebook: EvidenceNotebook = {
        hypotheses: sessHypotheses,
        tests: sessTests,
        savedConceptIds,
        consolidations
      };

      const rubric = calculateRubricScore({
        completedMissions: session.completedMissions,
        hypotheses: notebook.hypotheses,
        tests: notebook.tests,
        savedConceptIds: notebook.savedConceptIds,
        consolidations: notebook.consolidations
      });

      let teacherFeedbackGeneral: string | undefined;
      let reviewedBy: string | undefined;
      let reviewedAt: string | undefined;

      const sessScores = (scoresData || []).filter((sc: any) => sc.session_id === sRow.id);
      for (const sc of sessScores) {
        if (rubric[sc.criterion_key]) {
          if (sc.grading_source === 'revisado_professor') {
            rubric[sc.criterion_key].teacherScore = Number(sc.score);
            rubric[sc.criterion_key].status = 'revisado_professor';
          }
          if (sc.teacher_feedback) teacherFeedbackGeneral = sc.teacher_feedback;
          if (sc.reviewed_by) reviewedBy = sc.reviewed_by;
          if (sc.reviewed_at) reviewedAt = sc.reviewed_at;
        }
      }

      cloudEvaluations.push({
        sessionId: session.id,
        student,
        session,
        notebook,
        rubric,
        finalTotalScore: getTotalScore(rubric),
        teacherFeedbackGeneral,
        reviewedBy,
        reviewedAt
      });
    }

    // Merge cloud evaluations with local evaluations (avoiding duplicates by sessionId)
    const mergedMap = new Map<string, StudentFullEvaluation>();
    for (const item of cloudEvaluations) {
      mergedMap.set(item.sessionId, item);
    }
    for (const localItem of localEvaluations) {
      if (!mergedMap.has(localItem.sessionId)) {
        mergedMap.set(localItem.sessionId, localItem);
      }
    }

    const merged = Array.from(mergedMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY, JSON.stringify(merged));
    }
    return merged;
  } catch (err) {
    console.warn('[Supabase] Falha ao buscar avaliações da nuvem, usando cache local:', err);
    return localEvaluations;
  }
}

export function updateTeacherEvaluation(params: {
  sessionId: string;
  rubricScores: Record<string, number>;
  feedbackGeneral: string;
  teacherName: string;
}): void {
  const evaluations = getAllStudentEvaluations();
  const target = evaluations.find(e => e.sessionId === params.sessionId);
  if (!target) return;

  const now = new Date().toISOString();
  const reviewer = params.teacherName || 'Prof. Me. Ábner Lucas';

  for (const [key, score] of Object.entries(params.rubricScores)) {
    if (target.rubric[key]) {
      target.rubric[key].teacherScore = score;
      target.rubric[key].status = 'revisado_professor';
    }
  }

  target.teacherFeedbackGeneral = params.feedbackGeneral;
  target.reviewedBy = reviewer;
  target.reviewedAt = now;
  target.finalTotalScore = getTotalScore(target.rubric);

  localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY, JSON.stringify(evaluations));

  if (isSupabaseConfigured && supabase && isValidUuid(params.sessionId)) {
    void syncRubricScoresToSupabase(
      params.sessionId,
      target.rubric,
      params.feedbackGeneral,
      reviewer,
      now
    );
  }
}

