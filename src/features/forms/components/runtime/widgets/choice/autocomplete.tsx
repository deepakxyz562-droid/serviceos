'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { WidgetProps, normalizeOptions, str, bool, num } from '../widget-props';
import { cn } from '@/lib/utils';

export function Autocomplete({ value, onChange, config, disabled, field }: WidgetProps) {
  // Settings write `customOptions` as a comma-separated string. Legacy
  // runtime read `config.options` (array). Build the option list from
  // `customOptions` first, then fall back to `config.options` / field defaults.
  const customOptions = config.customOptions;
  const rawOptions =
    (typeof customOptions === 'string' && customOptions.trim()
      ? customOptions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null) ||
    config.options ||
    (field as any)?.options || [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
      'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin',
    ];
  const options = normalizeOptions(rawOptions);
  // Settings write `dataSource` (string) and `maxItems` (number). Honor
  // `maxItems` by truncating the visible option list when set.
  const maxItems = num(config.maxItems, 0);
  const visibleOptions = maxItems > 0 ? options.slice(0, maxItems) : options;
  const allowCustom = bool(config.allowCustom ?? config.allowCustomOptions, true);
  const placeholder = str(config.placeholder, 'Search or type...');
  const ariaLabel = str(field?.label, 'Autocomplete');
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const valStr = typeof value === 'string' ? value : '';
  const selected = visibleOptions.find((o) => o.value === valStr);
  const filtered = visibleOptions.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const showCustom = allowCustom && query && !visibleOptions.some((o) => o.label.toLowerCase() === query.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? selected.label : valStr ? valStr : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type to search..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{allowCustom ? 'Press Enter to add custom value' : 'No results found.'}</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Check className={cn('size-4', valStr === opt.value ? 'opacity-100' : 'opacity-0')} />
                  {opt.label}
                </CommandItem>
              ))}
              {showCustom && (
                <CommandItem
                  value="__custom__"
                  onSelect={() => {
                    onChange(query);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="text-primary"
                >
                  <Search className="size-4" />
                  Use “{query}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default Autocomplete;
