'use client';

import React, { useCallback, useRef, useState } from 'react';
import { MoveHorizontal, Image as ImageIcon } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

interface ComparisonSliderValue {
  position: number;
}

export function ComparisonSlider({ value, onChange, config, disabled, field }: WidgetProps) {
  const beforeImage = String(config?.beforeImage ?? '');
  const afterImage = String(config?.afterImage ?? '');
  const beforeLabel = String(config?.beforeLabel ?? 'Before');
  const afterLabel = String(config?.afterLabel ?? 'After');
  const ariaLabel = String(field?.label ?? 'Comparison slider');

  const initialValue = typeof value === 'number' ? value : 50;
  const [position, setPosition] = useState<number>(
    typeof (value as ComparisonSliderValue | undefined)?.position === 'number'
      ? (value as ComparisonSliderValue).position
      : initialValue,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, pct));
    setPosition(clamped);
    onChange({ position: clamped });
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || disabled) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => { draggingRef.current = false; };

  const handleKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 10 : 1;
    let next = position;
    if (e.key === 'ArrowLeft') next = Math.max(0, position - step);
    else if (e.key === 'ArrowRight') next = Math.min(100, position + step);
    else return;
    e.preventDefault();
    setPosition(next);
    onChange({ position: next });
  };

  if (!beforeImage || !afterImage) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <ImageIcon className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">Configure before &amp; after images</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.beforeImage</code> &amp; <code>config.afterImage</code>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div
        ref={containerRef}
        className="relative w-full aspect-video rounded-xl overflow-hidden border border-border select-none touch-none bg-muted/30"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img src={afterImage} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div
          className="absolute inset-0 h-full overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="absolute inset-0 h-full object-cover"
            style={{ width: `${100 * (100 / Math.max(position, 1))}%` }}
            draggable={false}
          />
        </div>

        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-black/60 text-white rounded px-1.5 py-0.5">
          {beforeLabel}
        </span>
        <span className="absolute top-2 right-2 text-[10px] font-semibold bg-black/60 text-white rounded px-1.5 py-0.5">
          {afterLabel}
        </span>

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md"
          style={{ left: `${position}%` }}
        >
          <button
            type="button"
            aria-label="Drag to compare"
            aria-valuenow={Math.round(position)}
            aria-valuemin={0}
            aria-valuemax={100}
            role="slider"
            disabled={disabled}
            onKeyDown={handleKey}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-9 rounded-full bg-white text-slate-800 border border-slate-300 shadow-lg flex items-center justify-center cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={{ left: 0 }}
          >
            <MoveHorizontal className="size-4" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Position: {Math.round(position)}%
      </p>
    </div>
  );
}

export default ComparisonSlider;
