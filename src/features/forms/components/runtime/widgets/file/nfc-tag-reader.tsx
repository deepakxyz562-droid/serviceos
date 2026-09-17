'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Nfc, RefreshCw, Check, AlertTriangle, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

// Minimal type for the experimental Web NFC API.
type NDEFRecordLike = {
  recordType: string;
  mediaType?: string;
  data?: BufferSource;
  toRecords?: () => NDEFRecordLike[];
};

type NDEFMessageLike = { records: NDEFRecordLike[] };

type NDEFReaderLike = {
  onreading: ((e: { message: NDEFMessageLike; serialNumber?: string }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  scan: () => Promise<void>;
};

type NDEFReaderCtor = new () => NDEFReaderLike;

export interface NfcTagValue {
  serialNumber?: string;
  records: Array<{
    recordType: string;
    mediaType?: string;
    data?: string; // decoded text if applicable
  }>;
  readAt: string;
}

function getNDEFReader(): NDEFReaderCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { NDEFReader?: NDEFReaderCtor };
  return w.NDEFReader ?? null;
}

const decodePayload = (data?: BufferSource): string => {
  if (!data) return '';
  try {
    const bytes = 'buffer' in (data as object) ? new Uint8Array((data as ArrayBuffer).slice(0)) : new Uint8Array(data as ArrayBuffer);
    // Skip NDEF Text record header (1 byte) and decode rest as UTF-8.
    const offset = bytes.length > 0 ? 1 : 0;
    return new TextDecoder().decode(bytes.slice(offset));
  } catch {
    return '(binary)';
  }
};

export function NfcTagReaderWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'NFC tag reader');
  const timeoutMs = Number(config?.timeoutMs ?? 15000);

  const readerRef = useRef<NDEFReaderLike | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const tag: NfcTagValue | null =
    value && typeof value === 'object' ? (value as NfcTagValue) : null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!getNDEFReader()) setSupported(false);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startScan = async () => {
    if (disabled) return;
    const ctor = getNDEFReader();
    if (!ctor) {
      setSupported(false);
      setError('Web NFC API not available in this browser.');
      return;
    }
    setError(null);
    setScanning(true);
    try {
      const reader = new ctor();
      readerRef.current = reader;

      reader.onreading = (e) => {
        const records = e.message.records.map((r) => ({
          recordType: r.recordType,
          mediaType: r.mediaType,
          data: r.recordType === 'text' ? decodePayload(r.data) : undefined,
        }));
        onChange({
          serialNumber: e.serialNumber,
          records,
          readAt: new Date().toISOString(),
        });
        setScanning(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      };

      reader.onerror = (ev) => {
        setError(ev.error ? `NFC error: ${ev.error}` : 'NFC read error');
        setScanning(false);
      };

      await reader.scan();

      timerRef.current = setTimeout(() => {
        setScanning(false);
        setError('No NFC tag detected within the timeout.');
      }, timeoutMs);
    } catch {
      setError('Cannot start NFC scan. Make sure NFC is enabled.');
      setScanning(false);
    }
  };

  const stop = () => {
    setScanning(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    readerRef.current = null;
  };

  if (!supported) {
    return (
      <div className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 space-y-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" />
          <span className="font-medium">Web NFC unavailable</span>
        </div>
        <p>
          This browser does not support the Web NFC API. On supported devices
          (Chrome on Android), an NFC reader will appear here.
        </p>
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            className="text-xs gap-1.5"
          >
            <Nfc className="size-3.5" /> Tap to scan (unsupported)
          </Button>
        )}
      </div>
    );
  }

  if (tag) {
    return (
      <div className="space-y-2 p-3 border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Check className="size-4" />
          <span className="text-xs font-semibold">NFC tag read</span>
        </div>
        {tag.serialNumber && (
          <p className="text-[11px] text-muted-foreground font-mono">
            Serial: {tag.serialNumber}
          </p>
        )}
        <div className="space-y-1">
          {tag.records.map((r, i) => (
            <div
              key={i}
              className="text-[11px] rounded-md bg-background border border-border/60 p-2 flex items-start gap-1.5"
            >
              <Tag className="size-3.5 mt-0.5 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-mono">
                  <span className="text-muted-foreground">{r.recordType}</span>
                  {r.mediaType ? ` · ${r.mediaType}` : ''}
                </p>
                {r.data && (
                  <p className="break-all mt-0.5">{r.data}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Scan another
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 border border-border/80 rounded-xl bg-card">
      <div className="flex items-center gap-2">
        <div
          className={`size-9 rounded-lg flex items-center justify-center ${
            scanning
              ? 'bg-emerald-500 text-white animate-pulse'
              : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
          }`}
        >
          {scanning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Nfc className="size-4" />
          )}
        </div>
        <div>
          <p className="text-xs font-semibold">{ariaLabel}</p>
          <p className="text-[11px] text-muted-foreground">
            {scanning
              ? 'Hold an NFC tag near your device…'
              : 'Tap to start scanning for NFC tags'}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}

      <div className="flex gap-2">
        {!scanning ? (
          <Button
            type="button"
            size="sm"
            onClick={startScan}
            disabled={disabled}
            className="text-xs gap-1.5"
          >
            <Nfc className="size-3.5" /> Start scan
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={stop}
            disabled={disabled}
            className="text-xs gap-1.5"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default NfcTagReaderWidget;
