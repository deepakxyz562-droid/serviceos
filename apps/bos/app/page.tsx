'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BosWebApp } from '@/components/bos/bos-web-app';

function BosPageContent() {
  const searchParams = useSearchParams();
  const isDemo =
    searchParams.get('demo') === 'true' || searchParams.get('mode') === 'demo';
  const initialView =
    searchParams.get('view') || searchParams.get('tab') || undefined;

  return <BosWebApp demoMode={isDemo} initialView={initialView} />;
}

export default function BosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#F4F8F6] text-[#0A6847] font-bold">
          Loading BOS...
        </div>
      }
    >
      <BosPageContent />
    </Suspense>
  );
}
