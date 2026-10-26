'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, FileText, Lock, RotateCcw } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { wireBackground } from '@/lib/wires';
import { getActiveStudent, getActiveSession, getEvidenceNotebook, clearActiveStudentSession } from '@/lib/storage';
import { StudentProfile, ActivitySession, EvidenceNotebook } from '@/lib/types';
import { fetchMissionAvailability } from '@/lib/mission-availability';

// Descriptions name each layer's subject only, never the fault being investigated.
const STAGES = [
  { num: 1, name: 'Física', title: 'O Sinal Desaparecido', desc: 'Cabos, conectores e sinais elétricos.' },
  { num: 2, name: 'Enlace', title: 'O Caminho do Quadro', desc: 'Quadros Ethernet, endereços MAC e o switch.' },
  { num: 3, name: 'Rede', title: 'O Pacote Sem Caminho', desc: 'Endereços IP, sub-redes e roteamento.' },
  { num: 4, name: 'Transporte', title: 'A Conexão Interrompida', desc: 'Portas lógicas e conexões TCP.' },
  { num: 5, name: 'Sessão', title: 'O Diálogo Perdido', desc: 'Como um diálogo entre sistemas começa e se mantém.' },
  { num: 6, name: 'Apresentação', title: 'Dados Sem Sentido', desc: 'Formato e codificação dos dados.' },
  { num: 7, name: 'Aplicação', title: 'O Recurso Indisponível', desc: 'Pedidos e respostas entre cliente e servidor.' },
  { num: 8, name: 'Integrador', title: 'Desafio Integrador', desc: 'Uma investigação que cruza mais de uma camada.' },
];

