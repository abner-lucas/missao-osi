'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  Search,
  Bookmark,
  BookmarkCheck,
  Check,
  ExternalLink,
  Shield,
  Cpu,
  Globe,
  Radio,
  FileCheck
} from 'lucide-react';
import { OSI_LAYERS_DATA, OSI_STANDARDIZATION_BODIES } from '@/lib/atlas-data';
import { LayerInfo } from '@/lib/types';
import { toggleConceptInNotebook, getEvidenceNotebook } from '@/lib/storage';
import EncapsulationAnimator from './EncapsulationAnimator';

export default function AtlasView() {
  const [selectedLayerNumber, setSelectedLayerNumber] = useState<number>(7);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedConceptIds, setSavedConceptIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'camadas' | 'encapsulamento' | 'padronizacao'>('camadas');

  useEffect(() => {
    const nb = getEvidenceNotebook();
    setSavedConceptIds(nb.savedConceptIds);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const layerParam = Number(params.get('layer'));
      if (layerParam >= 1 && layerParam <= 7) {
        setSelectedLayerNumber(layerParam);
      }
    }
  }, []);

  const handleToggleSaveConcept = (conceptId: string) => {
    toggleConceptInNotebook(conceptId);
    const nb = getEvidenceNotebook();
    setSavedConceptIds([...nb.savedConceptIds]);
  };

  const selectedLayer: LayerInfo =
    OSI_LAYERS_DATA.find((l) => l.number === selectedLayerNumber) || OSI_LAYERS_DATA[0];

  // Filtered concepts if search query present
  const filteredLayers = searchQuery.trim()
    ? OSI_LAYERS_DATA.filter((l) => {
        const query = searchQuery.toLowerCase();
        return (
          l.namePt.toLowerCase().includes(query) ||
          l.nameEn.toLowerCase().includes(query) ||
          l.protocols.some((p) => p.toLowerCase().includes(query)) ||
          l.devices.some((d) => d.toLowerCase().includes(query)) ||
          l.keyConcepts.some((c) => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query))
        );
      })
    : OSI_LAYERS_DATA;

  return (
    <div className="space-y-6">
      {/* Top Bar with Mode Switcher & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 self-start text-xs font-medium">
          <button
            onClick={() => setActiveTab('camadas')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'camadas'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pilha das 7 Camadas
          </button>
          <button
            onClick={() => setActiveTab('encapsulamento')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'encapsulamento'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Encapsulamento Interativo
          </button>
          <button
            onClick={() => setActiveTab('padronizacao')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'padronizacao'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Organizações & Normas
          </button>
        </div>

        {/* Concept Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar protocolo, conceito ou PDU..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Mode 1: 7 Layers Interactive Stack & Details */}
      {activeTab === 'camadas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Vertical Layers Stack (Left 4 columns) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
              Pilha de Referência OSI
            </div>

            {filteredLayers.map((layer) => {
              const isSelected = selectedLayerNumber === layer.number;
              return (
                <button
                  key={layer.number}
                  onClick={() => setSelectedLayerNumber(layer.number)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/80 ring-1 ring-cyan-500/40 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs border"
                      style={{
                        backgroundColor: `${layer.color}15`,
                        color: layer.color,
                        borderColor: `${layer.color}40`,
                      }}
                    >
                      L{layer.number}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {layer.namePt}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        PDU: {layer.pdu}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300">
                    {layer.nameEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Layer Technical Detail Dossier (Right 8 columns) */}
          <div className="lg:col-span-8 bg-[#0F172A] border border-slate-800 rounded-xl p-6 space-y-6">
            {/* Header of selected layer */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm border"
                  style={{
                    backgroundColor: `${selectedLayer.color}20`,
                    color: selectedLayer.color,
                    borderColor: `${selectedLayer.color}50`,
                  }}
                >
                  L{selectedLayer.number}
                </span>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    Camada {selectedLayer.number}: {selectedLayer.namePt}
                    <span className="text-sm font-normal text-slate-400 font-mono">
                      ({selectedLayer.nameEn})
                    </span>
                  </h2>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Unidade de Dados (PDU): <strong className="text-cyan-300 font-mono">{selectedLayer.pdu}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer Summary */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 text-sm text-slate-300 leading-relaxed">
              {selectedLayer.summary}
            </div>

            {/* Key Concepts with Save to Notebook button */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Conceitos Chave & Evidências Investigativas
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {selectedLayer.keyConcepts.map((concept) => {
                  const isSaved = savedConceptIds.includes(concept.id);
                  return (
                    <div
                      key={concept.id}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-bold text-white">
                          {concept.title}
                        </h4>
                        <button
                          onClick={() => handleToggleSaveConcept(concept.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                            isSaved
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                          }`}
                          title="Anexar este conceito ao seu Caderno de Evidências"
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>No Caderno</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-3.5 h-3.5" />
                              <span>Salvar no Caderno</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-normal">
                        {concept.description}
                      </p>

                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Exemplo Real:</strong> {concept.realWorldExample}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Protocols, Devices & Standards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Protocolos Principais
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLayer.protocols.map((p) => (
                    <span key={p} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  Equipamentos / Dispositivos
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLayer.devices.map((d) => (
                    <span key={d} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Normas e Padrões
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLayer.standards.map((s) => (
                    <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Interactive Encapsulation */}
      {activeTab === 'encapsulamento' && (
        <EncapsulationAnimator />
      )}

      {/* Mode 3: Standardization Bodies */}
      {activeTab === 'padronizacao' && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Organizações de Padronização e Interoperabilidade de Rede
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Como múltiplos fabricantes de hardware e software garantem compatibilidade global nas 7 camadas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OSI_STANDARDIZATION_BODIES.map((cat) => (
              <div key={cat.category} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  {cat.category}
                </h4>
                <div className="space-y-2.5">
                  {cat.organizations.map((org) => (
                    <div key={org.code} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {org.code}
                        </span>
                        {'country' in org && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {org.country}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-200">
                        {org.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {org.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
