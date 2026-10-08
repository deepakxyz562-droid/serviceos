'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AuthPage } from '@/components/auth/auth-page';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { authFetch, removeToken } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

/** Shared session bootstrap for independently served product entry points. */
function SessionGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'login' | 'error'>('loading');
  const setAuth = useAppStore(s => s.setAuth);
  const clearAuth = useAppStore(s => s.clearAuth);
  const acceptSession = useCallback((user: unknown, tenant: unknown, workspace?: unknown) => {
    setAuth({ isAuthenticated: true, user, tenant, workspace });
    setStatus('ready');
  }, [setAuth]);

  useEffect(() => {
    const abort = new AbortController();
    clearAuth();
    authFetch('/api/auth/me', { signal: abort.signal, cache: 'no-store' })
      .then(async response => {
        if (abort.signal.aborted) return;
        if (response.status === 401) { setStatus('login'); return; }
        if (!response.ok) throw new Error('Session unavailable');
        const session = await response.json();
        if (!abort.signal.aborted) {
          if (session.user) acceptSession(session.user, session.tenant, session.workspace);
          else setStatus('login');
        }
      })
      .catch(() => { if (!abort.signal.aborted) setStatus('error'); });
    return () => abort.abort();
  }, [acceptSession, clearAuth]);

  if (status === 'loading') return <p role="status" className="p-8">Loading your workspace…</p>;
  if (status === 'error') return <div role="alert" className="p-8">We could not load your session. <button onClick={() => window.location.reload()}>Try again</button></div>;
  if (status === 'login') return <AuthPage initialTab="login" onAuthSuccess={acceptSession} />;
  return <>
    <header className="flex items-center justify-between border-b p-3">
      <a href="/app">Workspace navigation</a>
      <button onClick={async () => {
        try {
          const response = await authFetch('/api/auth/logout', { method: 'POST' });
          if (!response.ok) throw new Error('Sign out unavailable');
          removeToken(); clearAuth(); setStatus('login');
        } catch { setStatus('error'); }
      }}>Sign out</button>
    </header>
    {children}
  </>;
}

export function ProductSessionShell({ children }: { children: ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryProvider><SessionGate>{children}</SessionGate><Toaster /></QueryProvider>
  </ThemeProvider>;
}
