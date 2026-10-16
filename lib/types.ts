export type LayerNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LayerInfo {
  number: LayerNumber;
  namePt: string;
  nameEn: string;
  pdu: string;
  summary: string;
  color: string;
  badgeBg: string;
  protocols: string[];
  devices: string[];
  standards: string[];
  keyConcepts: {
    id: string;
    title: string;
    description: string;
    realWorldExample: string;
  }[];
}

export interface StudentProfile {
  id: string;
  fullName: string;
  className: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivitySession {
  id: string;
  studentId: string;
  currentStage: number; // 1 to 8 (8 is final)
  completedMissions: number[]; // e.g. [1, 2]
  status: 'em_andamento' | 'concluido';
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

export interface InvestigationHypothesis {
  id: string;
  missionNumber: number;
  statement: string;
  selectedConceptIds: string[];
  createdAt: string;
  status: 'ativa' | 'confirmada' | 'refutada' | 'revisada';
  revisionNote?: string;
}

export interface TestExecutionRecord {
  id: string;
  missionNumber: number;
  testKey: string;
  testName: string;
  predictedResult: string;
  actualResult: string;
  interpretation: string;
  executedAt: string;
  success: boolean;
}

export interface MissionConsolidation {
  missionNumber: number;
  identifiedCause: string;
  evidenceUsed: string[];
  relatedLayers: number[];
  justificationText: string;
  verificationConfirmed: boolean;
  submittedAt: string;
}

export interface MissionSimulationState {
  missionNumber: number;
  // Common states
  isResolved: boolean;
  // Specific states
  cableConnected?: boolean;
  linkLedActive?: boolean;
  macDestination?: string;
  switchPortLearned?: boolean;
  pcIp?: string;
  pcSubnet?: string;
  pcGateway?: string;
  targetIp?: string;
  tcpPortTarget?: number;
  tcpServiceListening?: boolean;
  sessionTokenStatus?: 'inexistente' | 'expirado' | 'valido';
  dataEncoding?: 'ISO-8859-1' | 'UTF-8' | 'ASCII';
  targetResourceUri?: string;
  // Final challenge states
  secondaryPcGatewayOk?: boolean;
  secondaryServicePortOk?: boolean;
  secondaryEncodingOk?: boolean;
}

export interface EvidenceNotebook {
  hypotheses: InvestigationHypothesis[];
  tests: TestExecutionRecord[];
  savedConceptIds: string[];
  consolidations: Record<number, MissionConsolidation>;
}

export interface RubricCriteriaScore {
  criterionKey: 'evidencias' | 'hipoteses' | 'testes' | 'conceitos_osi' | 'justificativas' | 'desafio_final';
  title: string;
  maxScore: number;
  autoScore: number;
  teacherScore?: number;
  status: 'auto' | 'revisado_professor';
  teacherComment?: string;
}

export interface StudentFullEvaluation {
  sessionId: string;
  student: StudentProfile;
  session: ActivitySession;
  notebook: EvidenceNotebook;
  rubric: Record<string, RubricCriteriaScore>;
  finalTotalScore: number;
  teacherFeedbackGeneral?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
