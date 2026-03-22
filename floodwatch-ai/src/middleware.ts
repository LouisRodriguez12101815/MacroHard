/**
 * Site Access Gate — Middleware
 *
 * Protects the entire deployment behind a simple access code.
 * Set SITE_ACCESS_CODE in .env.local (and in Vercel env vars).
 *
 * Visitors see a password prompt. Once they enter the correct code,
 * a cookie is set and they can browse freely for 24 hours.
 *
 * To disable the gate, remove SITE_ACCESS_CODE from env or set it to empty.
 */

import { NextRequest, NextResponse } from 'next/server';

const ACCESS_CODE = process.env.SITE_ACCESS_CODE || '';
const COOKIE_NAME = 'floodwatch_access';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export function middleware(req: NextRequest) {
  // If no access code is configured, allow everything through
  if (!ACCESS_CODE) return NextResponse.next();

  // Allow API routes through (they're used by the app itself)
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  // Allow the gate endpoint itself
  if (req.nextUrl.pathname === '/gate') return NextResponse.next();

  // Allow static assets
  if (
    req.nextUrl.pathname.startsWith('/_next/') ||
    req.nextUrl.pathname.startsWith('/favicon') ||
    req.nextUrl.pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // Check for valid access cookie
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === ACCESS_CODE) return NextResponse.next();

  // No valid cookie — redirect to gate
  const gateUrl = new URL('/gate', req.url);
  gateUrl.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
