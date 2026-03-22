import { NextResponse } from 'next/server';

const ACCESS_CODE = process.env.SITE_ACCESS_CODE || '';
const COOKIE_NAME = 'floodwatch_access';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(req: Request) {
  const body = await req.json();
  const { code } = body;

  if (!ACCESS_CODE || code !== ACCESS_CODE) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, ACCESS_CODE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return res;
}
