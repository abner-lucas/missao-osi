'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, BookmarkCheck, Search } from 'lucide-react';
import { OSI_LAYERS_DATA, OSI_STANDARDIZATION_BODIES } from '@/lib/atlas-data';
import { LayerInfo } from '@/lib/types';
import { toggleConceptInNotebook, getEvidenceNotebook } from '@/lib/storage';
import { wireBackground } from '@/lib/wires';
import EncapsulationAnimator from './EncapsulationAnimator';

type AtlasTab = 'camadas' | 'encapsulamento' | 'padronizacao';

const TABS: { key: AtlasTab; label: string }[] = [
  { key: 'camadas', label: 'As 7 camadas' },
  { key: 'encapsulamento', label: 'Encapsulamento' },
  { key: 'padronizacao', label: 'Organizações e normas' },
];

export default function AtlasView() {
  const [selectedLayerNumber, setSelectedLayerNumber] = useState<number>(7);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedConceptIds, setSavedConceptIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<AtlasTab>('camadas');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setActiveTab(TABS[next].key);
    tabRefs.current[TABS[next].key]?.focus();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-linha">
        <div role="tablist" aria-label="Modos do Atlas" className="flex overflow-x-auto -mb-px">
          {TABS.map((t, i) => {
            const selected = activeTab === t.key;
            return (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[t.key] = el;
                }}
                type="button"
                role="tab"
                id={`atlas-aba-${t.key}`}
                aria-selected={selected}
                aria-controls={`atlas-painel-${t.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(t.key)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`shrink-0 min-h-12 px-4 border-b-[3px] font-bold whitespace-nowrap transition-colors ${
                  selected ? 'border-caneta text-caneta' : 'border-transparent text-grafite-2 hover:text-grafite'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'camadas' && (
          <div className="relative w-full md:max-w-xs pb-3">
            <label htmlFor="busca-atlas" className="sr-only">
              Buscar no Atlas
            </label>
            <Search className="w-5 h-5 text-grafite-3 absolute left-3 top-[1.4rem] -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              id="busca-atlas"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar protocolo, conceito ou equipamento"
              className="campo !pl-10"
            />
          </div>
        )}
      </div>

      {activeTab === 'camadas' && (
        <div role="tabpanel" id="atlas-painel-camadas" aria-labelledby="atlas-aba-camadas" className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <nav aria-label="Camadas do modelo OSI">
            <p className="sr-only" aria-live="polite">
              {searchQuery.trim() ? `${filteredLayers.length} camadas encontradas` : ''}
            </p>
            {filteredLayers.length === 0 ? (
              <p className="text-grafite-2 p-4">Nada encontrado para &quot;{searchQuery}&quot;.</p>
            ) : (
              <ul className="space-y-1.5">
                {filteredLayers.map((layer) => {
                  const isSelected = selectedLayerNumber === layer.number;
                  return (
                    <li key={layer.number}>
                      <button
                        type="button"
                        onClick={() => setSelectedLayerNumber(layer.number)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                          isSelected ? 'bg-folha shadow-[0_0_0_2px_var(--color-caneta)]' : 'hover:bg-folha'
                        }`}
                      >
                        <span aria-hidden="true" className="font-display font-extrabold text-2xl w-6 text-center">
                          {layer.number}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold text-lg leading-tight">
                            <span className="sr-only">Camada {layer.number}: </span>
                            {layer.namePt}
                          </span>
                          <span className="block text-sm text-grafite-2">Unidade de dados: {layer.pdu}</span>
                        </span>
                        <span aria-hidden="true" className="w-10 h-2.5 rounded-full shrink-0" style={{ background: wireBackground(layer.number) }} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={selectedLayer.number}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="folha overflow-hidden"
              aria-labelledby="titulo-camada"
            >
              <div aria-hidden="true" className="h-3" style={{ background: wireBackground(selectedLayer.number) }} />
              <div className="p-5 sm:p-8 space-y-7">
                <header>
                  <p className="text-grafite-2">
                    Camada {selectedLayer.number}, em inglês {selectedLayer.nameEn}
                  </p>
                  <h2 id="titulo-camada" className="mt-1 text-[clamp(2rem,4vw,2.75rem)] font-extrabold [font-stretch:80%]">
                    {selectedLayer.namePt}
                  </h2>
                  <p className="mt-1 text-grafite-2">
                    Unidade de dados: <strong className="text-grafite">{selectedLayer.pdu}</strong>
                  </p>
                  <p className="mt-4 text-lg leading-relaxed max-w-prose">{selectedLayer.summary}</p>
                </header>

                <section aria-labelledby="titulo-conceitos">
                  <h3 id="titulo-conceitos" className="text-2xl font-extrabold">
                    Conceitos-chave
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {selectedLayer.keyConcepts.map((concept) => {
                      const isSaved = savedConceptIds.includes(concept.id);
                      return (
                        <li key={concept.id} className="rounded-xl border border-linha p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <h4 className={`text-lg font-extrabold leading-snug ${isSaved ? 'marca-texto' : ''}`}>{concept.title}</h4>
                            <button
                              type="button"
                              onClick={() => handleToggleSaveConcept(concept.id)}
                              aria-pressed={isSaved}
                              className={`btn shrink-0 !min-h-10 !py-1.5 ${isSaved ? 'bg-marca text-grafite hover:bg-[#ffdd55]' : 'btn-secundario'}`}
                              title="Anexar este conceito ao seu Caderno de Evidências"
                            >
                              {isSaved ? (
                                <>
                                  <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
                                  <span>No Caderno</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-4 h-4" aria-hidden="true" />
                                  <span>Salvar no Caderno</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="mt-2 leading-relaxed">{concept.description}</p>
                          <p className="mt-2 text-grafite-2">
                            <strong className="text-grafite">Exemplo real:</strong> {concept.realWorldExample}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <dl className="grid gap-5 md:grid-cols-3 border-t border-linha pt-6">
                  {[
                    { title: 'Protocolos', items: selectedLayer.protocols, mono: true },
                    { title: 'Equipamentos', items: selectedLayer.devices, mono: false },
                    { title: 'Normas e padrões', items: selectedLayer.standards, mono: true },
                  ].map((group) => (
                    <div key={group.title}>
                      <dt className="font-bold">{group.title}</dt>
                      <dd className="mt-2 flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <span key={item} className={`rounded-md bg-papel border border-linha px-2 py-0.5 text-[0.95rem] ${group.mono ? 'font-mono' : ''}`}>
                            {item}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      )}

      {activeTab === 'encapsulamento' && (
        <div role="tabpanel" id="atlas-painel-encapsulamento" aria-labelledby="atlas-aba-encapsulamento">
          <EncapsulationAnimator />
        </div>
      )}

      {activeTab === 'padronizacao' && (
        <div role="tabpanel" id="atlas-painel-padronizacao" aria-labelledby="atlas-aba-padronizacao" className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold">Quem define as regras da rede</h2>
            <p className="mt-2 text-lg text-grafite-2">
              Fabricantes diferentes conseguem conversar porque seguem as mesmas normas, nas sete camadas.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {OSI_STANDARDIZATION_BODIES.map((cat) => (
              <section key={cat.category} aria-labelledby={`org-${cat.category}`} className="folha p-5 sm:p-6">
                <h3 id={`org-${cat.category}`} className="text-2xl font-extrabold">
                  {cat.category}
                </h3>
                <ul className="mt-4 divide-y divide-linha">
                  {cat.organizations.map((org) => (
                    <li key={org.code} className="py-3 first:pt-0 last:pb-0">
                      <p className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-display font-extrabold text-xl">{org.code}</span>
                        {'country' in org && <span className="text-sm text-grafite-2">{org.country}</span>}
                      </p>
                      <p className="font-semibold">{org.name}</p>
                      <p className="text-grafite-2">{org.role}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
