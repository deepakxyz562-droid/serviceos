"use client";

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiFetch } from '@/lib/api/client';

export interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
}

interface CustomerSelectProps {
  value?: string;
  onChange: (customer: CustomerOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerSelect({
  value,
  onChange,
  placeholder = 'Select customer...',
  disabled = false,
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Debounced search
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const query = search.trim();
        const url = `/api/customers?limit=15${query ? `&search=${encodeURIComponent(query)}` : ''}`;
        const res = await apiFetch<{ data?: CustomerOption[]; customers?: CustomerOption[] }>(url);
        const list = res.data || res.customers || [];
        if (active) setOptions(list);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  // Fetch initial selected customer details if value is provided
  useEffect(() => {
    if (!value) {
      setSelectedCustomer(null);
      return;
    }
    const found = options.find((c) => c.id === value);
    if (found) {
      setSelectedCustomer(found);
    } else {
      apiFetch<{ customer?: CustomerOption; data?: CustomerOption }>(`/api/customers/${value}`)
        .then((res) => {
          const cust = res.customer || res.data;
          if (cust) setSelectedCustomer(cust);
        })
        .catch(() => {});
    }
  }, [value, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedCustomer ? (
            <span className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedCustomer.name}</span>
              {selectedCustomer.companyName && (
                <span className="text-xs text-muted-foreground truncate">
                  ({selectedCustomer.companyName})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, phone, or email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching customers...
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty>No customers found.</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((cust) => (
                <CommandItem
                  key={cust.id}
                  value={cust.id}
                  onSelect={() => {
                    setSelectedCustomer(cust);
                    onChange(cust);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === cust.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{cust.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {cust.phone || cust.email || cust.companyName || 'No contact info'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
