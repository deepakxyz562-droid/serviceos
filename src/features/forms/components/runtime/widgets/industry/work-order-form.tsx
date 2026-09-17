'use client';

import React, { useState } from 'react';
import { ClipboardList, Flag, User, CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, bool } from '../widget-props';

type Priority = 'low' | 'medium' | 'high' | 'critical';

interface WorkOrderValue {
  description: string;
  priority: Priority;
  assignee: string;
  dueDate?: string;
  location?: string;
  category?: string;
  notes?: string;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

const PRIORITY_TONE: Record<Priority, 'outline' | 'secondary' | 'destructive'> = {
  low: 'outline',
  medium: 'outline',
  high: 'secondary',
  critical: 'destructive',
};

export function WorkOrderForm({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Work order form');
  const allowDueDate = bool(config.allowDueDate, true);

  const [v, setV] = useState<WorkOrderValue>(() => {
    const existing = value && typeof value === 'object' ? (value as WorkOrderValue) : null;
    return {
      description: existing?.description ?? '',
      priority: existing?.priority ?? (str(config.priority, 'medium') as Priority),
      assignee: existing?.assignee ?? str(config.assignee, ''),
      dueDate: existing?.dueDate ?? str(config.dueDate, ''),
      location: existing?.location ?? str(config.location, ''),
      category: existing?.category ?? str(config.category, 'General'),
      notes: existing?.notes ?? '',
    };
  });

  const emit = (next: Partial<WorkOrderValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-blue-600" />
        <span className="text-xs font-semibold">Work Order</span>
        <Badge variant={PRIORITY_TONE[v.priority]} className="ml-auto text-[9px] uppercase flex items-center gap-1">
          <Flag className="size-2.5" /> {v.priority}
        </Badge>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Work description</label>
        <Textarea
          value={v.description}
          onChange={(e) => emit({ description: e.target.value })}
          disabled={disabled}
          placeholder="Describe the work to be performed…"
          className="text-xs min-h-[60px]"
          aria-label="Work description"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Flag className="size-3" /> Priority
          </label>
          <Select value={v.priority} onValueChange={(x) => emit({ priority: x as Priority })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Category</label>
          <Input
            value={v.category ?? ''}
            onChange={(e) => emit({ category: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Category"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <User className="size-3" /> Assigned to
        </label>
        <Input
          value={v.assignee}
          onChange={(e) => emit({ assignee: e.target.value })}
          disabled={disabled}
          placeholder="Technician / team name"
          className="h-8 text-xs"
          aria-label="Assignee"
        />
      </div>

      {allowDueDate && (
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <CalendarClock className="size-3" /> Due date
          </label>
          <Input
            type="datetime-local"
            value={v.dueDate}
            onChange={(e) => emit({ dueDate: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Due date"
          />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Location</label>
        <Input
          value={v.location ?? ''}
          onChange={(e) => emit({ location: e.target.value })}
          disabled={disabled}
          placeholder="Site / asset reference"
          className="h-8 text-xs"
          aria-label="Location"
        />
      </div>

      <Textarea
        value={v.notes ?? ''}
        onChange={(e) => emit({ notes: e.target.value })}
        disabled={disabled}
        placeholder="Additional notes / parts list / safety instructions…"
        className="text-xs min-h-[40px]"
        aria-label="Notes"
      />
    </div>
  );
}

export default WorkOrderForm;
