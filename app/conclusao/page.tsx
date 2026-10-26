'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Printer } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { wireBackground } from '@/lib/wires';
import {
  getActiveStudent,
  getActiveSession,
  getEvidenceNotebook,
  getAllStudentEvaluations,
  fetchOwnEvaluationFromCloud
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

    // Fetch existing evaluation if teacher graded locally or on the server (MySQL)
    const all = getAllStudentEvaluations();
    const match = all.find((e) => e.student.id === s.id || e.sessionId === sess?.id);
    if (match) {
      setEvaluation(match);
    }

    if (sess) {
      fetchOwnEvaluationFromCloud(sess.id).then((cloudMatch) => {
        if (cloudMatch) {
          setEvaluation(cloudMatch);
        }
      });
    }
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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 print:p-0 print:max-w-none">
        <article className="folha overflow-hidden print:border-0 print:rounded-none">
          <div aria-hidden="true" className="h-3 flex">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span key={n} className="flex-1" style={{ background: wireBackground(n) }} />
            ))}
          </div>

          <header className="px-5 sm:px-10 pt-8 pb-6 border-b border-linha">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-grafite-2">Instituto Federal do Pará, Campus Breves. Curso Técnico em Informática.</p>
                <h1 className="mt-2 text-[clamp(2rem,5vw,3rem)] font-extrabold [font-stretch:78%] leading-[1.04]">
                  Relatório da investigação
                </h1>
              </div>
              <button type="button" onClick={handlePrint} className="btn btn-secundario nao-imprimir shrink-0">
                <Printer className="w-[18px] h-[18px]" aria-hidden="true" />
                Imprimir relatório
              </button>
            </div>

            <dl className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm text-grafite-2">Estudante</dt>
                <dd className="font-bold text-lg leading-tight">{student.fullName}</dd>
              </div>
              <div>
                <dt className="text-sm text-grafite-2">Turma</dt>
                <dd className="font-semibold">{student.className}</dd>
              </div>
              <div>
                <dt className="text-sm text-grafite-2">Etapas concluídas</dt>
                <dd className="font-semibold">{session?.completedMissions.length || 0} de 8 missões</dd>
              </div>
              <div>
                <dt className="text-sm text-grafite-2">Situação da avaliação</dt>
                <dd className={`font-semibold flex items-center gap-2 ${isReviewedByTeacher ? 'text-ok' : 'text-alerta'}`}>
                  <span aria-hidden="true" className={`led ${isReviewedByTeacher ? 'led-verde' : 'led-ambar'}`} />
                  {isReviewedByTeacher ? 'Nota consolidada pelo professor' : 'Aguardando revisão do professor'}
                </dd>
              </div>
            </dl>
          </header>

          {evaluation?.teacherFeedbackGeneral && (
            <section aria-labelledby="titulo-parecer" className="px-5 sm:px-10 py-6 border-b border-linha bg-caneta-clara/50">
              <h2 id="titulo-parecer" className="text-xl font-extrabold">
                Parecer do professor
              </h2>
              <blockquote className="mt-2 text-lg leading-relaxed border-l-4 border-caneta pl-4">{evaluation.teacherFeedbackGeneral}</blockquote>
              <p className="mt-2 text-sm text-grafite-2">
                {evaluation.reviewedBy}
                {evaluation.reviewedAt && `, ${new Date(evaluation.reviewedAt).toLocaleDateString('pt-BR')}`}
              </p>
            </section>
          )}

          <section aria-labelledby="titulo-rubrica" className="px-5 sm:px-10 py-7 border-b border-linha">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="titulo-rubrica" className="text-2xl font-extrabold">
                  Rubrica de avaliação
                </h2>
                <p className="text-grafite-2 mt-1">Seis critérios, 10 pontos no total.</p>
              </div>
              <p className="font-display font-extrabold text-5xl leading-none">
                {totalScore.toFixed(1)}
                <span className="text-2xl text-grafite-2"> / 10</span>
              </p>
            </div>
            <table className="mt-5 w-full text-left">
              <caption className="sr-only">Nota por critério da rubrica</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Critério</th>
                  <th scope="col">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {Object.values(finalRubric).map((crit) => {
                  const score = crit.teacherScore !== undefined ? crit.teacherScore : crit.autoScore;
                  return (
                    <tr key={crit.criterionKey}>
                      <th scope="row" className="py-3.5 pr-4 font-normal">
                        <span className="block font-bold">{crit.title}</span>
                        <span className="block text-sm text-grafite-2">
                          {crit.status === 'revisado_professor' ? 'Confirmada pelo professor' : 'Avaliação automática do processo'}
                        </span>
                        <span aria-hidden="true" className="mt-2 block h-1.5 rounded-full bg-papel overflow-hidden max-w-xs print:hidden">
                          <span className="block h-full bg-caneta rounded-full" style={{ width: `${(score / crit.maxScore) * 100}%` }} />
                        </span>
                      </th>
                      <td className="py-3.5 text-right font-bold whitespace-nowrap align-top">
                        {score.toFixed(1)} / {crit.maxScore.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="titulo-justificativas" className="px-5 sm:px-10 py-7">
            <h2 id="titulo-justificativas" className="text-2xl font-extrabold">
              Justificativas por missão
            </h2>
            {Object.keys(currentNotebook.consolidations).length === 0 ? (
              <p className="mt-4 rounded-xl border-2 border-dashed border-linha-forte p-6 text-center text-grafite-2">
                Nenhuma justificativa registrada até agora. Elas aparecem aqui quando você conclui o momento F de cada missão.
              </p>
            ) : (
              <ol className="mt-4 space-y-5">
                {Object.values(currentNotebook.consolidations).map((c) => (
                  <li key={c.missionNumber} className="flex gap-4">
                    <span aria-hidden="true" className="w-2 rounded-full shrink-0" style={{ background: wireBackground(c.missionNumber === 8 ? 0 : c.missionNumber, 'vertical') }} />
                    <div>
                      <h3 className="text-lg font-extrabold">
                        {c.missionNumber === 8 ? 'Desafio Integrador' : `Missão ${c.missionNumber} (Camada ${c.missionNumber})`}
                      </h3>
                      {c.identifiedCause && (
                        <p className="text-grafite-2">
                          <strong className="text-grafite">Causa:</strong> {c.identifiedCause}
                        </p>
                      )}
                      <p className="mt-1 leading-relaxed">{c.justificationText}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </article>

        <nav aria-label="Próximos passos" className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3 nao-imprimir">
          <Link href="/painel" className="btn btn-discreto">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao painel da missão
          </Link>
          <Link href="/atlas" className="btn btn-primario">
            <BookOpen className="w-[18px] h-[18px]" aria-hidden="true" />
            Revisar o Atlas OSI
          </Link>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
