'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShieldCheck,
  Star,
  Sparkles,
  DollarSign,
  Calendar,
  Phone,
  MessageSquare,
  Lock,
  Unlock,
  Check,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Loader2,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ProposalTier {
  id: string;
  tier: 'good' | 'better' | 'best' | 'standard';
  title: string;
  price: number;
  coverMessage?: string;
  earliestArrival?: string;
  arrivalWindow?: string;
  warrantyMonths?: number;
  items?: Array<{ name: string; type: string; price: number }>;
}

interface ProviderProposalView {
  id: string;
  providerId: string;
  providerName: string;
  providerRating: number;
  reviewCount: number;
  verified: boolean;
  distanceMiles: number;
  isTiered: boolean;
  selectedTierIndex?: number;
  tiers: ProposalTier[];
}

interface RequestTrackingData {
  id: string;
  publicSlug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  urgency: string;
  city: string;
  state: string;
  status: 'MATCHING' | 'PROPOSALS_RECEIVED' | 'BOOKED' | 'COMPLETED';
  createdAt: string;
  proposals: ProviderProposalView[];
  booking?: {
    bookingId: string;
    providerName: string;
    acceptedPrice: number;
    arrivalSlot: string;
    verificationPin: string;
    providerPhone: string;
  };
}

export function CustomerRequestTracker({ publicSlug }: { publicSlug: string }) {
  const [data, setData] = useState<RequestTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<{
    proposal: ProviderProposalView;
    tier: ProposalTier;
  } | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [activeTiers, setActiveTiers] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      // Load sample tracking data for this request slug
      const mockData: RequestTrackingData = {
        id: 'mreq_101',
        publicSlug: publicSlug || 'req-sample',
        title: 'Central AC is humming and blowing warm air',
        description: 'Unit stopped cooling yesterday afternoon. Outdoor fan spins but air inside is 78 degrees.',
        category: 'hvac',
        categoryLabel: 'HVAC & Air Conditioning',
        urgency: 'same_day',
        city: 'Chicago',
        state: 'IL',
        status: 'PROPOSALS_RECEIVED',
        createdAt: '1 hour ago',
        proposals: [
          {
            id: 'prop_apex_01',
            providerId: 'ten_apex_hvac',
            providerName: 'Apex Climate Solutions',
            providerRating: 4.9,
            reviewCount: 48,
            verified: true,
            distanceMiles: 2.8,
            isTiered: true,
            tiers: [
              {
                id: 'tier_good',
                tier: 'good',
                title: 'Standard Diagnostic & Capacitor Replacement',
                price: 245,
                earliestArrival: 'Today, 2:00 PM - 4:00 PM',
                arrivalWindow: 'Today Afternoon',
                warrantyMonths: 3,
                items: [
                  { name: 'Full Electrical Diagnostic', type: 'diagnostic', price: 95 },
                  { name: '45/5 MFD Dual Run Capacitor (OEM)', type: 'part', price: 65 },
                  { name: 'Labor & System Testing', type: 'labor', price: 85 },
                ],
              },
              {
                id: 'tier_better',
                tier: 'better',
                title: 'Capacitor Replacement + Full AC Tune-Up',
                price: 320,
                earliestArrival: 'Today, 2:00 PM - 4:00 PM',
                arrivalWindow: 'Today Afternoon',
                warrantyMonths: 12,
                items: [
                  { name: 'Full Electrical Diagnostic', type: 'diagnostic', price: 95 },
                  { name: 'Heavy-Duty Turbo 200 Run Capacitor', type: 'part', price: 95 },
                  { name: 'Condenser Coil Chemical Wash & Amp Test', type: 'service', price: 130 },
                ],
              },
              {
                id: 'tier_best',
                tier: 'best',
                title: 'Premium Repair + 1-Yr Maintenance Membership',
                price: 410,
                earliestArrival: 'Today, 2:00 PM - 4:00 PM',
                arrivalWindow: 'Today Afternoon',
                warrantyMonths: 24,
                items: [
                  { name: 'Full Electrical Diagnostic', type: 'diagnostic', price: 95 },
                  { name: 'Heavy-Duty Turbo 200 Run Capacitor', type: 'part', price: 95 },
                  { name: 'Condenser Coil Chemical Wash & Amp Test', type: 'service', price: 130 },
                  { name: '1-Year 2x Seasonal Maintenance Membership', type: 'membership', price: 80 },
                ],
              },
            ],
          },
          {
            id: 'prop_windy_02',
            providerId: 'ten_windy_city_air',
            providerName: 'Windy City Heating & Air',
            providerRating: 4.8,
            reviewCount: 32,
            verified: true,
            distanceMiles: 4.1,
            isTiered: false,
            tiers: [
              {
                id: 'tier_std',
                tier: 'standard',
                title: 'Standard AC Repair & Troubleshooting',
                price: 265,
                earliestArrival: 'Today, 4:00 PM - 6:00 PM',
                arrivalWindow: 'Today Late Afternoon',
                warrantyMonths: 6,
                items: [
                  { name: 'Diagnostic Inspection', type: 'diagnostic', price: 85 },
                  { name: 'Electrical Component Replacement', type: 'parts_labor', price: 180 },
                ],
              },
            ],
          },
        ],
      };

      // Fetch real data from the API instead of using mock data
      try {
        const res = await fetch(`/api/marketplace/requests/${publicSlug}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.request) {
            const req = json.request;
            // Transform API response to the component's expected shape
            const apiData: RequestTrackingData = {
              id: req.id,
              publicSlug: req.publicSlug,
              title: req.title,
              description: req.description || '',
              category: req.categorySlug,
              categoryLabel: req.serviceType || req.categorySlug,
              urgency: req.urgency || 'flexible',
              city: req.city || '',
              state: req.state || '',
              status: req.status,
              createdAt: req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recently',
              proposals: (json.proposals || []).map((p: any) => ({
                id: p.providerId,
                providerId: p.providerId,
                providerName: p.providerName,
                providerRating: p.providerRating,
                reviewCount: p.reviewCount,
                verified: p.verified,
                distanceMiles: p.distanceMiles || 0,
                isTiered: p.tiers.length > 1,
                tiers: p.tiers.map((t: any) => ({
                  id: t.id,
                  tier: t.tier,
                  title: t.title,
                  price: t.price,
                  earliestArrival: t.earliestArrival,
                  arrivalWindow: t.arrivalWindow,
                  warrantyMonths: t.warrantyMonths,
                  items: (t.items || []).map((item: any) => ({
                    name: item.description,
                    type: item.type,
                    price: item.total,
                  })),
                })),
              })),
            };
            setData(apiData);
          } else {
            // Fallback to mock if API returns no data
            setData(mockData);
          }
        } else {
          // API error — fallback to mock for now
          setData(mockData);
        }
      } catch {
        // Network error — fallback to mock
        setData(mockData);
      }
      setLoading(false);
    };

    fetchData();
  }, [publicSlug]);

  const handleAcceptBooking = async () => {
    if (!selectedProposal || !data) return;
    setIsAccepting(true);

    try {
      const res = await fetch('/api/marketplace/bookings/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: data.id,
          proposalId: selectedProposal.proposal.id,
          selectedTierId: selectedProposal.tier.id,
          tenantId: selectedProposal.proposal.providerId,
          totalAmount: selectedProposal.tier.price,
          customerName: 'Verified Customer',
          customerPhone: '(312) 555-0199',
          streetAddress: '123 Michigan Ave, Apt 4B',
          city: data.city,
          state: data.state,
          postalCode: '60601',
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                status: 'BOOKED',
                booking: {
                  bookingId: resData.booking.id,
                  providerName: selectedProposal.proposal.providerName,
                  acceptedPrice: selectedProposal.tier.price,
                  arrivalSlot: selectedProposal.tier.earliestArrival || 'Confirmed Window',
                  verificationPin: resData.booking.arrivalVerificationPin || '8492',
                  providerPhone: '(312) 555-8900',
                },
              }
            : null
        );
        setSelectedProposal(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm text-muted-foreground">Loading your request and active proposals...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="size-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold">Request Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1">Please check the link or submit a new request.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Request Header & Live Stepper */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                {data.categoryLabel}
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                📍 {data.city}, {data.state}
              </Badge>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                ⚡ {data.urgency.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{data.title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{data.description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data.status === 'BOOKED' ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-right">
                <span className="text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="size-4 text-emerald-600" /> Booking Confirmed
                </span>
                <span className="text-[11px] text-emerald-700">Tech dispatched</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-right">
                <span className="text-xs font-semibold text-foreground">
                  {data.proposals.length} Proposals Received
                </span>
                <p className="text-[11px] text-emerald-600 font-medium">Verified local pros ready</p>
              </div>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 text-center">
          <div className="flex flex-col items-center">
            <div className="size-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs mb-1.5">
              ✓
            </div>
            <span className="text-xs font-semibold text-foreground">1. Request Posted</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">AI Triaged & Matched</span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`size-8 rounded-full font-bold flex items-center justify-center text-xs mb-1.5 ${
                data.status === 'PROPOSALS_RECEIVED' || data.status === 'BOOKED'
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                  : 'bg-slate-100 text-muted-foreground'
              }`}
            >
              2
            </div>
            <span className="text-xs font-semibold text-foreground">2. Compare Proposals</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Upfront Tiers & Price</span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`size-8 rounded-full font-bold flex items-center justify-center text-xs mb-1.5 ${
                data.status === 'BOOKED'
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                  : 'bg-slate-100 text-muted-foreground'
              }`}
            >
              3
            </div>
            <span className="text-xs font-semibold text-foreground">3. 1-Click Booking</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Instant Dispatch & Code</span>
          </div>
        </div>
      </div>

      {/* IF BOOKED: Display Confirmation Banner */}
      {data.status === 'BOOKED' && data.booking && (
        <Card className="border-emerald-300 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">You are officially booked with {data.booking.providerName}!</h3>
                  <p className="text-xs text-muted-foreground">
                    Arrival Window: <strong className="text-foreground">{data.booking.arrivalSlot}</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Arrival PIN Code</p>
                <p className="text-2xl font-extrabold text-emerald-600 tracking-widest">{data.booking.verificationPin}</p>
                <p className="text-[10px] text-muted-foreground">Share with tech upon arrival</p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted-foreground">Total Booked: <strong className="text-foreground">${data.booking.acceptedPrice}</strong></span>
              <span>•</span>
              <span className="text-muted-foreground">Provider Phone: <strong className="text-foreground">{data.booking.providerPhone}</strong></span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> 100% Satisfaction Guarantee
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Proposal Comparison Matrix */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Available Proposals & Pricing</h2>
            <p className="text-xs text-muted-foreground">
              Objective side-by-side comparison. Review warranty, arrival time, and package options.
            </p>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-50">
            {data.proposals.length} Active Offers
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.proposals.map((prop) => {
            const currentTierIndex = activeTiers[prop.id] || 0;
            const currentTier = prop.tiers[currentTierIndex] || prop.tiers[0];

            return (
              <Card
                key={prop.id}
                className="border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Provider Header */}
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <CardTitle className="text-base font-bold text-foreground">
                            {prop.providerName}
                          </CardTitle>
                          {prop.verified && (
                            <ShieldCheck className="size-4 text-emerald-600" title="Verified License & Insurance" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1 text-amber-500 font-semibold">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            {prop.providerRating}
                          </span>
                          <span>({prop.reviewCount} reviews)</span>
                          <span>•</span>
                          <span>📍 {prop.distanceMiles} mi away</span>
                        </div>
                      </div>

                      {/* Price Badge */}
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Package Total</span>
                        <span className="text-2xl font-extrabold text-foreground">${currentTier.price}</span>
                      </div>
                    </div>

                    {/* Tier Switcher if Good/Better/Best */}
                    {prop.isTiered && (
                      <div className="pt-3">
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                          {prop.tiers.map((t, idx) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setActiveTiers((prev) => ({ ...prev, [prop.id]: idx }))}
                              className={`py-1.5 px-2 rounded-md capitalize transition-all ${
                                currentTierIndex === idx
                                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm font-bold'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {t.tier} (${t.price})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Selected Tier Title */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{currentTier.title}</h4>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                        <Clock className="size-3.5" /> Earliest Arrival: {currentTier.earliestArrival}
                      </p>
                    </div>

                    {/* Itemized Breakdown */}
                    {currentTier.items && currentTier.items.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Included In This Quote:
                        </span>
                        {currentTier.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground flex items-center gap-1.5">
                              <Check className="size-3.5 text-emerald-600 shrink-0" />
                              {item.name}
                            </span>
                            <span className="text-muted-foreground font-medium">${item.price}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Warranty & Guarantee */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>Warranty Coverage:</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                        {currentTier.warrantyMonths ? `${currentTier.warrantyMonths} Months Warranty` : 'Standard 30 Days'}
                      </Badge>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 rounded-b-xl flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <MessageSquare className="size-3.5" /> Message Pro
                  </Button>

                  <Button
                    size="sm"
                    disabled={data.status === 'BOOKED'}
                    onClick={() => setSelectedProposal({ proposal: prop, tier: currentTier })}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  >
                    Accept & Book (${currentTier.price}) <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Accept & Book Confirmation Modal */}
      {selectedProposal && (
        <Dialog open={!!selectedProposal} onOpenChange={(open) => !open && setSelectedProposal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Service Booking</DialogTitle>
              <DialogDescription>
                You are booking with <strong>{selectedProposal.proposal.providerName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Package:</span>
                  <span className="font-bold text-foreground">{selectedProposal.tier.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arrival Window:</span>
                  <span className="font-semibold text-emerald-600">{selectedProposal.tier.earliestArrival}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warranty:</span>
                  <span>{selectedProposal.tier.warrantyMonths || 3} Months</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-sm">
                  <span>Total Amount:</span>
                  <span className="text-emerald-700">${selectedProposal.tier.price}.00</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <ShieldCheck className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  Confirming this proposal immediately adds the job to the technician's calendar and unlocks your full address.
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedProposal(null)}>
                Cancel
              </Button>
              <Button
                disabled={isAccepting}
                onClick={handleAcceptBooking}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Confirming...
                  </>
                ) : (
                  <>
                    Confirm Booking <CheckCircle2 className="size-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