export default function PainelPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [, setNotebook] = useState<EvidenceNotebook | null>(null);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [closedMissions, setClosedMissions] = useState<Set<number>>(new Set());

  useEffect(() => {
    const s = getActiveStudent();
    const sess = getActiveSession();
    if (!s) {
      router.push('/acesso');
      return;
    }
    setStudent(s);
    setSession(sess);
    setNotebook(getEvidenceNotebook());
    fetchMissionAvailability().then((a) => setClosedMissions(a.closed));
  }, [router]);

  if (!student) return null;

  const completedCount = session?.completedMissions.length || 0;
  const progressPercent = Math.round((completedCount / 8) * 100);
  const isAllCompleted = completedCount >= 8 || session?.status === 'concluido';
  const currentStage = session?.currentStage || 1;
  const continueHref = !isAllCompleted && currentStage <= 8 ? `/missao/${currentStage}` : '/conclusao';
  const currentClosed = !isAllCompleted && currentStage <= 8 && closedMissions.has(currentStage);

  const handleSwitchStudent = () => {
    clearActiveStudentSession();
    router.push('/acesso');
  };

  const statusOf = (num: number) => {
    const isCompleted = Boolean(session?.completedMissions.includes(num));
    const isClosed = closedMissions.has(num);
    const isAvailable = (num <= currentStage || isCompleted) && !isClosed;
    const isCurrent = num === currentStage && !isCompleted;
    const label = isClosed
      ? 'Fechada pelo professor'
      : isCompleted
      ? 'Concluída'
      : isCurrent
      ? 'Em investigação'
      : isAvailable
      ? 'Disponível'
      : 'Bloqueada';
    return { isCompleted, isAvailable, isCurrent, isClosed, label };
  };

  const shownNum = selectedPort ?? Math.min(currentStage, 8);
  const shown = STAGES[shownNum - 1];
  const shownStatus = statusOf(shown.num);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div>
            <p className="text-grafite-2">{student.className}</p>
            <h1 className="mt-1 text-[clamp(2.1rem,5vw,3.4rem)] font-extrabold [font-stretch:78%] leading-[1.04]">
              Olá, {student.fullName}
            </h1>
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
              {currentClosed ? (
                <p className="flex items-center gap-2 min-h-12 px-4 rounded-[0.625rem] bg-alerta-fundo text-alerta font-semibold">
                  <Lock className="w-[18px] h-[18px]" aria-hidden="true" />
                  A etapa {currentStage} ainda não foi liberada pelo professor
                </p>
              ) : (
                <Link href={continueHref} className="btn btn-primario !min-h-12 !text-base !px-6">
                  {!isAllCompleted && currentStage <= 8
                    ? `Continuar: etapa ${currentStage} (${STAGES[currentStage - 1].name})`
                    : 'Ver relatório final'}
                </Link>
              )}
              <Link href="/atlas" className="btn btn-secundario">
                <BookOpen className="w-[18px] h-[18px]" aria-hidden="true" />
                Abrir Atlas OSI
              </Link>
              <Link href="/conclusao" className="btn btn-secundario">
                <FileText className="w-[18px] h-[18px]" aria-hidden="true" />
                Dossiê e rubrica
              </Link>
            </div>
          </div>

          <div>
            <p id="rotulo-progresso" className="font-bold text-lg">
              {completedCount} de 8 missões concluídas
            </p>
            <div
              role="progressbar"
              aria-labelledby="rotulo-progresso"
              aria-valuemin={0}
              aria-valuemax={8}
              aria-valuenow={completedCount}
              aria-valuetext={`${progressPercent}%`}
              className="mt-3 grid grid-cols-8 gap-1.5"
            >
              {STAGES.map((stg) => {
                const st = statusOf(stg.num);
                return (
                  <span
                    key={stg.num}
                    className={`h-3 rounded-full ${st.isCompleted ? '' : st.isCurrent ? 'bg-caneta-clara ring-2 ring-caneta ring-inset' : 'bg-linha'}`}
                    style={st.isCompleted ? { background: wireBackground(stg.num) } : undefined}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleSwitchStudent}
              className="btn btn-discreto mt-4 !px-2 -ml-2"
              title="Encerrar a sessão neste computador para outro aluno entrar"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Trocar aluno
            </button>
          </div>
        </section>

        <section aria-labelledby="titulo-portas">
          <h2 id="titulo-portas" className="text-2xl sm:text-3xl font-extrabold">
            Trilha investigativa
          </h2>
          <p className="mt-2 text-grafite-2">Cada porta é uma missão. Escolha uma para ver os detalhes.</p>

          <div className="lousa mt-5 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap gap-2 items-center justify-between text-giz-2 text-sm mb-4">
              <span className="font-display font-bold text-giz [font-stretch:80%] text-lg">Switch da trilha, 8 portas</span>
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="led led-verde" aria-hidden="true" />
                  concluída
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="led led-ambar" aria-hidden="true" />
                  atual
                </span>
              </span>
            </div>
            <ul className="grid grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-4">
              {STAGES.map((stg) => {
                const st = statusOf(stg.num);
                const selected = shownNum === stg.num;
                return (
                  <li key={stg.num}>
                    <button
                      type="button"
                      onClick={() => setSelectedPort(stg.num)}
                      aria-pressed={selected}
                      aria-label={`Missão ${stg.num}, ${stg.name}: ${stg.title}. ${st.label}.`}
                      className={`w-full rounded-xl p-2 sm:p-2.5 transition-colors ${
                        selected ? 'bg-lousa-3 ring-2 ring-marca' : 'bg-lousa-2 hover:bg-lousa-3'
                      }`}
                    >
                      <span className="flex justify-between px-1 mb-1.5" aria-hidden="true">
                        <span className={`led ${st.isCompleted ? 'led-verde' : 'led-apagado opacity-40'}`} />
                        <span className={`led ${st.isCurrent && !st.isClosed ? 'led-ambar led-piscando' : 'led-apagado opacity-40'}`} />
                      </span>
                      <span
                        aria-hidden="true"
                        className="relative block mx-auto w-full aspect-[5/4] rounded-md bg-[#0f1614] border-2 border-[#0a0f0e]"
                      >
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[42%] h-[22%] bg-lousa-2 rounded-t-sm" />
                        <span className="absolute inset-x-[14%] top-[18%] flex justify-between">
                          {Array.from({ length: 8 }).map((_, k) => (
                            <span key={k} className="w-[7%] h-1.5 bg-[#c9a227] rounded-[1px]" />
                          ))}
                        </span>
                        {st.isCompleted && (
                          <span
                            className="absolute inset-x-[22%] top-[38%] bottom-[22%] rounded-sm"
                            style={{ background: wireBackground(stg.num, 'vertical') }}
                          />
                        )}
                        {!st.isAvailable && <Lock className="absolute inset-0 m-auto w-4 h-4 text-giz-2/70" />}
                      </span>
                      <span aria-hidden="true" className="block mt-1.5 text-center font-display font-bold text-giz text-lg leading-none">
                        {stg.num}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={shown.num}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="folha mt-4 p-5 sm:p-7 grid sm:grid-cols-[auto_1fr_auto] gap-5 items-center"
              >
                <span
                  aria-hidden="true"
                  className="hidden sm:block w-3 self-stretch rounded-full"
                  style={{ background: wireBackground(shown.num, 'vertical') }}
                />
                <div>
                  <p className="text-grafite-2">
                    {shown.num === 8 ? 'Desafio integrador' : `Missão ${shown.num}, camada ${shown.name}`}
                    {', '}
                    <span
                      className={
                        shownStatus.isCompleted ? 'text-ok font-semibold' : shownStatus.isCurrent ? 'text-alerta font-semibold' : ''
                      }
                    >
                      {shownStatus.label.toLowerCase()}
                    </span>
                  </p>
                  <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold">{shown.title}</h3>
                  <p className="mt-1 text-grafite-2">{shown.desc}</p>
                </div>
                <div>
                  {shownStatus.isAvailable ? (
                    <Link
                      href={`/missao/${shown.num}`}
                      className={`btn w-full sm:w-auto ${shownStatus.isCompleted ? 'btn-secundario' : 'btn-primario'}`}
                    >
                      {shownStatus.isCompleted ? 'Revisar missão' : 'Investigar'}
                    </Link>
                  ) : (
                    <p className="flex items-center gap-2 text-grafite-2">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      {shownStatus.isClosed ? 'O professor ainda não liberou esta missão' : 'Conclua a etapa anterior'}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
