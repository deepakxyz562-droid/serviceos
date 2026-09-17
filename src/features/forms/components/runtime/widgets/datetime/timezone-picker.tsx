'use client';

import React from 'react';
import { Globe, Check, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';

// Curated subset of common IANA timezones (UTC offsets computed via Intl).
const TZ_IDS = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Halifax', 'America/Toronto', 'America/Vancouver',
  'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires', 'America/Bogota',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Stockholm', 'Europe/Oslo',
  'Europe/Warsaw', 'Europe/Athens', 'Europe/Istanbul', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'Asia/Dubai', 'Asia/Tehran', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Dhaka',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Manila', 'Asia/Singapore', 'Asia/Hong_Kong',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Taipei',
  'Australia/Sydney', 'Australia/Perth', 'Australia/Adelaide',
  'Pacific/Auckland', 'Pacific/Honolulu',
];

function tzOffset(id: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(new Date());
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    return tz.replace('GMT', 'UTC');
  } catch {
    return '';
  }
}

const TZ_ENTRIES = TZ_IDS.map((id) => ({ id, label: id.replace(/_/g, ' '), offset: tzOffset(id) }));

export function TimezonePicker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Timezone');
  const placeholder = str(config.placeholder, 'Select timezone');
  const [open, setOpen] = React.useState(false);

  const valStr = typeof value === 'string' ? value : '';
  const selected = TZ_ENTRIES.find((t) => t.id === valStr);

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
          <span className="flex items-center gap-2 truncate">
            <Globe className="size-4 text-muted-foreground" />
            {selected ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">{selected.offset}</span>
                <span className="truncate">{selected.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <Search className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {TZ_ENTRIES.map((tz) => (
                <CommandItem
                  key={tz.id}
                  value={`${tz.id} ${tz.label}`}
                  onSelect={() => {
                    onChange(tz.id);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Check className={cn('size-4', valStr === tz.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="font-mono text-xs text-muted-foreground w-12">{tz.offset}</span>
                  <span className="truncate">{tz.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default TimezonePicker;
