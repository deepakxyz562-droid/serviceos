'use client';

import React, { useState } from 'react';
import { Heart, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';

interface WishlistValue {
  productId: string;
  variant?: string;
  name?: string;
  added: boolean;
  wishlistId?: string;
  timestamp?: string;
}

export function WishlistAdd({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Add to wishlist');
  const productId = str(config.productId, 'prod-001');
  const variant = str(config.variant, '');
  const name = str(config.name, str(field?.label, 'Product'));
  const buttonStyle = str(config.buttonStyle, 'default'); // default | compact | pill
  const showLabel = config.showLabel !== false;

  const existing: WishlistValue | undefined = value && typeof value === 'object' ? (value as WishlistValue) : undefined;
  const [added, setAdded] = useState<boolean>(existing?.added ?? false);
  const [loading, setLoading] = useState(false);

  const handleToggle = () => {
    if (disabled) return;
    setLoading(true);
    setTimeout(() => {
      const next = !added;
      setAdded(next);
      if (next) {
        const out: WishlistValue = {
          productId,
          variant: variant || undefined,
          name,
          added: true,
          wishlistId: `wl_${Math.random().toString(36).slice(2, 12)}`,
          timestamp: new Date().toISOString(),
        };
        onChange(out);
      } else {
        onChange({ productId, variant: variant || undefined, name, added: false });
      }
      setLoading(false);
    }, 350);
  };

  const sizeCls = buttonStyle === 'compact' ? 'h-8 px-3 text-[11px]' :
    buttonStyle === 'pill' ? 'h-9 px-5 rounded-full text-xs' : 'h-9 px-4 text-xs';

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <Button
        type="button"
        disabled={disabled || loading}
        onClick={handleToggle}
        variant={added ? 'secondary' : 'outline'}
        className={cn(sizeCls, 'gap-1.5 w-full sm:w-auto', added && 'text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30')}
        aria-label={`${added ? 'Remove from' : 'Add to'} wishlist`}
        aria-pressed={added}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : added ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <Heart className={cn('size-4', !added && 'text-rose-500')} fill={added ? 'currentColor' : 'none'} />
        )}
        {showLabel && <span>{added ? 'Saved!' : 'Add to Wishlist'}</span>}
        {added && existing?.wishlistId && (
          <Badge variant="outline" className="text-[8px] ml-1 px-1 py-0">#{existing.wishlistId.slice(-4)}</Badge>
        )}
      </Button>
      {added && existing?.timestamp && (
        <p className="text-[10px] text-muted-foreground">
          Saved · {new Date(existing.timestamp).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

export default WishlistAdd;
