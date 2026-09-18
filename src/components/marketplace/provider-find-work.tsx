'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  DollarSign,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  Layers,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/app-store';
import { calculateMarketplaceFee } from '@/lib/marketplace/fee-engine';

interface Opportunity {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  serviceType: string;
  description: string;
  propertyType: string;
  urgency: string;
  budgetDisplay: string;
  budgetMin: number;
  budgetMax: number;
  city: string;
  state: string;
  postalCode: string;
  distanceMiles: number;
  distanceDisplay: string;
  preferredDate: string;
  preferredTime: string;
  photosCount: number;
  proposalsReceived: number;
  createdAt: string;
  aiSummary: string;
}

export function ProviderFindWork() {
  const auth = useAppStore((s) => s.auth);
  const tenantPlan = ((auth?.tenant as any)?.plan || 'starter') as string;

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxDistance, setMaxDistance] = useState(25);
  const [selectedUrgency, setSelectedUrgency] = useState('all');

  // Proposal Composer Modal State
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null);
  const [isTiered, setIsTiered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOppIds, setSubmittedOppIds] = useState<Record<string, boolean>>({});

  // Single Quote Form
  const [quotePrice, setQuotePrice] = useState(275);
  const [coverMessage, setCoverMessage] = useState('');
  const [arrivalWindow, setArrivalWindow] = useState('Today (2:00 PM - 5:00 PM)');
  const [warrantyMonths, setWarrantyMonths] = useState(6);
  const [lineItems, setLineItems] = useState([
    { name: 'Diagnostic & Safety Inspection', type: 'diagnostic', price: 85 },
    { name: 'Parts & Labor Repair', type: 'labor_parts', price: 190 },
  ]);

  // Tiered Quotes (Good / Better / Best)
  const [goodPrice, setGoodPrice] = useState(225);
  const [goodWarranty, setGoodWarranty] = useState(3);
  const [betterPrice, setBetterPrice] = useState(320);
  const [betterWarranty, setBetterWarranty] = useState(12);
  const [bestPrice, setBestPrice] = useState(450);
  const [bestWarranty, setBestWarranty] = useState(24);

  useEffect(() => {
    fetchOpportunities();
  }, [selectedCategory, maxDistance, selectedUrgency]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedUrgency !== 'all') params.set('urgency', selectedUrgency);
      params.set('maxDistance', String(maxDistance));

      const res = await fetch(`/api/marketplace/provider/opportunities?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities || []);
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenComposer = (opp: Opportunity) => {
    setActiveOpp(opp);
    setQuotePrice(opp.budgetMin ? Math.round((opp.budgetMin + opp.budgetMax) / 2) : 250);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { name: 'Additional Service / Part', type: 'service', price: 50 }]);
  };

  const handleRemoveLineItem = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleSubmitProposal = async () => {
    if (!activeOpp) return;
    setIsSubmitting(true);

    try {
      const payload = {
        requestId: activeOpp.id,
        tenantId: (auth?.tenant as any)?.id || 'ten_current',
        tenantPlan,
        isTiered,
        ...(isTiered
          ? {
              tiers: [
                {
                  tier: 'good',
                  title: 'Good: Essential Repair',
                  price: goodPrice,
                  arrivalWindow,
                  warrantyMonths: goodWarranty,
                  items: [{ name: 'Essential repair & testing', price: goodPrice }],
                },
                {
                  tier: 'better',
                  title: 'Better: Premium Repair & Full Tune-Up',
                  price: betterPrice,
                  arrivalWindow,
                  warrantyMonths: betterWarranty,
                  items: [{ name: 'Premium replacement + safety check', price: betterPrice }],
                },
                {
                  tier: 'best',
                  title: 'Best: Complete Restoration + Extended Warranty',
                  price: bestPrice,
                  arrivalWindow,
                  warrantyMonths: bestWarranty,
                  items: [{ name: 'Heavy-duty parts + 2yr VIP guarantee', price: bestPrice }],
                },
              ],
            }
          : {
              title: `${activeOpp.categoryLabel} Proposal`,
              price: quotePrice,
              coverMessage,
              arrivalWindow,
              warrantyMonths,
              items: lineItems,
            }),
      };

      const res = await fetch('/api/marketplace/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (resData.success) {
        setSubmittedOppIds((prev) => ({ ...prev, [activeOpp.id]: true }));
        setActiveOpp(null);
      } else {
        alert(resData.error || 'Failed to submit proposal');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Fee Calculation
  const calculatedFee = calculateMarketplaceFee(tenantPlan, quotePrice);
  const planSavings = calculatedFee.savingsVsFreePlan;

  return (
    <div className="space-y-6">
      {/* Monetization & Rate Badge Bar */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Briefcase className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Find Work Opportunities Feed
              </h3>
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold">
                $0 Lead Fee
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current Plan Take-Rate: <strong className="text-emerald-600 font-bold uppercase">{tenantPlan} ({calculatedFee.takeRatePct}%)</strong>. Pay only when you win and finish the job.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="p-2 px-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 text-emerald-800 dark:text-emerald-300 font-medium">
            ✨ Free to browse, match & submit proposals
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Trade Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium"
          >
            <option value="all">All Categories</option>
            <option value="hvac">HVAC & Cooling</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="roofing">Roofing</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Radius Distance</label>
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium"
          >
            <option value={10}>Within 10 miles</option>
            <option value={25}>Within 25 miles</option>
            <option value={50}>Within 50 miles</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Urgency Filter</label>
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium"
          >
            <option value="all">All Urgencies</option>
            <option value="emergency">🚨 Emergency Only</option>
            <option value="same_day">⚡ Same Day</option>
            <option value="this_week">📅 This Week</option>
          </select>
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-muted-foreground">Scanning nearby matched service requests...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-16 border rounded-xl border-dashed">
          <Briefcase className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold">No Active Opportunities in Radius</h4>
          <p className="text-xs text-muted-foreground mt-1">Try expanding your radius or changing categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {opportunities.map((opp) => {
            const hasSubmitted = submittedOppIds[opp.id];

            return (
              <Card
                key={opp.id}
                className="border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-300 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          {opp.categoryLabel}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            opp.urgency === 'same_day' || opp.urgency === 'emergency'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {opp.urgency === 'emergency' ? '🚨 Emergency' : opp.urgency === 'same_day' ? '⚡ Same Day' : '📅 Flexible'}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-emerald-600" />
                          {opp.city}, {opp.state} ({opp.distanceDisplay})
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground">{opp.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{opp.description}</p>

                      {/* AI Diagnostic Hint */}
                      {opp.aiSummary && (
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Sparkles className="size-3.5 text-emerald-600 shrink-0" />
                          <span><strong>AI Diagnostic Summary:</strong> {opp.aiSummary}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span>Customer Budget: <strong className="text-foreground">{opp.budgetDisplay}</strong></span>
                        <span>•</span>
                        <span>Preferred Slot: <strong className="text-foreground">{opp.preferredTime}</strong></span>
                        <span>•</span>
                        <span>{opp.proposalsReceived} quotes already submitted</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-3 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{opp.createdAt}</span>

                      {hasSubmitted ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-1 px-3">
                          <CheckCircle2 className="size-3.5 mr-1" /> Proposal Sent
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleOpenComposer(opp)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                        >
                          <Send className="size-3.5" /> Submit Proposal
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Proposal Composer Modal */}
      {activeOpp && (
        <Dialog open={!!activeOpp} onOpenChange={(open) => !open && setActiveOpp(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  {activeOpp.categoryLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">{activeOpp.distanceDisplay}</span>
              </div>
              <DialogTitle>Submit Proposal to Customer</DialogTitle>
              <DialogDescription>{activeOpp.title}</DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-5 text-xs">
              {/* Proposal Mode Switcher */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                <div>
                  <p className="font-semibold text-foreground">Proposal Format</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isTiered
                      ? '3-Tier Good / Better / Best packages (increases win rate by 42%)'
                      : 'Single fixed-price quote'}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setIsTiered(false)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      !isTiered ? 'bg-emerald-600 text-white font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    Single Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTiered(true)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      isTiered ? 'bg-emerald-600 text-white font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    Good / Better / Best
                  </button>
                </div>
              </div>

              {/* SINGLE QUOTE BUILDER */}
              {!isTiered ? (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-1">Total Quote Amount ($) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">$</span>
                      <Input
                        type="number"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(Number(e.target.value))}
                        className="pl-7 text-base font-bold"
                      />
                    </div>
                  </div>

                  {/* Itemized Lines */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-semibold">Itemized Line Items</label>
                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 text-[11px]"
                      >
                        <Plus className="size-3" /> Add Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {lineItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const copy = [...lineItems];
                              copy[idx].name = e.target.value;
                              setLineItems(copy);
                            }}
                            placeholder="Service or part description"
                            className="flex-1 text-xs"
                          />
                          <div className="w-28 relative">
                            <span className="absolute left-2.5 top-2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const copy = [...lineItems];
                                copy[idx].price = Number(e.target.value);
                                setLineItems(copy);
                              }}
                              className="pl-6 text-xs"
                            />
                          </div>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-2 text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Earliest Arrival Window</label>
                      <Input
                        value={arrivalWindow}
                        onChange={(e) => setArrivalWindow(e.target.value)}
                        placeholder="e.g. Today 2:00 PM - 5:00 PM"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Warranty Guarantee</label>
                      <select
                        value={warrantyMonths}
                        onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                      >
                        <option value={1}>30 Days</option>
                        <option value={3}>90 Days (3 Months)</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>1 Year</option>
                        <option value={24}>2 Years</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Note / Message to Customer (Optional)</label>
                    <Textarea
                      value={coverMessage}
                      onChange={(e) => setCoverMessage(e.target.value)}
                      placeholder="e.g. We have an EPA-certified tech in your area with OEM parts on the truck ready to inspect and fix today."
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                /* GOOD / BETTER / BEST 3-TIER BUILDER */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* GOOD */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Good</span>
                      <Badge variant="outline" className="text-[10px]">Essential</Badge>
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Price ($)</label>
                      <Input
                        type="number"
                        value={goodPrice}
                        onChange={(e) => setGoodPrice(Number(e.target.value))}
                        className="font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Warranty</label>
                      <select
                        value={goodWarranty}
                        onChange={(e) => setGoodWarranty(Number(e.target.value))}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                      </select>
                    </div>
                  </div>

                  {/* BETTER */}
                  <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/20 space-y-3 relative">
                    <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      POPULAR
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">Better</span>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Tune-up</Badge>
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Price ($)</label>
                      <Input
                        type="number"
                        value={betterPrice}
                        onChange={(e) => setBetterPrice(Number(e.target.value))}
                        className="font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Warranty</label>
                      <select
                        value={betterWarranty}
                        onChange={(e) => setBetterWarranty(Number(e.target.value))}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        <option value={6}>6 Months</option>
                        <option value={12}>1 Year</option>
                      </select>
                    </div>
                  </div>

                  {/* BEST */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Best</span>
                      <Badge variant="outline" className="text-[10px]">VIP Plan</Badge>
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Price ($)</label>
                      <Input
                        type="number"
                        value={bestPrice}
                        onChange={(e) => setBestPrice(Number(e.target.value))}
                        className="font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Warranty</label>
                      <select
                        value={bestWarranty}
                        onChange={(e) => setBestWarranty(Number(e.target.value))}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        <option value={12}>1 Year</option>
                        <option value={24}>2 Years</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Fee & Net Payout Transparency Box */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-300">Total Customer Price:</span>
                  <span className="text-base font-bold">${!isTiered ? quotePrice : betterPrice}.00</span>
                </div>

                {(() => {
                  const activeGross = !isTiered ? quotePrice : betterPrice;
                  const fee = calculateMarketplaceFee(tenantPlan, activeGross);
                  return (
                    <>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>
                          Marketplace Fee ({tenantPlan.toUpperCase()} {fee.takeRatePct}%):
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          -${fee.marketplaceFee.toFixed(2)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-emerald-400">Your Estimated Payout:</span>
                        <span className="text-lg font-extrabold text-white">
                          ${fee.providerPayout.toFixed(2)}
                        </span>
                      </div>

                      {fee.savingsVsFreePlan > 0 && (
                        <p className="text-[11px] text-emerald-300 pt-1">
                          🎉 You save ${fee.savingsVsFreePlan.toFixed(2)} on this job compared to the 8% Free rate!
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setActiveOpp(null)}>
                Cancel
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={handleSubmitProposal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-4" /> Send Proposal to Customer
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
