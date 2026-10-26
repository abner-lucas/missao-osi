import { NextResponse } from 'next/server';
import { TEACHER_COOKIE, getTeacherAccessKey, teacherToken } from '@/lib/server-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accessKey = typeof body?.accessKey === 'string' ? body.accessKey.trim() : '';

  if (!accessKey || accessKey !== getTeacherAccessKey()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEACHER_COOKIE, teacherToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(TEACHER_COOKIE);
  return response;
}
