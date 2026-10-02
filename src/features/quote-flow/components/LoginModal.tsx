'use client';
import { useState } from 'react';
import { useAppStore } from '@/features/quote-flow/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, X } from 'lucide-react';

export function LoginModal() {
  const closeModal = useAppStore((s) => s.closeModal);
  const setUser = useAppStore((s) => s.setUser);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Refresh QuoteFlow business
      const bizRes = await fetch('/api/quote-flow/business/onboarding');
      if (bizRes.ok) {
        const bizData = await bizRes.json();
        setBusiness(bizData.business);
      }

      setUser({
        id: data.user?.id || 'user',
        email: data.user?.email || email,
        name: data.user?.name || name || email.split('@')[0],
      });

      closeModal();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-600"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              QuoteFlow
            </div>
            <div className="text-xs text-stone-500">
              Describe it. We create it.
            </div>
          </div>
        </div>
        <div className="mb-4 flex rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white'
                : 'text-stone-500'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              mode === 'register'
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white'
                : 'text-stone-500'
            }`}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1"
            />
          </div>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-stone-400">
          By continuing you agree to our terms.
        </p>
      </div>
    </div>
  );
}
