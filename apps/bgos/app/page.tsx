import { redirect } from 'next/navigation';

/** Preserve sign-in callbacks and deep links while using the real application. */
export default async function BgosPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  if (!query.has('auth')) query.set('auth', 'login');
  redirect(`/app${query.size ? `?${query}` : ''}`);
}
