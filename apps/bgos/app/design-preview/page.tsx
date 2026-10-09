import type { Metadata } from 'next';
import { BgosDesignPreview } from '@/components/bgos/design-preview/preview';

export const metadata: Metadata = {
  title: 'BGOS · Design preview',
  robots: { index: false, follow: false },
};

// This page renders only local fixtures. It never bootstraps a live session.
export default function DesignPreviewPage() {
  return <BgosDesignPreview />;
}
