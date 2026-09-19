'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Clock, MapPin, DollarSign, MessageSquare,
  CheckCircle2, Loader2, ArrowRight, Bell, Phone, ShieldCheck, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CustomerInfo {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
}

interface CustomerRequest {
  id: string;
  publicSlug: string;
  title: string;
  categorySlug: string;
  serviceType: string | null;
  status: string;
  city: string;
  state: string;
  urgency: string;
  budgetMin: number | null;
  budgetMax: number | null;
  createdAt: string;
  proposalsCount: number;
  lowestPrice: number | null;
  bookingStatus: string | null;
  bookingId: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  POSTED: { label: 'Posted', color: 'bg-blue-100 text-blue-700' },
  MATCHING: { label: 'Finding providers', color: 'bg-blue-100 text-blue-700' },
  ACTIVE: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  PROPOSALS_RECEIVED: { label: 'Proposals received', color: 'bg-amber-100 text-amber-700' },
  PROVIDER_SELECTED: { label: 'Provider selected', color: 'bg-purple-100 text-purple-700' },
  BOOKED: { label: 'Booked', color: 'bg-emerald-100 text-emerald-700' },
  IN_PROGRESS: { label: 'In progress', color: 'bg-indigo-100 text-indigo-700' },
  COMPLETED: { label: 'Completed', color: 'bg-slate-100 text-slate-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expired', color: 'bg-slate-100 text-slate-500' },
};

export default function MyRequestsPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Inline Phone Login for non-logged-in customers
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState('');

  const checkAuth = () => {
    fetch('/api/marketplace/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.customer) {
          setCustomer(data.customer);
        }
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
      });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) return;
    setIsVerifying(true);
    setLoginError('');
    try {
      const res = await fetch('/api/marketplace/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setLoginError(data.error || 'Failed to send verification code');
      }
    } catch {
      setLoginError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setIsVerifying(true);
    setLoginError('');
    try {
      const res = await fetch('/api/marketplace/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, code: otpCode }),
      });
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomer(data.customer);
      } else {
        setLoginError(data.error || 'Invalid verification code');
      }
    } catch {
      setLoginError('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!authChecked || !customer) return;
    setLoading(true);
    fetch('/api/marketplace/customer/requests')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRequests(data.requests || []);
        }
      })
      .finally(() => setLoading(false));
  }, [authChecked, customer]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If not logged in, render the clean 2026 Customer Login view
  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-2">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="text-xl font-bold">Track My Requests</CardTitle>
            <CardDescription className="text-xs">
              Enter your mobile number to view your active service bids and chat with local contractors.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      required
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="(312) 555-0199"
                      className="pl-9"
                    />
                  </div>
                </div>

                {loginError && <p className="text-xs text-rose-600 font-medium">{loginError}</p>}

                <Button
                  type="submit"
                  disabled={isVerifying || !phoneInput.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isVerifying ? <Loader2 className="size-4 animate-spin" /> : 'Send Verification Code →'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Enter 6-Digit Code sent to {phoneInput}
                  </label>
                  <Input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="text-center font-mono text-lg tracking-widest"
                    autoFocus
                  />
                </div>

                {loginError && <p className="text-xs text-rose-600 font-medium">{loginError}</p>}

                <Button
                  type="submit"
                  disabled={isVerifying || !otpCode.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isVerifying ? <Loader2 className="size-4 animate-spin" /> : 'Verify & Open Requests'}
                </Button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-xs text-muted-foreground hover:underline text-center mt-2"
                >
                  Change phone number
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-border/60 text-center">
              <p className="text-xs text-muted-foreground mb-2">Haven&apos;t posted a request yet?</p>
              <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                <Link href="/request">
                  <Plus className="size-3.5 text-emerald-600" />
                  <span>Post a New Request</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeRequests = requests.filter((r) =>
    ['POSTED', 'MATCHING', 'ACTIVE', 'PROPOSALS_RECEIVED', 'PROVIDER_SELECTED', 'BOOKED', 'IN_PROGRESS'].includes(r.status)
  );
  const completedRequests = requests.filter((r) =>
    ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Requests</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome{customer?.name ? `, ${customer.name}` : ''}! Track your service requests here.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/request')}
          >
            <Plus className="size-4 mr-1" /> New Request
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Active Requests */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeRequests.length === 0 && completedRequests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="size-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No requests yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Post a service request to get bids from verified local pros.
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => router.push('/request')}
              >
                <Plus className="size-4 mr-1" /> Post a Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Section */}
            {activeRequests.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Active ({activeRequests.length})
                </h2>
                {activeRequests.map((req) => (
                  <RequestCard key={req.id} request={req} />
                ))}
              </div>
            )}

            {/* Completed Section */}
            {completedRequests.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  History ({completedRequests.length})
                </h2>
                {completedRequests.map((req) => (
                  <RequestCard key={req.id} request={req} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function RequestCard({ request }: { request: CustomerRequest }) {
  const statusInfo = STATUS_LABELS[request.status] || { label: request.status, color: 'bg-slate-100 text-slate-700' };
  const timeAgo = getTimeAgo(request.createdAt);

  return (
    <Link href={`/requests/${request.publicSlug}`}>
      <Card className="hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-[10px] ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
                <span className="text-[10px] text-slate-400">{timeAgo}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {request.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-0.5">
                  <MapPin className="size-3" /> {request.city}, {request.state}
                </span>
                {request.budgetMin && (
                  <span className="flex items-center gap-0.5">
                    <DollarSign className="size-3" /> {request.budgetMin}
                    {request.budgetMax ? `–${request.budgetMax}` : '+'}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-300 shrink-0" />
          </div>

          {/* Proposal summary */}
          {request.proposalsCount > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <MessageSquare className="size-3" /> {request.proposalsCount} proposal{request.proposalsCount !== 1 ? 's' : ''}
              </span>
              {request.lowestPrice && (
                <span className="text-slate-500">
                  From ${request.lowestPrice}
                </span>
              )}
            </div>
          )}

          {/* Booking status */}
          {request.bookingStatus && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600">
              <CheckCircle2 className="size-3" /> Booked
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}
