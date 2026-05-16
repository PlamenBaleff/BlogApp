import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/admin', '/dashboard'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle CORS preflight for API routes so the Expo web preview (and any other
  // browser client running on a different origin) can call our endpoints.
  if (pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  const hasToken =
    request.cookies.get('accessToken')?.value ||
    request.headers.get('authorization');

  if (!hasToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/api/:path*'],
};
