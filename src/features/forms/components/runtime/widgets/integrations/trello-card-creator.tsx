'use client';

import React, { useState } from 'react';
import { Trello, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface TrelloCardValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  cardId?: string;
  cardUrl?: string;
}

export function TrelloCardCreator({ value, onChange, config, disabled, field }: WidgetProps) {
  const apiKey = str(config.apiKey, '');
  const listId = str(config.listId, '');
  const ariaLabel = str(field?.label, 'Trello card');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = (value as Partial<TrelloCardValue> | undefined) ?? {};
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = () => {
    if (disabled) return;
    if (!name.trim()) {
      setError('Card name is required.');
      return;
    }
    setPending(true); setError(null);
    setTimeout(() => {
      const shortId = Math.random().toString(36).slice(2, 6);
      const next: TrelloCardValue = {
        integrated: true, timestamp: new Date().toISOString(),
        externalId: `trello_card_${Math.random().toString(36).slice(2, 10)}`,
        cardId: shortId,
        cardUrl: `https://trello.com/c/${shortId}`,
      };
      onChange(next);
      setPending(false);
    }, 700);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Trello className="size-3.5 text-[#0079bf]" />
        <span className="text-xs font-semibold">Trello Card</span>
        {(!apiKey || !listId) && <span className="ml-auto text-[10px] text-amber-600">incomplete config</span>}
      </div>
      {existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Card created. URL: <span className="font-mono">{existing.cardUrl}</span></span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input placeholder="Card name *" value={name} disabled={disabled || pending}
            onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
          <Textarea placeholder="Description (optional)" value={desc} disabled={disabled || pending}
            onChange={(e) => setDesc(e.target.value)} className="text-xs min-h-[60px]" />
          {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
          <Button type="button" disabled={disabled || pending} onClick={handleCreate}
            className="w-full h-9 bg-[#0079bf] hover:bg-[#0265a0] text-white text-xs gap-1.5">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trello className="size-3.5" />} Create Card
          </Button>
        </div>
      )}
    </div>
  );
}

export default TrelloCardCreator;
