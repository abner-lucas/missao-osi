'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  Lightbulb,
  FlaskConical,
  Wrench,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Info,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  HelpCircle
} from 'lucide-react';
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
  getEvidenceNotebook,
  getActiveSession,
  getActiveStudent
} from '@/lib/storage';
import { OSI_LAYERS_DATA } from '@/lib/atlas-data';
import TopologyViewer from './TopologyViewer';

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

  // Consolidation form states
  const [justificationText, setJustificationText] = useState('');
  const [identifiedCause, setIdentifiedCause] = useState('');
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

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
      setErrorFeedback('Por favor, escreva uma hipótese mais detalhada explicando o que você suspeita.');
      return;
    }
    setErrorFeedback(null);
    addHypothesisToNotebook(missionNumber, hypothesisText, selectedConceptIds);
    setSuccessFeedback('Hipótese registrada com sucesso no Caderno de Evidências!');
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

    recordTestExecution({
      missionNumber,
      testKey: testDef.key,
      testName: testDef.label,
      predictedResult: predictedResult.trim(),
      actualResult: result.output,
      interpretation: testInterpretation.trim(),
      success: result.success
    });
  };

  // Apply Intervention (Momento E)
  const handleApplyIntervention = (interventionKey: string) => {
    const intervention = config.interventions.find((i) => i.key === interventionKey);
    if (!intervention) return;

    const nextState = intervention.apply(simulationState);
    setSimulationState(nextState);
    updateMissionSimulationState(missionNumber, nextState);
    setSuccessFeedback(`Intervenção "${intervention.label}" aplicada ao sistema! Verifique o novo comportamento.`);
    setTimeout(() => setSuccessFeedback(null), 3000);
  };

  // Submit Final Consolidation (Momento F)
  const handleConsolidateMission = () => {
    if (justificationText.trim().length < 15) {
      setErrorFeedback('A justificativa técnica precisa conter pelo menos 15 caracteres explicando por que a solução funcionou.');
      return;
    }
    if (!simulationState.isResolved) {
      setErrorFeedback('O problema da simulação ainda não foi resolvido. Aplique a intervenção necessária no Momento E.');
      return;
    }

    setErrorFeedback(null);
    consolidateMission({
      missionNumber,
      identifiedCause: identifiedCause || config.correctCauseSummary,
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

  return (
    <div className="space-y-6">
      {/* Mission Title Header */}
      <div className="p-6 bg-[#0F172A] border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {missionNumber === 8 ? 'Desafio Integrador' : `Missão ${missionNumber} de 8`}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-semibold text-slate-300">
              Camada {config.layerNumber ? `${config.layerNumber} (${config.layerName})` : 'Integrada'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold border ${
              simulationState.isResolved
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              {simulationState.isResolved ? 'Problema Resolvido' : 'Investigação em Aberto'}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {config.title}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {config.subtitle}
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/90 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200">Sintoma Principal:</strong> {config.initialProblemDescription}
          </div>
        </div>
      </div>

      {/* Network Topology Simulation */}
      <TopologyViewer
        missionNumber={missionNumber}
        simulationState={simulationState}
      />

      {/* 6 Moments Investigation Workflow */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {/* Moments Nav Strip */}
        <div className="flex border-b border-slate-800 bg-[#0B1120] overflow-x-auto text-xs font-medium">
          {[
            { key: 'A', label: 'A. Observação' },
            { key: 'B', label: 'B. Consulta Atlas' },
            { key: 'C', label: 'C. Hipótese' },
            { key: 'D', label: 'D. Previsão & Teste' },
            { key: 'E', label: 'E. Intervenção' },
            { key: 'F', label: 'F. Consolidação' },
          ].map((m) => {
            const isActive = activeMoment === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setActiveMoment(m.key as any)}
                className={`py-3 px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback message banner */}
        {errorFeedback && (
          <div className="p-3 bg-red-950/80 border-b border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
        )}
        {successFeedback && (
          <div className="p-3 bg-emerald-950/80 border-b border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successFeedback}</span>
          </div>
        )}

        {/* Moments Body */}
        <div className="p-6">
          {/* MOMENTO A: OBSERVAÇÃO */}
          {activeMoment === 'A' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                Momento A: Observação dos Fenômenos de Rede
              </h2>
              <p className="text-xs text-slate-300">
                Observe atentamente os indicadores visuais na topologia acima e verifique as anomalias registradas pelos equipamentos:
              </p>

              <div className="space-y-2">
                {config.initialTopologySymptoms.map((symptom, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] text-cyan-400 shrink-0">
                      {i + 1}
                    </span>
                    <span>{symptom}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setActiveMoment('B')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <span>Prosseguir para Consulta ao Atlas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* MOMENTO B: CONSULTA AO ATLAS */}
          {activeMoment === 'B' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Momento B: Consulta aos Conceitos do Atlas OSI
                </h2>
                <a
                  href={`/atlas?layer=${config.layerNumber || 4}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Abrir Atlas Completo em nova aba</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-xs text-slate-300">
                Selecione abaixo os conceitos técnicos pertinentes a esta camada que ajudarão a formular sua hipótese investigativa:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relevantConcepts.map((concept) => {
                  const isSelected = selectedConceptIds.includes(concept.id);
                  return (
                    <div
                      key={concept.id}
                      onClick={() => toggleConceptSelection(concept.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/40 text-white'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-xs font-bold text-slate-200">
                          {concept.title}
                        </h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isSelected
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {isSelected ? 'Selecionado' : 'Clique para Vincular'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {concept.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 flex justify-between">
                <button
                  onClick={() => setActiveMoment('A')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setActiveMoment('C')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <span>Avançar para Formular Hipótese</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* MOMENTO C: HIPÓTESE */}
          {activeMoment === 'C' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Momento C: Formulação de Hipótese Investigativa
              </h2>
              <p className="text-xs text-slate-300">
                Com base no que você observou e nos conceitos consultados, qual é a sua explicação provável para o problema nesta camada?
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Declaração da sua hipótese:
                </label>
                <textarea
                  value={hypothesisText}
                  onChange={(e) => setHypothesisText(e.target.value)}
                  rows={3}
                  placeholder="Ex: Suspeito que a ausência de sinal ocorra porque o conector RJ-45 está fisicamente solto da porta..."
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setActiveMoment('B')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmitHypothesis}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <span>Registrar Hipótese e Prosseguir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* MOMENTO D: PREVISÃO E TESTE */}
          {activeMoment === 'D' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-blue-400" />
                Momento D: Previsão e Execução de Teste Diagnóstico
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select test */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    Selecione o teste de rede a executar:
                  </label>
                  <div className="space-y-2">
                    {config.availableTests.map((t) => (
                      <div
                        key={t.key}
                        onClick={() => setSelectedTestKey(t.key)}
                        className={`p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                          selectedTestKey === t.key
                            ? 'bg-slate-900 border-cyan-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-slate-200">{t.label}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{t.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Previsão do Aluno (obrigatória) */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    O que você PREVÊ que o teste irá retornar? (Obrigatório antes de executar)
                  </label>
                  <input
                    type="text"
                    value={predictedResult}
                    onChange={(e) => setPredictedResult(e.target.value)}
                    placeholder="Ex: Prevejo que a tensão será 0V e o link constará como down."
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />

                  <button
                    onClick={handleExecuteTest}
                    className="w-full py-2.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FlaskConical className="w-4 h-4" />
                    <span>Disparar Teste Diagnóstico</span>
                  </button>
                </div>
              </div>

              {/* Test Output Console */}
              {testOutput && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-400 font-bold">
                      CONSOLE DE EXECUÇÃO: [{testOutput.diagnosticCode}]
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                      testOutput.success
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {testOutput.success ? 'TEST PASS' : 'ANOMALY DETECTED'}
                    </span>
                  </div>
                  <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {testOutput.output}
                  </pre>

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Sua interpretação deste resultado:
                    </label>
                    <input
                      type="text"
                      value={testInterpretation}
                      onChange={(e) => setTestInterpretation(e.target.value)}
                      placeholder="Ex: O resultado confirmou a falta de sinal físico no par trançado."
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-between">
                <button
                  onClick={() => setActiveMoment('C')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setActiveMoment('E')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <span>Prosseguir para Intervenção</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* MOMENTO E: INTERVENÇÃO */}
          {activeMoment === 'E' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                Momento E: Reavaliação e Intervenção no Sistema
              </h2>
              <p className="text-xs text-slate-300">
                Aplique a intervenção técnica adequada para corrigir a falha na camada e restabelecer a comunicação:
              </p>

              <div className="space-y-3">
                {config.interventions.map((intervention) => (
                  <div
                    key={intervention.key}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">
                        {intervention.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {intervention.description}
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyIntervention(intervention.key)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
                    >
                      Aplicar Correção
                    </button>
                  </div>
                ))}
              </div>

              {simulationState.isResolved && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">Intervenção bem-sucedida!</span> O estado da topologia foi atualizado. Vá para a Consolidação para registrar sua justificativa técnica.
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-between">
                <button
                  onClick={() => setActiveMoment('D')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setActiveMoment('F')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                >
                  <span>Prosseguir para Consolidação</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* MOMENTO F: CONSOLIDAÇÃO */}
          {activeMoment === 'F' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                Momento F: Consolidação Justificada da Investigação
              </h2>
              <p className="text-xs text-slate-300">
                Para concluir esta missão e liberar a próxima etapa, redija uma justificativa técnica concisa explicando a causa raiz e como a intervenção resolveu o problema:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Causa Raiz Identificada:
                  </label>
                  <input
                    type="text"
                    value={identifiedCause}
                    onChange={(e) => setIdentifiedCause(e.target.value)}
                    placeholder={config.correctCauseSummary}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Justificativa Técnica do Aluno (Será analisada pelo Professor):
                  </label>
                  <textarea
                    value={justificationText}
                    onChange={(e) => setJustificationText(e.target.value)}
                    rows={4}
                    placeholder="Explique por que esta camada era a responsável pela falha e como a evidência observada comprovou isso..."
                    className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-between items-center">
                <button
                  onClick={() => setActiveMoment('E')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConsolidateMission}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Consolidar Missão & Avançar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gradual Pedagogical Hints (Pista 1, 2, 3) */}
      <div className="p-4 bg-[#0F172A] border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            Sistema de Pistas Pedagógicas Graduais
          </span>
          <span className="text-[11px] text-slate-500">
            Disponível sem penalização de nota
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Pista 1 */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-300">
              <span>Pista 1: Observação</span>
              {unlockedHintLevel < 1 ? (
                <button
                  onClick={() => setUnlockedHintLevel(1)}
                  className="text-[10px] font-mono text-cyan-400 hover:underline"
                >
                  Revelar
                </button>
              ) : (
                <span className="text-[10px] text-emerald-400">Ativa</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {unlockedHintLevel >= 1
                ? 'Verifique os LEDs de status na topologia e observe se há sinal físico ou tráfego de bits na porta.'
                : 'Clique em "Revelar" para obter uma orientação de observação.'}
            </p>
          </div>

          {/* Pista 2 */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-300">
              <span>Pista 2: Evidências</span>
              {unlockedHintLevel < 2 ? (
                <button
                  onClick={() => setUnlockedHintLevel(2)}
                  className="text-[10px] font-mono text-cyan-400 hover:underline"
                >
                  Revelar
                </button>
              ) : (
                <span className="text-[10px] text-emerald-400">Ativa</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {unlockedHintLevel >= 2
                ? 'Compare o resultado do teste de diagnóstico antes e depois da intervenção no painel.'
                : 'Clique em "Revelar" para comparar evidências.'}
            </p>
          </div>

          {/* Pista 3 */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-300">
              <span>Pista 3: Atlas OSI</span>
              {unlockedHintLevel < 3 ? (
                <button
                  onClick={() => setUnlockedHintLevel(3)}
                  className="text-[10px] font-mono text-cyan-400 hover:underline"
                >
                  Revelar
                </button>
              ) : (
                <span className="text-[10px] text-emerald-400">Ativa</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {unlockedHintLevel >= 3
                ? `Consulte a seção da Camada ${config.layerNumber || 'Integrada'} no Atlas OSI para revisar suas definições.`
                : 'Clique em "Revelar" para ver o direcionamento conceitual.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
