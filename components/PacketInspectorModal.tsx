'use client';

import React from 'react';
import { X, Network, Layers, ShieldCheck, Binary, ArrowRight } from 'lucide-react';
import { ENCAPSULATION_STEPS } from '@/lib/atlas-data';
import { MissionSimulationState } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeMissionNumber: number;
  simulationState?: MissionSimulationState;
}

export default function PacketInspectorModal({ isOpen, onClose, activeMissionNumber, simulationState }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Binary className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Inspetor de Pacotes e Estrutura PDU
              </h3>
              <p className="text-xs text-slate-400">
                Visualização detalhada dos cabeçalhos encapsulados nesta transmissão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar inspetor de pacotes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span>Visão em Camadas: <strong>Origem (PC Aluno) → Destino (Servidor IFPA)</strong></span>
            <span className="font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
              Missão Ativa: {activeMissionNumber === 8 ? 'Desafio Integrador (L4 + L6)' : `Camada ${activeMissionNumber}`}
            </span>
          </div>

          <div className="space-y-3">
            {ENCAPSULATION_STEPS.map((step) => {
              const isHighlight =
                step.layerNumber === activeMissionNumber ||
                (activeMissionNumber === 8 && (step.layerNumber === 4 || step.layerNumber === 6));

              const dynamicFields = step.fields.map((field) => {
                if (!simulationState) return field;
                if (step.layerNumber === 7 && field.name === 'Método / Comando' && activeMissionNumber === 7) {
                  return { ...field, value: `GET ${simulationState.targetResourceUri || '/notas.html'} HTTP/1.1` };
                }
                if (step.layerNumber === 6 && field.name === 'Charset') {
                  if (activeMissionNumber === 6) {
                    return { ...field, value: simulationState.dataEncoding || 'ISO-8859-1' };
                  }
                  if (activeMissionNumber === 8) {
                    return { ...field, value: simulationState.secondaryEncodingOk ? 'UTF-8' : 'ASCII (7-bit)' };
                  }
                }
                if (step.layerNumber === 5 && field.name === 'Session-ID' && activeMissionNumber === 5) {
                  return {
                    ...field,
                    value: simulationState.sessionTokenStatus === 'valido' ? 'SES-BREVES-2026-ACTIVE' : 'SES-2026-EXPIRED'
                  };
                }
                if (step.layerNumber === 4 && field.name === 'Porta Destino') {
                  if (activeMissionNumber === 4) {
                    return { ...field, value: `${simulationState.tcpPortTarget || 8080} (TCP)` };
                  }
                  if (activeMissionNumber === 8) {
                    return { ...field, value: simulationState.secondaryServicePortOk ? '80 (HTTP)' : '443 (Fechada)' };
                  }
                }
                if (step.layerNumber === 3 && field.name === 'IP Origem' && activeMissionNumber === 3) {
                  return {
                    ...field,
                    value: `192.168.10.25 (GW: ${simulationState.pcGateway || '0.0.0.0'})`
                  };
                }
                if (step.layerNumber === 2 && field.name === 'MAC Destino' && activeMissionNumber === 2) {
                  return {
                    ...field,
                    value: simulationState.switchPortLearned
                      ? 'A4:4C:11:89:12:01 (Gateway)'
                      : '00:00:00:00:00:00 (Não Aprendido)'
                  };
                }
                if (step.layerNumber === 1 && field.name === 'Sinalização' && activeMissionNumber === 1) {
                  return {
                    ...field,
                    value: simulationState.cableConnected ? '2.5V MLT-3 (Link UP)' : '0.0V (Sem Portadora / Link DOWN)'
                  };
                }
                return field;
              });

              return (
                <div
                  key={step.stage}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isHighlight
                      ? 'bg-slate-900 border-cyan-500/70 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {step.stage}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {step.pduName}
                      </span>
                    </div>
                    {isHighlight && (
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        Foco da Missão
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-2.5">
                    {step.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                    {dynamicFields.map((field) => (
                      <div key={field.name} className="p-2 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-slate-500 text-[10px] block truncate">{field.name}</span>
                        <span className="text-slate-200 text-[11px] font-medium truncate block">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0B1120] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Fechar Inspetor
          </button>
        </div>
      </div>
    </div>
  );
}
