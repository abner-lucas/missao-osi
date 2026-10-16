'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Lock,
  Play,
  RotateCcw,
  BookOpen,
  ClipboardList,
  Layers,
  ArrowRight,
  Radio,
  Server,
  Laptop,
  Check,
  Award
} from 'lucide-react';
import Header from '@/components/Header';
import { getActiveStudent, getActiveSession, getEvidenceNotebook, clearActiveStudentSession } from '@/lib/storage';
import { StudentProfile, ActivitySession, EvidenceNotebook } from '@/lib/types';
import { MISSIONS_CONFIG } from '@/lib/simulation-engine';

export default function PainelPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [notebook, setNotebook] = useState<EvidenceNotebook | null>(null);

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
  }, [router]);

  if (!student) return null;

  const completedCount = session?.completedMissions.length || 0;
  const progressPercent = Math.round((completedCount / 8) * 100);
  const isAllCompleted = completedCount >= 8 || session?.status === 'concluido';

  const stages = [
    { num: 1, name: 'Física', title: 'O Sinal Desaparecido', icon: '⚡', desc: 'Cabos, conectores RJ-45 e sinais elétricos' },
    { num: 2, name: 'Enlace', title: 'O Caminho do Quadro', icon: '🔀', desc: 'Quadros Ethernet, MAC Address e Switch' },
    { num: 3, name: 'Rede', title: 'O Pacote Sem Caminho', icon: '🌐', desc: 'Endereçamento IP, Gateway Padrão e Roteamento' },
    { num: 4, name: 'Transporte', title: 'A Conexão Interrompida', icon: '🔄', desc: 'Portas lógicas e 3-Way Handshake TCP' },
    { num: 5, name: 'Sessão', title: 'O Diálogo Perdido', icon: '💬', desc: 'Tokens, sincronização e continuidade do diálogo' },
    { num: 6, name: 'Apresentação', title: 'Dados Sem Sentido', icon: '🔤', desc: 'Sintaxe, codificação UTF-8 e decodificação' },
    { num: 7, name: 'Aplicação', title: 'O Recurso Indisponível', icon: '📄', desc: 'Requisição HTTP GET e códigos 200 vs 404' },
    { num: 8, name: 'Integrador', title: 'Desafio Integrador', icon: '🏆', desc: 'Diagnóstico duplo e relatório final consolidado' },
  ];

  const currentStage = session?.currentStage || 1;

  const handleSwitchStudent = () => {
    clearActiveStudentSession();
    router.push('/acesso');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 space-y-8 w-full">
        {/* Welcome Banner & Progress Overview */}
        <section className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-cyan-400 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                SESSÃO ATIVA • {student.className}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Olá, {student.fullName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Acompanhe a trilha de restauração da rede pelas sete camadas do Modelo OSI.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Progresso Geral:</span>
                <span className="font-mono text-sm font-bold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">
                  {completedCount}/8 Etapas ({progressPercent}%)
                </span>
              </div>
              <div className="w-48 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={!isAllCompleted && currentStage <= 8 ? `/missao/${currentStage}` : '/conclusao'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {!isAllCompleted && currentStage <= 8
                    ? `Continuar: Etapa ${currentStage} (${stages[currentStage - 1].name})`
                    : 'Ver Relatório Final Concluído'}
                </span>
              </Link>

              <Link
                href="/atlas"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Abrir Atlas OSI</span>
              </Link>

              <Link
                href="/conclusao"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-purple-400" />
                <span>Dossiê & Rubrica</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleSwitchStudent}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
              title="Encerrar sessão ativa neste computador para permitir o acesso de outro aluno"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Trocar Aluno</span>
            </button>
          </div>
        </section>

        {/* 8 Stages Trilha / Journey Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Trilha Investigativa da Rede
              </h2>
              <p className="text-xs text-slate-400">
                Acesse cada etapa para analisar fenômenos, testar hipóteses e consolidar seu aprendizado:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stages.map((stg) => {
              const isCompleted = session?.completedMissions.includes(stg.num);
              const isAvailable = stg.num <= currentStage || isCompleted;
              const isCurrent = stg.num === currentStage && !isCompleted;

              let statusLabel = 'Bloqueada';
              let badgeStyle = 'bg-slate-900 text-slate-500 border-slate-800';

              if (isCompleted) {
                statusLabel = 'Concluída';
                badgeStyle = 'bg-emerald-950 text-emerald-400 border-emerald-800';
              } else if (isCurrent) {
                statusLabel = 'Em Investigação';
                badgeStyle = 'bg-cyan-950 text-cyan-300 border-cyan-800 animate-pulse';
              } else if (isAvailable) {
                statusLabel = 'Disponível';
                badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
              }

              return (
                <div
                  key={stg.num}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'bg-slate-900 border-cyan-500/80 ring-1 ring-cyan-500/30 shadow-lg'
                      : isCompleted
                      ? 'bg-slate-900/80 border-slate-800'
                      : isAvailable
                      ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{stg.icon}</span>
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] font-mono text-cyan-400 font-semibold">
                        {stg.num === 8 ? 'Desafio Integrador' : `Camada ${stg.num} — ${stg.name}`}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-0.5">
                        {stg.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">
                        {stg.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 mt-4">
                    {isAvailable ? (
                      <Link
                        href={`/missao/${stg.num}`}
                        className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          isCurrent
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                            : isCompleted
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Revisar Missão</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Investigar</span>
                          </>
                        )}
                      </Link>
                    ) : (
                      <div className="py-2 text-center text-xs text-slate-600 flex items-center justify-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        <span>Conclua a etapa anterior</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
