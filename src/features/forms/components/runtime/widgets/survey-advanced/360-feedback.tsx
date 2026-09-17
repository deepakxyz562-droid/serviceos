'use client';

import React, { useState } from 'react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Trash2, Plus, Star } from 'lucide-react';

interface PeerEntry {
  id: string;
  email: string;
  rating: number;
  comment: string;
}

interface FeedbackValue {
  peers: PeerEntry[];
}

let counter = 0;
const newId = () => `peer_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export function ThreeHundredFeedback({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, '360 feedback');
  const maxPeers = Math.max(1, num(config.maxPeers, 10));
  const requireEmail = bool(config.requireEmail, true);

  const v: FeedbackValue = value && typeof value === 'object' ? (value as FeedbackValue) : { peers: [] };
  const peers: PeerEntry[] = Array.isArray(v.peers) ? v.peers : [];

  const [emailDraft, setEmailDraft] = useState('');

  const emit = (next: PeerEntry[]) => onChange({ peers: next });

  const addPeer = () => {
    if (disabled || peers.length >= maxPeers) return;
    if (requireEmail && !emailDraft.trim()) return;
    emit([...peers, { id: newId(), email: emailDraft.trim(), rating: 0, comment: '' }]);
    setEmailDraft('');
  };

  const remove = (id: string) => emit(peers.filter((p) => p.id !== id));

  const update = (id: string, patch: Partial<PeerEntry>) =>
    emit(peers.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Users className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-semibold">
          {peers.length}/{maxPeers} peers added
        </span>
      </div>

      <div className="flex gap-1.5">
        <Input
          type="email"
          value={emailDraft}
          disabled={disabled || peers.length >= maxPeers}
          onChange={(e) => setEmailDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPeer();
            }
          }}
          placeholder="peer@example.com"
          className="text-xs h-8 flex-1"
          aria-label={`${ariaLabel} peer email`}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          disabled={disabled || peers.length >= maxPeers || (requireEmail && !emailDraft.trim())}
          onClick={addPeer}
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {peers.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-card p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground truncate">{p.email || 'Anonymous peer'}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                disabled={disabled}
                onClick={() => remove(p.id)}
                aria-label={`Remove ${p.email}`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>

            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => update(p.id, { rating: p.rating === s ? 0 : s })}
                  aria-label={`${p.email} rating ${s}`}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      'size-4 transition-colors',
                      s <= p.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30 hover:text-amber-300',
                    )}
                  />
                </button>
              ))}
              {p.rating > 0 && <Badge variant="secondary" className="text-[9px] ml-1 h-4">{p.rating}/5</Badge>}
            </div>

            <Textarea
              value={p.comment}
              disabled={disabled}
              onChange={(e) => update(p.id, { comment: e.target.value })}
              placeholder="Comment about this peer…"
              className="text-xs min-h-[50px]"
              aria-label={`${p.email} comment`}
            />
          </div>
        ))}
      </div>

      {peers.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-3">Add at least one peer to collect 360° feedback.</p>
      )}
    </div>
  );
}

export default ThreeHundredFeedback;
