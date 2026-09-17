'use client';

import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PackageX, PackageCheck, Boxes } from 'lucide-react';
import { WidgetProps, str, num, bool } from '../widget-props';

interface StockOption {
  label: string;
  value: string;
  stock?: number;
  price?: number;
}

export function InventoryDropdownV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Inventory dropdown');
  const placeholder = str(config.placeholder, 'Select an item…');
  const showStock = bool(config.showStock, true);
  const disableSoldOut = bool(config.disableSoldOut, true);
  const currency = str(config.currency, 'USD');

  const options: StockOption[] = useMemo(() => {
    const raw = config.options;
    if (!Array.isArray(raw)) {
      return [
        { label: 'Item A', value: 'a', stock: 12, price: 19.99 },
        { label: 'Item B', value: 'b', stock: 0, price: 24.99 },
        { label: 'Item C', value: 'c', stock: 3, price: 9.99 },
      ];
    }
    return raw.map((item, idx) => {
      if (typeof item === 'string') return { label: item, value: item, stock: 10, price: 0 };
      const o = item as Record<string, unknown>;
      return {
        label: str(o.label, String(o.value ?? idx)),
        value: str(o.value, String(o.label ?? idx)),
        stock: num(o.stock, 0),
        price: num(o.price, 0),
      };
    });
  }, [config.options]);

  const [selected, setSelected] = useState<string>(typeof value === 'string' ? value : '');
  const current = options.find((o) => o.value === selected);

  const commit = (v: string) => {
    setSelected(v);
    const opt = options.find((o) => o.value === v);
    onChange({
      value: v,
      label: opt?.label ?? '',
      stock: opt?.stock ?? 0,
      price: opt?.price ?? 0,
      soldOut: (opt?.stock ?? 0) <= 0,
    });
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Select value={selected} onValueChange={commit} disabled={disabled}>
        <SelectTrigger aria-label={ariaLabel} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((opt) => {
              const soldOut = opt.stock <= 0;
              const disabledItem = disableSoldOut && soldOut;
              return (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={disabledItem}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    {soldOut ? (
                      <PackageX className="size-3.5 text-muted-foreground" />
                    ) : (
                      <PackageCheck className="size-3.5 text-emerald-600" />
                    )}
                    <span>{opt.label}</span>
                  </span>
                  {showStock && (
                    <span className="ml-auto pl-2 text-[10px] text-muted-foreground">
                      {soldOut ? 'Sold out' : `${opt.stock} left`}
                    </span>
                  )}
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>

      {current && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1">
            <Boxes className="size-3" />
            {current.stock > 0 ? `${current.stock} in stock` : 'Sold out'}
          </Badge>
          {current.price > 0 && (
            <Badge variant="outline">
              {current.price.toFixed(2)} {currency}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default InventoryDropdownV2;
