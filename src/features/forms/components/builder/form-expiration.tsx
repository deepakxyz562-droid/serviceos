'use client';

/**
 * Form Expiration (UI)
 * --------------------
 * UI for setting form expiration: by date or by max submissions.
 *
 * Exports types `FormExpiration { expiresAt?, maxSubmissions? }`.
 */
import { useState } from 'react';
import { CalendarClock, Infinity as InfinityIcon, Hash, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface FormExpiration {
  enabled: boolean;
  expiresAt?: string; // ISO date string
  maxSubmissions?: number;
  expirationMessage?: string;
  closeFormOnExpiry?: boolean;
}

export interface FormExpirationProps {
  value?: FormExpiration;
  onChange?: (cfg: FormExpiration) => void;
  className?: string;
}

export function FormExpiration({ value, onChange, className }: FormExpirationProps) {
  const [cfg, setCfg] = useState<FormExpiration>(
    value ?? { enabled: false, expirationMessage: 'This form is no longer accepting submissions.', closeFormOnExpiry: true },
  );

  function update(patch: Partial<FormExpiration>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    onChange?.(next);
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" />
          Form Expiration
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            aria-label="Enable form expiration"
            className="ml-auto"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cfg.enabled ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <InfinityIcon className="h-4 w-4" />
            Form accepts submissions indefinitely.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fe-expires" className="flex items-center gap-1.5 text-xs">
                  <Timer className="h-3.5 w-3.5" /> Expiration Date
                </Label>
                <Input
                  id="fe-expires"
                  type="datetime-local"
                  value={cfg.expiresAt ? new Date(cfg.expiresAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => update({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fe-max" className="flex items-center gap-1.5 text-xs">
                  <Hash className="h-3.5 w-3.5" /> Max Submissions
                </Label>
                <Input
                  id="fe-max"
                  type="number"
                  min={1}
                  placeholder="No limit"
                  value={cfg.maxSubmissions ?? ''}
                  onChange={(e) => update({ maxSubmissions: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fe-message" className="text-xs">Expiration Message</Label>
              <Input
                id="fe-message"
                value={cfg.expirationMessage ?? ''}
                onChange={(e) => update({ expirationMessage: e.target.value })}
                placeholder="Message shown when the form is expired."
              />
            </div>
            <div className="flex items-center gap-2 rounded-md border p-2">
              <Switch
                id="fe-close"
                checked={cfg.closeFormOnExpiry ?? true}
                onCheckedChange={(v) => update({ closeFormOnExpiry: v })}
              />
              <Label htmlFor="fe-close" className="text-xs">
                Close form (disable new submissions) once expired
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => update({ expiresAt: undefined, maxSubmissions: undefined })}>
              Clear Limits
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default FormExpiration;
