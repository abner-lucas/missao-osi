import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getDb, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Which missions the teacher has opened for the class. Without a database every mission stays open.
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, configured: false, disponiveis: {} });
  }
  try {
    const db = await getDb();
    const [rows] = await db.query<RowDataPacket[]>('SELECT numero, disponivel FROM missoes');
    const disponiveis: Record<number, boolean> = {};
    for (const row of rows) disponiveis[row.numero] = Boolean(row.disponivel);
    return NextResponse.json({ ok: true, configured: true, disponiveis });
  } catch (err) {
    console.error('[MySQL] Falha ao ler disponibilidade das missões:', err);
    return NextResponse.json({ ok: false, configured: true, disponiveis: {} }, { status: 503 });
  }
}
