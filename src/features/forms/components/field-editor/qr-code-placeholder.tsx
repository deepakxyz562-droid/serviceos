'use client';

/**
 * QRCodePlaceholder — pure-CSS decorative QR code grid.
 *
 * Renders a deterministic 11×11 grid of black/white squares derived from the
 * formId hash. Used by the Form Editor Dialog (Embed tab) and the Embed Dialog.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { cn } from '@/lib/utils';

export interface QRCodePlaceholderProps {
  formId: string;
}

export function QRCodePlaceholder({ formId }: QRCodePlaceholderProps) {
  const seed = formId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const cells = Array.from({ length: 121 }, (_, i) => {
    const row = Math.floor(i / 11);
    const col = i % 11;
    const isCorner =
      (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
    const isFilled = isCorner || ((seed * (i + 1) * 7) % 13 > 5);
    return isFilled;
  });

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-xl shadow-inner">
        <div className="grid grid-cols-11 gap-0.5 w-[132px]">
          {cells.map((filled, i) => (
            <div
              key={i}
              className={cn('w-3 h-3', filled ? 'bg-gray-900' : 'bg-white')}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Scan to open form</p>
    </div>
  );
}
