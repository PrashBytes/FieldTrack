import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/login', '/signup', '/forgot-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublic = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
  if (isPublic) {
    return NextResponse.next();
  }

  // Check for Supabase auth cookies without making a network call.
  // The client-side auth context does the full session validation.
  const hasAuthCookie = req.cookies.getAll().some((c) =>
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
