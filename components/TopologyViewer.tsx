'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  FastForward,
  Search,
  CheckCircle2,
  AlertTriangle,
  Server,
  Laptop,
  Layers,
  Radio,
  ArrowRight,
  Info
} from 'lucide-react';
import { MissionSimulationState } from '@/lib/types';
import { getReducedMotionPreference } from '@/lib/storage';
import PacketInspectorModal from './PacketInspectorModal';

interface Props {
  missionNumber: number;
  simulationState: MissionSimulationState;
  onInspectNode?: (nodeId: string) => void;
}

export default function TopologyViewer({
  missionNumber,
  simulationState,
  onInspectNode
}: Props) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(getReducedMotionPreference());
    const onMotionChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setReducedMotion(Boolean(customEvent.detail));
    };
    window.addEventListener('missao-osi-motion-change', onMotionChange);
    return () => window.removeEventListener('missao-osi-motion-change', onMotionChange);
  }, []);

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

  // Status flags scoped to the active mission so each mission clearly isolates its layer's fault
  const isPhysicallyConnected = missionNumber !== 1 || Boolean(simulationState.cableConnected);
  const isMacRouted = missionNumber !== 2 || Boolean(simulationState.switchPortLearned);
  const isIpRouted = missionNumber !== 3 || (simulationState.pcGateway === '192.168.10.1');
  const isTcpConnected =
    missionNumber === 4
      ? simulationState.tcpPortTarget === 80
      : missionNumber === 8
      ? Boolean(simulationState.secondaryServicePortOk)
      : true;
  const isSessionValid = missionNumber !== 5 || (simulationState.sessionTokenStatus === 'valido');
  const isEncodingCorrect =
    missionNumber === 6
      ? simulationState.dataEncoding === 'UTF-8'
      : missionNumber === 8
      ? Boolean(simulationState.secondaryEncodingOk)
      : true;
  const isUriCorrect = missionNumber !== 7 || (simulationState.targetResourceUri === '/boletim.html');

  // Determine current active packet stage and where it gets blocked/rejected
  let packetBlockedAt: number | null = null;
  let packetStatusLabel = 'PDU OK';

  if (missionNumber === 1 && !isPhysicallyConnected) {
    packetBlockedAt = 0; // cannot leave PC NIC
    packetStatusLabel = 'SEM LINK (0V)';
  } else if (missionNumber === 2 && !isMacRouted) {
    packetBlockedAt = 1; // dropped at Switch
    packetStatusLabel = 'MAC DESCONHECIDO';
  } else if (missionNumber === 3 && !isIpRouted) {
    packetBlockedAt = 2; // cannot be routed without Default Gateway (0.0.0.0)
    packetStatusLabel = 'SEM GATEWAY';
  } else if (missionNumber === 4 && !isTcpConnected) {
    packetBlockedAt = 3; // rejected at Server with TCP RST
    packetStatusLabel = 'TCP RST (:8080)';
  } else if (missionNumber === 5 && !isSessionValid) {
    packetBlockedAt = 3; // rejected at Server due to expired session token
    packetStatusLabel = 'TOKEN EXPIRADO';
  } else if (missionNumber === 6 && !isEncodingCorrect) {
    packetBlockedAt = 3; // corrupted presentation syntax
    packetStatusLabel = 'MOJIBAKE (ISO)';
  } else if (missionNumber === 7 && !isUriCorrect) {
    packetBlockedAt = 3; // HTTP 404 at server
    packetStatusLabel = 'HTTP 404';
  } else if (missionNumber === 8 && !simulationState.isResolved) {
    packetBlockedAt = 3;
    packetStatusLabel = !isTcpConnected ? 'TCP RST (:443)' : 'ERRO ASCII (L6)';
  } else {
    const hopLabels = ['L1/L2 SAÍDA', 'COMUTAÇÃO L2', 'ROTEAMENTO L3', 'ENTREGA L4-L7'];
    packetStatusLabel = hopLabels[stepIndex] || 'PDU OK';
  }

  const effectiveStep =
    packetBlockedAt !== null ? Math.min(stepIndex, packetBlockedAt) : stepIndex;
  const isCurrentlyBlocked =
    packetBlockedAt !== null && stepIndex >= packetBlockedAt;
  const packetX =
    effectiveStep === 0 ? 165 :
    effectiveStep === 1 ? 322 :
    effectiveStep === 2 ? 525 : 715;
  const packetColor = isCurrentlyBlocked
    ? (packetBlockedAt === 1 || missionNumber === 5 || missionNumber === 6 ? '#F59E0B' : '#EF4444')
    : '#22D3EE';

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Top Bar with status & controls */}
      <div className="p-3 bg-[#0B1120] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Topologia do Laboratório
          </span>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-slate-400 text-[11px]">
            Rede Local: 192.168.10.0/24 | Servidor: 10.0.20.10
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
            aria-label={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          <button
            onClick={handleStepForward}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Avançar 1 passo"
            aria-label="Avançar 1 passo"
          >
            <StepForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reiniciar animação"
            aria-label="Reiniciar animação"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="text-slate-600">|</span>

          {/* Speed selector */}
          <button
            onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 hover:bg-slate-800"
            title="Alternar velocidade"
          >
            {speed}x
          </button>

          <span className="text-slate-600">|</span>

          {/* Inspect Packets Modal Trigger */}
          <button
            onClick={() => setInspectorOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition-colors"
          >
            <Search className="w-3 h-3" />
            <span>Inspecionar PDU</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative p-6 bg-[#070B14] min-h-[300px] flex items-center justify-center overflow-x-auto">
        <svg
          viewBox="0 0 880 240"
          className="w-full max-w-4xl h-auto select-none"
          aria-label="Diagrama da topologia de rede"
        >
          <defs>
            {/* Glowing filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Subnet Labels Background */}
          <rect x="40" y="20" width="370" height="200" rx="10" fill="#0F172A" fillOpacity="0.4" stroke="#1E293B" strokeDasharray="4 4" />
          <text x="55" y="42" fill="#64748B" fontSize="11" fontFamily="var(--font-mono)">
            SUB-REDE LOCAL: 192.168.10.0/24 (VLAN 10)
          </text>

          <rect x="470" y="20" width="370" height="200" rx="10" fill="#0F172A" fillOpacity="0.4" stroke="#1E293B" strokeDasharray="4 4" />
          <text x="485" y="42" fill="#64748B" fontSize="11" fontFamily="var(--font-mono)">
            REDE SERVIDOR: 10.0.20.0/24 (DMZ EDUCACIONAL)
          </text>

          {/* Segment 1: PC to Switch */}
          <g>
            <path
              d="M 140 120 L 290 120"
              stroke={isPhysicallyConnected ? '#06B6D4' : '#EF4444'}
              strokeWidth="3"
              strokeDasharray={isPhysicallyConnected ? 'none' : '6 6'}
            />
            {/* Port Labels */}
            <text x="150" y="112" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">NIC ETH0</text>
            <text x="250" y="112" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">Fa0/1</text>
            {!isPhysicallyConnected && (
              <g transform="translate(215, 108)">
                <circle cx="8" cy="8" r="10" fill="#7F1D1D" stroke="#EF4444" strokeWidth="1.5" />
                <text x="8" y="12" fill="#FECACA" fontSize="12" fontWeight="bold" textAnchor="middle">✕</text>
              </g>
            )}
          </g>

          {/* Segment 2: Switch to Router */}
          <g>
            <path
              d="M 350 120 L 490 120"
              stroke={isMacRouted ? '#06B6D4' : '#F59E0B'}
              strokeWidth="3"
            />
            <text x="360" y="112" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">Fa0/24</text>
            <text x="440" y="112" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">Gi0/0</text>
            {missionNumber === 2 && !isMacRouted && (
              <g transform="translate(410, 108)">
                <circle cx="8" cy="8" r="10" fill="#78350F" stroke="#F59E0B" strokeWidth="1.5" />
                <text x="8" y="12" fill="#FEF3C7" fontSize="11" fontWeight="bold" textAnchor="middle">?</text>
              </g>
            )}
          </g>

          {/* Segment 3: Router to Server */}
          <g>
            <path
              d="M 550 120 L 730 120"
              stroke={isIpRouted ? '#06B6D4' : '#EF4444'}
              strokeWidth="3"
              strokeDasharray={isIpRouted ? 'none' : '4 4'}
            />
            <text x="560" y="112" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">Gi0/1 (WAN)</text>
            <text x="680" y="112" fill="#94A3B8" fontSize="10" fontFamily="var(--font-mono)">ETH0</text>
            {missionNumber === 3 && !isIpRouted && (
              <g transform="translate(630, 108)">
                <circle cx="8" cy="8" r="10" fill="#7F1D1D" stroke="#EF4444" strokeWidth="1.5" />
                <text x="8" y="12" fill="#FECACA" fontSize="12" fontWeight="bold" textAnchor="middle">✕</text>
              </g>
            )}
          </g>

          {/* Node 1: PC Aluno */}
          <g
            className="cursor-pointer group"
            onClick={() => handleNodeClick('pc-aluno')}
            transform="translate(80, 80)"
          >
            <rect
              width="65"
              height="80"
              rx="8"
              fill="#1E293B"
              stroke={selectedNode === 'pc-aluno' ? '#22D3EE' : '#334155'}
              strokeWidth={selectedNode === 'pc-aluno' ? '2.5' : '1.5'}
              className="transition-all"
            />
            {/* Monitor Screen */}
            <rect x="8" y="10" width="49" height="38" rx="4" fill="#0B1120" stroke="#475569" />
            <text x="32" y="32" fill="#38BDF8" fontSize="16" textAnchor="middle">💻</text>
            {/* PC LED */}
            <circle
              cx="52"
              cy="62"
              r="3"
              fill={isPhysicallyConnected ? '#10B981' : '#EF4444'}
            />
            <text x="32" y="70" fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle">
              {missionNumber === 8 ? 'PC-2 ALUNO' : 'PC ALUNO'}
            </text>
            <text x="32" y="98" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
              {missionNumber === 8 ? '192.168.10.30' : '192.168.10.25'}
            </text>
          </g>

          {/* Node 2: Switch SW-01 */}
          <g
            className="cursor-pointer group"
            onClick={() => handleNodeClick('switch-01')}
            transform="translate(290, 95)"
          >
            <rect
              width="65"
              height="50"
              rx="6"
              fill="#1E293B"
              stroke={selectedNode === 'switch-01' ? '#22D3EE' : '#334155'}
              strokeWidth={selectedNode === 'switch-01' ? '2.5' : '1.5'}
            />
            <text x="32" y="24" fill="#A855F7" fontSize="14" textAnchor="middle">🔀</text>
            {/* Port LEDs */}
            <circle cx="15" cy="38" r="2.5" fill={isPhysicallyConnected ? '#10B981' : '#64748B'} />
            <circle cx="25" cy="38" r="2.5" fill="#10B981" />
            <circle cx="35" cy="38" r="2.5" fill="#10B981" />
            <circle cx="50" cy="38" r="2.5" fill={isMacRouted ? '#10B981' : '#F59E0B'} />
            <text x="32" y="62" fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle">
              SWITCH SW-01
            </text>
            <text x="32" y="74" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
              Camada 2 (MAC)
            </text>
          </g>

          {/* Node 3: Roteador RT-BREVES */}
          <g
            className="cursor-pointer group"
            onClick={() => handleNodeClick('router-01')}
            transform="translate(490, 85)"
          >
            <circle
              cx="35"
              cy="35"
              r="35"
              fill="#1E293B"
              stroke={selectedNode === 'router-01' ? '#22D3EE' : '#334155'}
              strokeWidth={selectedNode === 'router-01' ? '2.5' : '1.5'}
            />
            <text x="35" y="38" fill="#10B981" fontSize="18" textAnchor="middle">🌐</text>
            <text x="35" y="86" fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle">
              ROTEADOR IFPA
            </text>
            <text x="35" y="98" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
              GW: 192.168.10.1
            </text>
          </g>

          {/* Node 4: Servidor IFPA */}
          <g
            className="cursor-pointer group"
            onClick={() => handleNodeClick('server-ifpa')}
            transform="translate(730, 80)"
          >
            <rect
              width="65"
              height="80"
              rx="8"
              fill="#1E293B"
              stroke={selectedNode === 'server-ifpa' ? '#22D3EE' : '#334155'}
              strokeWidth={selectedNode === 'server-ifpa' ? '2.5' : '1.5'}
            />
            {/* Server Chassis lines */}
            <rect x="8" y="10" width="49" height="15" rx="3" fill="#0B1120" stroke="#475569" />
            <rect x="8" y="30" width="49" height="15" rx="3" fill="#0B1120" stroke="#475569" />
            <rect x="8" y="50" width="49" height="15" rx="3" fill="#0B1120" stroke="#475569" />
            {/* Blinking LEDs */}
            <circle cx="50" cy="17" r="2" fill={isUriCorrect ? '#10B981' : '#EF4444'} />
            <circle cx="50" cy="37" r="2" fill={isTcpConnected ? '#10B981' : '#EF4444'} />
            <circle cx="50" cy="57" r="2" fill={isSessionValid && isEncodingCorrect ? '#10B981' : '#F59E0B'} />
            <text x="32" y="76" fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle">
              SERVIDOR
            </text>
            <text x="32" y="98" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
              10.0.20.10
            </text>
          </g>

          {/* Animated Traveling Packet (Rendered in foreground above nodes) */}
          <g
            transform={`translate(${packetX}, 120)`}
            style={{
              transition: reducedMotion ? 'none' : `transform ${Math.max(0.45 / speed, 0.2)}s ease-in-out`
            }}
          >
            <circle
              cx="0"
              cy="0"
              r="7"
              fill={packetColor}
              filter="url(#glow)"
            >
              {!reducedMotion && isPlaying && isCurrentlyBlocked && (
                <animate attributeName="r" values="6;9;6" dur="1s" repeatCount="indefinite" />
              )}
            </circle>
            {/* Dynamic PDU Status Pill */}
            <g transform="translate(0, -24)">
              <rect
                x="-48"
                y="-11"
                width="96"
                height="17"
                rx="4"
                fill="#0B1120"
                stroke={packetColor}
                strokeWidth="1.2"
              />
              <text
                x="0"
                y="0.5"
                fill={packetColor}
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {packetStatusLabel}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Node Inspector Quick Bar (shows when user clicks a node) */}
      <div className="p-3 bg-[#0B1120] border-t border-slate-800 text-xs">
        {selectedNode === 'pc-aluno' && (
          <div className="flex items-center justify-between text-slate-300">
            <div>
              <span className="font-bold text-white">{missionNumber === 8 ? 'PC-2 Aluno (Laboratório Breves):' : 'PC Aluno (Laboratório Breves):'}</span> IP: {missionNumber === 8 ? '192.168.10.30' : '192.168.10.25'} | Máscara: 255.255.255.0 | Gateway: <code className="text-cyan-300 font-mono">{missionNumber > 3 ? '192.168.10.1' : (simulationState.pcGateway || '0.0.0.0 (Ausente)')}</code>
            </div>
            <span className="font-mono text-slate-400">MAC: 00:1A:2B:3C:4D:5E</span>
          </div>
        )}
        {selectedNode === 'switch-01' && (
          <div className="flex items-center justify-between text-slate-300">
            <div>
              <span className="font-bold text-white">Switch SW-01 (Cisco Catalyst Simulado):</span> Porta Fa0/1 conectada ao PC | Porta Fa0/24 conectada ao Roteador.
            </div>
            <span className="font-mono text-cyan-400">Tabela MAC: {isMacRouted ? 'Resolvida' : 'Incompleta'}</span>
          </div>
        )}
        {selectedNode === 'router-01' && (
          <div className="flex items-center justify-between text-slate-300">
            <div>
              <span className="font-bold text-white">Roteador IFPA Breves:</span> Interface Gi0/0: 192.168.10.1/24 | Interface Gi0/1: 172.16.0.1 (WAN para DMZ).
            </div>
            <span className="font-mono text-emerald-400">Roteamento: Ativo</span>
          </div>
        )}
        {selectedNode === 'server-ifpa' && (
          <div className="flex items-center justify-between text-slate-300">
            <div>
              <span className="font-bold text-white">Servidor Acadêmico IFPA:</span> IP: 10.0.20.10 | Serviço HTTP: Porta 80 (LISTEN) | Recurso: <code className="text-cyan-300 font-mono">/boletim.html</code>
            </div>
            <span className="font-mono text-slate-400">SO: Debian Linux</span>
          </div>
        )}
        {!selectedNode && (
          <div className="text-slate-400 text-center flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dica pedagógica: Clique em qualquer equipamento acima para inspecionar parâmetros técnicos, interfaces e portas.</span>
          </div>
        )}
      </div>

      {/* Packet Inspector Modal */}
      <PacketInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        activeMissionNumber={missionNumber}
        simulationState={simulationState}
      />
    </div>
  );
}
