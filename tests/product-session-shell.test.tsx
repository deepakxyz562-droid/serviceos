import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ fetch: vi.fn(), setAuth: vi.fn(), clearAuth: vi.fn() }));
vi.mock('@/lib/client-auth', () => ({ authFetch: m.fetch, removeToken: vi.fn() }));
vi.mock('@/store/app-store', () => ({ useAppStore: (select: any) => select(m) }));
vi.mock('@/components/auth/auth-page', () => ({ AuthPage: () => <p>Sign in form</p> }));
vi.mock('@/providers/query-provider', () => ({ QueryProvider: ({ children }: any) => children }));
vi.mock('@/providers/theme-provider', () => ({ ThemeProvider: ({ children }: any) => children }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
import { ProductSessionShell } from '@/components/products/product-session-shell';
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it('hydrates verified session before mounting the product', async () => {
 let resolve!: (r: Response) => void;
 m.fetch.mockReturnValue(new Promise(r => { resolve = r; }));
 render(<ProductSessionShell><p>Private workspace</p></ProductSessionShell>);
 expect(screen.queryByText('Private workspace')).toBeNull();
 resolve(Response.json({ user: { id: 'u1' }, tenant: { id: 't1' }, workspace: { id: 'w1' } }));
 await screen.findByText('Private workspace');
 expect(m.setAuth).toHaveBeenCalledWith({ isAuthenticated: true, user: { id: 'u1' }, tenant: { id: 't1' }, workspace: { id: 'w1' } });
});
it('shows login without mounting private content for anonymous users', async () => {
 m.fetch.mockResolvedValue(Response.json({ user: null }));
 render(<ProductSessionShell><p>Private workspace</p></ProductSessionShell>);
 await screen.findByText('Sign in form');
 expect(screen.queryByText('Private workspace')).toBeNull();
 expect(m.setAuth).not.toHaveBeenCalled();
});
it('does not trust stale state when session verification fails', async () => {
 m.fetch.mockResolvedValue(new Response('', { status: 503 }));
 render(<ProductSessionShell><p>Private workspace</p></ProductSessionShell>);
 await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
 expect(m.clearAuth).toHaveBeenCalled();
 expect(m.setAuth).not.toHaveBeenCalled();
 expect(screen.queryByText('Private workspace')).toBeNull();
});
