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

function LoginFormContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
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

          {/* Quick Demo Option */}
          <div className="mt-5 border-t border-[#EDF4F0] pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/?demo=true';
              }}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#0A6847] hover:text-[#085238] hover:underline"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Explore BOS in Demo Mode (No Login Needed)</span>
            </button>
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
