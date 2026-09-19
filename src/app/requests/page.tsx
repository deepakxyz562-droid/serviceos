'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Clock, MapPin, DollarSign, MessageSquare,
  CheckCircle2, Loader2, ArrowRight, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  useEffect(() => {
    // Check auth
    fetch('/api/marketplace/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.customer) {
          // Not logged in — redirect to post a request (which handles OTP)
          router.push('/request');
          return;
        }
        setCustomer(data.customer);
        setAuthChecked(true);
      })
      .catch(() => {
        router.push('/request');
      });
  }, [router]);

  useEffect(() => {
    if (!authChecked || !customer) return;
    fetch('/api/marketplace/customer/requests')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRequests(data.requests);
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
