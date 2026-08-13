'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Facebook,
  Instagram,
  MapPin,
  Linkedin,
  Image as ImageIcon,
  Twitter,
  Sparkles,
  Loader2,
  ImagePlus,
  X,
  CalendarClock,
  Send,
  Save,
  Wand2,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Post Composer View
 * ------------------
 * Form for creating a single post that publishes to one or more connected
 * social accounts simultaneously.
 *
 * Features:
 *   - Platform selector (checkboxes per connected account)
 *   - Caption textarea with character counter (warns on X's 280 limit)
 *   - AI Assist button → /api/social/ai-caption (uses Brand Brain context)
 *   - Image upload (uses /api/upload which already exists for other views)
 *   - Link URL input
 *   - Platform-specific options:
 *       * Google Business: post type (offer/event/whats_new/product) + offer fields
 *       * Pinterest: board selector (free-text board ID for now)
 *   - Schedule picker (datetime-local) OR "Publish now"
 *   - Save Draft / Schedule / Publish buttons
 *
 * On submit:
 *   - Save Draft → POST /api/social/posts { status: 'draft' }
 *   - Schedule   → POST /api/social/posts { status: 'scheduled', scheduledAt }
 *   - Publish    → POST /api/social/posts { status: 'published' }
 *     (the API auto-triggers publishPost() in the background)
 */

// ─── Platform metadata ─────────────────────────────────────────────────────

interface PlatformMeta {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  charLimit: number;
}

const PLATFORMS: PlatformMeta[] = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600', charLimit: 5000 },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-600', charLimit: 2200 },
  { key: 'googlebusiness', label: 'Google Business', icon: MapPin, color: 'bg-emerald-600', charLimit: 1500 },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-sky-700', charLimit: 3000 },
  { key: 'pinterest', label: 'Pinterest', icon: ImageIcon, color: 'bg-red-600', charLimit: 500 },
  { key: 'twitter', label: 'X', icon: Twitter, color: 'bg-zinc-900', charLimit: 280 },
];

