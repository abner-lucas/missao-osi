'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import MissionShell from '@/components/MissionShell';
import Footer from '@/components/Footer';

interface Props {
  params: Promise<{ id: string }>;
}

export default function MissionPage({ params }: Props) {
  const resolvedParams = React.use(params);
  const rawId = resolvedParams.id;

  let missionNumber: number;
  if (rawId === 'final' || rawId === '8') {
    missionNumber = 8;
  } else {
    missionNumber = parseInt(rawId, 10);
  }

  if (isNaN(missionNumber) || missionNumber < 1 || missionNumber > 8) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <MissionShell missionNumber={missionNumber} />
      </main>
      <Footer />
    </div>
  );
}
