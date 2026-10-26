'use client';

export type MissionAvailability = {
  // Missions explicitly closed by the teacher; anything not listed is open.
  closed: Set<number>;
  // False when the server has no database (availability cannot be controlled).
  controlled: boolean;
};

// Fails open: if the server cannot be reached, students are not blocked from working.
export async function fetchMissionAvailability(): Promise<MissionAvailability> {
  try {
    const res = await fetch('/api/missoes', { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    const closed = new Set<number>();
    for (const [numero, open] of Object.entries(payload?.disponiveis || {})) {
      if (open === false) closed.add(Number(numero));
    }
    return { closed, controlled: Boolean(res.ok && payload?.configured) };
  } catch {
    return { closed: new Set(), controlled: false };
  }
}

export async function isMissionOpen(missionNumber: number): Promise<boolean> {
  const { closed } = await fetchMissionAvailability();
  return !closed.has(missionNumber);
}

export async function setMissionAvailability(numero: number, disponivel: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/professor/missoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero, disponivel }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
