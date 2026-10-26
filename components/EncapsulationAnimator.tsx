'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { ENCAPSULATION_STEPS } from '@/lib/atlas-data';
import { wireBackground } from '@/lib/wires';
import { useReducedMotion } from './MotionProvider';

export default function EncapsulationAnimator() {
  // Step sequence: 0 to 6 (Host A encapsulation L7 to L1), 7 (Medium transmission), 8 to 14 (Host B decapsulation L1 to L7)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const reducedMotion = useReducedMotion();

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

  // Layers whose header is part of the PDU at this step (outermost = lowest layer)
  const presentLayers: number[] = isHostA
    ? Array.from({ length: currentStep + 1 }, (_, i) => 7 - i)
    : isMedium
    ? [7, 6, 5, 4, 3, 2, 1]
    : Array.from({ length: 15 - currentStep }, (_, i) => 7 - i).filter((l) => l >= currentStep - 7);
  const activeLayer = isHostA ? 7 - currentStep : isHostB ? currentStep - 7 : null;
  const pduOrder = [...presentLayers].sort((a, b) => a - b);

  const selected = ENCAPSULATION_STEPS[selectedLayerIndex];
  const phase = isHostA ? 'Encapsulando no PC do aluno' : isMedium ? 'Bits viajando pelo cabo' : currentStep >= 14 ? 'Entregue no servidor' : 'Desencapsulando no servidor';

  const stackColumn = (side: 'A' | 'B') => (
    <ol className="space-y-1.5">
      {ENCAPSULATION_STEPS.map((step, idx) => {
        const isCurrent = side === 'A' ? isHostA && currentStep === idx : isHostB && 14 - currentStep === idx;
        const isDone = side === 'A' ? (isHostA ? currentStep > idx : true) : isHostB ? 14 - currentStep < idx : false;
        return (
          <li key={step.stage}>
            <button
              type="button"
              onClick={() => setSelectedLayerIndex(idx)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${step.stage}, ${step.pduName}${isCurrent ? ', camada atual' : isDone ? ', concluída' : ''}. Ver detalhes`}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                isCurrent ? 'bg-marca text-lousa font-bold' : isDone ? 'bg-lousa-2 text-giz' : 'text-giz-2 hover:bg-lousa-2'
              } ${selectedLayerIndex === idx && !isCurrent ? 'ring-2 ring-giz-2' : ''}`}
            >
              <span aria-hidden="true" className="w-5 h-2 rounded-full shrink-0" style={{ background: wireBackground(step.layerNumber) }} />
              <span className="font-bold w-4 text-center" aria-hidden="true">
                {step.layerNumber}
              </span>
              <span className="truncate">{step.pduName}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <section aria-labelledby="titulo-encapsulamento" className="lousa rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-lousa-3">
        <div>
          <h2 id="titulo-encapsulamento" className="font-display font-extrabold text-2xl text-giz [font-stretch:82%]">
            Encapsulamento e desencapsulamento
          </h2>
          <p className="text-giz-2">Siga a mensagem do aplicativo do aluno até os sinais no cabo, e de volta no servidor.</p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Controles do simulador">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn !min-h-11 bg-giz text-lousa hover:bg-white"
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir passo a passo'}
          >
            {isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5" aria-hidden="true" />}
            {isPlaying ? 'Pausar' : 'Reproduzir'}
          </button>
          <button type="button" onClick={handlePrev} disabled={currentStep === 0} className="btn !min-h-11 !w-11 !p-0 text-giz hover:bg-lousa-2" aria-label="Passo anterior">
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={handleNext} disabled={currentStep === 14} className="btn !min-h-11 !w-11 !p-0 text-giz hover:bg-lousa-2" aria-label="Próximo passo">
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={handleReset} className="btn !min-h-11 !w-11 !p-0 text-giz hover:bg-lousa-2" aria-label="Reiniciar">
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* The PDU itself: one header per layer, added on the way down and removed on the way up */}
      <div className="px-4 sm:px-6 py-6 border-b border-lousa-3" aria-live="polite">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-bold text-lg text-giz">{phase}</span>
          <span className="text-giz-2">Passo {currentStep + 1} de 15</span>
        </p>
        <div className="mt-4 h-16 flex items-stretch overflow-hidden rounded-lg" aria-hidden="true">
          {isMedium ? (
            <motion.div
              key="bits"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center px-4 font-mono text-marca tracking-[0.3em] overflow-hidden whitespace-nowrap bg-lousa-2"
            >
              <motion.span animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                1011001110100101100111010010110011101001011001110100101100111010010110011101001
              </motion.span>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {pduOrder.map((layer) => {
                const isData = layer === 7;
                const isActive = layer === activeLayer;
                return (
                  <motion.div
                    key={layer}
                    layout
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: isData ? 'auto' : 'clamp(2.6rem, 9vw, 5.5rem)', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 0.8, 0.2, 1] }}
                    className={`relative flex items-center justify-center font-bold shrink-0 ${isData ? 'flex-1 bg-giz text-lousa px-4' : 'text-white'} ${
                      isActive ? 'ring-4 ring-inset ring-marca z-10' : ''
                    }`}
                    style={isData ? undefined : { background: wireBackground(layer) }}
                  >
                    <span className={isData ? '' : 'rounded bg-lousa/70 px-1.5'}>{isData ? 'Dados' : `L${layer}`}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
        <p className="sr-only">
          {isMedium
            ? 'O quadro inteiro viaja como bits pelo meio físico.'
            : `O pacote tem agora ${presentLayers.length} ${presentLayers.length === 1 ? 'parte' : 'partes'}: dados e cabeçalhos das camadas ${pduOrder.filter((l) => l !== 7).join(', ') || 'nenhuma'}.`}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 px-4 sm:px-6 py-6">
        <div>
          <h3 className="font-bold text-giz mb-2">PC do aluno (origem)</h3>
          {stackColumn('A')}
        </div>
        <div>
          <h3 className="font-bold text-giz mb-2">Servidor do IFPA (destino)</h3>
          {stackColumn('B')}
        </div>
      </div>

      <div className="bg-folha text-grafite px-4 sm:px-6 py-5" aria-live="polite">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xl font-extrabold">
            {selected.stage}: {selected.pduName}
          </span>
          <span className="text-grafite-2 font-mono text-sm">{selected.addedHeader}</span>
        </p>
        <p className="mt-1 text-grafite-2 max-w-prose">{selected.description}</p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          {selected.fields.map((f) => (
            <div key={f.name} className="rounded-lg bg-papel border border-linha px-3 py-2">
              <dt className="text-sm text-grafite-2">{f.name}</dt>
              <dd className="font-mono break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
