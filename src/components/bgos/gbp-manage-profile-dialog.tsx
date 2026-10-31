'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Loader2,
  Clock,
  Store,
  MapPin,
  Phone,
  Globe,
  Tag,
  Check,
  CheckCircle2,
  Copy,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

interface DaySchedule {
  open: boolean;
  openTime: string;
  closeTime: string;
  is24Hours?: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const DEFAULT_HOURS: Record<string, DaySchedule> = {
  Monday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Tuesday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Wednesday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Thursday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Friday: { open: true, openTime: '09:00', closeTime: '18:00' },
  Saturday: { open: true, openTime: '10:00', closeTime: '16:00' },
  Sunday: { open: false, openTime: '09:00', closeTime: '18:00' },
};

interface AiVariation {
  id: string;
  label: string;
  description: string;
  charCount: number;
  highlight: string;
}

interface ManageProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: {
    title?: string;
    category?: string;
    phone?: string;
    address?: string;
    website?: string;
    description?: string;
    regularHours?: Record<string, DaySchedule> | null;
    mapsUrl?: string | null;
  } | null;
  onSuccess?: () => void;
  initialTab?: 'contact' | 'ai' | 'posts' | 'basics' | 'description' | 'hours';
}

export function GbpManageProfileDialog({
  open,
  onOpenChange,
  place,
  onSuccess,
  initialTab = 'contact',
}: ManageProfileDialogProps) {
  const normalizedInitial =
    initialTab === 'basics' || initialTab === 'hours'
      ? 'contact'
      : initialTab === 'description'
      ? 'ai'
      : initialTab;
  const [activeTab, setActiveTab] = useState<'contact' | 'ai' | 'posts'>(normalizedInitial);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState<Record<string, DaySchedule>>(DEFAULT_HOURS);

  // Quick Google Post state
  const [newPostContent, setNewPostContent] = useState('');
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [recentPosts, setRecentPosts] = useState<Array<{ id: string; content: string; status: string; createdAt?: string }>>([]);

  // Saving state
  const [saving, setSaving] = useState(false);

  // AI Rewrite state
  const [rewriting, setRewriting] = useState(false);
  const [variations, setVariations] = useState<AiVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  useEffect(() => {
    if (open && place) {
      setTitle(place.title || '');
      setCategory(place.category || '');
      setPhone(place.phone || '');
      setAddress(place.address || '');
      setWebsite(place.website || '');
      setDescription(place.description || '');
      if (place.regularHours && typeof place.regularHours === 'object') {
        setHours({ ...DEFAULT_HOURS, ...place.regularHours });
      }
      setVariations([]);
      setSelectedVariation(null);

      // Fetch recent posts
      void authFetch('/api/social/posts?platform=googlebusiness&limit=5')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.data)) setRecentPosts(data.data);
        })
        .catch(() => {});
    }
    if (open && initialTab) {
      const norm =
        initialTab === 'basics' || initialTab === 'hours'
          ? 'contact'
          : initialTab === 'description'
          ? 'ai'
          : initialTab;
      setActiveTab(norm);
    }
  }, [open, place, initialTab]);

  const handlePublishQuickPost = async () => {
    if (!newPostContent.trim()) return;
    setIsPublishingPost(true);
    try {
      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPostContent.trim(),
          targets: [{ platform: 'googlebusiness' }],
          status: 'published',
        }),
      });
      if (!res.ok) throw new Error('Failed to post to Google Business Profile');
      toast.success('Post published directly to Google Business Profile!');
      setNewPostContent('');
      const updated = await authFetch('/api/social/posts?platform=googlebusiness&limit=5').then((r) => r.json());
      if (Array.isArray(updated?.data)) setRecentPosts(updated.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish post');
    } finally {
      setIsPublishingPost(false);
    }
  };

  const handleRewrite = async () => {
    setRewriting(true);
    setVariations([]);
    setSelectedVariation(null);

    try {
      const res = await authFetch('/api/gbp/rewrite-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentDescription: description,
          businessName: title,
          category,
          address,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate descriptions');
      }

      if (Array.isArray(data.variations) && data.variations.length > 0) {
        setVariations(data.variations);
        toast.success(`Generated ${data.variations.length} SEO-optimized descriptions!`);
      } else {
        toast.error('No variations returned. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating description';
      toast.error(msg);
    } finally {
      setRewriting(false);
    }
  };

  const handleApplyVariation = (v: AiVariation) => {
    setDescription(v.description);
    setSelectedVariation(v.id);
    toast.success(`Applied ${v.label}`);
  };

  const handleToggleDay = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        open: !prev[day]?.open,
      },
    }));
  };

  const handleTimeChange = (day: string, field: 'openTime' | 'closeTime', value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/gbp/place', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          phone: phone.trim(),
          address: address.trim(),
          website: website.trim(),
          description: description.trim(),
          regularHours: hours,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save changes');
      }

      toast.success('Google Business Profile updated successfully!');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Manage Google Business Profile
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Edit business information, hours, and AI-optimized SEO description.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-2 w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1">
            <TabsTrigger value="contact" className="rounded-lg text-xs font-semibold">
              <MapPin className="mr-1.5 size-3.5" />
              Contact & Address
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-lg text-xs font-semibold">
              <Sparkles className="mr-1.5 size-3.5" />
              AI & Automation
            </TabsTrigger>
            <TabsTrigger value="posts" className="rounded-lg text-xs font-semibold">
              <FileText className="mr-1.5 size-3.5" />
              Post on Google
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Contact & Address + Operating Hours */}
          <TabsContent value="contact" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Business Name</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Business Name as shown on Google Maps"
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Primary Category</label>
                <div className="relative">
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Software Company, Fabrication"
                    className="rounded-xl border-slate-200 pl-8 text-xs"
                  />
                  <Tag className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                <div className="relative">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="rounded-xl border-slate-200 pl-8 text-xs"
                  />
                  <Phone className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Business Address / Location</label>
              <div className="relative">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, State, PIN"
                  className="rounded-xl border-slate-200 pl-8 text-xs"
                />
                <MapPin className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Website URL</label>
              <div className="relative">
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="rounded-xl border-slate-200 pl-8 text-xs"
                />
                <Globe className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Operating Hours Accordion */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" /> Business Operating Hours
              </label>
              <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                {DAYS_OF_WEEK.map((day) => {
                  const config = hours[day] || { open: false, openTime: '09:00', closeTime: '18:00' };
                  return (
                    <div
                      key={day}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`size-4 rounded border text-white transition flex items-center justify-center ${
                            config.open ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {config.open && <Check className="size-3 stroke-[3]" />}
                        </button>
                        <span className={`text-xs ${config.open ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                          {day}
                        </span>
                      </div>

                      {config.open ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            value={config.openTime}
                            onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                            className="h-6 w-20 rounded border-slate-200 text-[11px] px-1.5"
                          />
                          <span className="text-[11px] text-slate-400">to</span>
                          <Input
                            type="time"
                            value={config.closeTime}
                            onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
                            className="h-6 w-20 rounded border-slate-200 text-[11px] px-1.5"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 italic">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {place?.mapsUrl && (
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <span>View Live Listing on Google Maps</span>
                <ExternalLink className="size-3" />
              </a>
            )}
          </TabsContent>

          {/* TAB 2: AI & Automation */}
          <TabsContent value="ai" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-700">AI Profile Description</label>
                <p className="text-[11px] text-slate-400">
                  Google allows up to 750 characters. Optimized for local Google Maps keywords.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRewrite}
                disabled={rewriting}
                className="gap-1.5 rounded-xl border-purple-200 bg-purple-50 text-xs font-semibold text-purple-700 hover:bg-purple-100 hover:text-purple-800"
              >
                {rewriting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-purple-600" />
                    ✨ Rewrite with AI
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                rows={4}
                maxLength={750}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your business does, your services, and what makes you special for local customers..."
                className="rounded-xl border-slate-200 text-xs leading-relaxed"
              />
              <div
                className={`mt-1 text-right text-[11px] font-medium ${
                  description.length > 700 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {description.length} / 750 characters
              </div>
            </div>

            {/* AI Generated Variations */}
            {variations.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-purple-200/80 bg-purple-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900">
                      Choose an AI-Generated Variation
                    </span>
                  </div>
                  <Badge variant="outline" className="border-purple-200 text-[10px] text-purple-700">
                    3 options
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {variations.map((v) => {
                    const isSelected = selectedVariation === v.id || description === v.description;
                    return (
                      <div
                        key={v.id}
                        className={`rounded-xl border p-3.5 transition ${
                          isSelected
                            ? 'border-purple-500 bg-white shadow-xs ring-1 ring-purple-500'
                            : 'border-slate-200/80 bg-white hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{v.label}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {v.charCount} chars
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            onClick={() => handleApplyVariation(v)}
                            className="h-7 rounded-lg text-xs font-medium"
                          >
                            {isSelected ? (
                              <>
                                <Check className="mr-1 size-3" />
                                Applied
                              </>
                            ) : (
                              'Use This'
                            )}
                          </Button>
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-slate-700">
                          {v.description}
                        </p>

                        {v.highlight && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-purple-700">
                            <Sparkles className="size-3" />
                            <span>{v.highlight}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Post on Google */}
          <TabsContent value="posts" className="space-y-4 pt-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" /> Create Quick Google Post / Offer
              </label>
              <Textarea
                rows={3}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Write an announcement, festival offer, or update for your Google profile..."
                className="rounded-xl border-slate-200 text-xs bg-white"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handlePublishQuickPost}
                  disabled={isPublishingPost || !newPostContent.trim()}
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  {isPublishingPost ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Publish to Google
                </Button>
              </div>
            </div>

            {/* Recent Posts Feed */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-800">Recent Live &amp; Scheduled Posts</p>
              {recentPosts.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No recent Google posts found.</p>
              ) : (
                <div className="space-y-2">
                  {recentPosts.map((p) => (
                    <div key={p.id} className="rounded-xl border border-slate-100 bg-white p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-800 font-medium truncate">{p.content}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Status: {p.status}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
