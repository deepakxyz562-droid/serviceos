import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { MobileAppHandoff } from '@/components/bgos/mobile-app-handoff';
import { buildBgosOpenHandoffConfig } from '@/lib/bgos/open-handoff';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: 'Opening BGOS App — Business Growth OS',
  description: 'Open BGOS directly in the mobile app or install it from Google Play.',
};

function firstParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return (val[0] || '').trim();
  return typeof val === 'string' ? val.trim() : '';
}

export default async function OpenBgosAppPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const [params, hdrs] = await Promise.all([
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
    headers(),
  ]);

  const handoff = buildBgosOpenHandoffConfig({
    view: firstParam(params.view),
    socialTab: firstParam(params.socialTab),
    tab: firstParam(params.tab),
    mode: firstParam(params.mode),
    userAgent: hdrs.get('user-agent') || '',
  });

  if (!handoff.isMobile) {
    redirect(handoff.webFallbackUrl);
  }

  return (
    <MobileAppHandoff
      platform={handoff.platform}
      appSchemeUrl={handoff.appSchemeUrl}
      androidIntentUrl={handoff.androidIntentUrl}
      storeUrl={handoff.storeUrl}
      storeLabel={handoff.storeLabel}
      webFallbackUrl={handoff.webFallbackUrl}
      actionTitle={handoff.actionTitle}
    />
  );
}
