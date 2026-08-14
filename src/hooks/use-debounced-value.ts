'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay`
 * milliseconds have elapsed without further changes.
 *
 * Used to prevent list-search inputs from firing an HTTP request on every
 * keystroke. The raw `value` stays immediately reactive for the input field,
 * while consumers that trigger network fetches (useCallback deps / useEffect)
 * should depend on the debounced copy instead.
 *
 * @param value  The rapidly-changing value to debounce.
 * @param delay  Milliseconds to wait before propagating the value. Default 250ms.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
