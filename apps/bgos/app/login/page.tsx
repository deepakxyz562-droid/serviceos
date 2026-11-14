import { redirect } from 'next/navigation';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fieseros.bgos';

/**
 * BGOS entry route (Option A: 100% Mobile / App-First).
 * Redirects general login traffic directly to the Google Play Store.
 * Preserves OAuth code/token callbacks if triggered by integrations.
 */
export default async function BgosLogin({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params && ('code' in params || 'token' in params)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
    }
    query.set('product', 'bgos');
    redirect(`/app${query.size ? `?${query}` : ''}`);
  }

  redirect(PLAY_STORE_URL);
}
