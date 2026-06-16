import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 proxy (formerly "middleware").
 *
 * Forwards the request pathname as an `x-pathname` header so the root layout
 * (a Server Component) can choose the correct <html lang> for the Greek (/)
 * vs English (/en) trees. No rewrites/redirects — bare / stays Greek, /en stays
 * English.
 */
export function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', request.nextUrl.pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    // Run on page routes only — skip Next internals and static asset files.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
