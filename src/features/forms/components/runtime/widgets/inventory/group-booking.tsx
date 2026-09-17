'use client';

import React, { useMemo, useState } from 'react';
import { Users, UserPlus, Trash2, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface Attendee {
  name: string;
  email?: string;
  phone?: string;
}

interface GroupValue {
  primaryContact?: string;
  attendees: Attendee[];
  count: number;
}

export function GroupBooking({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Group booking');
  const maxAttendees = Math.max(1, num(config.maxAttendees, 10));
  const requireEmail = !!config.requireEmail;

  const [attendees, setAttendees] = useState<Attendee[]>(() => {
    const v = value as GroupValue | undefined;
    if (v?.attendees && Array.isArray(v.attendees)) return v.attendees;
    return [{ name: '' }];
  });
  const [primary, setPrimary] = useState<string>(() => {
    const v = value as GroupValue | undefined;
    return v?.primaryContact ?? '';
  });

  const emit = (next: Attendee[], p: string) => {
    setAttendees(next);
    setPrimary(p);
    onChange({
      primaryContact: p,
      attendees: next,
      count: next.filter((a) => a.name.trim()).length,
    });
  };

  const update = (idx: number, patch: Partial<Attendee>) => {
    const next = attendees.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    emit(next, primary);
  };

  const addRow = () => {
    if (attendees.length >= maxAttendees) return;
    emit([...attendees, { name: '' }], primary);
  };

  const removeRow = (idx: number) => {
    if (attendees.length === 1) return;
    emit(attendees.filter((_, i) => i !== idx), primary);
  };

  const filled = attendees.filter((a) => a.name.trim()).length;

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Users className="size-3.5" /> Attendees
        </span>
        <Badge variant="secondary" className="text-[9px]">
          {filled} / {maxAttendees}
        </Badge>
      </div>

      <Input
        placeholder="Primary contact name (organizer)"
        value={primary}
        onChange={(e) => emit(attendees, e.target.value)}
        disabled={disabled}
        aria-label="Primary contact name"
        className="text-xs h-9"
      />

      <div className="space-y-2">
        {attendees.map((a, idx) => (
          <div key={idx} className="rounded-lg border border-border/60 p-2 space-y-1.5 bg-muted/20">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
              <div className="flex-1 relative">
                <User className="absolute left-2 top-2.5 size-3 text-muted-foreground" />
                <Input
                  placeholder={`Attendee ${idx + 1} name`}
                  value={a.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  disabled={disabled}
                  aria-label={`Attendee ${idx + 1} name`}
                  className="text-xs h-8 pl-7"
                />
              </div>
              {attendees.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={disabled}
                  onClick={() => removeRow(idx)}
                  aria-label={`Remove attendee ${idx + 1}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-2 top-2.5 size-3 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email (optional)"
                value={a.email ?? ''}
                onChange={(e) => update(idx, { email: e.target.value })}
                disabled={disabled}
                aria-label={`Attendee ${idx + 1} email`}
                className="text-xs h-8 pl-7"
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs h-8 gap-1.5"
        disabled={disabled || attendees.length >= maxAttendees}
        onClick={addRow}
        aria-label="Add attendee"
      >
        <UserPlus className="size-3.5" />
        Add attendee ({attendees.length}/{maxAttendees})
      </Button>

      {requireEmail && filled > 0 && attendees.some((a) => a.name && !a.email) && (
        <p className="text-[10px] text-amber-600">Each attendee requires an email address.</p>
      )}
    </div>
  );
}

export default GroupBooking;
