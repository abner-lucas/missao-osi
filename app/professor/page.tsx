'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Award,
  Download,
  Search,
  Filter,
  Eye,
  Edit3,
  X,
  FileText,
  Lightbulb,
  FlaskConical,
  LogOut,
  ChevronRight,
  Database,
  RefreshCw
} from 'lucide-react';
import Header from '@/components/Header';
import { getAllStudentEvaluations, fetchAllStudentEvaluationsFromCloud, updateTeacherEvaluation } from '@/lib/storage';
import { StudentFullEvaluation, RubricCriteriaScore } from '@/lib/types';
import { getTotalScore } from '@/lib/simulation-engine';

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<StudentFullEvaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('todas');
  const [selectedStudent, setSelectedStudent] = useState<StudentFullEvaluation | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState(false);

  // Grading form state inside modal
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [feedbackGeneral, setFeedbackGeneral] = useState('');
  const [teacherName, setTeacherName] = useState('Prof. Me. Ábner Lucas - IFPA Breves');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    // Verify auth
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('missao_osi_teacher_auth');
      if (!auth) {
        router.push('/professor/login');
        return;
      }
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    setSyncing(true);
    const localList = getAllStudentEvaluations();
    setEvaluations(localList);
    const cloud = await fetchAllStudentEvaluationsFromCloud();
    if (cloud.unauthorized) {
      // Server session (cookie) expired or missing
      localStorage.removeItem('missao_osi_teacher_auth');
      router.push('/professor/login');
      return;
    }
    setEvaluations(cloud.evaluations);
    setDatabaseConnected(cloud.databaseConnected);
    setSyncing(false);
  };

  const handleOpenEvaluationModal = (item: StudentFullEvaluation) => {
    setSelectedStudent(item);
    const initialScores: Record<string, number> = {};
    for (const [k, v] of Object.entries(item.rubric)) {
      initialScores[k] = v.teacherScore !== undefined ? v.teacherScore : v.autoScore;
    }
    setRubricScores(initialScores);
    setFeedbackGeneral(item.teacherFeedbackGeneral || '');
    if (item.reviewedBy) setTeacherName(item.reviewedBy);
    setSaveNotice(null);
  };

  const handleSaveEvaluation = () => {
    if (!selectedStudent) return;
    updateTeacherEvaluation({
      sessionId: selectedStudent.sessionId,
      rubricScores,
      feedbackGeneral,
      teacherName
    });
    setSaveNotice('Avaliação e parecer pedagógico salvos com sucesso!');
    setTimeout(() => {
      setSaveNotice(null);
      setSelectedStudent(null);
      loadData();
    }, 1200);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('missao_osi_teacher_auth');
    }
    void fetch('/api/professor/login', { method: 'DELETE' }).finally(() => router.push('/'));
  };

  // CSV Export for class registry
  const handleExportCSV = () => {
    if (evaluations.length === 0) return;
    const headers = ['Nome do Estudante', 'Turma', 'Etapa', 'Concluidas', 'Nota Evidencias', 'Nota Hipoteses', 'Nota Testes', 'Nota Conceitos OSI', 'Nota Justificativas', 'Nota Desafio Final', 'Nota Final (10)', 'Parecer Docente'];
    const rows = evaluations.map((e) => {
      const r = e.rubric;
      return [
        `"${e.student.fullName}"`,
        `"${e.student.className}"`,
        e.session.currentStage,
        e.session.completedMissions.length,
        (r.evidencias?.teacherScore ?? r.evidencias?.autoScore ?? 0).toFixed(1),
        (r.hipoteses?.teacherScore ?? r.hipoteses?.autoScore ?? 0).toFixed(1),
        (r.testes?.teacherScore ?? r.testes?.autoScore ?? 0).toFixed(1),
        (r.conceitos_osi?.teacherScore ?? r.conceitos_osi?.autoScore ?? 0).toFixed(1),
        (r.justificativas?.teacherScore ?? r.justificativas?.autoScore ?? 0).toFixed(1),
        (r.desafio_final?.teacherScore ?? r.desafio_final?.autoScore ?? 0).toFixed(1),
        e.finalTotalScore.toFixed(1),
        `"${e.teacherFeedbackGeneral || 'Sem parecer'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `notas_missao_osi_ifpa_breves_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalStudents = evaluations.length;
  const completedSessions = evaluations.filter(e => e.session.status === 'concluido' || e.session.completedMissions.length >= 8).length;
  const inProgressSessions = totalStudents - completedSessions;
  const averageScore = totalStudents > 0
    ? (evaluations.reduce((acc, curr) => acc + curr.finalTotalScore, 0) / totalStudents).toFixed(1)
    : '0.0';

  // Filtered
  const filteredList = evaluations.filter((item) => {
    const matchesSearch = item.student.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'todas' || item.student.className.toLowerCase().includes(filterClass.toLowerCase());
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 space-y-8 w-full">
        {/* Top Bar with Teacher Credentials */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800 text-xs font-mono">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>PAINEL EXCLUSIVO DO PROFESSOR</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono border ${
                  databaseConnected
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                }`}
                title={
                  databaseConnected
                    ? 'Sincronização com o banco MySQL da Hostinger ativa'
                    : 'Configure DB_NAME, DB_USER e DB_PASSWORD no servidor para sincronizar entre máquinas'
                }
              >
                <Database className="w-3 h-3" />
                <span>{databaseConnected ? 'MySQL Conectado' : 'Persistência Local (Navegador)'}</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Acompanhamento de Turma • Redes de Computadores
            </h1>
            <p className="text-xs text-slate-400">
              Prof. Me. Ábner Lucas • IFPA Campus Breves
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
              title="Atualizar dados da turma"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${syncing ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
              title="Exportar notas da turma em formato CSV para diário eletrônico"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Notas (CSV)</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Alunos Inscritos</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalStudents}</div>
            <div className="text-[11px] text-slate-500">1º Ano Informática Integrado</div>
          </div>

          <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Sessões em Andamento</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">{inProgressSessions}</div>
            <div className="text-[11px] text-slate-500">Atividades em investigação</div>
          </div>

          <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Missões Concluídas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{completedSessions}</div>
            <div className="text-[11px] text-slate-500">Com todas as 8 etapas finalizadas</div>
          </div>

          <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Média da Turma</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono">{averageScore} / 10</div>
            <div className="text-[11px] text-slate-500">Baseada no raciocínio processual</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno por nome..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="todas">Todas as Turmas</option>
              <option value="1º Ano Informática">1º Ano Informática - Breves</option>
              <option value="Turma A">Turma A</option>
              <option value="Turma B">Turma B</option>
            </select>
          </div>
        </div>

        {/* Student Dossiers Table */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1120] text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Estudante</th>
                  <th className="p-3.5">Turma</th>
                  <th className="p-3.5">Etapa Atual</th>
                  <th className="p-3.5">Missões</th>
                  <th className="p-3.5">Nota Processo</th>
                  <th className="p-3.5">Status Avaliativo</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Nenhum estudante encontrado com o filtro atual.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const isReviewed = Boolean(item.reviewedBy);
                    return (
                      <tr key={item.sessionId} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {item.student.fullName}
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {item.student.className}
                        </td>
                        <td className="p-3.5 font-mono text-cyan-400 font-semibold">
                          Etapa {item.session.currentStage}/8
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            {item.session.completedMissions.length} de 8
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-sm text-cyan-300">
                          {item.finalTotalScore.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">/ 10</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                            isReviewed
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {isReviewed ? 'Validado pelo Docente' : 'Revisão Pendente'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenEvaluationModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Avaliar Dossiê</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Teacher Detailed Grading & Inspection Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-950 text-purple-400 border border-purple-800">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Avaliação Pedagógica: {selectedStudent.student.fullName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Turma: {selectedStudent.student.className} • Sessão ID: {selectedStudent.sessionId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {saveNotice && (
                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveNotice}</span>
                </div>
              )}

              {/* Subjective Justifications Written by the Student */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Justificativas Técnicas Redigidas pelo Estudante
                </h4>

                <div className="space-y-2">
                  {Object.keys(selectedStudent.notebook.consolidations).length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-500">
                      Nenhuma consolidação enviada ainda.
                    </div>
                  ) : (
                    Object.values(selectedStudent.notebook.consolidations).map((c) => (
                      <div key={c.missionNumber} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300">
                            {c.missionNumber === 8 ? 'Desafio Integrador' : `Missão ${c.missionNumber} (Camada ${c.missionNumber})`}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Causa apontada: {c.identifiedCause}
                          </span>
                        </div>
                        <p className="text-slate-200 leading-relaxed italic bg-slate-950 p-2.5 rounded border border-slate-800/80">
                          "{c.justificationText}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Rubric Criteria Score Sliders / Inputs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-yellow-400" />
                  Atribuição de Notas pelos 6 Critérios (Total: 10,0 Pontos)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.values(selectedStudent.rubric).map((crit) => {
                    const currentScore = rubricScores[crit.criterionKey] !== undefined
                      ? rubricScores[crit.criterionKey]
                      : crit.autoScore;
                    return (
                      <div key={crit.criterionKey} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{crit.title}</span>
                          <span className="font-mono text-cyan-400 font-semibold">
                            Max: {crit.maxScore.toFixed(1)} pts
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max={crit.maxScore}
                            step="0.1"
                            value={currentScore}
                            onChange={(e) => {
                              setRubricScores({
                                ...rubricScores,
                                [crit.criterionKey]: parseFloat(e.target.value)
                              });
                            }}
                            className="flex-1 accent-cyan-500"
                          />
                          <span className="font-mono text-sm font-bold text-white w-10 text-right">
                            {currentScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teacher General Feedback & Observations */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Parecer Pedagógico Geral do Docente (Visível no Relatório do Aluno):
                </label>
                <textarea
                  value={feedbackGeneral}
                  onChange={(e) => setFeedbackGeneral(e.target.value)}
                  rows={3}
                  placeholder="Ex: Demonstrou excelente raciocínio ao relacionar o endereço MAC à comutação local e diferenciar do roteamento por IP..."
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0B1120] border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEvaluation}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Avaliação Docente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
