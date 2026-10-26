'use client';

import React from 'react';
import { ENCAPSULATION_STEPS } from '@/lib/atlas-data';
import { MissionSimulationState } from '@/lib/types';
import { wireBackground } from '@/lib/wires';
import Dialog from './Dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeMissionNumber: number;
  simulationState?: MissionSimulationState;
}

export default function PacketInspectorModal({ isOpen, onClose, activeMissionNumber, simulationState }: Props) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Inspetor de pacotes"
      description="Os cabeçalhos que cada camada acrescenta nesta transmissão, do PC do aluno ao servidor do IFPA."
      closeLabel="Fechar inspetor de pacotes"
      size="xl"
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="btn btn-secundario">
            Fechar inspetor
          </button>
        </div>
      }
    >
      <ol className="space-y-3">
        {ENCAPSULATION_STEPS.map((step) => {
          const isHighlight =
            step.layerNumber === activeMissionNumber ||
            (activeMissionNumber === 8 && (step.layerNumber === 4 || step.layerNumber === 6));
      const dynamicFields = step.fields.map((field) => {
        if (!simulationState) return field;
        if (step.layerNumber === 7 && field.name === 'Método / Comando' && activeMissionNumber === 7) {
          return { ...field, value: `GET ${simulationState.targetResourceUri || '/notas.html'} HTTP/1.1` };
        }
        if (step.layerNumber === 6 && field.name === 'Codificação') {
          if (activeMissionNumber === 6) {
            return { ...field, value: simulationState.dataEncoding || 'ISO-8859-1' };
          }
          if (activeMissionNumber === 8) {
            return { ...field, value: simulationState.secondaryEncodingOk ? 'UTF-8' : 'ASCII (7-bit)' };
          }
        }
        if (step.layerNumber === 5 && field.name === 'Código da sessão' && activeMissionNumber === 5) {
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
            value: `192.168.10.25 (roteador de saída: ${simulationState.pcGateway || '0.0.0.0'})`
          };
        }
        if (step.layerNumber === 2 && field.name === 'MAC Destino' && activeMissionNumber === 2) {
          return {
            ...field,
            value: simulationState.switchPortLearned
              ? 'A4:4C:11:89:12:01 (roteador)'
              : '00:00:00:00:00:00 (Não Aprendido)'
          };
        }
        if (step.layerNumber === 1 && field.name === 'Sinalização' && activeMissionNumber === 1) {
          return {
            ...field,
            value: simulationState.cableConnected ? '2.5V (Link UP)' : '0.0V (Sem Portadora / Link DOWN)'
          };
        }
        return field;
      });

          return (
            <li
              key={step.stage}
              className={`rounded-xl border-2 p-4 ${isHighlight ? 'border-caneta bg-caneta-clara/40' : 'border-linha'}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span aria-hidden="true" className="w-6 h-2.5 rounded-full" style={{ background: wireBackground(step.layerNumber) }} />
                <h3 className="text-lg font-extrabold">
                  {step.stage}: {step.pduName}
                </h3>
                {isHighlight && <span className="text-caneta font-semibold">camada desta missão</span>}
              </div>
              <p className="mt-1 text-grafite-2">{step.description}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                {dynamicFields.map((field) => (
                  <div key={field.name} className="rounded-lg bg-papel border border-linha px-3 py-2">
                    <dt className="text-sm text-grafite-2">{field.name}</dt>
                    <dd className="font-mono text-[0.95rem] break-words">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ol>
    </Dialog>
  );
}
