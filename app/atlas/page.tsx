'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AtlasView from '@/components/AtlasView';

export default function AtlasPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="max-w-3xl">
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold [font-stretch:78%] leading-[1.04]">Atlas OSI</h1>
          <p className="mt-3 text-lg text-grafite-2">
            Consulta livre, a qualquer momento: as sete camadas, como os dados são encapsulados e quem define as normas.
          </p>
        </div>
        <AtlasView />
      </main>

      <Footer />
    </div>
  );
}
