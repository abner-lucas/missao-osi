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

type SyncOperation =
  | 'session'
  | 'simulation'
  | 'hypothesis'
  | 'test'
  | 'interpretation'
  | 'concepts'
  | 'consolidation'
  | 'rubric';

// Requests are chained so the server receives them in the order they happened.
let syncQueue: Promise<void> = Promise.resolve();

// Sends a student event to the MySQL API (app/api/sync). localStorage stays the source of truth offline.
function sendToServer(op: SyncOperation, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const student = getActiveStudent();
  const session = getActiveSession();
  if (!student || !session || !isValidUuid(student.id) || !isValidUuid(session.id)) return;

  const body = JSON.stringify({ op, student, session, data });
  syncQueue = syncQueue.then(async () => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: body.length < 60000
      });
      if (res.status === 410) {
        // The teacher deleted this student: drop the local session and go back to identification
        clearActiveStudentSession();
        window.location.href = '/acesso?removido=1';
        return;
      }
      if (!res.ok && res.status !== 503) {
        console.warn(`[MySQL] Falha ao sincronizar "${op}" (HTTP ${res.status})`);
      }
    } catch (err) {
      console.warn(`[MySQL] Erro de rede ao sincronizar "${op}":`, err);
    }
  });
}

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

function syncInitialSession(session: ActivitySession): void {
  const missionNumber = session.currentStage <= 8 ? session.currentStage : 8;
  sendToServer('session', {
    missionNumber,
    simulationState: getMissionSimulationState(missionNumber)
  });
}

function rubricCriteriaPayload(rubric: Record<string, RubricCriteriaScore>) {
  return Object.values(rubric).map((crit) => ({
    criterionKey: crit.criterionKey,
    title: crit.title,
    autoScore: crit.autoScore,
    teacherScore: crit.teacherScore,
    maxScore: crit.maxScore
  }));
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
    syncInitialSession(existingSession);
    return { student: existingStudent, session: existingSession };
  }

  // Create new student with valid UUIDs (primary keys in MySQL)
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
  syncInitialSession(session);

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

export function updateMissionSimulationState(
  missionNumber: number,
  newState: MissionSimulationState,
  intervention?: { key: string; label: string }
): void {
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

    sendToServer('simulation', {
      missionNumber,
      completed: session.completedMissions.includes(missionNumber),
      simulationState: newState,
      interventionKey: intervention?.key,
      interventionLabel: intervention?.label
    });
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

  sendToServer('hypothesis', { ...newHypo });

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

  sendToServer('test', { ...fullRecord });

  return fullRecord;
}

