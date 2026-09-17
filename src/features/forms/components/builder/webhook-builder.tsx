'use client';

/**
 * Webhook Builder
 * ---------------
 * UI for configuring webhooks: URL, secret, field mapping.
 *
 * Export the type `WebhookConfig { url, secret, fieldMapping }`.
 */
import { useState } from 'react';
import { Webhook, Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { FormField } from '@/lib/forms/form-schema-types';
import { cn } from '@/lib/utils';

export interface WebhookConfig {
  url: string;
  secret: string;
  fieldMapping: Record<string, string>;
  enabled?: boolean;
  events?: string[];
}

export interface WebhookBuilderProps {
  fields: FormField[];
  value?: WebhookConfig;
  onChange?: (cfg: WebhookConfig) => void;
  className?: string;
}

const EVENT_OPTIONS = ['form.submitted', 'form.saved', 'form.approved', 'form.rejected', 'form.spam_detected'];

function genSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'whsec_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function WebhookBuilder({ fields, value, onChange, className }: WebhookBuilderProps) {
  const [cfg, setCfg] = useState<WebhookConfig>(
    value ?? { url: '', secret: '', fieldMapping: {}, enabled: false, events: ['form.submitted'] },
  );
  const [targetKey, setTargetKey] = useState('');

  function update(patch: Partial<WebhookConfig>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    onChange?.(next);
  }

  function addMapping(fieldId: string, target: string) {
    if (!fieldId || !target) return;
    const next = { ...cfg.fieldMapping, [target]: fieldId };
    update({ fieldMapping: next });
    setTargetKey('');
  }

  function removeMapping(target: string) {
    const next = { ...cfg.fieldMapping };
    delete next[target];
    update({ fieldMapping: next });
  }

  function toggleEvent(ev: string) {
    const events = new Set(cfg.events ?? []);
    if (events.has(ev)) events.delete(ev);
    else events.add(ev);
    update({ events: Array.from(events) });
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Webhook className="h-4 w-4" />
          Webhook Configuration
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            aria-label="Enable webhook"
            className="ml-auto"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="wh-url">Webhook URL</Label>
          <Input
            id="wh-url"
            type="url"
            placeholder="https://example.com/webhooks/forms"
            value={cfg.url}
            onChange={(e) => update({ url: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-secret">Signing Secret</Label>
          <div className="flex gap-2">
            <Input
              id="wh-secret"
              type="text"
              placeholder="whsec_..."
              value={cfg.secret}
              onChange={(e) => update({ secret: e.target.value })}
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const secret = genSecret();
                update({ secret });
              }}
            >
              Generate
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigator.clipboard?.writeText(cfg.secret)}
              disabled={!cfg.secret}
              aria-label="Copy secret"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Sent in the <code>X-Webhook-Signature</code> header (HMAC-SHA256 of the body).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Events</Label>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_OPTIONS.map((ev) => {
              const active = (cfg.events ?? []).includes(ev);
              return (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggleEvent(ev)}
                  className={cn(
                    'rounded-full border px-2 py-1 text-xs transition',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background',
                  )}
                >
                  {ev}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Field Mapping</Label>
          <div className="rounded-md border">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b bg-muted/40 px-3 py-2 text-[10px] font-medium uppercase text-muted-foreground">
              <div>Form Field</div>
              <div>Target Key</div>
              <div />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {Object.entries(cfg.fieldMapping).map(([target, fieldId]) => {
                const field = fields.find((f) => f.id === fieldId);
                return (
                  <div key={target} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-b px-3 py-2 text-xs last:border-0">
                    <div className="truncate">{field?.label ?? fieldId}</div>
                    <div className="font-mono">{target}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMapping(target)}
                      aria-label={`Remove mapping ${target}`}
                      className="h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              {Object.keys(cfg.fieldMapping).length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">No mappings yet.</div>
              )}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-t p-2">
              <select
                className="rounded border bg-background px-2 py-1 text-xs"
                onChange={(e) => setTargetKey(e.target.value)}
                value=""
              >
                <option value="">Select field...</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
              <Input
                placeholder="target_key"
                value={targetKey}
                onChange={(e) => setTargetKey(e.target.value)}
                className="text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const sel = document.querySelector('select') as HTMLSelectElement | null;
                  addMapping(sel?.value ?? '', targetKey);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {cfg.enabled && (
          <Badge variant="default" className="text-[10px]">Webhook Active</Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default WebhookBuilder;
