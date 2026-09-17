'use client';

import React, { useState } from 'react';
import { Save, RotateCcw, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface SaveResumeValue {
  action: 'save' | 'resume';
  token?: string;
  resumeUrl?: string;
  timestamp?: string;
}

function generateToken(): string {
  return `sr_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
}

export function SaveAndResume({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Save & resume');
  const endpoint = str(config.endpoint, '/api/forms/save');
  const existing = (value as Partial<SaveResumeValue> | undefined) ?? {};
  const [pending, setPending] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    if (disabled) return;
    setPending(true);
    const token = generateToken();
    setTimeout(() => {
      const resumeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/forms/resume?token=${token}`;
      const next: SaveResumeValue = {
        action: 'save', token, resumeUrl, timestamp: new Date().toISOString(),
      };
      onChange(next);
      setPending(false);
    }, 600);
  };

  const handleResume = () => {
    if (disabled || !tokenInput.trim()) return;
    setPending(true);
    setTimeout(() => {
      const next: SaveResumeValue = {
        action: 'resume', token: tokenInput.trim(), timestamp: new Date().toISOString(),
      };
      onChange(next);
      setPending(false);
    }, 600);
  };

  const copyToken = () => {
    if (!existing.token || !navigator?.clipboard) return;
    navigator.clipboard.writeText(existing.token).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Save className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Save &amp; resume later</span>
      </div>
      {!existing.token ? (
        <Button type="button" disabled={disabled || pending} onClick={handleSave}
          className="w-full h-9 text-xs gap-1.5">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save progress
        </Button>
      ) : existing.action === 'save' ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Progress saved.</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Resume token:</p>
          <div className="flex items-center gap-1">
            <Input readOnly value={existing.token} className="h-7 text-[10px] font-mono" aria-label="Resume token" />
            <Button type="button" variant="outline" size="icon" className="size-7 shrink-0" onClick={copyToken} aria-label="Copy token">
              {copied ? <CheckCircle2 className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground break-all">{existing.resumeUrl}</p>
          <p className="text-[10px] text-muted-foreground font-mono">POST {endpoint}</p>
        </div>
      ) : null}

      {!existing.token && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground text-center">— or resume with a token —</p>
          <div className="flex gap-1.5">
            <Input placeholder="Paste resume token" value={tokenInput} disabled={disabled || pending}
              onChange={(e) => setTokenInput(e.target.value)} className="h-8 text-xs font-mono" aria-label="Resume token input" />
            <Button type="button" disabled={disabled || pending || !tokenInput.trim()} onClick={handleResume}
              variant="outline" className="h-8 px-3 text-xs gap-1 shrink-0">
              {pending ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />} Resume
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SaveAndResume;