// The interpretation field only appears after the test ran, so it is saved separately.
export function updateTestInterpretation(testId: string, interpretation: string): void {
  const notebook = getEvidenceNotebook();
  const test = notebook.tests.find((t) => t.id === testId);
  if (!test || test.interpretation === interpretation) return;
  test.interpretation = interpretation;
  saveEvidenceNotebook(notebook);

  sendToServer('interpretation', { testId, interpretation });
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

  sendToServer('concepts', { savedConceptIds: notebook.savedConceptIds });

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

    sendToServer('consolidation', {
      consolidation,
      simulationState: getMissionSimulationState(consolidation.missionNumber)
    });
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

  // Sync calculated (automatic) rubric scores; the server keeps teacher-reviewed rows intact
  sendToServer('rubric', { criteria: rubricCriteriaPayload(evaluation.rubric) });
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

export type CloudFetchResult = {
  evaluations: StudentFullEvaluation[];
  databaseConnected: boolean;
  unauthorized?: boolean;
};

// Maps the Portuguese rows returned by /api/professor/evaluations (MySQL) into evaluations.
function mapCloudPayload(payload: any): StudentFullEvaluation[] {
  const bySession = (rows: any[] | undefined, sessionId: string) =>
    (rows || []).filter((r: any) => r.sessao_id === sessionId);

  const alunosMap = new Map((payload.alunos || []).map((a: any) => [a.id, a]));
  const cloudEvaluations: StudentFullEvaluation[] = [];

  for (const sRow of payload.sessoes || []) {
    const aRow: any = alunosMap.get(sRow.aluno_id);
    if (!aRow) continue;

    const student: StudentProfile = {
      id: aRow.id,
      fullName: aRow.nome_completo,
      className: aRow.turma,
      createdAt: aRow.criado_em,
      updatedAt: aRow.atualizado_em
    };

    const session: ActivitySession = {
      id: sRow.id,
      studentId: sRow.aluno_id,
      currentStage: sRow.etapa_atual,
      completedMissions: sRow.missoes_concluidas || [],
      status: sRow.situacao,
      startedAt: sRow.iniciada_em,
      lastActivityAt: sRow.ultima_atividade_em,
      completedAt: sRow.concluida_em || undefined
    };

    const hypotheses: InvestigationHypothesis[] = bySession(payload.hipoteses, sRow.id).map((h: any) => ({
      id: h.id,
      missionNumber: h.missao,
      statement: h.enunciado,
      selectedConceptIds: h.conceitos_relacionados || [],
      createdAt: h.criada_em,
      status: h.situacao || 'ativa'
    }));

    const tests: TestExecutionRecord[] = bySession(payload.testes, sRow.id).map((t: any) => ({
      id: t.id,
      missionNumber: t.missao,
      testKey: t.codigo_teste,
      testName: t.nome_teste || t.codigo_teste,
      predictedResult: t.resultado_previsto,
      actualResult: t.resultado_obtido,
      interpretation: t.interpretacao || '',
      executedAt: t.executado_em,
      success: Boolean(t.sucesso)
    }));

    const consolidations: Record<number, MissionConsolidation> = {};
    for (const c of bySession(payload.consolidacoes, sRow.id)) {
      consolidations[c.missao] = {
        missionNumber: c.missao,
        identifiedCause: c.causa_identificada || '',
        evidenceUsed: c.evidencias_utilizadas || [],
        relatedLayers: c.camadas_relacionadas || [],
        justificationText: c.justificativa,
        verificationConfirmed: Boolean(c.verificacao_confirmada),
        submittedAt: c.enviada_em
      };
    }

    const notebook: EvidenceNotebook = {
      hypotheses,
      tests,
      savedConceptIds: bySession(payload.conceitos, sRow.id).map((c: any) => c.conceito_id),
      consolidations
    };

    const rubric = calculateRubricScore({
      completedMissions: session.completedMissions,
      hypotheses: notebook.hypotheses,
      tests: notebook.tests,
      savedConceptIds: notebook.savedConceptIds,
      consolidations: notebook.consolidations
    });

    for (const n of bySession(payload.notas, sRow.id)) {
      if (rubric[n.criterio] && n.nota_professor !== null && n.nota_professor !== undefined) {
        rubric[n.criterio].teacherScore = Number(n.nota_professor);
        rubric[n.criterio].status = 'revisado_professor';
      }
    }

    const review: any = bySession(payload.avaliacoes, sRow.id)[0];

    cloudEvaluations.push({
      sessionId: session.id,
      student,
      session,
      notebook,
      rubric,
      finalTotalScore: getTotalScore(rubric),
      teacherFeedbackGeneral: review?.parecer || undefined,
      reviewedBy: review?.avaliador || undefined,
      reviewedAt: review?.avaliado_em || undefined
    });
  }

  return cloudEvaluations;
}

// Student view: fetches only the active session's evaluation (e.g. teacher grading done on another machine).
export async function fetchOwnEvaluationFromCloud(sessionId: string): Promise<StudentFullEvaluation | null> {
  if (!isValidUuid(sessionId)) return null;
  try {
    const res = await fetch(`/api/professor/evaluations?sessionId=${encodeURIComponent(sessionId)}`, {
      cache: 'no-store'
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok || !payload.configured) return null;
    return mapCloudPayload(payload).find((e) => e.sessionId === sessionId) || null;
  } catch {
    return null;
  }
}

export async function fetchAllStudentEvaluationsFromCloud(): Promise<CloudFetchResult> {
  const localEvaluations = getAllStudentEvaluations();

  try {
    const res = await fetch('/api/professor/evaluations', { cache: 'no-store' });
    if (res.status === 401) {
      return { evaluations: localEvaluations, databaseConnected: false, unauthorized: true };
    }
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok || !payload.configured) {
      return { evaluations: localEvaluations, databaseConnected: false };
    }

    const cloudEvaluations = mapCloudPayload(payload);

    // Merge cloud evaluations with local evaluations (avoiding duplicates by sessionId)
    const mergedMap = new Map<string, StudentFullEvaluation>();
    for (const item of cloudEvaluations) {
      mergedMap.set(item.sessionId, item);
    }
    for (const localItem of localEvaluations) {
      // Real sessions (UUID) live in the database; one missing there was deleted by the teacher
      if (isValidUuid(localItem.sessionId)) continue;
      if (!mergedMap.has(localItem.sessionId)) {
        mergedMap.set(localItem.sessionId, localItem);
      }
    }

    const merged = Array.from(mergedMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY, JSON.stringify(merged));
    }
    return { evaluations: merged, databaseConnected: true };
  } catch (err) {
    console.warn('[MySQL] Falha ao buscar avaliações do servidor, usando cache local:', err);
    return { evaluations: localEvaluations, databaseConnected: false };
  }
}

// Teacher removes a student and all of their answers (server and this browser's registry).
export async function deleteStudentEvaluation(sessionId: string): Promise<boolean> {
  if (isValidUuid(sessionId)) {
    try {
      const res = await fetch(`/api/professor/alunos?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (!res.ok) return false;
    } catch {
      return false;
    }
  }
  const remaining = getAllStudentEvaluations().filter((e) => e.sessionId !== sessionId);
  localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY, JSON.stringify(remaining));
  return true;
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

  // Only criteria the teacher actually changed become teacher scores; untouched ones keep
  // following the automatic score, so progress made after the review still counts.
  for (const [key, score] of Object.entries(params.rubricScores)) {
    const crit = target.rubric[key];
    if (!crit) continue;
    const changed = Math.abs(score - crit.autoScore) > 0.001;
    const previouslyReviewed = crit.teacherScore !== undefined;
    if (changed || (previouslyReviewed && Math.abs(score - (crit.teacherScore as number)) > 0.001)) {
      crit.teacherScore = score;
      crit.status = 'revisado_professor';
    } else if (!previouslyReviewed) {
      crit.teacherScore = undefined;
      crit.status = 'auto';
    }
  }

  target.teacherFeedbackGeneral = params.feedbackGeneral;
  target.reviewedBy = reviewer;
  target.reviewedAt = now;
  target.finalTotalScore = getTotalScore(target.rubric);

  localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS_REGISTRY, JSON.stringify(evaluations));

  if (isValidUuid(params.sessionId)) {
    void fetch('/api/professor/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: params.sessionId,
        criteria: rubricCriteriaPayload(target.rubric),
        feedback: params.feedbackGeneral,
        reviewedBy: reviewer,
        reviewedAt: now
      })
    })
      .then((res) => {
        if (!res.ok) console.warn(`[MySQL] Falha ao gravar avaliação docente (HTTP ${res.status})`);
      })
      .catch((err) => console.warn('[MySQL] Erro de rede ao gravar avaliação docente:', err));
  }
}

