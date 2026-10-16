'use client';

import React from 'react';
import Header from '@/components/Header';
import AtlasView from '@/components/AtlasView';
import { BookOpen } from 'lucide-react';

export default function AtlasPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 space-y-6 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>MAPA MENTAL DE REFERÊNCIA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Atlas OSI — Modelo de Interconexão de Sistemas Abertos
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Consulte as 7 camadas, PDUs, padrões internacionais (ISO, IEEE, ABNT), protocolos e simulação de encapsulamento.
            </p>
          </div>
        </div>

        <AtlasView />
      </main>
    </div>
  );
}
