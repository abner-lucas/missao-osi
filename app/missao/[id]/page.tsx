'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import MissionShell from '@/components/MissionShell';

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
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 space-y-8 w-full">
        <MissionShell missionNumber={missionNumber} />
      </main>
    </div>
  );
}
