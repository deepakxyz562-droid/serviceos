import { redirect } from 'next/navigation';

/**
 * BGOS entry route.
 *
 * Preserves sign-in callbacks and deep links while redirecting to the real
 * application shell at `/app`. We redirect to `/app` (NOT `/`) because `/`
 * is this very route — redirecting to `/` would create an infinite loop
 * (`ERR_TOO_MANY_REDIRECTS`).
 */
export default async function BgosLogin({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  query.set('product', 'bgos');
  if (!query.has('auth')) query.set('auth', 'login');
  redirect(`/app${query.size ? `?${query}` : ''}`);
}
