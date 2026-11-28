import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { MobileAppHandoff } from '@/components/bgos/mobile-app-handoff';
import {
  buildBgosOpenHandoffConfig,
  buildCleanBgosOpenDestination,
} from '@/lib/bgos/open-handoff';
import { recordTokenClickEvent } from '@/lib/email-consent';

export const dynamic = 'force-dynamic';

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

  const view = firstParam(params.view);
  const socialTab = firstParam(params.socialTab);
  const tab = firstParam(params.tab);
  const mode = firstParam(params.mode);
  const clickToken = firstParam(params.ct);
  const userAgent = hdrs.get('user-agent') || '';

  if (clickToken) {
    const rawHost = (hdrs.get('x-forwarded-host') || hdrs.get('host') || 'bgos.site').trim();
    const proto = (hdrs.get('x-forwarded-proto') || 'https').trim();
    const baseUrl = rawHost.includes('://') ? rawHost : `${proto}://${rawHost}`;
    await recordTokenClickEvent({
      token: clickToken,
      destination: buildCleanBgosOpenDestination({ baseUrl, view, socialTab, tab, mode }),
      userAgent,
      ipAddress: hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip'),
    });
  }

  const handoff = buildBgosOpenHandoffConfig({
    view,
    socialTab,
    tab,
    mode,
    userAgent,
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
