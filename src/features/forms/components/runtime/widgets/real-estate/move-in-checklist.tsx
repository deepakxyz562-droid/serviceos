'use client';

import React, { useState } from 'react';
import { Home, Plus, Trash2, Camera, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str } from '../widget-props';

type Condition = 'new' | 'good' | 'fair' | 'damaged' | 'n-a';

interface RoomItem {
  id: string;
  label: string;
  condition: Condition;
  notes?: string;
}
interface Room {
  id: string;
  name: string;
  items: RoomItem[];
}
interface MoveInValue {
  propertyAddress: string;
  tenantName: string;
  inspectionDate: string;
  rooms: Room[];
  photos?: string[];
}

interface RoomConfig {
  name: string;
  items: string[];
}

const DEFAULT_ROOMS: RoomConfig[] = [
  { name: 'Living Room', items: ['Walls & paint', 'Flooring', 'Windows & blinds', 'Ceiling lights'] },
  { name: 'Kitchen', items: ['Cabinets', 'Countertops', 'Sink & faucet', 'Appliances'] },
  { name: 'Bedrooms', items: ['Closet doors', 'Walls', 'Flooring', 'Window hardware'] },
  { name: 'Bathrooms', items: ['Tile & grout', 'Toilet', 'Sink & vanity', 'Shower/tub'] },
];

const CONDITIONS: { value: Condition; label: string; cls: string }[] = [
  { value: 'new', label: 'New', cls: 'text-emerald-600' },
  { value: 'good', label: 'Good', cls: 'text-emerald-600' },
  { value: 'fair', label: 'Fair', cls: 'text-amber-600' },
  { value: 'damaged', label: 'Damaged', cls: 'text-red-600' },
  { value: 'n-a', label: 'N/A', cls: 'text-muted-foreground' },
];

let _idCounter = 0;
const uid = (p: string) => `${p}-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`;

export function MoveInChecklist({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Move-in checklist');
  const roomCfg = Array.isArray(config.rooms) ? (config.rooms as RoomConfig[]) : DEFAULT_ROOMS;

  const v: MoveInValue = value && typeof value === 'object'
    ? (value as MoveInValue)
    : (() => ({
        propertyAddress: '', tenantName: '', inspectionDate: new Date().toISOString().slice(0, 10),
        rooms: roomCfg.map((r) => ({
          id: uid('room'),
          name: r.name,
          items: r.items.map((label) => ({ id: uid('item'), label, condition: 'good' as Condition })),
        })),
      }))();

  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set(v.rooms.map((r) => r.id)));

  const patch = (p: Partial<MoveInValue>) => onChange({ ...v, ...p });

  const updateItem = (roomId: string, itemId: string, p: Partial<RoomItem>) => {
    const rooms = v.rooms.map((r) => r.id === roomId
      ? { ...r, items: r.items.map((i) => i.id === itemId ? { ...i, ...p } : i) }
      : r);
    patch({ rooms });
  };

  const addItem = (roomId: string) => {
    const rooms = v.rooms.map((r) => r.id === roomId
      ? { ...r, items: [...r.items, { id: uid('item'), label: 'New item', condition: 'good' }] }
      : r);
    patch({ rooms });
  };

  const removeItem = (roomId: string, itemId: string) => {
    const rooms = v.rooms.map((r) => r.id === roomId
      ? { ...r, items: r.items.filter((i) => i.id !== itemId) }
      : r);
    patch({ rooms });
  };

  const toggleRoom = (id: string) => {
    const next = new Set(openRooms);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenRooms(next);
  };

  const damagedCount = v.rooms.flatMap((r) => r.items).filter((i) => i.condition === 'damaged').length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Home className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Move-in condition</span>
        </div>
        {damagedCount > 0 ? (
          <Badge variant="destructive" className="text-[9px]">{damagedCount} damaged</Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] gap-1">
            <CheckCircle2 className="size-2.5" /> All good
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input value={v.propertyAddress} disabled={disabled}
          onChange={(e) => patch({ propertyAddress: e.target.value })}
          aria-label="Property address" placeholder="Address" className="text-xs h-9 col-span-2" />
        <Input value={v.tenantName} disabled={disabled}
          onChange={(e) => patch({ tenantName: e.target.value })}
          aria-label="Tenant name" placeholder="Tenant" className="text-xs h-9" />
        <Input type="date" value={v.inspectionDate} disabled={disabled}
          onChange={(e) => patch({ inspectionDate: e.target.value })}
          aria-label="Inspection date" className="text-xs h-9" />
      </div>

      <div className="space-y-1.5">
        {v.rooms.map((room) => {
          const open = openRooms.has(room.id);
          const damaged = room.items.filter((i) => i.condition === 'damaged').length;
          return (
            <div key={room.id} className="rounded-md border border-border overflow-hidden">
              <button type="button" disabled={disabled} onClick={() => toggleRoom(room.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 bg-muted/50 hover:bg-muted"
                aria-label={`Toggle ${room.name}`}>
                {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <span className="text-xs font-semibold flex-1 text-left">{room.name}</span>
                {damaged > 0 && <Badge variant="destructive" className="text-[9px] h-4">{damaged} dmg</Badge>}
              </button>
              {open && (
                <div className="p-2 space-y-1.5">
                  {room.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-1 items-center">
                      <Input value={item.label} disabled={disabled}
                        onChange={(e) => updateItem(room.id, item.id, { label: e.target.value })}
                        aria-label="Item label" className="col-span-5 h-8 text-xs" />
                      <div className="col-span-5">
                        <Select
                          value={item.condition}
                          disabled={disabled}
                          onValueChange={(val) => updateItem(room.id, item.id, { condition: val as Condition })}>
                          <SelectTrigger className="h-8 text-xs" aria-label="Condition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input value={item.notes ?? ''} disabled={disabled}
                        onChange={(e) => updateItem(room.id, item.id, { notes: e.target.value })}
                        aria-label="Notes" placeholder="Notes" className="col-span-1 h-8 text-[10px]" />
                      <Button type="button" variant="ghost" size="sm" disabled={disabled}
                        onClick={() => removeItem(room.id, item.id)}
                        className="col-span-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                        aria-label="Remove item">
                        <Trash2 className="size-3.5" />
                      </Button>
                      {item.condition === 'damaged' && item.notes && (
                        <div className="col-span-12 text-[10px] text-red-600">⚠ {item.notes}</div>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" disabled={disabled}
                    onClick={() => addItem(room.id)} className="h-7 text-[10px] gap-1">
                    <Plus className="size-3" /> Add item
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
        <Camera className="size-2.5" /> Take photos of any pre-existing damage and attach separately.
      </p>
    </div>
  );
}

export default MoveInChecklist;
