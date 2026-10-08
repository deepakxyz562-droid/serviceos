import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { productForHostname } from '../shared/product-context';

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase();
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // If someone requests /quote-flow directly on fieseros.com, redirect to quoteflow.fieseros.com
  if (
    (host === 'fieseros.com' || host === 'www.fieseros.com') &&
    pathname.startsWith('/quote-flow')
  ) {
    const redirectUrl = new URL(request.url);
    redirectUrl.host = 'quoteflow.fieseros.com';
    redirectUrl.pathname = pathname === '/quote-flow' ? '/' : pathname.replace('/quote-flow', '');
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  const appProduct = productForHostname(host);
  if (appProduct === 'quoteflow' && pathname === '/') {
    url.pathname = '/quote-flow';
    return NextResponse.rewrite(url);
  }

  const response = NextResponse.next();
  response.headers.set('x-app-product', appProduct);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
