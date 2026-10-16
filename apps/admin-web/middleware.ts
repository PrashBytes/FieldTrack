import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/access-denied'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const { pathname } = req.nextUrl;

  // 1. Skip static assets, internals, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return res;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        res = NextResponse.next({
          request: {
            headers: req.headers,
          },
        });
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: '', ...options });
        res = NextResponse.next({
          request: {
            headers: req.headers,
          },
        });
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const isLocalOrPlaceholder =
    !supabaseUrl ||
    supabaseUrl.includes('placeholder') ||
    supabaseUrl.includes('your-project-id') ||
    supabaseUrl.includes('127.0.0.1') ||
    supabaseUrl.includes('localhost');

  // Fast check: look for Supabase auth token cookie or dev fallback cookie
  const devAuthCookie = req.cookies.get('sb-dev-auth-token')?.value;
  const hasStandardAuthCookie = req.cookies.getAll().some((c) =>
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );
  const hasAuthCookie = !!devAuthCookie || hasStandardAuthCookie;

  const isPublicRoute =
    pathname === '/' ||
    publicRoutes.some(
      (route) => pathname === route || (route !== '/' && pathname.startsWith(route + '/'))
    );

  // Unauthenticated user attempting to access protected route
  if (!hasAuthCookie && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // In local development or mock mode, never block on network requests
  if (isLocalOrPlaceholder || devAuthCookie) {
    if (hasAuthCookie && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  }

  // Validate session when real Supabase is configured
  if (hasAuthCookie) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user && !isPublicRoute) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // If authenticated user navigates to login, redirect to dashboard
      if (user && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Role authorization for dashboard routes
      if (user && !isPublicRoute) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = profile?.role?.toUpperCase();
        const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'];

        if (role && !allowedRoles.includes(role)) {
          return NextResponse.redirect(new URL('/access-denied', req.url));
        }
      }
    } catch {
      // In build-time or network error scenarios, proceed safely
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
