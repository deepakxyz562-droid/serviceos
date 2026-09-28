'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Video,
  Clock,
  MessageSquare,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Eye,
  Check,
  Package,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { CreatorOffer, CreatorProfileData, DEFAULT_OFFERS } from '@/lib/creator-profile';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { CURRENCIES, currencyMap, formatCurrency, resolveEffectiveCurrency } from '@/lib/currency-resolver';

export function CreatorOffersView({ embedded = false }: { embedded?: boolean } = {}) {
  const auth = useAppStore((s) => s.auth);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const effectiveCurrency = resolveEffectiveCurrency(auth?.tenant?.currency);
  const currencySymbol = currencyMap[effectiveCurrency]?.symbol || '$';

  const [profile, setProfile] = useState<CreatorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<CreatorOffer | null>(null);
  const [offerForm, setOfferForm] = useState<Partial<CreatorOffer>>({
    title: '',
    slug: '',
    type: 'one_on_one',
    description: '',
    price: effectiveCurrency === 'INR' ? 999 : 49,
    currency: effectiveCurrency,
    durationMinutes: 30,
    eventSlug: '30min',
    turnaroundHours: 24,
    downloadUrl: '',
    fileSize: '',
    badge: 'POPULAR',
    features: ['30 Min Video Consultation', 'Actionable Notes'],
    isActive: true,
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/creator/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch {
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Save Offers to Database
  const handleSaveOffers = async (updatedOffers: CreatorOffer[]) => {
    if (!profile) return;
    setSaving(true);
    try {
      const updatedProfile = { ...profile, offers: updatedOffers };
      const res = await authFetch('/api/creator/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });

      if (res.ok) {
        setProfile(updatedProfile);
        toast.success('Offers updated successfully!');
      } else {
        toast.error('Failed to save offers');
      }
    } catch {
      toast.error('Network error saving offers');
    } finally {
      setSaving(false);
    }
  };

  // Submit Offer Modal Form
  const handleSubmitOfferForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.title?.trim()) {
      toast.error('Offer title is required');
      return;
    }

    const currentOffers = profile?.offers || DEFAULT_OFFERS;
    let nextOffers: CreatorOffer[];

    if (editingOffer) {
      nextOffers = currentOffers.map((o) =>
        o.id === editingOffer.id
          ? ({ ...o, ...offerForm, id: o.id, order: o.order } as CreatorOffer)
          : o
      );
    } else {
      const newOffer: CreatorOffer = {
        id: `off_${Date.now()}`,
        title: offerForm.title,
        slug: (offerForm.slug || offerForm.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        type: offerForm.type || 'one_on_one',
        description: offerForm.description || '',
        price: Number(offerForm.price) || 0,
        currency: (offerForm.currency as any) || 'INR',
        durationMinutes: offerForm.durationMinutes ? Number(offerForm.durationMinutes) : undefined,
        eventSlug: offerForm.eventSlug || '30min',
        turnaroundHours: offerForm.turnaroundHours ? Number(offerForm.turnaroundHours) : undefined,
        downloadUrl: offerForm.downloadUrl || '',
        fileSize: offerForm.fileSize || '',
        badge: offerForm.badge || '',
        features: offerForm.features || [],
        isActive: offerForm.isActive ?? true,
        order: currentOffers.length + 1,
      };
      nextOffers = [newOffer, ...currentOffers];
    }

    await handleSaveOffers(nextOffers);
    setShowOfferModal(false);
    setEditingOffer(null);
  };

  // Delete Offer
  const handleDeleteOffer = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete offer "${title}"?`)) return;
    const nextOffers = (profile?.offers || []).filter((o) => o.id !== id);
    await handleSaveOffers(nextOffers);
    toast.success(`Offer "${title}" deleted`);
  };

  // Toggle Offer Active
  const handleToggleActive = async (offer: CreatorOffer) => {
    const nextOffers = (profile?.offers || []).map((o) =>
      o.id === offer.id ? { ...o, isActive: !o.isActive } : o
    );
    await handleSaveOffers(nextOffers);
  };

  const formatPrice = (price: number, currency?: string) => {
    if (price === 0) return 'Free';
    const c = currency || effectiveCurrency;
    return formatCurrency(price, c);
  };

  return (
    <div className={cn('w-full space-y-6 pb-12', embedded ? 'pt-2' : 'p-4 md:p-8')}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">Offers &amp; Services</h1>
            <Badge variant="secondary" className="text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
              Topmate-Style Monetization
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create 1:1 call bookings, priority Q&amp;A queries, and downloadable digital products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/p/${profile?.handle || 'creator'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-900 text-foreground font-bold text-xs hover:bg-slate-50 transition-colors shadow-2xs h-9"
          >
            <span>Preview Public Storefront</span>
            <ExternalLink className="size-3.5" />
          </a>

          <Button
            type="button"
            onClick={() => {
              setEditingOffer(null);
              setOfferForm({
                title: '',
                slug: '',
                type: 'one_on_one',
                description: '',
                price: effectiveCurrency === 'INR' ? 999 : 49,
                currency: effectiveCurrency,
                durationMinutes: 30,
                eventSlug: '30min',
                turnaroundHours: 24,
                downloadUrl: '',
                fileSize: '',
                badge: 'POPULAR',
                features: ['30 Min Video Consultation'],
                isActive: true,
              });
              setShowOfferModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4 gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>New Offer</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 rounded-2xl border">
          <p className="text-xs text-muted-foreground">Total Offers</p>
          <p className="text-xl font-black text-foreground">{profile?.offers?.length || 0}</p>
        </Card>
        <Card className="p-4 rounded-2xl border">
          <p className="text-xs text-muted-foreground">Active on Page</p>
          <p className="text-xl font-black text-emerald-600">
            {profile?.offers?.filter((o) => o.isActive !== false).length || 0}
          </p>
        </Card>
        <Card className="p-4 rounded-2xl border">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Primary Currency</p>
            <button
              type="button"
              onClick={() => setActiveView('settings')}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Change</span>
              <Settings className="size-2.5" />
            </button>
          </div>
          <p className="text-xl font-black text-blue-600">
            {effectiveCurrency} ({currencySymbol})
          </p>
        </Card>
        <Card className="p-4 rounded-2xl border">
          <p className="text-xs text-muted-foreground">Payments Supported</p>
          <p className="text-xs font-bold text-foreground mt-1">Creem MoR &amp; UPI / Cards</p>
        </Card>
      </div>

      {/* ── Offers List ── */}
      <div className="space-y-3">
        {profile?.offers?.map((offer) => {
          const isCall = offer.type === 'one_on_one' || offer.type === 'consultation';
          const isQuestion = offer.type === 'ask_question';
          const isProduct = offer.type === 'digital_product';

          return (
            <Card
              key={offer.id}
              className={`p-4 rounded-2xl border transition-all ${
                offer.isActive ? 'bg-card' : 'bg-slate-50 dark:bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCall
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                        : isQuestion
                        ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/50'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                    }`}
                  >
                    {isCall ? <Video className="size-5" /> : isQuestion ? <MessageSquare className="size-5" /> : <Download className="size-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-foreground">{offer.title}</h4>
                      {offer.badge && (
                        <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0">
                          {offer.badge}
                        </Badge>
                      )}
                      <span className="text-xs font-black text-blue-600">
                        {formatPrice(offer.price, offer.currency)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {offer.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium pt-0.5">
                      <span>Type: <strong className="capitalize text-foreground">{offer.type.replace(/_/g, ' ')}</strong></span>
                      {isCall && <span>Duration: <strong className="text-foreground">{offer.durationMinutes || 30} mins</strong></span>}
                      {isQuestion && <span>Reply in: <strong className="text-foreground">{offer.turnaroundHours || 24} hours</strong></span>}
                      {isProduct && offer.fileSize && <span>Size: <strong className="text-foreground">{offer.fileSize}</strong></span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0">
                  <Switch
                    checked={offer.isActive}
                    onCheckedChange={() => handleToggleActive(offer)}
                    title={offer.isActive ? 'Active (Click to Pause)' : 'Paused (Click to Activate)'}
                    className="scale-90"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingOffer(offer);
                      setOfferForm({ ...offer });
                      setShowOfferModal(true);
                    }}
                    className="size-8 rounded-xl text-slate-500 hover:text-foreground"
                    title="Edit Offer"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteOffer(offer.id, offer.title)}
                    className="size-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete Offer"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── CREATE / EDIT OFFER MODAL ── */}
      <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingOffer ? 'Edit Offer' : 'Create New Offer'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure your 1:1 consultation, paid question, or digital download.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitOfferForm} className="space-y-4 text-xs pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Offer Type</Label>
              <select
                value={offerForm.type}
                onChange={(e) => setOfferForm({ ...offerForm, type: e.target.value as any })}
                className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium"
              >
                <option value="one_on_one">1:1 Video Call (Google Meet)</option>
                <option value="ask_question">Ask a Question (Priority Written &amp; Audio Reply)</option>
                <option value="digital_product">Digital Product / Guide / Download</option>
                <option value="package">Package / Consulting Bundle</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Offer Title</Label>
              <Input
                value={offerForm.title || ''}
                onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                placeholder="e.g. 1:1 Architecture Consultation"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Price</Label>
                <Input
                  type="number"
                  min={0}
                  value={offerForm.price ?? 999}
                  onChange={(e) => setOfferForm({ ...offerForm, price: Number(e.target.value) || 0 })}
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Currency</Label>
                <select
                  value={offerForm.currency || effectiveCurrency}
                  onChange={(e) => setOfferForm({ ...offerForm, currency: e.target.value as any })}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium font-mono"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {offerForm.type === 'one_on_one' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Duration (Minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={240}
                    value={offerForm.durationMinutes || 30}
                    onChange={(e) => setOfferForm({ ...offerForm, durationMinutes: Number(e.target.value) || 30 })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Slot Engine Slug</Label>
                  <Input
                    value={offerForm.eventSlug || '30min'}
                    onChange={(e) => setOfferForm({ ...offerForm, eventSlug: e.target.value })}
                    placeholder="30min"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            )}

            {offerForm.type === 'ask_question' && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Turnaround Time (Hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={offerForm.turnaroundHours || 24}
                  onChange={(e) => setOfferForm({ ...offerForm, turnaroundHours: Number(e.target.value) || 24 })}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            )}

            {offerForm.type === 'digital_product' && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">File Download URL</Label>
                <Input
                  value={offerForm.downloadUrl || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, downloadUrl: e.target.value })}
                  placeholder="https://assets.yourdomain.com/guide.pdf"
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Description</Label>
              <textarea
                value={offerForm.description || ''}
                onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                placeholder="What will the customer get from this offer?"
                rows={3}
                className="w-full rounded-xl border bg-background p-2.5 text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Badge Text (Optional)</Label>
              <Input
                value={offerForm.badge || ''}
                onChange={(e) => setOfferForm({ ...offerForm, badge: e.target.value.toUpperCase() })}
                placeholder="e.g. MOST POPULAR, FREE, BEST VALUE"
                className="h-8 text-xs rounded-lg font-mono uppercase"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOfferModal(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4"
              >
                {editingOffer ? 'Update Offer' : 'Create Offer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
