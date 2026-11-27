import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { MobileAppHandoff } from '@/components/bgos/mobile-app-handoff';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: 'Opening BGOS App — Business Growth OS',
  description: 'Open BGOS directly in the mobile app or continue in browser.',
};

function firstParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return (val[0] || '').trim();
  return typeof val === 'string' ? val.trim() : '';
}

function actionLabelForView(view: string, socialTab: string): string {
  if (socialTab === 'ai-content' || view === 'studio' || view === 'socialMedia') {
    return 'Opening AI Creative Studio';
  }
  if (view === 'reviews') return 'Opening Google Reviews';
  if (view === 'photos') return 'Opening Media & Photos';
  if (view === 'growthReport' || view === 'growth-report') return 'Opening Growth Report';
  if (view === 'helpCenter' || view === 'help') return 'Opening Help Center';
  if (view === 'settings') return 'Opening Settings';
  if (view === 'billing') return 'Opening BGOS Plan';
  return 'Opening BGOS App';
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

  const view = firstParam(params.view) || 'dashboard';
  const socialTab = firstParam(params.socialTab);
  const tab = firstParam(params.tab);
  const mode = firstParam(params.mode);

  const webQs = new URLSearchParams({ product: 'bgos', view });
  if (socialTab) webQs.set('socialTab', socialTab);
  if (tab) webQs.set('tab', tab);
  if (mode) webQs.set('mode', mode);
  const webFallbackUrl = `/app?${webQs.toString()}`;

  const appQs = new URLSearchParams({ view });
  if (socialTab) appQs.set('socialTab', socialTab);
  if (tab) appQs.set('tab', tab);
  if (mode) appQs.set('mode', mode);
  const appSchemeUrl = `bgos://open?${appQs.toString()}`;

  const ua = hdrs.get('user-agent') || '';
  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  if (!isMobileDevice) {
    redirect(webFallbackUrl);
  }

  return (
    <MobileAppHandoff
      appSchemeUrl={appSchemeUrl}
      webFallbackUrl={webFallbackUrl}
      actionTitle={actionLabelForView(view, socialTab)}
    />
  );
}
