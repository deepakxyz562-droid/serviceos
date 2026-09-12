'use client';

import { useState, useRef, useMemo } from 'react';
import { Plus, X, MapPin, ChevronDown, Check, Pencil, Phone, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CustomerPickerCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  properties?: any[];
}

export interface CustomerPickerProps {
  customers: CustomerPickerCustomer[];
  selectedCustomerId: string;
  selectedCustomer?: CustomerPickerCustomer | null;
  selectedAddress?: string;
  onAddressSelect?: (addr: string) => void;
  onAddAddressClick?: () => void;
  onCustomAddressChange?: (addr: string) => void;
  onPick: (c: any) => void;
  onClear: () => void;
  onCreate: (nameQuery: string) => void;
  query: string;
  setQuery: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

export function CustomerPicker({
  customers,
  selectedCustomerId,
  selectedCustomer,
  selectedAddress,
  onAddressSelect,
  onAddAddressClick,
  onCustomAddressChange,
  onPick,
  onClear,
  onCreate,
  query,
  setQuery,
  open,
  setOpen,
}: CustomerPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const selected = selectedCustomer || customers.find((c) => c.id === selectedCustomerId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 10);
    return customers
      .filter((c) =>
        [c.name, c.phone || '', c.email || '', c.address || '']
          .some((f) => f.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [customers, query]);

  const handlePick = (c: CustomerPickerCustomer) => {
    onPick(c);
    setOpen(false);
    setQuery('');
  };

  // If a customer is selected, show a comprehensive, slick client & address card
  if (selected) {
    const properties: any[] = selected.properties || [];
    const currentAddress = selectedAddress !== undefined ? selectedAddress : (selected.address || '');

    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-3 space-y-2.5 shadow-xs transition-all">
        {/* Top Header: Client name, Contact info, and Clear action */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-emerald-950 dark:text-emerald-200 truncate">
                {selected.name}
              </p>
              {properties.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                  {properties.length} {properties.length === 1 ? 'saved address' : 'saved addresses'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-emerald-700 dark:text-emerald-400">
              {selected.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3 opacity-70" />
                  {selected.phone}
                </span>
              )}
              {selected.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3 opacity-70" />
                  {selected.email}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditingCustom(false);
              onClear();
              inputRef.current?.focus();
            }}
            className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-200 p-1 -mr-1 -mt-1 rounded-md hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 transition-colors"
            title="Change client"
            aria-label="Clear selected customer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Location & Service Address Sub-Box */}
        <div className="rounded-md border border-emerald-200/80 bg-white/80 dark:border-emerald-900/50 dark:bg-black/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Service Location
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {properties.length > 0 && onAddressSelect && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] font-medium text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 dark:text-emerald-300 dark:bg-emerald-900/60 px-2 gap-1 rounded cursor-pointer"
                    >
                      <span>Change Address</span>
                      <ChevronDown className="size-3 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">
                      Client Saved Properties ({properties.length})
                    </div>
                    {properties.map((prop, idx) => {
                      const propAddr = [prop.street1, prop.street2, prop.city, prop.province, prop.postalCode, prop.country]
                        .filter(Boolean)
                        .join(', ');
                      const isSelected = currentAddress === propAddr || currentAddress === prop.street1;

                      return (
                        <DropdownMenuItem
                          key={prop.id || idx}
                          onClick={() => {
                            onAddressSelect(propAddr);
                            setIsEditingCustom(false);
                          }}
                          className="flex items-start justify-between gap-2 cursor-pointer py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-foreground flex items-center gap-1">
                              {prop.label || `Address ${idx + 1}`}
                              {prop.isPrimary && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                                  Primary
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{propAddr || prop.street1}</p>
                          </div>
                          {isSelected && <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                    {onAddAddressClick && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={onAddAddressClick}
                          className="text-emerald-700 dark:text-emerald-400 font-medium text-xs cursor-pointer gap-1.5"
                        >
                          <Plus className="size-3.5" /> Add new property address
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {onAddAddressClick && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onAddAddressClick}
                  className="h-6 text-[11px] font-medium text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 dark:text-emerald-300 dark:bg-emerald-900/60 px-2 gap-1 rounded cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>Add Location</span>
                </Button>
              )}

              {onCustomAddressChange && (
                <button
                  type="button"
                  onClick={() => setIsEditingCustom((v) => !v)}
                  className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-400 p-1 rounded hover:bg-emerald-100/50 transition-colors cursor-pointer"
                  title={isEditingCustom ? 'Done editing' : 'Edit address manually'}
                >
                  <Pencil className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Address Display / Inline Edit Mode */}
          {isEditingCustom && onCustomAddressChange ? (
            <div className="pt-1">
              <Input
                value={currentAddress}
                onChange={(e) => onCustomAddressChange(e.target.value)}
                placeholder="Enter service location address"
                className="h-8 text-xs bg-white dark:bg-background border-emerald-300 focus-visible:ring-emerald-500"
                autoFocus
              />
            </div>
          ) : (
            <p className="text-xs text-foreground/90 font-medium leading-relaxed pl-5 -mt-0.5 break-words">
              {currentAddress || (
                <span className="text-muted-foreground italic font-normal">
                  No service location specified.{' '}
                  {onAddAddressClick && (
                    <button
                      type="button"
                      onClick={onAddAddressClick}
                      className="text-emerald-700 dark:text-emerald-400 underline font-medium cursor-pointer"
                    >
                      Click here to add one.
                    </button>
                  )}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder="Select a client"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching client found</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(c)}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-b border-border last:border-b-0 transition-colors"
            >
              <p className="font-medium text-sm text-foreground">{c.name}</p>
              {c.address && <p className="text-xs text-muted-foreground truncate">{c.address}</p>}
              <p className="text-xs text-muted-foreground truncate">
                {c.email ? `${c.email} · ` : ''}
                {c.phone}
              </p>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onCreate(query);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-medium text-sm flex items-center gap-2 border-t border-border"
          >
            <span className="flex items-center justify-center size-5 rounded-full bg-emerald-600 text-white">
              <Plus className="size-3.5" />
            </span>
            Create new client{query.trim() ? ` "${query.trim()}"` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
