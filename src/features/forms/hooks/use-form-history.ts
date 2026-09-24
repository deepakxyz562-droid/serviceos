'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseFormHistoryOptions<T> {
  maxDepth?: number;
  onUndo?: (state: T) => void;
  onRedo?: (state: T) => void;
}

export function useFormHistory<T>(initialPresent: T, options: UseFormHistoryOptions<T> = {}) {
  const maxDepth = options.maxDepth ?? 30;
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  // Keep ref to avoid stale state in event listeners
  const stateRef = useRef<{ past: T[]; present: T; future: T[] }>({
    past: [],
    present: initialPresent,
    future: [],
  });

  stateRef.current = { past, present, future };

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    const { past: currentPast, present: currentPresent, future: currentFuture } = stateRef.current;
    if (currentPast.length === 0) return;

    const previous = currentPast[currentPast.length - 1];
    const newPast = currentPast.slice(0, currentPast.length - 1);

    setPast(newPast);
    setPresent(previous);
    setFuture([currentPresent, ...currentFuture]);
    options.onUndo?.(previous);
  }, [options]);

  const redo = useCallback(() => {
    const { past: currentPast, present: currentPresent, future: currentFuture } = stateRef.current;
    if (currentFuture.length === 0) return;

    const next = currentFuture[0];
    const newFuture = currentFuture.slice(1);

    setPast([...currentPast, currentPresent]);
    setPresent(next);
    setFuture(newFuture);
    options.onRedo?.(next);
  }, [options]);

  const record = useCallback(
    (newPresent: T | ((prev: T) => T)) => {
      const resolved =
        typeof newPresent === 'function'
          ? (newPresent as (prev: T) => T)(stateRef.current.present)
          : newPresent;

      setPast((prev) => [...prev.slice(-maxDepth + 1), stateRef.current.present]);
      setPresent(resolved);
      setFuture([]); // Clear future when new branch of changes is made
    },
    [maxDepth],
  );

  const reset = useCallback((newPresent: T) => {
    setPast([]);
    setPresent(newPresent);
    setFuture([]);
  }, []);

  // Keyboard shortcut listener for Cmd+Z / Cmd+Shift+Z / Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
      const isModifier = isMac ? e.metaKey : e.ctrlKey;

      if (isModifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isModifier && e.key.toLowerCase() === 'y' && !isMac) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    state: present,
    setState: record,
    record,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
    pastCount: past.length,
    futureCount: future.length,
  };
}
