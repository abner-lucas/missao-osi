import { NextRequest, NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { TEACHER_COOKIE, asMissionNumber, teacherToken } from '@/lib/server-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Teacher opens or closes a mission for the whole class.
export async function POST(request: NextRequest) {
  if (request.cookies.get(TEACHER_COOKIE)?.value !== teacherToken()) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const numero = asMissionNumber(body?.numero);
  if (!numero || typeof body?.disponivel !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'Dados inválidos' }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.execute('UPDATE missoes SET disponivel = ?, disponibilidade_alterada_em = ? WHERE numero = ?', [
      body.disponivel ? 1 : 0,
      new Date(),
      numero,
    ]);
    return NextResponse.json({ ok: true, numero, disponivel: body.disponivel });
  } catch (err) {
    console.error('[MySQL] Falha ao alterar disponibilidade da missão:', err);
    return NextResponse.json({ ok: false, error: 'Falha ao gravar' }, { status: 500 });
  }
}
