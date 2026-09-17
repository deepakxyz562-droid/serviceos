'use client';

import React, { useState } from 'react';
import { Mic, Sparkles, Loader2, Play, Square, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface AiVoiceCloneValue {
  text: string;
  voiceId?: string;
  status: 'idle' | 'cloning' | 'placeholder';
  timestamp?: string;
  audioUrl?: string;
}

export function AiVoiceClone({ value, onChange, config, disabled, field }: WidgetProps) {
  const voiceId = str(config.voiceId, '');
  const endpoint = str(config.endpoint, '/api/forms/ai/voice-clone');
  const ariaLabel = str(field?.label, 'AI voice clone');
  const [pending, setPending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const existing = (value as Partial<AiVoiceCloneValue> | undefined) ?? {};
  const text = existing.text ?? '';

  const handleClone = (t: string) => {
    if (disabled || !t.trim()) return;
    setPending(true);
    setTimeout(() => {
      const next: AiVoiceCloneValue = {
        text: t, voiceId, status: 'placeholder',
        timestamp: new Date().toISOString(),
        audioUrl: `data:audio/placeholder;voice=${voiceId || 'default'}`,
      };
      onChange(next);
      setPending(false);
    }, 900);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Mic className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">AI Voice Clone</span>
        {voiceId ? <span className="ml-auto text-[10px] font-mono text-muted-foreground">voice:{voiceId.slice(0, 6)}</span>
                : <span className="ml-auto text-[10px] text-amber-600">no voiceId</span>}
      </div>
      <Textarea
        value={text}
        disabled={disabled}
        onChange={(e) => onChange({ text: e.target.value, voiceId, status: 'idle' })}
        placeholder="Type text to synthesize with the cloned voice…"
        className="text-xs min-h-[70px]"
        aria-label="Text to synthesize"
      />
      <Button type="button" disabled={disabled || pending || !text.trim()} onClick={() => handleClone(text)}
        className="w-full h-9 text-xs gap-1.5">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {pending ? 'Synthesizing…' : 'Generate voice'}
      </Button>
      {existing.status === 'placeholder' && (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="size-3 text-amber-600 shrink-0" />
            <span className="text-[10px] text-amber-700 dark:text-amber-300">Placeholder audio — no real TTS API called in Phase 4.</span>
          </div>
          <Button type="button" variant="outline" size="sm"
            disabled={disabled} onClick={() => setPlaying(!playing)}
            className="text-xs gap-1 w-full">
            {playing ? <Square className="size-3" /> : <Play className="size-3" />}
            {playing ? 'Stop' : 'Play placeholder'}
          </Button>
          <p className="text-[10px] text-muted-foreground font-mono">POST {endpoint}</p>
        </div>
      )}
    </div>
  );
}

export default AiVoiceClone;
