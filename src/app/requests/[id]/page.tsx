'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Clock, DollarSign, Star, ShieldCheck,
  MessageSquare, CheckCircle2, Loader2, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProposalTier {
  id: string;
  tier: string;
  title: string;
  price: number;
  coverMessage: string | null;
  earliestArrival: string | null;
  arrivalWindow: string | null;
  warrantyMonths: number;
  items: Array<{ id: string; type: string; description: string; quantity: number; unitPrice: number; total: number }>;
}

interface Proposal {
  providerId: string;
  providerName: string;
  providerRating: number;
  reviewCount: number;
  verified: boolean;
  logo: string | null;
  tiers: ProposalTier[];
}

interface RequestDetail {
  id: string;
  publicSlug: string;
  title: string;
  description: string;
  categorySlug: string;
  serviceType: string | null;
  status: string;
  city: string;
  state: string;
  urgency: string;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredDate: string | null;
  preferredTimeSlot: string | null;
  createdAt: string;
  media: Array<{ id: string; url: string; type: string }>;
}

const URGENCY_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  same_day: 'Today',
  this_week: 'This week',
  flexible: 'Flexible',
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  good: { label: 'Good', color: 'border-slate-300 bg-slate-50' },
  better: { label: 'Better', color: 'border-emerald-400 bg-emerald-50' },
  best: { label: 'Best', color: 'border-amber-400 bg-amber-50' },
  standard: { label: 'Standard', color: 'border-blue-300 bg-blue-50' },
};

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/marketplace/requests/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRequest(data.request);
          setProposals(data.proposals || []);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAccept = async (proposalId: string) => {
    setAccepting(true);
    try {
      const res = await fetch('/api/marketplace/bookings/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, publicSlug: slug }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/bookings/${data.bookingId}`);
      }
    } catch {
      // error
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-sm text-slate-500">Request not found.</p>
          <Link href="/requests" className="text-xs text-emerald-600 mt-2 inline-block">
            ← Back to My Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/requests">
            <ArrowLeft className="size-5 text-slate-400" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate">{request.title}</h1>
            <p className="text-[10px] text-slate-500">
              {request.city}, {request.state} • {URGENCY_LABELS[request.urgency] || request.urgency}
            </p>
          </div>
          <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
            {request.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Request Details */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {request.city}, {request.state}
              </span>
              {request.budgetMin && (
                <span className="flex items-center gap-1">
                  <DollarSign className="size-3" /> {request.budgetMin}
                  {request.budgetMax ? `–${request.budgetMax}` : '+'}
                </span>
              )}
              {request.preferredDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" /> {new Date(request.preferredDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{request.description}</p>
            {/* Photos */}
            {request.media?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {request.media.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt="Request photo"
                    className="size-20 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proposals */}
        {proposals.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-700">
              {proposals.length} Provider{proposals.length !== 1 ? 's' : ''} Responded
            </h2>
            <p className="text-xs text-slate-500">
              Compare prices, availability, and ratings. Choose the provider that works best for you.
            </p>

            {proposals.map((proposal) => (
              <Card key={proposal.providerId} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Provider header */}
                  <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {proposal.providerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{proposal.providerName}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {proposal.providerRating > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="size-3 text-amber-400 fill-current" />
                            {proposal.providerRating.toFixed(1)} ({proposal.reviewCount})
                          </span>
                        )}
                        {proposal.verified && (
                          <span className="flex items-center gap-0.5 text-emerald-600">
                            <ShieldCheck className="size-3" /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tiers (Good/Better/Best or Standard) */}
                  <div className="p-3 space-y-2">
                    {proposal.tiers.map((tier) => {
                      const tierInfo = TIER_LABELS[tier.tier] || TIER_LABELS.standard;
                      const isSelected = selectedTier === tier.id;
                      return (
                        <div
                          key={tier.id}
                          onClick={() => setSelectedTier(isSelected ? null : tier.id)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-50' : tierInfo.color
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] uppercase font-bold">
                                {tierInfo.label}
                              </Badge>
                              <span className="text-sm font-bold text-slate-900">{tier.title}</span>
                            </div>
                            <span className="text-lg font-bold text-emerald-600">
                              ${tier.price}
                            </span>
                          </div>
                          {tier.coverMessage && (
                            <p className="text-[11px] text-slate-600 mb-2">{tier.coverMessage}</p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            {tier.arrivalWindow && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="size-3" /> {tier.arrivalWindow}
                              </span>
                            )}
                            {tier.warrantyMonths > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ShieldCheck className="size-3" /> {tier.warrantyMonths}mo warranty
                              </span>
                            )}
                          </div>
                          {/* Items (shown when selected) */}
                          {isSelected && tier.items?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                              {tier.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-[10px] text-slate-600">
                                  <span>{item.description}</span>
                                  <span>${item.total}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Accept button */}
                    {selectedTier && (
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
                        size="sm"
                        disabled={accepting}
                        onClick={() => {
                          const tier = proposal.tiers.find((t) => t.id === selectedTier);
                          if (tier) handleAccept(tier.id);
                        }}
                      >
                        {accepting ? (
                          <><Loader2 className="size-4 mr-1 animate-spin" /> Accepting...</>
                        ) : (
                          <>Accept This Proposal</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="size-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Waiting for proposals</p>
              <p className="text-xs text-slate-500 mt-1">
                We&apos;re matching your request with nearby providers. You&apos;ll see their proposals here.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
