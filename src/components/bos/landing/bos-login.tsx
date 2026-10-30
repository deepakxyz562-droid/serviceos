'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/navigation';
import {
  Store,
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { setToken } from '@/lib/client-auth';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

function LoginFormContent() {
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get('redirect') || '/?app=true';
  const redirectUrl = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//') && !requestedRedirect.includes('\\') ? requestedRedirect : '/?app=true';

  const [mode, setMode] = useState<'signin' | 'register'>(searchParams.get('mode') === 'register' ? 'register' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Retail Supermarket & Kirana');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    setLoading(true);
    const googleAuthUrl = `/api/auth/google?app=bos&mode=${mode === 'register' ? 'register' : 'login'}&redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = googleAuthUrl;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && (data?.token || data?.user)) {
        if (data.token) {
          setToken(data.token);
          try {
            localStorage.setItem(
              'fieseros_auth',
              JSON.stringify({ token: data.token, user: data.user }),
            );
          } catch {
            // ignore
          }
        }
        window.location.href = redirectUrl;
      } else {
        setError(data?.error || 'Invalid email or password. Please try again.');
      }
    } catch {
      setError('Unable to connect to the authentication server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !businessName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          businessName: businessName.trim(),
          industry: businessType,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        if (data?.emailVerificationRequired) {
          setSuccessMsg(
            'Account created! A verification link has been sent to your email. You can now sign in.',
          );
          setMode('signin');
        } else {
          // Attempt immediate login
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), password }),
          });
          const loginData = await loginRes.json().catch(() => null);
          if (loginRes.ok && loginData?.token) {
            setToken(loginData.token);
            try {
              localStorage.setItem(
                'fieseros_auth',
                JSON.stringify({ token: loginData.token, user: loginData.user }),
              );
            } catch {
              // ignore
            }
          }
          window.location.href = redirectUrl;
        }
      } else {
        setError(data?.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Unable to connect to the server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F8F6] px-4 py-8">
      <div className="w-full max-w-md">
        {/* BOS Brand Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bos/logo-mark.png"
              alt="BOS"
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-contain shadow-md"
            />
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight text-[#0A6847]">BOS</h1>
              <p className="text-[12px] font-medium text-[#4B7A68]">
                Business Operating System
              </p>
            </div>
          </div>
          <p className="mt-2 text-[13px] font-medium text-[#64748B]">
            One system to run the entire business: POS, Stock, Khata &amp; Orders
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-6 shadow-sm">
          {/* Tabs */}
          <div className="mb-6 flex rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition-all ${
                mode === 'signin'
                  ? 'bg-white text-[#0A6847] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#0A6847] shadow-xs'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Create Store
            </button>
          </div>

          {/* Google 1-Tap OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mb-4 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-[#DCE9E3] bg-white text-[13px] font-bold text-[#1E293B] shadow-2xs transition-all hover:bg-[#F8FCFA] hover:border-[#B2D8C7] active:scale-[0.99] disabled:opacity-50"
          >
            <GoogleIcon />
            <span>{mode === 'register' ? 'Sign up with Google' : 'Continue with Google'}</span>
          </button>

          <div className="relative mb-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4EFEA]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-[#94A3B8]">
              <span className="bg-white px-3 font-semibold">Or continue with email</span>
            </div>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-[12.5px] font-medium text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-[12.5px] font-medium text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A6847]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="merchant@sharmastore.in"
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-3 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-10 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#475569]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6847] text-[13.5px] font-bold text-white shadow-sm hover:bg-[#085238] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to BOS</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Your Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-3 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Store / Business Name
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Sharma General Store"
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-3 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Business Type
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] px-3 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                >
                  <option value="Retail Supermarket & Kirana">
                    Retail Supermarket &amp; Kirana
                  </option>
                  <option value="Grocery Store">Grocery Store</option>
                  <option value="Pharmacy & Medical">Pharmacy &amp; Medical</option>
                  <option value="Restaurant & Cafe">Restaurant &amp; Cafe</option>
                  <option value="Electronics & Retail">Electronics &amp; Retail</option>
                  <option value="Salon & Spa">Salon &amp; Spa</option>
                  <option value="Home Services & Trades">Home Services &amp; Trades</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@sharmastore.in"
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-3 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Mobile Phone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-3 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-bold text-[#334155]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-10 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#475569]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6847] text-[13.5px] font-bold text-white shadow-sm hover:bg-[#085238] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Create Store &amp; Launch</span>
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Support / Help footer */}
          <div className="mt-5 border-t border-[#EDF4F0] pt-4 text-center">
            <p className="text-[12px] text-[#64748B]">
              Need help accessing your store?{' '}
              <a
                href="mailto:support@fieseros.com"
                className="font-bold text-[#0A6847] hover:underline"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#64748B]">
          <ShieldCheck className="h-4 w-4 text-[#0A6847]" />
          <span>Encrypted 256-bit SSL session • GST &amp; UPI compliant</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F8F6] text-[#0A6847] font-bold">
          Loading...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
