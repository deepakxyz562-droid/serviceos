'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Store,
  ShieldCheck,
  Search,
  ArrowRight,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles,
  Layers,
  MapPin,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

function TrackRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trackingCode, setTrackingCode] = useState('');
  const [lookupChannel, setLookupChannel] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);

  // Check if slug passed as query parameter e.g. /request/track?slug=abc
  useEffect(() => {
    const slug = searchParams.get('slug') || searchParams.get('code') || searchParams.get('id');
    if (slug) {
      router.push(`/request/track/${encodeURIComponent(slug.trim())}`);
    }
  }, [searchParams, router]);

  // Check if customer already logged in
  useEffect(() => {
    fetch('/api/marketplace/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.customer) {
          setCustomer(data.customer);
          // Fetch their requests
          fetch('/api/marketplace/customer/requests')
            .then((r) => r.json())
            .then((reqData) => {
              if (reqData.requests) {
                setRecentRequests(reqData.requests);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingCustomer(false);
      });
  }, []);

  const handleTrackByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) {
      toast.error('Please enter a tracking code or request link');
      return;
    }

    let code = trackingCode.trim();
    // If full URL pasted: extract the trailing slug
    if (code.includes('/request/track/')) {
      code = code.split('/request/track/')[1].split('?')[0].split('#')[0];
    } else if (code.includes('/requests/')) {
      code = code.split('/requests/')[1].split('?')[0].split('#')[0];
    }

    if (!code) {
      toast.error('Invalid tracking code');
      return;
    }

    setIsSubmitting(true);
    router.push(`/request/track/${encodeURIComponent(code)}`);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupChannel === 'phone' && !phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (lookupChannel === 'email' && !email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsVerifying(true);
    try {
      const payload = lookupChannel === 'phone'
        ? { phone: phone.trim() }
        : { email: email.trim() };

      const res = await fetch('/api/marketplace/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtpSentMessage(data.maskedContact || (lookupChannel === 'phone' ? `SMS sent to ${phone}` : `Email sent to ${email}`));
        toast.success(lookupChannel === 'phone' ? 'Verification code sent via SMS' : 'Verification code sent to your email');
      } else {
        toast.error(data.error || 'Failed to send verification code');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setIsVerifying(true);
    try {
      const payload = lookupChannel === 'phone'
        ? { phone: phone.trim(), code: otpCode.trim() }
        : { email: email.trim(), code: otpCode.trim() };

      const res = await fetch('/api/marketplace/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Verified! Loading your requests...');
        router.push('/requests');
      } else {
        toast.error(data.error || 'Invalid OTP code');
      }
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-90">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Store className="size-5" />
            </div>
            <span>Fieseros <span className="text-emerald-600">Marketplace</span></span>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Verified Local Pros &amp; Escrow Protected</span>
            </div>
            <Link
              href="/request"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
            >
              Post a Request <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>Real-Time Request &amp; 3-Bid Tracker</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Track Your Service Request
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            View incoming provider proposals, compare Good / Better / Best tiered bids, chat with contractors, and manage your booking.
          </p>
        </div>

        {/* Existing Logged-in Requests (if available) */}
        {recentRequests.length > 0 && (
          <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Your Active Requests</CardTitle>
                  <CardDescription className="text-xs">Logged in as {customer?.phone || customer?.name}</CardDescription>
                </div>
                <Button asChild size="sm" variant="outline" className="text-xs h-8">
                  <Link href="/requests">View All in Dashboard</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {recentRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/request/track/${req.publicSlug || req.id}`}
                  className="p-3.5 rounded-xl bg-card border border-border/80 hover:border-emerald-500/60 flex items-center justify-between gap-4 transition shadow-2xs group"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate group-hover:text-emerald-600 transition-colors">
                      {req.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {req.city}, {req.state}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {new Date(req.createdAt).toLocaleDateString()}</span>
                      {req.proposalsCount > 0 && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {req.proposalsCount} Proposal{req.proposalsCount > 1 ? 's' : ''} received
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" className="bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs h-8 px-3 shrink-0">
                    Track <ArrowRight className="size-3 ml-1" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 2-Option Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Method 1: Tracking Code / Link */}
          <Card className="border-border/80 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-2">
                  <Search className="size-5" />
                </div>
                <CardTitle className="text-base font-bold">Track with Code or Link</CardTitle>
                <CardDescription className="text-xs">
                  Enter the tracking code from your SMS or email confirmation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTrackByCode} className="space-y-3">
                  <Input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="e.g. ac-repair-phoenix-81f2 or paste link"
                    className="h-11 text-xs sm:text-sm rounded-xl"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting || !trackingCode.trim()}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="size-4 animate-spin mr-2" /> Opening Tracker...</>
                    ) : (
                      <>Track Request <ArrowRight className="size-4 ml-1.5" /></>
                    )}
                  </Button>
                </form>
              </CardContent>
            </div>
            <div className="px-6 pb-6 pt-0 text-[11px] text-muted-foreground">
              💡 Tip: The tracking code was sent to your phone number when you posted the request.
            </div>
          </Card>

          {/* Method 2: Phone or Email Dual-Channel Lookup */}
          <Card className="border-border/80 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3">
                <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-2">
                  {lookupChannel === 'phone' ? <Phone className="size-5" /> : <Mail className="size-5" />}
                </div>
                <CardTitle className="text-base font-bold">Look Up by Phone or Email</CardTitle>
                <CardDescription className="text-xs">
                  Don't have your tracking code? Verify your mobile or email to view all your requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!otpSent ? (
                  <div className="space-y-3">
                    {/* Toggle Channel */}
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                      <button
                        type="button"
                        onClick={() => setLookupChannel('phone')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          lookupChannel === 'phone'
                            ? 'bg-white dark:bg-slate-800 text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Phone className="size-3" /> Mobile Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => setLookupChannel('email')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          lookupChannel === 'email'
                            ? 'bg-white dark:bg-slate-800 text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Mail className="size-3" /> Email Address
                      </button>
                    </div>

                    <form onSubmit={handleSendOtp} className="space-y-3">
                      {lookupChannel === 'phone' ? (
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="h-11 text-xs sm:text-sm rounded-xl"
                        />
                      ) : (
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                          className="h-11 text-xs sm:text-sm rounded-xl"
                        />
                      )}

                      <Button
                        type="submit"
                        disabled={isVerifying || (lookupChannel === 'phone' ? !phone.trim() : !email.trim())}
                        className="w-full h-11 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 font-semibold text-xs rounded-xl shadow-xs"
                      >
                        {isVerifying ? (
                          <><Loader2 className="size-4 animate-spin mr-2" /> Sending Code...</>
                        ) : (
                          `Send Verification Code via ${lookupChannel === 'phone' ? 'SMS' : 'Email'} →`
                        )}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                      {otpSentMessage || `Code sent to ${lookupChannel === 'phone' ? phone : email}`}.{' '}
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpCode(''); }}
                        className="underline hover:text-blue-900 ml-1 font-semibold"
                      >
                        Change
                      </button>
                    </div>
                    <Input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="h-11 text-center tracking-widest text-base font-bold rounded-xl"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      disabled={isVerifying || otpCode.length < 4}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                    >
                      {isVerifying ? (
                        <><Loader2 className="size-4 animate-spin mr-2" /> Verifying...</>
                      ) : (
                        'Verify & View Requests'
                      )}
                    </Button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLookupChannel(lookupChannel === 'phone' ? 'email' : 'phone');
                          setOtpSent(false);
                          setOtpCode('');
                        }}
                        className="text-xs text-emerald-600 hover:underline font-medium"
                      >
                        {lookupChannel === 'phone' ? 'SMS delayed? Switch to email verification' : 'Switch to phone SMS'}
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </div>
            <div className="px-6 pb-6 pt-0 text-[11px] text-muted-foreground">
              🔒 Instant secure access via Phone SMS or Email. No passwords required.
            </div>
          </Card>
        </div>

        {/* Need a new pro? Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-foreground">Need to hire for another project?</h3>
            <p className="text-xs text-muted-foreground">
              Post a free request in under 60 seconds and get 3 competitive bids from top-rated local pros.
            </p>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-5 rounded-xl shrink-0 font-semibold shadow-xs">
            <Link href="/request">Post Free Request →</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-muted-foreground bg-white dark:bg-slate-900 mt-auto">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Fieseros OS &amp; Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms-of-service" className="hover:underline">Terms</Link>
            <Link href="/privacy-policy" className="hover:underline">Privacy</Link>
            <Link href="/marketplace" className="hover:underline">Browse Directory</Link>
            <Link href="/requests" className="hover:underline">My Requests</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function TrackRequestLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    }>
      <TrackRequestContent />
    </Suspense>
  );
}
