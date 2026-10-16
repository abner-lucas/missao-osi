'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Layers,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Info,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { ENCAPSULATION_STEPS } from '@/lib/atlas-data';
import { getReducedMotionPreference } from '@/lib/storage';

export default function EncapsulationAnimator() {
  // Step sequence: 0 to 6 (Host A encapsulation L7 to L1), 7 (Medium transmission), 8 to 14 (Host B decapsulation L1 to L7)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    setReducedMotion(getReducedMotionPreference());
    const onMotionChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setReducedMotion(Boolean(customEvent.detail));
    };
    window.addEventListener('missao-osi-motion-change', onMotionChange);
    return () => window.removeEventListener('missao-osi-motion-change', onMotionChange);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 14) {
          setIsPlaying(false);
          return 14;
        }
        return prev + 1;
      });
    }, reducedMotion ? 1800 : 1200);
    return () => clearInterval(timer);
  }, [isPlaying, reducedMotion]);

  // Determine stage details
  const isHostA = currentStep <= 6;
  const isMedium = currentStep === 7;
  const isHostB = currentStep >= 8;

  // Keep selectedLayerIndex synced with active animation step
  useEffect(() => {
    if (currentStep <= 6) {
      setSelectedLayerIndex(currentStep);
    } else if (currentStep === 7) {
      setSelectedLayerIndex(6);
    } else {
      setSelectedLayerIndex(14 - currentStep);
    }
  }, [currentStep]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(14, prev + 1));
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Header Bar */}
      <div className="p-4 bg-[#0B1120] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Simulador de Encapsulamento & Desencapsulamento
          </h3>
          <p className="text-xs text-slate-400">
            Acompanhe o trajeto dos dados: da camada de aplicação do emissor aos sinais físicos e à entrega no receptor
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isPlaying ? 'Pausar' : 'Reproduzir sequencialmente'}
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir sequencialmente'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Passo anterior"
            aria-label="Passo anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep === 14}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Próximo passo"
            aria-label="Próximo passo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reiniciar"
            aria-label="Reiniciar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
            Passo {currentStep + 1}/15
          </span>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="p-6 bg-[#070B14] grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Host A (Origem) */}
        <div className="lg:col-span-5 bg-[#0F172A]/80 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sm text-slate-200">
              Host A — Origem (PC Aluno)
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
              {isHostA ? 'Encapsulando ↓' : 'Concluído'}
            </span>
          </div>

          <div className="space-y-1.5 flex-1">
            {ENCAPSULATION_STEPS.map((step, idx) => {
              const isCurrent = isHostA && currentStep === idx;
              const isPast = isHostA ? currentStep > idx : true;
              return (
                <button
                  key={step.stage}
                  onClick={() => setSelectedLayerIndex(idx)}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between text-xs ${
                    isCurrent
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                      : isPast
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] w-6 text-center">
                      L{step.layerNumber}
                    </span>
                    <span className="font-medium truncate">{step.pduName}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-800 text-white animate-pulse">
                      Ativo
                    </span>
                  )}
                  {isPast && !isCurrent && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Medium / Flow Indicator */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-3 text-center space-y-3">
          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
            isMedium
              ? 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-500 text-white'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <span className="text-2xl mb-1">⚡</span>
            <span className="font-bold text-xs uppercase tracking-wider font-mono">
              Meio Físico
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              Cabo UTP Cat6
            </span>
            {isMedium && (
              <span className="text-[10px] font-mono text-cyan-300 mt-2 animate-bounce">
                Bits em trânsito...
              </span>
            )}
          </div>
          <div className="hidden lg:flex flex-col items-center text-slate-600 text-xs">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        {/* Host B (Destino) */}
        <div className="lg:col-span-5 bg-[#0F172A]/80 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sm text-slate-200">
              Host B — Destino (Servidor IFPA)
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
              {isHostB ? 'Desencapsulando ↑' : currentStep >= 14 ? 'Entregue' : 'Aguardando'}
            </span>
          </div>

          <div className="space-y-1.5 flex-1">
            {ENCAPSULATION_STEPS.map((step, actualIdx) => {
              const isCurrent = isHostB && (14 - currentStep === actualIdx);
              const isProcessed = isHostB ? (14 - currentStep <= actualIdx) : false;
              return (
                <button
                  key={step.stage}
                  onClick={() => setSelectedLayerIndex(actualIdx)}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between text-xs ${
                    isCurrent
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                      : isProcessed
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] w-6 text-center">
                      L{step.layerNumber}
                    </span>
                    <span className="font-medium truncate">{step.pduName}</span>
                  </div>
                  {isCurrent && (
                    <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-800 text-white ${reducedMotion ? '' : 'animate-pulse'}`}>
                      Lendo ↑
                    </span>
                  )}
                  {isProcessed && !isCurrent && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Layer Inspection Box */}
      <div className="p-4 bg-[#0B1120] border-t border-slate-800">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              Inspeção da Camada Selecionada: {ENCAPSULATION_STEPS[selectedLayerIndex].stage} ({ENCAPSULATION_STEPS[selectedLayerIndex].pduName})
            </span>
            <span className="font-mono text-slate-400 text-[11px]">
              {ENCAPSULATION_STEPS[selectedLayerIndex].addedHeader}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {ENCAPSULATION_STEPS[selectedLayerIndex].description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
            {ENCAPSULATION_STEPS[selectedLayerIndex].fields.map((f) => (
              <div key={f.name} className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">{f.name}</span>
                <span className="text-cyan-300 text-xs font-semibold block truncate">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
