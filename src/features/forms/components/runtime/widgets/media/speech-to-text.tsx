'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

// Minimal type for the SpeechRecognition API (vendor-prefixed in browsers).
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function SpeechToTextWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const lang = String(config?.lang ?? 'en-US');
  const continuous = Boolean(config?.continuous ?? true);
  const ariaLabel = String(field?.label ?? 'Speech to text');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const transcript: string = typeof value === 'string' ? value : '';

  useEffect(() => {
    const ctor = getRecognitionCtor();
    if (!ctor) {
      setSupported(false);
      return;
    }
    const recognition = new ctor();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        const piece = result[0]?.transcript ?? '';
        // Treat as interim unless last item is final (browser-dependent).
        if (i === e.results.length - 1 && (e.results as unknown as { isFinal?: boolean }).isFinal) {
          finalText += piece;
        } else {
          interimText += piece;
        }
      }
      if (finalText) {
        onChange((transcript ? transcript + ' ' : '') + finalText.trim());
      }
      setInterim(interimText);
    };
    recognition.onerror = (e) => {
      setError(e.error ? `Recognition error: ${e.error}` : 'Recognition error');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, continuous]);

  const start = () => {
    if (disabled || !recognitionRef.current) return;
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      setError('Could not start speech recognition');
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const clear = () => {
    if (disabled) return;
    onChange('');
    setInterim('');
  };

  if (!supported) {
    return (
      <div className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
        <AlertTriangle className="size-3.5" />
        Speech recognition is not supported in this browser. Type your text below instead.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          onClick={listening ? stop : start}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`text-xs gap-1.5 ${
            listening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {listening ? <Square className="size-3.5 fill-current" /> : <Mic className="size-3.5" />}
          {listening ? 'Stop' : 'Start speaking'}
        </Button>
        {transcript && !disabled && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clear}
            className="text-xs gap-1.5 text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        )}
      </div>

      {listening && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600">
          <span className="size-2 rounded-full bg-red-500 animate-pulse" /> Listening…
        </div>
      )}
      {error && (
        <div className="text-[11px] text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" /> {error}
        </div>
      )}

      <textarea
        value={transcript + (interim ? ' ' + interim : '')}
        readOnly
        placeholder="Recognized text will appear here…"
        aria-label={ariaLabel}
        className="w-full min-h-[100px] rounded-xl border border-border/80 bg-muted/20 p-3 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      />

      {transcript && !listening && (
        <div className="text-[11px] text-emerald-600 flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5" /> {transcript.split(/\s+/).length} words captured
        </div>
      )}
    </div>
  );
}

export default SpeechToTextWidget;
