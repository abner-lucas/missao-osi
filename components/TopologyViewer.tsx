'use client';

import React, { useState, useEffect } from 'react';
import { Pause, Play, RotateCcw, Search, StepForward } from 'lucide-react';
import { MissionSimulationState } from '@/lib/types';
import PacketInspectorModal from './PacketInspectorModal';
import { useReducedMotion } from './MotionProvider';

interface Props {
  missionNumber: number;
  simulationState: MissionSimulationState;
  onInspectNode?: (nodeId: string) => void;
}

const GIZ = '#eef1ec';
const GIZ_2 = '#b4c3bd';
const NODE = '#273a35';
const NODE_STROKE = '#55706a';
const MARCA = '#ffe680';
const VERDE = '#22a050';
const AMBAR = '#e0a000';
const VERMELHO = '#ef5a4c';

export default function TopologyViewer({ missionNumber, simulationState, onInspectNode }: Props) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  // Animation cycle loop
  useEffect(() => {
    if (!isPlaying || reducedMotion) return;
    const intervalTime = Math.max(800 / speed, 300);
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % 4);
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isPlaying, speed, reducedMotion]);

  const handleStepForward = () => {
    setIsPlaying(false);
    setStepIndex((prev) => (prev + 1) % 4);
  };

  const handleReset = () => {
    setStepIndex(0);
    setIsPlaying(true);
  };

  // Node details dialog / click handler
  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    if (onInspectNode) onInspectNode(nodeId);
  };

  const nodeProps = (nodeId: string, label: string) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    'aria-pressed': selectedNode === nodeId,
    className: 'cursor-pointer outline-none [&:focus-visible>.foco]:opacity-100',
    onClick: () => handleNodeClick(nodeId),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNodeClick(nodeId);
      }
    },
  });

  // Status flags scoped to the active mission so each mission clearly isolates its layer's fault
  const isPhysicallyConnected = missionNumber !== 1 || Boolean(simulationState.cableConnected);
  const isMacRouted = missionNumber !== 2 || Boolean(simulationState.switchPortLearned);
  const isIpRouted = missionNumber !== 3 || simulationState.pcGateway === '192.168.10.1';
  const isTcpConnected =
    missionNumber === 4
      ? simulationState.tcpPortTarget === 80
      : missionNumber === 8
      ? Boolean(simulationState.secondaryServicePortOk)
      : true;
  const isSessionValid = missionNumber !== 5 || simulationState.sessionTokenStatus === 'valido';
  const isEncodingCorrect =
    missionNumber === 6
      ? simulationState.dataEncoding === 'UTF-8'
      : missionNumber === 8
      ? Boolean(simulationState.secondaryEncodingOk)
      : true;
  const isUriCorrect = missionNumber !== 7 || simulationState.targetResourceUri === '/boletim.html';

  // Where the packet gets blocked. The label stays neutral ("Parou aqui"): naming the cause
  // would hand the student the hypothesis before the investigation.
  let packetBlockedAt: number | null = null;
  if (missionNumber === 1 && !isPhysicallyConnected) packetBlockedAt = 0;
  else if (missionNumber === 2 && !isMacRouted) packetBlockedAt = 1;
  else if (missionNumber === 3 && !isIpRouted) packetBlockedAt = 2;
  else if (missionNumber === 4 && !isTcpConnected) packetBlockedAt = 3;
  else if (missionNumber === 5 && !isSessionValid) packetBlockedAt = 3;
  else if (missionNumber === 6 && !isEncodingCorrect) packetBlockedAt = 3;
  else if (missionNumber === 7 && !isUriCorrect) packetBlockedAt = 3;
  else if (missionNumber === 8 && !simulationState.isResolved) packetBlockedAt = 3;

  const hopLabels = ['Saindo do PC', 'No switch', 'No roteador', 'No servidor'];
  const effectiveStep = packetBlockedAt !== null ? Math.min(stepIndex, packetBlockedAt) : stepIndex;
  const isCurrentlyBlocked = packetBlockedAt !== null && stepIndex >= packetBlockedAt;
  const packetStatusLabel = isCurrentlyBlocked ? 'Parou aqui' : hopLabels[effectiveStep] || 'Em trânsito';
  const packetX = effectiveStep === 0 ? 165 : effectiveStep === 1 ? 322 : effectiveStep === 2 ? 525 : 715;
  const packetColor = isCurrentlyBlocked
    ? packetBlockedAt === 1 || missionNumber === 5 || missionNumber === 6
      ? AMBAR
      : VERMELHO
    : GIZ;

  const pcLabel = missionNumber === 8 ? 'PC-2 do aluno' : 'PC do aluno';
  const pcIp = missionNumber === 8 ? '192.168.10.30' : '192.168.10.25';

  return (
    <section aria-labelledby="titulo-topologia" className="lousa rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-lousa-3">
        <div>
          <h2 id="titulo-topologia" className="font-display font-extrabold text-xl text-giz [font-stretch:82%]">
            Topologia do laboratório
          </h2>
          <p className="text-sm text-giz-2 font-mono">Rede local 192.168.10.0/24, servidor 10.0.20.10</p>
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Controles da animação do pacote">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn !min-h-11 !w-11 !p-0 text-giz hover:bg-lousa-2"
            aria-label={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
            title={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
          >
            {isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={handleStepForward}
            className="btn !min-h-11 !w-11 !p-0 text-giz hover:bg-lousa-2"
            aria-label="Avançar 1 passo"
            title="Avançar 1 passo"
          >
            <StepForward className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn !min-h-11 !w-11 !p-0 text-giz hover:bg-lousa-2"
            aria-label="Reiniciar animação"
            title="Reiniciar animação"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1)}
            className="btn !min-h-11 !px-3 text-giz hover:bg-lousa-2 font-mono"
            aria-label={`Velocidade ${speed}x. Alternar velocidade`}
            title="Alternar velocidade"
          >
            {speed}x
          </button>
          <button
            type="button"
            onClick={() => setInspectorOpen(true)}
            className="btn !min-h-11 bg-giz text-lousa hover:bg-white ml-1"
          >
            <Search className="w-[18px] h-[18px]" aria-hidden="true" />
            Ver o pacote por dentro
          </button>
        </div>
      </div>

      <p className="md:hidden px-4 pt-3 text-sm text-giz-2">Arraste o diagrama para o lado para ver a rede inteira.</p>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Diagrama da topologia, rolável na horizontal">
        <svg viewBox="0 0 880 250" className="w-full min-w-[720px] h-auto select-none block" aria-label="Diagrama da topologia de rede. Use Tab para escolher um equipamento e Enter para ver seus detalhes.">
          <rect x="40" y="16" width="370" height="214" rx="12" fill="none" stroke="#3d544d" strokeDasharray="5 6" />
          <text x="56" y="40" fill={GIZ_2} fontSize="13" fontFamily="var(--font-mono)">
            Rede local do laboratório 192.168.10.0/24
          </text>
          <rect x="470" y="16" width="370" height="214" rx="12" fill="none" stroke="#3d544d" strokeDasharray="5 6" />
          <text x="486" y="40" fill={GIZ_2} fontSize="13" fontFamily="var(--font-mono)">
            Rede do servidor 10.0.20.0/24
          </text>

          {/* Segment 1: PC to Switch */}
          <path d="M 140 125 L 290 125" stroke={isPhysicallyConnected ? GIZ_2 : VERMELHO} strokeWidth="4" strokeDasharray={isPhysicallyConnected ? 'none' : '8 7'} strokeLinecap="round" />
          <text x="148" y="148" fill={GIZ_2} fontSize="12" fontFamily="var(--font-mono)">eth0</text>
          <text x="248" y="148" fill={GIZ_2} fontSize="12" fontFamily="var(--font-mono)">Fa0/1</text>
          {!isPhysicallyConnected && (
            <g transform="translate(215, 125)">
              <circle r="11" fill="#3a1714" stroke={VERMELHO} strokeWidth="2" />
              <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke={VERMELHO} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* Segment 2: Switch to Router */}
          <path d="M 355 125 L 490 125" stroke={isMacRouted ? GIZ_2 : AMBAR} strokeWidth="4" strokeLinecap="round" />
          <text x="362" y="148" fill={GIZ_2} fontSize="12" fontFamily="var(--font-mono)">Fa0/24</text>
          <text x="442" y="148" fill={GIZ_2} fontSize="12" fontFamily="var(--font-mono)">Gi0/0</text>
          {missionNumber === 2 && !isMacRouted && (
            <g transform="translate(420, 125)">
              <circle r="11" fill="#3a2a05" stroke={AMBAR} strokeWidth="2" />
              <text y="5" fill={AMBAR} fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="var(--font-display)">?</text>
            </g>
          )}

          {/* Segment 3: Router to Server */}
          <path d="M 560 125 L 730 125" stroke={isIpRouted ? GIZ_2 : VERMELHO} strokeWidth="4" strokeDasharray={isIpRouted ? 'none' : '6 6'} strokeLinecap="round" />
          <text x="566" y="148" fill={GIZ_2} fontSize="12" fontFamily="var(--font-mono)">Gi0/1</text>
          <text x="686" y="148" fill={GIZ_2} fontSize="12" fontFamily="var(--font-mono)">eth0</text>
          {missionNumber === 3 && !isIpRouted && (
            <g transform="translate(640, 125)">
              <circle r="11" fill="#3a1714" stroke={VERMELHO} strokeWidth="2" />
              <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke={VERMELHO} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* PC */}
          <g transform="translate(76, 78)" {...nodeProps('pc-aluno', `${pcLabel}, ${pcIp}. Ver detalhes`)}>
            <rect className="foco opacity-0" x="-8" y="-8" width="80" height="140" rx="12" fill="none" stroke={MARCA} strokeWidth="3" />
            <rect width="64" height="44" rx="5" fill={NODE} stroke={selectedNode === 'pc-aluno' ? MARCA : NODE_STROKE} strokeWidth={selectedNode === 'pc-aluno' ? 3 : 2} />
            <rect x="7" y="7" width="50" height="30" rx="2" fill="#16221f" />
            <rect x="26" y="44" width="12" height="8" fill={NODE_STROKE} />
            <rect x="16" y="52" width="32" height="5" rx="2" fill={NODE_STROKE} />
            <circle cx="56" cy="31" r="4" fill={isPhysicallyConnected ? VERDE : VERMELHO} />
            <text x="32" y="80" fill={GIZ} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans)">{pcLabel}</text>
            <text x="32" y="98" fill={GIZ_2} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">{pcIp}</text>
          </g>

          {/* Switch */}
          <g transform="translate(290, 102)" {...nodeProps('switch-01', 'Switch SW-01. Ver detalhes')}>
            <rect className="foco opacity-0" x="-8" y="-8" width="81" height="108" rx="12" fill="none" stroke={MARCA} strokeWidth="3" />
            <rect width="65" height="46" rx="6" fill={NODE} stroke={selectedNode === 'switch-01' ? MARCA : NODE_STROKE} strokeWidth={selectedNode === 'switch-01' ? 3 : 2} />
            {[0, 1, 2, 3].map((k) => (
              <rect key={k} x={8 + k * 13} y="10" width="10" height="9" rx="1.5" fill="#16221f" />
            ))}
            <circle cx="13" cy="32" r="3.5" fill={isPhysicallyConnected ? VERDE : '#5b6b66'} />
            <circle cx="26" cy="32" r="3.5" fill={VERDE} />
            <circle cx="39" cy="32" r="3.5" fill={VERDE} />
            <circle cx="52" cy="32" r="3.5" fill={isMacRouted ? VERDE : AMBAR} />
            <text x="32" y="66" fill={GIZ} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans)">Switch SW-01</text>
            <text x="32" y="84" fill={GIZ_2} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">camada 2</text>
          </g>

          {/* Router */}
          <g transform="translate(490, 90)" {...nodeProps('router-01', 'Roteador do IFPA, 192.168.10.1. Ver detalhes')}>
            <rect className="foco opacity-0" x="-8" y="-8" width="86" height="130" rx="12" fill="none" stroke={MARCA} strokeWidth="3" />
            <circle cx="35" cy="35" r="33" fill={NODE} stroke={selectedNode === 'router-01' ? MARCA : NODE_STROKE} strokeWidth={selectedNode === 'router-01' ? 3 : 2} />
            <path d="M 20 28 L 50 28 M 44 22 L 50 28 L 44 34 M 50 42 L 20 42 M 26 36 L 20 42 L 26 48" stroke={GIZ_2} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x="35" y="90" fill={GIZ} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans)">Roteador IFPA</text>
            <text x="35" y="108" fill={GIZ_2} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">192.168.10.1</text>
          </g>

          {/* Server */}
          <g transform="translate(730, 70)" {...nodeProps('server-ifpa', 'Servidor acadêmico, 10.0.20.10. Ver detalhes')}>
            <rect className="foco opacity-0" x="-8" y="-8" width="81" height="150" rx="12" fill="none" stroke={MARCA} strokeWidth="3" />
            <rect width="65" height="84" rx="7" fill={NODE} stroke={selectedNode === 'server-ifpa' ? MARCA : NODE_STROKE} strokeWidth={selectedNode === 'server-ifpa' ? 3 : 2} />
            {[0, 1, 2].map((k) => (
              <rect key={k} x="8" y={9 + k * 24} width="49" height="17" rx="3" fill="#16221f" />
            ))}
            <circle cx="50" cy="17.5" r="3" fill={isUriCorrect ? VERDE : VERMELHO} />
            <circle cx="50" cy="41.5" r="3" fill={isTcpConnected ? VERDE : VERMELHO} />
            <circle cx="50" cy="65.5" r="3" fill={isSessionValid && isEncodingCorrect ? VERDE : AMBAR} />
            <text x="32" y="104" fill={GIZ} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans)">Servidor</text>
            <text x="32" y="122" fill={GIZ_2} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">10.0.20.10</text>
          </g>

          {/* Traveling packet */}
          <g
            transform={`translate(${packetX}, 125)`}
            style={{ transition: reducedMotion ? 'none' : `transform ${Math.max(0.45 / speed, 0.2)}s cubic-bezier(0.22, 0.8, 0.2, 1)` }}
            aria-hidden="true"
          >
            <rect x="-11" y="-8" width="22" height="16" rx="3" fill={packetColor} stroke="#16221f" strokeWidth="2" />
            <path d="M -11 -8 L 0 1 L 11 -8" stroke="#16221f" strokeWidth="1.5" fill="none" />
            {!reducedMotion && isPlaying && isCurrentlyBlocked && (
              <circle r="16" fill="none" stroke={packetColor} strokeWidth="2">
                <animate attributeName="r" values="12;22;12" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
            <g transform="translate(0, -34)">
              <rect x="-50" y="-13" width="100" height="22" rx="11" fill="#16221f" stroke={packetColor} strokeWidth="1.5" />
              <text y="3" fill={packetColor} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans)">
                {packetStatusLabel}
              </text>
            </g>
          </g>
        </svg>
      </div>
      <p className="sr-only" aria-live="polite">
        {packetBlockedAt !== null ? `O pacote para no trecho ${packetBlockedAt + 1} de 4 do caminho.` : 'O pacote percorre todo o caminho até o servidor.'}
      </p>

      <div className="px-4 sm:px-5 py-3.5 border-t border-lousa-3 bg-lousa-2/60 min-h-[3.5rem]" aria-live="polite">
        {selectedNode === 'pc-aluno' && (
          <p className="text-giz">
            <strong>{missionNumber === 8 ? 'PC-2 do aluno (laboratório Breves):' : 'PC do aluno (laboratório Breves):'}</strong> IP{' '}
            <code className="font-mono">{pcIp}</code>, máscara <code className="font-mono">255.255.255.0</code>, roteador de saída{' '}
            <code className="font-mono text-marca">{missionNumber > 3 ? '192.168.10.1' : simulationState.pcGateway || '0.0.0.0 (ausente)'}</code>, MAC{' '}
            <code className="font-mono">00:1A:2B:3C:4D:5E</code>
          </p>
        )}
        {selectedNode === 'switch-01' && (
          <p className="text-giz">
            <strong>Switch SW-01:</strong> porta Fa0/1 ligada ao PC, porta Fa0/24 ligada ao roteador. Tabela MAC:{' '}
            <span className="text-marca">{isMacRouted ? 'resolvida' : 'incompleta'}</span>.
          </p>
        )}
        {selectedNode === 'router-01' && (
          <p className="text-giz">
            <strong>Roteador IFPA Breves:</strong> Gi0/0 <code className="font-mono">192.168.10.1/24</code>, Gi0/1{' '}
            <code className="font-mono">172.16.0.1</code> (ligação com a rede do servidor). Roteamento ativo.
          </p>
        )}
        {selectedNode === 'server-ifpa' && (
          <p className="text-giz">
            <strong>Servidor acadêmico IFPA:</strong> IP <code className="font-mono">10.0.20.10</code>, serviço web (HTTP) atendendo na porta 80,
            recurso <code className="font-mono text-marca">/boletim.html</code>.
          </p>
        )}
        {!selectedNode && <p className="text-giz-2">Toque ou clique num equipamento para ver interfaces, endereços e portas.</p>}
      </div>

      <PacketInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        activeMissionNumber={missionNumber}
        simulationState={simulationState}
      />
    </section>
  );
}
