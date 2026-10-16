'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardList,
  Lightbulb,
  FlaskConical,
  BookOpen,
  CheckCircle2,
  FileText,
  Clock,
  Award
} from 'lucide-react';
import { getEvidenceNotebook, getActiveSession } from '@/lib/storage';
import { EvidenceNotebook, ActivitySession } from '@/lib/types';
import { OSI_LAYERS_DATA } from '@/lib/atlas-data';
import { calculateRubricScore, getTotalScore } from '@/lib/simulation-engine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EvidenceNotebookDrawer({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'hipoteses' | 'testes' | 'conceitos' | 'justificativas' | 'rubrica'>('hipoteses');
  const [notebook, setNotebook] = useState<EvidenceNotebook | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNotebook(getEvidenceNotebook());
      setSession(getActiveSession());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentNotebook: EvidenceNotebook = notebook || {
    hypotheses: [],
    tests: [],
    savedConceptIds: [],
    consolidations: {}
  };

  const rubric = calculateRubricScore({
    completedMissions: session?.completedMissions || [],
    hypotheses: currentNotebook.hypotheses,
    tests: currentNotebook.tests,
    savedConceptIds: currentNotebook.savedConceptIds,
    consolidations: currentNotebook.consolidations
  });

  const totalScore = getTotalScore(rubric);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end transition-opacity" role="dialog" aria-modal="true" aria-labelledby="notebook-title">
      <div className="w-full max-w-2xl bg-[#0F172A] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0B1120]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 id="notebook-title" className="text-base font-bold text-white tracking-tight">
                Caderno de Evidências do Aluno
              </h2>
              <p className="text-xs text-slate-400">
                Registro contínuo de observações, testes, hipóteses e justificativas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar Caderno de Evidências"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0A0F1D] px-3 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setTab('hipoteses')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'hipoteses'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Hipóteses ({currentNotebook.hypotheses.length})</span>
          </button>
          <button
            onClick={() => setTab('testes')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'testes'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
            <span>Testes ({currentNotebook.tests.length})</span>
          </button>
          <button
            onClick={() => setTab('conceitos')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'conceitos'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Conceitos Atlas ({currentNotebook.savedConceptIds.length})</span>
          </button>
          <button
            onClick={() => setTab('justificativas')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'justificativas'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Consolidações ({Object.keys(currentNotebook.consolidations).length})</span>
          </button>
          <button
            onClick={() => setTab('rubrica')}
            className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'rubrica'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            <span>Rubrica ({totalScore}/10)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'hipoteses' && (
            <div className="space-y-3">
              {currentNotebook.hypotheses.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-400 text-sm">
                  <Lightbulb className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  Nenhuma hipótese formulada ainda. Ao iniciar uma missão, você poderá registrar suas deduções sobre as falhas.
                </div>
              ) : (
                currentNotebook.hypotheses.map((h, i) => (
                  <div key={h.id || i} className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                        Missão {h.missionNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {h.createdAt ? new Date(h.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Recente'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium">
                      "{h.statement}"
                    </p>
                    {h.selectedConceptIds && h.selectedConceptIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {h.selectedConceptIds.map((cid) => (
                          <span key={cid} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            #{cid}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'testes' && (
            <div className="space-y-3">
              {currentNotebook.tests.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-400 text-sm">
                  <FlaskConical className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  Nenhum teste de diagnóstico executado ainda. Escolha um teste durante o Momento D da sua investigação.
                </div>
              ) : (
                currentNotebook.tests.map((t, i) => (
                  <div key={t.id || i} className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-sm">
                        {t.testName}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                        t.success
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}>
                        {t.success ? 'Conexão OK' : 'Falha Detectada'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-400 block mb-0.5">Previsão do Aluno:</span>
                        <span className="text-slate-300 italic">{t.predictedResult || 'Não informada'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-400 block mb-0.5">Interpretação:</span>
                        <span className="text-slate-200">{t.interpretation || 'Pendente'}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 font-mono text-slate-300 text-[11px] whitespace-pre-wrap border border-slate-800/80">
                      {t.actualResult}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'conceitos' && (
            <div className="space-y-3">
              {currentNotebook.savedConceptIds.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-400 text-sm">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  Nenhum conceito salvo ainda. Acesse o <strong>Atlas OSI</strong> e clique em <em>"Adicionar ao Caderno"</em> para fundamentar suas análises.
                </div>
              ) : (
                currentNotebook.savedConceptIds.map((cid) => {
                  let foundConcept: { id: string; title: string; description: string; realWorldExample: string } | undefined;
                  let foundLayer = 0;
                  for (const l of OSI_LAYERS_DATA) {
                    const c = l.keyConcepts.find(k => k.id === cid);
                    if (c) {
                      foundConcept = c;
                      foundLayer = l.number;
                      break;
                    }
                  }
                  if (!foundConcept) {
                    return (
                      <div key={cid} className="p-3 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                        Conceito: #{cid}
                      </div>
                    );
                  }
                  return (
                    <div key={cid} className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white text-sm">
                          {foundConcept.title}
                        </span>
                        <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 text-[10px]">
                          Camada {foundLayer}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {foundConcept.description}
                      </p>
                      <p className="text-[11px] text-slate-400 italic">
                        Exemplo prático: {foundConcept.realWorldExample}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'justificativas' && (
            <div className="space-y-3">
              {Object.keys(currentNotebook.consolidations).length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-400 text-sm">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  Nenhuma missão consolidada ainda. Ao resolver o problema de cada camada, você redigirá a justificativa técnica.
                </div>
              ) : (
                Object.values(currentNotebook.consolidations).map((c) => (
                  <div key={c.missionNumber} className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white text-sm">
                        Consolidação da Missão {c.missionNumber}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluída
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                      <span className="text-slate-400 block mb-1 font-medium">Justificativa do Aluno:</span>
                      "{c.justificationText}"
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'rubrica' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Pontuação Preliminar do Processo
                  </div>
                  <div className="text-2xl font-black text-white font-mono mt-0.5">
                    {totalScore.toFixed(1)} <span className="text-slate-500 text-base font-normal">/ 10,0</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 max-w-[200px]">
                  Baseada em raciocínio, previsões e justificativas técnicas analisáveis pelo professor.
                </div>
              </div>

              <div className="space-y-2">
                {Object.values(rubric).map((item) => (
                  <div key={item.criterionKey} className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-slate-200">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.status === 'revisado_professor'
                          ? 'Validado pelo docente'
                          : 'Cálculo automatizado do processo investigativo'}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold text-cyan-400">
                      {(item.teacherScore !== undefined ? item.teacherScore : item.autoScore).toFixed(1)} / {item.maxScore.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0B1120] text-center text-xs text-slate-400">
          Missão OSI • Registros de investigação salvos localmente e no banco
        </div>
      </div>
    </div>
  );
}
