import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirect /streaming to home page since streaming functionality is now integrated into homepage
  if (request.nextUrl.pathname === '/streaming') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/streaming']
};
