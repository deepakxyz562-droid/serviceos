'use client';

import React from 'react';
import type { WidgetProps } from './widget-props';

export function DividerWidget({ config }: WidgetProps) {
  const style = (config?.style as string) || 'solid';
  const thickness = Number(config?.thickness || 1);
  const spacing = (config?.spacing as string) || 'medium';

  const marginClass =
    spacing === 'compact'
      ? 'my-2'
      : spacing === 'large'
      ? 'my-8'
      : 'my-4';

  if (style === 'gradient') {
    return (
      <div className={`w-full ${marginClass}`}>
        <div
          className="w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          style={{ height: `${thickness}px` }}
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${marginClass}`}>
      <hr
        className="border-slate-200 dark:border-slate-800"
        style={{
          borderTopWidth: `${thickness}px`,
          borderTopStyle: style as any,
        }}
      />
    </div>
  );
}

export default DividerWidget;