function getPlatformMeta(key: string): PlatformMeta | undefined {
  return PLATFORMS.find((p) => p.key === key);
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PostComposerView() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Form state
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Platform-specific
  const [gbpPostType, setGbpPostType] = useState<string>('whats_new');
  const [gbpOfferTitle, setGbpOfferTitle] = useState('');
  const [gbpOfferStartDate, setGbpOfferStartDate] = useState('');
  const [gbpOfferEndDate, setGbpOfferEndDate] = useState('');
  const [gbpOfferCoupon, setGbpOfferCoupon] = useState('');
  const [pinterestBoard, setPinterestBoard] = useState('');

  // Schedule
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState<string>('');

  // AI assist
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional, friendly');
  const [isGenerating, setIsGenerating] = useState(false);

  // Image upload
  const [isUploading, setIsUploading] = useState(false);

  // Submit
  const [isSaving, setIsSaving] = useState(false);

  // ── Load connected accounts ──
  const loadAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await authFetch('/api/social/accounts');
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Group accounts by platform for display.
  const accountsByPlatform = useMemo(() => {
    const map = new Map<string, SocialAccount[]>();
    for (const a of accounts) {
      if (!a.isActive) continue;
      const list = map.get(a.platform) || [];
      list.push(a);
      map.set(a.platform, list);
    }
    return map;
  }, [accounts]);

  const selectedPlatforms = useMemo(() => {
    const set = new Set<string>();
    for (const accId of selectedAccountIds) {
      const acc = accounts.find((a) => a.id === accId);
      if (acc) set.add(acc.platform);
    }
    return Array.from(set);
  }, [selectedAccountIds, accounts]);

  // Tightest character limit across selected platforms.
  const charLimit = useMemo(() => {
    if (selectedPlatforms.length === 0) return 5000;
    return Math.min(
      ...selectedPlatforms.map((p) => getPlatformMeta(p)?.charLimit ?? 5000),
    );
  }, [selectedPlatforms]);

  const hasGbp = selectedPlatforms.includes('googlebusiness');
  const hasPinterest = selectedPlatforms.includes('pinterest');

  // ── Handlers ──

  const toggleAccount = (accId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId],
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('saveToLibrary', 'true');
        fd.append('folder', 'social-posts');
        const res = await authFetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const json = await res.json();
          if (json.url) uploaded.push(json.url);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      if (uploaded.length > 0) {
        setMediaUrls((prev) => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} image(s) added`);
      }
    } catch {
      toast.error('Image upload failed');
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be re-selected.
      e.target.value = '';
    }
  };

  const removeImage = (url: string) => {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      toast.error('Enter a topic for the AI to write about');
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform first so the AI knows the char limit');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await authFetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          platforms: selectedPlatforms,
          tone: aiTone,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.caption) {
          setContent(json.caption);
          toast.success('AI caption generated');
        } else {
          toast.error(json.error || 'AI returned an empty response');
        }
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'AI generation failed');
      }
    } catch {
      toast.error('Network error calling AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const validate = (): string | null => {
    if (!content.trim()) return 'Caption is required.';
    if (selectedAccountIds.length === 0) return 'Select at least one platform account.';
    if (publishMode === 'schedule' && !scheduledAt) return 'Pick a date and time to schedule.';
    if (hasGbp && gbpPostType === 'offer') {
      if (!gbpOfferTitle.trim()) return 'GBP offer requires a title.';
      if (!gbpOfferStartDate || !gbpOfferEndDate) return 'GBP offer requires start and end dates.';
    }
    if (content.length > charLimit) {
      return `Caption is ${content.length} chars — exceeds the ${charLimit}-char limit for the selected platforms.`;
    }
    return null;
  };

  const buildPayload = (status: 'draft' | 'scheduled' | 'published') => {
    const targets = selectedAccountIds.map((accId) => {
      const acc = accounts.find((a) => a.id === accId)!;
      return { platform: acc.platform, socialAccountId: acc.id };
    });

    const payload: Record<string, unknown> = {
      content,
      mediaUrls,
      linkUrl: linkUrl || undefined,
      targets,
      status,
    };

    if (status === 'scheduled' && scheduledAt) {
      payload.scheduledAt = scheduledAt;
    }

    if (hasGbp) {
      payload.gbpPostType = gbpPostType;
      if (gbpPostType === 'offer' && gbpOfferTitle) {
        payload.gbpOfferData = {
          title: gbpOfferTitle,
          startDate: gbpOfferStartDate,
          endDate: gbpOfferEndDate,
          couponCode: gbpOfferCoupon || undefined,
        };
      }
    }
    if (hasPinterest && pinterestBoard) {
      payload.pinterestBoard = pinterestBoard;
    }
    return payload;
  };

  const submitPost = async (status: 'draft' | 'scheduled' | 'published') => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setIsSaving(true);
    try {
      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(status)),
      });
      if (res.ok) {
        const json = await res.json();
        if (status === 'published') {
          toast.success('Post is publishing now — check the Posts list for results.');
        } else if (status === 'scheduled') {
          toast.success('Post scheduled — it will publish at the chosen time.');
        } else {
          toast.success('Draft saved.');
        }
        // Reset form on success.
        setContent('');
        setMediaUrls([]);
        setLinkUrl('');
        setSelectedAccountIds([]);
        setAiTopic('');
        setGbpOfferTitle('');
        setGbpOfferCoupon('');
        setGbpOfferStartDate('');
        setGbpOfferEndDate('');
        setPinterestBoard('');
        setScheduledAt('');
        setPublishMode('now');
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || `Failed to ${status === 'published' ? 'publish' : 'save'} post`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-10 mx-auto text-amber-500" />
            <h2 className="mt-4 text-lg font-semibold">No social accounts connected</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect at least one social account before composing a post.
            </p>
            <Button className="mt-4" onClick={() => (window.location.hash = 'social-accounts')}>
              Go to Social Accounts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Post</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compose once, publish to multiple platforms simultaneously.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main composer (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Platform selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish to</CardTitle>
              <CardDescription>Select one or more connected accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PLATFORMS.map((p) => {
                const accs = accountsByPlatform.get(p.key) || [];
                if (accs.length === 0) return null;
                const Icon = p.icon;
                return (
                  <div key={p.key} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="size-3.5" />
                      {p.label}
                    </div>
                    {accs.map((acc) => {
                      const checked = selectedAccountIds.includes(acc.id);
                      return (
                        <label
                          key={acc.id}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                            checked
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                              : 'border-border hover:bg-muted/40',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAccount(acc.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{acc.accountName}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {acc.accountId}
                            </div>
                          </div>
                          <div
                            className={cn(
                              'flex items-center justify-center size-7 rounded-md text-white',
                              p.color,
                            )}
                          >
                            <Icon className="size-3.5" />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Caption */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Caption</CardTitle>
                  <CardDescription>Write your post or use AI to draft one.</CardDescription>
                </div>
                <Badge
                  variant={content.length > charLimit ? 'destructive' : 'secondary'}
                  className="font-mono"
                >
                  {content.length} / {charLimit}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What do you want to share?"
                className="min-h-32 resize-y"
              />

              {/* AI Assist */}
              <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wand2 className="size-4 text-emerald-500" />
                  AI Assist
                </div>
                <Input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Topic (e.g. 'Spring cleaning discount for new customers')"
                  className="bg-background"
                />
                <div className="flex gap-2">
                  <Input
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    placeholder="Tone (e.g. friendly, professional)"
                    className="bg-background flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={isGenerating || !aiTopic.trim()}
                  >
                    {isGenerating ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Generate
                  </Button>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Images</Label>
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {mediaUrls.map((url) => (
                      <div
                        key={url}
                        className="relative aspect-square rounded-md overflow-hidden border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Upload preview"
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                          aria-label="Remove image"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted/40 text-sm text-muted-foreground">
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="size-4" />
                      Upload images
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>

              {/* Link URL */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <LinkIcon className="size-3.5" />
                  Link URL (optional)
                </Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://your-site.com/promo"
                  type="url"
                />
              </div>
            </CardContent>
          </Card>

          {/* Platform-specific options */}
          {(hasGbp || hasPinterest) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform options</CardTitle>
                <CardDescription>
                  Extra fields for the platforms you selected.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasGbp && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="size-4 text-emerald-600" />
                      Google Business
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Post type</Label>
                      <Select value={gbpPostType} onValueChange={setGbpPostType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whats_new">What's New</SelectItem>
                          <SelectItem value="offer">Offer</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {gbpPostType === 'offer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/30">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Offer title</Label>
                          <Input
                            value={gbpOfferTitle}
                            onChange={(e) => setGbpOfferTitle(e.target.value)}
                            placeholder="20% off spring cleaning"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Start date</Label>
                          <Input
                            type="date"
                            value={gbpOfferStartDate}
                            onChange={(e) => setGbpOfferStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">End date</Label>
                          <Input
                            type="date"
                            value={gbpOfferEndDate}
                            onChange={(e) => setGbpOfferEndDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Coupon code (optional)</Label>
                          <Input
                            value={gbpOfferCoupon}
                            onChange={(e) => setGbpOfferCoupon(e.target.value)}
                            placeholder="SPRING20"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {hasPinterest && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ImageIcon className="size-4 text-red-600" />
                      Pinterest
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Board ID (where to pin)
                      </Label>
                      <Input
                        value={pinterestBoard}
                        onChange={(e) => setPinterestBoard(e.target.value)}
                        placeholder="e.g. 123456789012345678"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: schedule + actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">When to publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={publishMode === 'now' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPublishMode('now')}
                  className="flex-1"
                >
                  <Send className="size-3.5" />
                  Publish now
                </Button>
                <Button
                  variant={publishMode === 'schedule' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPublishMode('schedule')}
                  className="flex-1"
                >
                  <CalendarClock className="size-3.5" />
                  Schedule
                </Button>
              </div>
              {publishMode === 'schedule' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date &amp; time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The post will be published automatically at this time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                disabled={isSaving}
                onClick={() =>
                  submitPost(publishMode === 'schedule' ? 'scheduled' : 'published')
                }
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : publishMode === 'schedule' ? (
                  <CalendarClock className="size-4" />
                ) : (
                  <Send className="size-4" />
                )}
                {publishMode === 'schedule' ? 'Schedule post' : 'Publish now'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={isSaving}
                onClick={() => submitPost('draft')}
              >
                <Save className="size-4" />
                Save as draft
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Accounts</span>
                <span className="font-medium text-foreground">{selectedAccountIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Platforms</span>
                <span className="font-medium text-foreground">{selectedPlatforms.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Images</span>
                <span className="font-medium text-foreground">{mediaUrls.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Caption</span>
                <span className="font-medium text-foreground">
                  {content.length} / {charLimit}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
