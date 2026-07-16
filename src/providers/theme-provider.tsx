'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Client-side wrapper around `next-themes` ThemeProvider.
 *
 * Mounted once at the root layout so `useTheme()` works everywhere
 * (header, customer portal, employee portal, settings, etc.).
 *
 * Uses `attribute="class"` so the `.dark` class is applied to `<html>`
 * (NOT a wrapper div) — this makes Tailwind's `dark:` variants work
 * throughout the document and survives refreshes via localStorage.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
