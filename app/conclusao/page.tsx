'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Award,
  CheckCircle2,
  Clock,
  Printer,
  BookOpen,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Layers,
  FlaskConical,
  HelpCircle,
  User
} from 'lucide-react';
import Header from '@/components/Header';
import {
  getActiveStudent,
  getActiveSession,
  getEvidenceNotebook,
  getAllStudentEvaluations,
  fetchAllStudentEvaluationsFromCloud
} from '@/lib/storage';
import { StudentProfile, ActivitySession, EvidenceNotebook, StudentFullEvaluation } from '@/lib/types';
import { calculateRubricScore, getTotalScore } from '@/lib/simulation-engine';

export default function ConclusaoPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [notebook, setNotebook] = useState<EvidenceNotebook | null>(null);
  const [evaluation, setEvaluation] = useState<StudentFullEvaluation | null>(null);

  useEffect(() => {
    const s = getActiveStudent();
    const sess = getActiveSession();
    const nb = getEvidenceNotebook();
    if (!s) {
      router.push('/acesso');
      return;
    }
    setStudent(s);
    setSession(sess);
    setNotebook(nb);

    // Fetch existing evaluation if teacher graded locally or in Supabase
    const all = getAllStudentEvaluations();
    const match = all.find((e) => e.student.id === s.id || e.sessionId === sess?.id);
    if (match) {
      setEvaluation(match);
    }

    fetchAllStudentEvaluationsFromCloud().then((cloudList) => {
      const cloudMatch = cloudList.find((e) => e.student.id === s.id || e.sessionId === sess?.id);
      if (cloudMatch) {
        setEvaluation(cloudMatch);
      }
    });
  }, [router]);

  if (!student) return null;

  const currentNotebook = notebook || {
    hypotheses: [],
    tests: [],
    savedConceptIds: [],
    consolidations: {}
  };

  const calculatedRubric = calculateRubricScore({
    completedMissions: session?.completedMissions || [],
    hypotheses: currentNotebook.hypotheses,
    tests: currentNotebook.tests,
    savedConceptIds: currentNotebook.savedConceptIds,
    consolidations: currentNotebook.consolidations
  });

  const finalRubric = evaluation?.rubric || calculatedRubric;
  const totalScore = getTotalScore(finalRubric);
  const isReviewedByTeacher = Boolean(evaluation?.reviewedBy);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-8 w-full print:p-0 print:bg-white print:text-black">
        {/* Academic Certificate / Dossier Header */}
        <section className="p-8 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl space-y-6 print:border-none print:shadow-none print:bg-transparent">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-xs font-mono mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>RELATÓRIO INDIVIDUAL DE INVESTIGAÇÃO CONCLUÍDA</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight print:text-black">
                Dossiê Pedagógico: Missão OSI
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 print:text-gray-600">
                Instituto Federal do Pará (IFPA) Campus Breves • Curso Técnico em Informática
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors print:hidden"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Imprimir Relatório</span>
            </button>
          </div>

          {/* Student & Activity Info Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-slate-500 block text-[10px]">ESTUDANTE</span>
              <span className="text-white font-bold text-sm block truncate print:text-black">{student.fullName}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-slate-500 block text-[10px]">TURMA / DISCIPLINA</span>
              <span className="text-white font-semibold block truncate print:text-black">{student.className}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-slate-500 block text-[10px]">ETAPAS CONCLUÍDAS</span>
              <span className="text-emerald-400 font-bold block print:text-emerald-700">
                {session?.completedMissions.length || 0} de 8 Missões
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-slate-500 block text-[10px]">STATUS DA AVALIAÇÃO</span>
              <span className={`font-bold block ${isReviewedByTeacher ? 'text-emerald-400 print:text-emerald-700' : 'text-amber-400 print:text-amber-700'}`}>
                {isReviewedByTeacher ? 'Nota Consolidada pelo Docente' : 'Aguardando Revisão Docente'}
              </span>
            </div>
          </div>

          {/* Teacher feedback alert if available */}
          {evaluation?.teacherFeedbackGeneral && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800 text-xs text-slate-200 space-y-1.5 print:bg-blue-50 print:border-blue-300 print:text-black">
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>Parecer do Professor ({evaluation.reviewedBy}):</span>
                {evaluation.reviewedAt && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(evaluation.reviewedAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
              <p className="italic leading-relaxed">
                "{evaluation.teacherFeedbackGeneral}"
              </p>
            </div>
          )}
        </section>

        {/* 6 Criteria Rubric Breakdown */}
        <section className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl space-y-4 print:border-none print:shadow-none print:bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight print:text-black">
                Rubrica Avaliativa de Aprendizagem (Valor: 10,0 Pontos)
              </h2>
              <p className="text-xs text-slate-400 print:text-gray-600">
                Combinação de critérios objetivos e validação qualitativa do raciocínio investigativo:
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-cyan-400 print:text-black">
                {totalScore.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ 10,0</span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {Object.values(finalRubric).map((crit) => {
              const score = crit.teacherScore !== undefined ? crit.teacherScore : crit.autoScore;
              return (
                <div
                  key={crit.criterionKey}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs print:bg-gray-50 print:border-gray-200"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white print:text-black">
                      {crit.title}
                    </div>
                    <div className="text-[11px] text-slate-400 print:text-gray-500">
                      {crit.status === 'revisado_professor'
                        ? 'Pontuação confirmada pelo professor'
                        : 'Avaliação preliminar automática do processo'}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-cyan-400 print:text-black shrink-0">
                    {score.toFixed(1)} / {crit.maxScore.toFixed(1)} pts
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Investigative Journey History Table */}
        <section className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl space-y-4 print:border-none print:shadow-none print:bg-transparent">
          <h2 className="text-base font-bold text-white tracking-tight print:text-black">
            Síntese das Justificativas Apresentadas por Camada
          </h2>

          <div className="space-y-3 text-xs">
            {Object.keys(currentNotebook.consolidations).length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-800 rounded-lg">
                Nenhuma justificativa consolidada registrada até o momento.
              </div>
            ) : (
              Object.values(currentNotebook.consolidations).map((c) => (
                <div key={c.missionNumber} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 print:bg-gray-50 print:border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 font-mono text-xs">
                      {c.missionNumber === 8 ? 'Desafio Integrador' : `Missão ${c.missionNumber} (Camada ${c.missionNumber})`}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Causa: {c.identifiedCause}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed italic print:text-black">
                    "{c.justificationText}"
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-800 print:hidden">
            <Link
              href="/painel"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Painel da Missão</span>
            </Link>

            <Link
              href="/atlas"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Revisar Atlas OSI</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
