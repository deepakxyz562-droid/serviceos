'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface UseFormAutosaveOptions<T> {
  formId: string;
  debounceMs?: number;
  onSaveRemote?: (data: T) => Promise<void>;
  enabled?: boolean;
}

export function useFormAutosave<T>(
  data: T,
  options: UseFormAutosaveOptions<T>,
) {
  const { formId, debounceMs = 1500, onSaveRemote, enabled = true } = options;
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const dataRef = useRef<T>(data);
  const isFirstRender = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  dataRef.current = data;

  const storageKey = `fieseros_form_draft_${formId || 'new'}`;

  // Flush save immediately (e.g. Cmd+S or manual Save button)
  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setStatus('saving');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(dataRef.current));
      }

      if (onSaveRemote) {
        await onSaveRemote(dataRef.current);
      }

      setStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('[Autosave] Failed to save draft:', err);
      setStatus('error');
    }
  }, [storageKey, onSaveRemote]);

  // Debounced auto-save on data mutation
  useEffect(() => {
    if (!enabled) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStatus('unsaved');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(dataRef.current));
        }

        if (onSaveRemote) {
          await onSaveRemote(dataRef.current);
        }

        setStatus('saved');
        setLastSavedAt(new Date());
      } catch (err) {
        console.error('[Autosave] Debounced save failed:', err);
        setStatus('error');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, debounceMs, enabled, onSaveRemote, storageKey]);

  // Global Cmd+S / Ctrl+S shortcut to flush immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
      const isModifier = isMac ? e.metaKey : e.ctrlKey;

      if (isModifier && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flushSave]);

  // Restore draft from localStorage
  const restoreDraft = useCallback((): T | null => {
    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem(storageKey);
        if (item) {
          return JSON.parse(item) as T;
        }
      }
    } catch {}
    return null;
  }, [storageKey]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } catch {}
  }, [storageKey]);

  return {
    status,
    lastSavedAt,
    flushSave,
    restoreDraft,
    clearDraft,
  };
}
