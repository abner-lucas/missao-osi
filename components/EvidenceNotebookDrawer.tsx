'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, FlaskConical, BookOpen, FileText, Award } from 'lucide-react';
import { getEvidenceNotebook, getActiveSession } from '@/lib/storage';
import { EvidenceNotebook, ActivitySession } from '@/lib/types';
import { OSI_LAYERS_DATA } from '@/lib/atlas-data';
import { calculateRubricScore, getTotalScore } from '@/lib/simulation-engine';
import { wireBackground } from '@/lib/wires';
import Dialog from './Dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'hipoteses' | 'testes' | 'conceitos' | 'justificativas' | 'rubrica';

function Empty({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-linha-forte bg-folha/80 p-6 text-center text-grafite-2">
      <Icon className="w-8 h-8 mx-auto mb-2 text-grafite-3" />
      <p className="max-w-sm mx-auto">{children}</p>
    </div>
  );
}

const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Recente';

export default function EvidenceNotebookDrawer({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('hipoteses');
  const [notebook, setNotebook] = useState<EvidenceNotebook | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (isOpen) {
      setNotebook(getEvidenceNotebook());
      setSession(getActiveSession());
    }
  }, [isOpen]);

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

  const tabs: { key: Tab; label: string; count: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'hipoteses', label: 'Suspeitas', count: String(currentNotebook.hypotheses.length), icon: Lightbulb },
    { key: 'testes', label: 'Testes', count: String(currentNotebook.tests.length), icon: FlaskConical },
    { key: 'conceitos', label: 'Conceitos', count: String(currentNotebook.savedConceptIds.length), icon: BookOpen },
    { key: 'justificativas', label: 'Consolidações', count: String(Object.keys(currentNotebook.consolidations).length), icon: FileText },
    { key: 'rubrica', label: 'Rubrica', count: `${totalScore}/10`, icon: Award },
  ];

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].key);
    tabRefs.current[tabs[next].key]?.focus();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      variant="lateral"
      title="Caderno de Evidências"
      description="Suas suspeitas, testes, conceitos e justificativas, salvos automaticamente."
      closeLabel="Fechar Caderno de Evidências"
      bodyClassName="quadriculado !p-0"
      footer={<p className="text-sm text-grafite-2 text-center">Registros salvos neste navegador e no banco da escola.</p>}
    >
      <div role="tablist" aria-label="Seções do caderno" className="sticky top-0 z-10 flex overflow-x-auto bg-folha border-b border-linha px-3">
        {tabs.map((t, i) => {
          const selected = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`aba-${t.key}`}
              aria-selected={selected}
              aria-controls={`painel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`shrink-0 flex items-center gap-2 min-h-12 px-3 border-b-[3px] font-semibold whitespace-nowrap transition-colors ${
                selected ? 'border-caneta text-caneta' : 'border-transparent text-grafite-2 hover:text-grafite'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {t.label}
              <span className={`text-sm rounded-full px-2 ${selected ? 'bg-caneta-clara' : 'bg-papel'}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`painel-${tab}`} aria-labelledby={`aba-${tab}`} tabIndex={0} className="p-4 sm:p-6 space-y-3 outline-none">
        {tab === 'hipoteses' &&
          (currentNotebook.hypotheses.length === 0 ? (
            <Empty icon={Lightbulb}>Nenhuma suspeita ainda. Você escreve a primeira no momento C de uma missão.</Empty>
          ) : (
            currentNotebook.hypotheses.map((h, i) => (
              <article key={h.id || i} className="rounded-xl bg-folha border border-linha p-4">
                <p className="flex justify-between text-sm text-grafite-2">
                  <span className="font-semibold">Missão {h.missionNumber}</span>
                  <span>{time(h.createdAt)}</span>
                </p>
                <p className="mt-1.5 text-lg leading-snug">{h.statement}</p>
                {h.selectedConceptIds && h.selectedConceptIds.length > 0 && (
                  <p className="mt-2 text-sm text-grafite-2">
                    Conceitos: {h.selectedConceptIds.map((cid) => <span key={cid} className="marca-texto mr-2 font-mono">{cid}</span>)}
                  </p>
                )}
              </article>
            ))
          ))}

        {tab === 'testes' &&
          (currentNotebook.tests.length === 0 ? (
            <Empty icon={FlaskConical}>Nenhum teste ainda. Os testes aparecem aqui depois do momento D.</Empty>
          ) : (
            currentNotebook.tests.map((t, i) => (
              <article key={t.id || i} className="rounded-xl bg-folha border border-linha p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-extrabold">{t.testName}</h3>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span aria-hidden="true" className={`led ${t.success ? 'led-verde' : 'led-ambar'}`} />
                    {t.success ? 'Conexão OK' : 'Falha detectada'}
                  </span>
                </div>
                <dl className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm text-grafite-2">Minha previsão</dt>
                    <dd>{t.predictedResult || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-grafite-2">Minha interpretação</dt>
                    <dd>{t.interpretation || 'Pendente'}</dd>
                  </div>
                </dl>
                <pre className="lousa rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">{t.actualResult}</pre>
              </article>
            ))
          ))}

        {tab === 'conceitos' &&
          (currentNotebook.savedConceptIds.length === 0 ? (
            <Empty icon={BookOpen}>
              Nenhum conceito salvo. No <strong>Atlas OSI</strong>, use &quot;Salvar no caderno&quot; para guardar os que ajudarem.
            </Empty>
          ) : (
            currentNotebook.savedConceptIds.map((cid) => {
              let foundConcept: { id: string; title: string; description: string; realWorldExample: string } | undefined;
              let foundLayer = 0;
              for (const l of OSI_LAYERS_DATA) {
                const c = l.keyConcepts.find((k) => k.id === cid);
                if (c) {
                  foundConcept = c;
                  foundLayer = l.number;
                  break;
                }
              }
              if (!foundConcept) {
                return (
                  <p key={cid} className="rounded-xl bg-folha border border-linha p-4 font-mono">
                    Conceito: {cid}
                  </p>
                );
              }
              return (
                <article key={cid} className="rounded-xl bg-folha border border-linha p-4 flex gap-4">
                  <span aria-hidden="true" className="w-2 self-stretch rounded-full shrink-0" style={{ background: wireBackground(foundLayer, 'vertical') }} />
                  <div>
                    <p className="text-sm text-grafite-2">Camada {foundLayer}</p>
                    <h3 className="text-lg font-extrabold">{foundConcept.title}</h3>
                    <p className="mt-1">{foundConcept.description}</p>
                    <p className="mt-2 text-grafite-2">
                      <strong className="text-grafite">Na prática:</strong> {foundConcept.realWorldExample}
                    </p>
                  </div>
                </article>
              );
            })
          ))}

        {tab === 'justificativas' &&
          (Object.keys(currentNotebook.consolidations).length === 0 ? (
            <Empty icon={FileText}>Nenhuma missão consolidada. A justificativa é escrita no momento F.</Empty>
          ) : (
            Object.values(currentNotebook.consolidations).map((c) => (
              <article key={c.missionNumber} className="rounded-xl bg-folha border border-linha p-4">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-lg font-extrabold">Missão {c.missionNumber}</span>
                  <span className="flex items-center gap-2 text-ok font-semibold text-sm">
                    <span aria-hidden="true" className="led led-verde" />
                    Concluída
                  </span>
                </p>
                <p className="mt-2 leading-relaxed">{c.justificationText}</p>
              </article>
            ))
          ))}

        {tab === 'rubrica' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-folha border border-linha p-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-grafite-2">Pontuação preliminar</p>
                <p className="font-display font-extrabold text-5xl leading-none mt-1">
                  {totalScore.toFixed(1)}
                  <span className="text-2xl text-grafite-2 font-bold"> / 10</span>
                </p>
              </div>
              <p className="text-sm text-grafite-2 max-w-[15rem]">Conta o raciocínio, as previsões e as justificativas. O professor revisa.</p>
            </div>
            <ul className="rounded-xl bg-folha border border-linha divide-y divide-linha">
              {Object.values(rubric).map((item) => {
                const score = item.teacherScore !== undefined ? item.teacherScore : item.autoScore;
                return (
                  <li key={item.criterionKey} className="p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{item.title}</span>
                      <span className="font-bold whitespace-nowrap">
                        {score.toFixed(1)} / {item.maxScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-papel overflow-hidden" aria-hidden="true">
                      <div className="h-full rounded-full bg-caneta" style={{ width: `${(score / item.maxScore) * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-sm text-grafite-2">
                      {item.status === 'revisado_professor' ? 'Validado pelo professor' : 'Cálculo automático do processo'}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
