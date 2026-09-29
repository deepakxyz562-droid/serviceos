'use client';

import dynamic from 'next/dynamic';

/**
 * Client wrapper for LaunchSpecialModal.
 *
 * The root layout is a server component and cannot use next/dynamic with
 * ssr:false. This client component wraps the dynamic import so the modal
 * (which uses framer-motion) loads asynchronously after hydration,
 * keeping framer-motion out of the initial page bundle.
 */
const LaunchSpecialModal = dynamic(
  () => import('@/components/landing/launch-special-modal').then((m) => m.LaunchSpecialModal),
  { ssr: false, loading: () => null }
);

export function LazyLaunchSpecialModal() {
  return <LaunchSpecialModal />;
}
