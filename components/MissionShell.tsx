'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ExternalLink, FlaskConical, Lightbulb, Lock, Wrench } from 'lucide-react';
import { isMissionOpen } from '@/lib/mission-availability';
import {
  MissionSimulationState,
  InvestigationHypothesis,
  TestExecutionRecord
} from '@/lib/types';
import {
  MISSIONS_CONFIG,
  MissionDefinition
} from '@/lib/simulation-engine';
import {
  getMissionSimulationState,
  updateMissionSimulationState,
  addHypothesisToNotebook,
  recordTestExecution,
  consolidateMission,
  updateTestInterpretation,
  getEvidenceNotebook,
  getActiveSession,
  getActiveStudent
} from '@/lib/storage';
import { OSI_LAYERS_DATA } from '@/lib/atlas-data';
import TopologyViewer from './TopologyViewer';
import { useReducedMotion } from './MotionProvider';
import { wireBackground } from '@/lib/wires';

interface Props {
  missionNumber: number;
}

export default function MissionShell({ missionNumber }: Props) {
  const router = useRouter();
  const config: MissionDefinition = MISSIONS_CONFIG[missionNumber];

  // Simulation state
  const [simulationState, setSimulationState] = useState<MissionSimulationState>(config.initialState);
  const [activeMoment, setActiveMoment] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('A');

  // Gradual Hints system (Pista 1, Pista 2, Pista 3)
  const [unlockedHintLevel, setUnlockedHintLevel] = useState<number>(0);

  // Form states
  const [hypothesisText, setHypothesisText] = useState('');
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [selectedTestKey, setSelectedTestKey] = useState<string>(config.availableTests[0]?.key || '');
  const [predictedResult, setPredictedResult] = useState('');
  const [testOutput, setTestOutput] = useState<{ output: string; success: boolean; diagnosticCode: string } | null>(null);
  const [testInterpretation, setTestInterpretation] = useState('');
  const [lastTestId, setLastTestId] = useState<string | null>(null);

  // Consolidation form states
  const [justificationText, setJustificationText] = useState('');
  const [identifiedCause, setIdentifiedCause] = useState('');
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [missionClosed, setMissionClosed] = useState(false);

  // Missions closed by the teacher cannot be worked on
  useEffect(() => {
    let active = true;
    setMissionClosed(false);
    isMissionOpen(missionNumber).then((open) => {
      if (active) setMissionClosed(!open);
    });
    return () => {
      active = false;
    };
  }, [missionNumber]);

  // Load state and reset per-mission form fields when missionNumber changes
  useEffect(() => {
    const student = getActiveStudent();
    const session = getActiveSession();
    if (!student || !session) {
      router.push('/acesso');
      return;
    }

    // Prevent bypassing locked missions via direct URL
    const isUnlocked =
      missionNumber <= session.currentStage ||
      session.completedMissions.includes(missionNumber);
    if (!isUnlocked) {
      router.push('/painel');
      return;
    }

    const savedState = getMissionSimulationState(missionNumber);
    setSimulationState(savedState);
    setActiveMoment('A');
    setUnlockedHintLevel(0);
    setHypothesisText('');
    setSelectedConceptIds([]);
    setSelectedTestKey(config.availableTests[0]?.key || '');
    setPredictedResult('');
    setTestOutput(null);
    setTestInterpretation('');
    setErrorFeedback(null);
    setSuccessFeedback(null);

    const notebook = getEvidenceNotebook();
    const existingConsolidation = notebook.consolidations[missionNumber];
    if (existingConsolidation) {
      setJustificationText(existingConsolidation.justificationText);
      setIdentifiedCause(existingConsolidation.identifiedCause);
    } else {
      setJustificationText('');
      setIdentifiedCause('');
    }
  }, [missionNumber, config.availableTests, router]);

  // Concept cards related to this layer (or L4 + L6 for the Integrator Mission 8)
  const layerData = OSI_LAYERS_DATA.find((l) => l.number === config.layerNumber);
  const relevantConcepts = layerData
    ? layerData.keyConcepts
    : OSI_LAYERS_DATA.filter((l) => l.number === 4 || l.number === 6).flatMap((l) => l.keyConcepts);

  // Handle concept selection for hypothesis
  const toggleConceptSelection = (id: string) => {
    if (selectedConceptIds.includes(id)) {
      setSelectedConceptIds(selectedConceptIds.filter((c) => c !== id));
    } else {
      setSelectedConceptIds([...selectedConceptIds, id]);
    }
  };

  // Submit Hypothesis (Momento C)
  const handleSubmitHypothesis = () => {
    if (hypothesisText.trim().length < 8) {
      setErrorFeedback('Escreva sua suspeita com mais detalhes: o que você acha que está acontecendo, e por quê.');
      return;
    }
    setErrorFeedback(null);
    addHypothesisToNotebook(missionNumber, hypothesisText, selectedConceptIds);
    setSuccessFeedback('Suspeita registrada no Caderno de Evidências.');
    setTimeout(() => {
      setSuccessFeedback(null);
      setActiveMoment('D');
    }, 1200);
  };

  // Execute Test (Momento D)
  const handleExecuteTest = () => {
    if (!predictedResult.trim()) {
      setErrorFeedback('Antes de executar o teste, você deve declarar sua previsão (o que espera observar).');
      return;
    }
    const testDef = config.availableTests.find((t) => t.key === selectedTestKey);
    if (!testDef) return;

    setErrorFeedback(null);
    const result = testDef.execute(simulationState);
    setTestOutput(result);

    saveTestInterpretation();
    const record = recordTestExecution({
      missionNumber,
      testKey: testDef.key,
      testName: testDef.label,
      predictedResult: predictedResult.trim(),
      actualResult: result.output,
      interpretation: '',
      success: result.success
    });
    setLastTestId(record.id);
    setTestInterpretation('');
  };

  // Interpretation is typed after the result is shown: save it on blur and when leaving Momento D
  const saveTestInterpretation = () => {
    if (lastTestId) {
      updateTestInterpretation(lastTestId, testInterpretation.trim());
    }
  };

  // Apply Intervention (Momento E)
  const handleApplyIntervention = (interventionKey: string) => {
    const intervention = config.interventions.find((i) => i.key === interventionKey);
    if (!intervention) return;

    const nextState = intervention.apply(simulationState);
    setSimulationState(nextState);
    updateMissionSimulationState(missionNumber, nextState, { key: intervention.key, label: intervention.label });
    setSuccessFeedback(`Intervenção "${intervention.label}" aplicada ao sistema! Verifique o novo comportamento.`);
    setTimeout(() => setSuccessFeedback(null), 3000);
  };

  // Submit Final Consolidation (Momento F)
  const handleConsolidateMission = async () => {
    if (justificationText.trim().length < 15) {
      setErrorFeedback('A justificativa técnica precisa conter pelo menos 15 caracteres explicando por que a solução funcionou.');
      return;
    }
    if (!simulationState.isResolved) {
      setErrorFeedback('O problema da simulação ainda não foi resolvido. Aplique a intervenção necessária no Momento E.');
      return;
    }
    // The teacher may have closed the mission while the student was working on it
    if (!(await isMissionOpen(missionNumber))) {
      setMissionClosed(true);
      return;
    }

    setErrorFeedback(null);
    consolidateMission({
      missionNumber,
      // Only what the student wrote: the expected answer must not be recorded as the student's own
      identifiedCause: identifiedCause.trim(),
      evidenceUsed: [selectedTestKey, ...selectedConceptIds],
      relatedLayers: [config.layerNumber],
      justificationText: justificationText.trim(),
      verificationConfirmed: true,
      submittedAt: new Date().toISOString()
    });

    setSuccessFeedback('Missão concluída com êxito! Registro processual salvo.');
    setTimeout(() => {
      if (missionNumber < 8) {
        router.push(`/missao/${missionNumber + 1}`);
      } else {
        router.push('/conclusao');
      }
    }, 1500);
  };

  if (missionClosed) {
    return (
      <div className="max-w-2xl py-6">
        <p className="flex items-center gap-2 text-grafite-2">
          <Lock className="w-5 h-5" aria-hidden="true" />
          {missionNumber === 8 ? 'Desafio integrador' : `Missão ${missionNumber} de 8`}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-extrabold [font-stretch:78%] leading-[1.04]">
          Esta missão está fechada
        </h1>
        <p className="mt-3 text-lg text-grafite-2">
          O professor ainda não liberou esta missão para a turma. Seu progresso está salvo. Volte quando ela for aberta.
        </p>
        <Link href="/painel" className="btn btn-primario mt-6">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar ao painel da missão
        </Link>
      </div>
    );
  }

  const momentIndex = MOMENTS.findIndex((m) => m.key === activeMoment);
  const goTo = (key: MomentKey) => setActiveMoment(key);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-grafite-2">
          <span className="flex items-center gap-2.5">
            <span aria-hidden="true" className="w-8 h-2.5 rounded-full" style={{ background: wireBackground(config.layerNumber || 0) }} />
            {missionNumber === 8 ? 'Desafio integrador' : `Missão ${missionNumber} de 8`}
            {', camada '}
            {config.layerNumber ? `${config.layerNumber} (${config.layerName})` : 'integrada'}
          </span>
          <span className="flex items-center gap-2 font-semibold" role="status">
            <span aria-hidden="true" className={`led ${simulationState.isResolved ? 'led-verde' : 'led-ambar led-piscando'}`} />
            <span className={simulationState.isResolved ? 'text-ok' : 'text-alerta'}>
              {simulationState.isResolved ? 'Problema resolvido' : 'Investigação em aberto'}
            </span>
          </span>
        </div>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-extrabold [font-stretch:78%] leading-[1.04]">{config.title}</h1>
        <p className="mt-2 text-lg text-grafite-2 max-w-3xl">{config.subtitle}</p>
        <div className="mt-5 max-w-3xl border-l-4 border-led-ambar bg-alerta-fundo rounded-r-xl px-5 py-4">
          <p className="font-bold">O que foi relatado</p>
          <p className="mt-1">{config.initialProblemDescription}</p>
        </div>
      </header>

      <TopologyViewer missionNumber={missionNumber} simulationState={simulationState} />

      <section aria-labelledby="titulo-investigacao" className="folha overflow-hidden">
        <h2 id="titulo-investigacao" className="sr-only">
          Etapas da investigação
        </h2>

        <nav aria-label="Momentos da investigação" className="border-b border-linha bg-papel/60">
          <ol className="flex md:grid md:grid-cols-6 overflow-x-auto snap-x px-2 sm:px-4 md:px-2">
            {MOMENTS.map((m, i) => {
              const isActive = activeMoment === m.key;
              const isPast = i < momentIndex;
              return (
                <li key={m.key} className="snap-start shrink-0 relative">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={`hidden md:block absolute top-[1.85rem] right-1/2 w-full h-[3px] -translate-x-[1.4rem] ${isPast || isActive ? 'bg-caneta' : 'bg-linha'}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => goTo(m.key)}
                    aria-current={isActive ? 'step' : undefined}
                    className={`relative flex md:flex-col items-center gap-2.5 md:gap-1.5 w-full min-h-14 px-2.5 sm:px-3 md:px-1 py-2 md:py-3 whitespace-nowrap md:whitespace-normal md:text-center font-semibold transition-colors ${
                      isActive ? 'text-caneta' : 'text-grafite-2 hover:text-grafite'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-display font-extrabold text-base border-2 transition-colors ${
                        isActive
                          ? 'bg-caneta border-caneta text-white'
                          : isPast
                          ? 'bg-caneta-clara border-caneta text-caneta'
                          : 'bg-folha border-linha-forte text-grafite-2'
                      }`}
                    >
                      {m.key}
                    </span>
                    <span>
                      <span className="sr-only">Momento {m.key}: </span>
                      {m.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div aria-live="assertive">
          <AnimatePresence initial={false}>
            {errorFeedback && (
              <motion.div
                key="erro"
                role="alert"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 sm:px-8 py-4 bg-erro-fundo text-erro flex items-start gap-2.5 border-b border-erro/20">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorFeedback}</span>
                </div>
              </motion.div>
            )}
            {successFeedback && (
              <motion.div
                key="ok"
                role="status"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 sm:px-8 py-4 bg-ok-fundo text-ok flex items-start gap-2.5 border-b border-ok/20 font-semibold">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{successFeedback}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 sm:px-8 py-7 min-h-[22rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeMoment}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.22, 0.8, 0.2, 1] }}
            >
              {/* MOMENTO A: OBSERVAÇÃO */}
              {activeMoment === 'A' && (
                <div className="space-y-5">
                  <MomentTitle letter="A" title="Observe os sinais da rede" />
                  <p className="text-grafite-2 max-w-2xl">
                    Olhe a topologia acima com calma. Estes são os comportamentos registrados pelos equipamentos:
                  </p>
                  <ol className="space-y-3 max-w-3xl">
                    {config.initialTopologySymptoms.map((symptom, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span aria-hidden="true" className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-papel border border-linha-forte flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{symptom}</span>
                      </li>
                    ))}
                  </ol>
                  <MomentNav onNext={() => goTo('B')} nextLabel="Consultar o Atlas" />
                </div>
              )}

              {/* MOMENTO B: CONSULTA AO ATLAS */}
              {activeMoment === 'B' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <MomentTitle letter="B" title="Consulte os conceitos da camada" />
                    <a
                      href={`/atlas?layer=${config.layerNumber || 4}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-discreto !px-2"
                    >
                      Abrir o Atlas completo
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  </div>
                  <p className="text-grafite-2 max-w-2xl">
                    Marque os conceitos que ajudam a explicar o que você observou. Eles vão junto com a sua suspeita.
                  </p>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {relevantConcepts.map((concept) => {
                      const isSelected = selectedConceptIds.includes(concept.id);
                      return (
                        <li key={concept.id}>
                          <button
                            type="button"
                            onClick={() => toggleConceptSelection(concept.id)}
                            aria-pressed={isSelected}
                            className={`w-full h-full text-left rounded-xl border-2 p-4 transition-colors ${
                              isSelected ? 'border-caneta bg-caneta-clara/50' : 'border-linha hover:border-linha-forte bg-folha'
                            }`}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className={`font-bold text-lg leading-snug ${isSelected ? 'marca-texto' : ''}`}>{concept.title}</span>
                              <span
                                aria-hidden="true"
                                className={`mt-1 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-caneta border-caneta text-white' : 'border-linha-forte'
                                }`}
                              >
                                {isSelected && <Check className="w-4 h-4" />}
                              </span>
                            </span>
                            <span className="block mt-1.5 text-grafite-2">{concept.description}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <MomentNav onBack={() => goTo('A')} onNext={() => goTo('C')} nextLabel="Escrever minha suspeita" />
                </div>
              )}

              {/* MOMENTO C: HIPÓTESE */}
              {activeMoment === 'C' && (
                <div className="space-y-5 max-w-3xl">
                  <MomentTitle letter="C" title="Qual é a sua suspeita?" />
                  <p className="text-grafite-2">
                    Com base no que você observou e nos conceitos que marcou, explique o que provavelmente está acontecendo.
                  </p>
                  <div>
                    <label htmlFor={`hipotese-${missionNumber}`} className="rotulo">
                      Minha suspeita
                    </label>
                    <textarea
                      id={`hipotese-${missionNumber}`}
                      value={hypothesisText}
                      onChange={(e) => setHypothesisText(e.target.value)}
                      rows={4}
                      placeholder="Eu suspeito que... porque observei que..."
                      className="campo leading-relaxed"
                    />
                    {selectedConceptIds.length > 0 && (
                      <p className="mt-2 text-sm text-grafite-2">
                        {selectedConceptIds.length === 1 ? '1 conceito marcado' : `${selectedConceptIds.length} conceitos marcados`} no
                        momento B.
                      </p>
                    )}
                  </div>
                  <MomentNav onBack={() => goTo('B')} onNext={handleSubmitHypothesis} nextLabel="Registrar suspeita" />
                </div>
              )}

              {/* MOMENTO D: PREVISÃO E TESTE */}
              {activeMoment === 'D' && (
                <div className="space-y-6">
                  <MomentTitle letter="D" title="Preveja e teste" />
                  <div className="grid gap-6 lg:grid-cols-2">
                    <fieldset>
                      <legend className="rotulo">Escolha o teste</legend>
                      <div className="space-y-2.5">
                        {config.availableTests.map((t) => {
                          const checked = selectedTestKey === t.key;
                          return (
                            <label
                              key={t.key}
                              className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                                checked ? 'border-caneta bg-caneta-clara/50' : 'border-linha hover:border-linha-forte'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`teste-${missionNumber}`}
                                value={t.key}
                                checked={checked}
                                onChange={() => setSelectedTestKey(t.key)}
                                className="mt-1 w-5 h-5 accent-caneta shrink-0"
                              />
                              <span>
                                <span className="block font-bold">{t.label}</span>
                                <span className="block text-grafite-2 mt-0.5">{t.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor={`previsao-${missionNumber}`} className="rotulo">
                          O que você prevê que o teste vai mostrar?
                        </label>
                        <input
                          id={`previsao-${missionNumber}`}
                          type="text"
                          value={predictedResult}
                          onChange={(e) => setPredictedResult(e.target.value)}
                          placeholder="Se minha suspeita estiver certa, o teste vai mostrar..."
                          className="campo"
                          aria-describedby={`previsao-ajuda-${missionNumber}`}
                        />
                        <p id={`previsao-ajuda-${missionNumber}`} className="mt-1.5 text-sm text-grafite-2">
                          Obrigatório antes de rodar o teste.
                        </p>
                      </div>
                      <button type="button" onClick={handleExecuteTest} className="btn btn-primario w-full">
                        <FlaskConical className="w-5 h-5" aria-hidden="true" />
                        Disparar teste diagnóstico
                      </button>

                      <AnimatePresence>
                        {testOutput && (
                          <motion.div
                            key={testOutput.output}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                          >
                            <div className="lousa rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-lousa-2 text-sm">
                                <span className="font-mono text-giz-2">{testOutput.diagnosticCode}</span>
                                <span className="flex items-center gap-2 font-semibold">
                                  <span aria-hidden="true" className={`led ${testOutput.success ? 'led-verde' : 'led-ambar'}`} />
                                  {testOutput.success ? 'Teste passou' : 'Anomalia detectada'}
                                </span>
                              </div>
                              <TerminalOutput text={testOutput.output} />
                            </div>
                            <div>
                              <label htmlFor={`interpretacao-${missionNumber}`} className="rotulo">
                                Como você interpreta este resultado?
                              </label>
                              <input
                                id={`interpretacao-${missionNumber}`}
                                type="text"
                                value={testInterpretation}
                                onChange={(e) => setTestInterpretation(e.target.value)}
                                onBlur={saveTestInterpretation}
                                placeholder="O resultado confirma ou contradiz minha previsão? Por quê?"
                                className="campo"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <MomentNav
                    onBack={() => goTo('C')}
                    onNext={() => {
                      saveTestInterpretation();
                      setActiveMoment('E');
                    }}
                    nextLabel="Ir para a intervenção"
                  />
                </div>
              )}

              {/* MOMENTO E: INTERVENÇÃO */}
              {activeMoment === 'E' && (
                <div className="space-y-5">
                  <MomentTitle letter="E" title="Intervenha no sistema" />
                  <p className="text-grafite-2 max-w-2xl">
                    Aplique a correção técnica e acompanhe na topologia se a comunicação volta.
                  </p>
                  <ul className="space-y-3">
                    {config.interventions.map((intervention) => (
                      <li
                        key={intervention.key}
                        className="rounded-xl border-2 border-linha p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-bold text-lg">{intervention.label}</p>
                          <p className="text-grafite-2 mt-0.5">{intervention.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyIntervention(intervention.key)}
                          className="btn btn-sucesso shrink-0"
                        >
                          <Wrench className="w-[18px] h-[18px]" aria-hidden="true" />
                          Aplicar correção
                        </button>
                      </li>
                    ))}
                  </ul>
                  <AnimatePresence>
                    {simulationState.isResolved && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                        className="rounded-xl bg-ok-fundo border border-ok/25 p-5 flex items-start gap-3"
                        role="status"
                      >
                        <motion.span
                          aria-hidden="true"
                          className="led led-verde mt-1.5"
                          initial={{ scale: 0.4 }}
                          animate={{ scale: [0.4, 1.6, 1] }}
                          transition={{ duration: 0.6 }}
                        />
                        <p>
                          <strong>A rede voltou a responder.</strong> Confira a topologia e siga para a consolidação para explicar o que você
                          fez.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <MomentNav onBack={() => goTo('D')} onNext={() => goTo('F')} nextLabel="Ir para a consolidação" />
                </div>
              )}

              {/* MOMENTO F: CONSOLIDAÇÃO */}
              {activeMoment === 'F' && (
                <div className="space-y-5 max-w-3xl">
                  <MomentTitle letter="F" title="Justifique a solução" />
                  <p className="text-grafite-2">
                    Para concluir a missão, explique a causa e por que a correção funcionou. O professor lê esta parte.
                  </p>
                  <div>
                    <label htmlFor={`causa-${missionNumber}`} className="rotulo">
                      Causa identificada
                    </label>
                    <input
                      id={`causa-${missionNumber}`}
                      type="text"
                      value={identifiedCause}
                      onChange={(e) => setIdentifiedCause(e.target.value)}
                      placeholder="Descreva, com suas palavras, a causa raiz da falha..."
                      className="campo"
                    />
                  </div>
                  <div>
                    <label htmlFor={`justificativa-${missionNumber}`} className="rotulo">
                      Justificativa técnica
                    </label>
                    <textarea
                      id={`justificativa-${missionNumber}`}
                      value={justificationText}
                      onChange={(e) => setJustificationText(e.target.value)}
                      rows={5}
                      placeholder="Por que esta camada era a responsável pela falha, e qual evidência mostrou isso?"
                      className="campo leading-relaxed"
                      aria-describedby={`justificativa-ajuda-${missionNumber}`}
                    />
                    <p id={`justificativa-ajuda-${missionNumber}`} className="mt-1.5 text-sm text-grafite-2">
                      {justificationText.trim().length < 15
                        ? `Escreva pelo menos 15 caracteres (${justificationText.trim().length} até agora).`
                        : 'Pronto para enviar.'}
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                    <button type="button" onClick={() => goTo('E')} className="btn btn-discreto">
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      Voltar
                    </button>
                    <button type="button" onClick={handleConsolidateMission} className="btn btn-sucesso !min-h-12 !px-6">
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      Consolidar missão e avançar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section aria-labelledby="titulo-pistas">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-pistas" className="text-2xl font-extrabold flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-led-ambar" aria-hidden="true" />
            Precisa de uma pista?
          </h2>
          <p className="text-grafite-2">Usar pistas não tira pontos.</p>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              level: 1,
              title: 'Pista 1: observação',
              text: 'Compare os LEDs e o ponto onde o pacote para na topologia. O que muda de um equipamento para o outro?',
            },
            {
              level: 2,
              title: 'Pista 2: evidências',
              text: 'Compare o resultado do teste de diagnóstico antes e depois da intervenção no painel.',
            },
            {
              level: 3,
              title: 'Pista 3: Atlas OSI',
              text: `Consulte a seção da Camada ${config.layerNumber || 'Integrada'} no Atlas OSI para revisar suas definições.`,
            },
          ].map((hint) => {
            const open = unlockedHintLevel >= hint.level;
            return (
              <li key={hint.level} className={`rounded-xl border-2 p-4 ${open ? 'border-led-ambar bg-alerta-fundo/60' : 'border-dashed border-linha-forte'}`}>
                <p className="font-bold">{hint.title}</p>
                <div aria-live="polite">
                  {open ? (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5">
                      {hint.text}
                    </motion.p>
                  ) : (
                    <button type="button" onClick={() => setUnlockedHintLevel(hint.level)} className="btn btn-discreto !px-2 mt-1 -ml-2">
                      Revelar pista
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

type MomentKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const MOMENTS: { key: MomentKey; label: string }[] = [
  { key: 'A', label: 'Observação' },
  { key: 'B', label: 'Consulta ao Atlas' },
  { key: 'C', label: 'Suspeita' },
  { key: 'D', label: 'Previsão e teste' },
  { key: 'E', label: 'Intervenção' },
  { key: 'F', label: 'Consolidação' },
];

function MomentTitle({ letter, title }: { letter: string; title: string }) {
  return (
    <h3 className="text-2xl sm:text-3xl font-extrabold">
      <span className="sr-only">Momento {letter}: </span>
      {title}
    </h3>
  );
}

function MomentNav({ onBack, onNext, nextLabel }: { onBack?: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="btn btn-discreto">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar
        </button>
      ) : (
        <span />
      )}
      <button type="button" onClick={onNext} className="btn btn-primario">
        {nextLabel}
      </button>
    </div>
  );
}

// Console output appears line by line, like a real terminal (instant with reduced motion).
function TerminalOutput({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const lines = text.split('\n');
  const [shown, setShown] = useState(reduced ? lines.length : 0);

  useEffect(() => {
    if (reduced) {
      setShown(lines.length);
      return;
    }
    setShown(0);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) window.clearInterval(timer);
    }, 110);
    return () => window.clearInterval(timer);
  }, [text, reduced, lines.length]);

  return (
    <pre className="px-4 py-3.5 font-mono text-[0.9rem] leading-relaxed whitespace-pre-wrap text-giz overflow-x-auto">
      <span aria-hidden="true">
        {lines.slice(0, shown).join('\n')}
        {shown < lines.length && <span className="inline-block w-2 h-4 bg-giz align-middle animate-pulse" />}
      </span>
      <span className="sr-only">{text}</span>
    </pre>
  );
}
