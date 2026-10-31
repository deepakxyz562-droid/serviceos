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
  Video,
  Play,
  Pencil,
  FileText,
  LayoutTemplate,
  CheckCircle2,
  Share2,
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
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Post Composer View
 * ------------------
 * Multi-format, omnichannel social media composer supporting:
 *   1. 🎨 Image + Text (Branded Split Card / Graphic) — Bloom & Co. style
 *   2. 🖼️ Image Only (High-res photo / graphic asset)
 *   3. 🎬 Video Post (Reels / MP4 / MOV clip with player preview)
 *   4. 📝 Text / Update (Status / Google Business update / Offer)
 *
 * Supported platforms:
 *   - Google Business Profile
 *   - Facebook Pages
 *   - Instagram Business
 *   - LinkedIn
 *   - X (Twitter)
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
  { key: 'googlebusiness', label: 'Google Business', icon: MapPin, color: 'bg-emerald-600', charLimit: 1500 },
  { key: 'facebook', label: 'Facebook Page', icon: Facebook, color: 'bg-blue-600', charLimit: 5000 },
  { key: 'instagram', label: 'Instagram Business', icon: Instagram, color: 'bg-pink-600', charLimit: 2200 },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-sky-700', charLimit: 3000 },
  { key: 'twitter', label: 'X (Twitter)', icon: Twitter, color: 'bg-zinc-900', charLimit: 280 },
];

function getPlatformMeta(key: string): PlatformMeta | undefined {
  return PLATFORMS.find((p) => p.key === key);
}

// ─── Post Formats ──────────────────────────────────────────────────────────

export type PostFormat = 'image_text' | 'image_only' | 'video' | 'text';

interface FormatOption {
  key: PostFormat;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    key: 'image_text',
    title: 'Image with Text',
    subtitle: 'Branded split card & editorial graphic (Bloom & Co. style)',
    icon: LayoutTemplate,
    badge: 'Popular',
  },
  {
    key: 'image_only',
    title: 'Image Only',
    subtitle: 'Visual-first photo or promotional artwork',
    icon: ImageIcon,
  },
  {
    key: 'video',
    title: 'Video / Reel',
    subtitle: 'Upload MP4/MOV clip for Facebook & Instagram Reels',
    icon: Video,
    badge: 'High Reach',
  },
  {
    key: 'text',
    title: 'Text / Update',
    subtitle: 'Quick announcement, offer, or status update',
    icon: FileText,
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PostComposerView({ embedded = false }: { embedded?: boolean } = {}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Post Format selection
  const [postFormat, setPostFormat] = useState<PostFormat>('image_text');

  // Form state
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Branded Split Card fields (for image_text format)
  const [brandHeadline, setBrandHeadline] = useState('A little self-care goes a long way.');
  const [brandSubtitle, setBrandSubtitle] = useState('Refresh your look with a personalised hair consultation. Book your next visit.');
  const [brandName, setBrandName] = useState('');

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

  // File upload
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
        const accList: SocialAccount[] = json.data || [];
        setAccounts(accList);
        // Default brandName to first active account name if available
        if (accList.length > 0 && accList[0].accountName) {
          setBrandName(accList[0].accountName);
        }
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

  // Group accounts by platform for display
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

  // Tightest character limit across selected platforms
  const charLimit = useMemo(() => {
    if (selectedPlatforms.length === 0) return 5000;
    return Math.min(
      ...selectedPlatforms.map((p) => getPlatformMeta(p)?.charLimit ?? 5000),
    );
  }, [selectedPlatforms]);

  const hasGbp = selectedPlatforms.includes('googlebusiness');
  const hasInstagram = selectedPlatforms.includes('instagram');
  const hasPinterest = selectedPlatforms.includes('pinterest');

  const selectedAccountObject = useMemo(() => {
    return accounts.find((a) => selectedAccountIds.includes(a.id));
  }, [accounts, selectedAccountIds]);

  const displayBrandName = brandName || selectedAccountObject?.accountName || 'Your Business';

  // ── Handlers ──

  const toggleAccount = (accId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId],
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('saveToLibrary', 'true');
        fd.append('folder', file.type.startsWith('video/') ? 'social-videos' : 'social-posts');
        const res = await authFetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const json = await res.json();
          if (json.url) {
            uploaded.push(json.url);
            if (file.type.startsWith('video/')) {
              setPostFormat('video');
            }
          }
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || `Failed to upload ${file.name}`);
        }
      }
      if (uploaded.length > 0) {
        setMediaUrls((prev) => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} file(s) added successfully`);
      }
    } catch {
      toast.error('File upload failed');
    } finally {
      setIsUploading(false);
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
    const platformsToTarget = selectedPlatforms.length > 0 ? selectedPlatforms : ['googlebusiness', 'facebook', 'instagram'];
    setIsGenerating(true);
    try {
      const res = await authFetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          platforms: platformsToTarget,
          tone: aiTone,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.caption) {
          setContent(json.caption);

          // Extract or generate headline & subtitle for the branded split card
          const lines = json.caption.split('\n').map((l: string) => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            const firstLine = lines[0].replace(/^[#*"\s]+|[#*"\s]+$/g, '');
            setBrandHeadline(firstLine.slice(0, 70));
            if (lines.length > 1) {
              setBrandSubtitle(lines.slice(1, 3).join(' ').replace(/#[A-Za-z0-9_]+/g, '').trim().slice(0, 160));
            }
          }
          toast.success('AI post created with branded headline!');
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
    if (selectedAccountIds.length === 0) return 'Select at least one connected social account.';

    if (postFormat === 'text') {
      if (!content.trim()) return 'Post text is required.';
      if (hasInstagram) {
        return 'Instagram requires a photo or video. Switch format to "Image with Text", "Image Only", or "Video" to post to Instagram.';
      }
    }

    if (postFormat === 'image_only') {
      if (mediaUrls.length === 0) return 'Please upload at least one photo for an Image Only post.';
    }

    if (postFormat === 'image_text') {
      if (!brandHeadline.trim() && !content.trim()) return 'Please provide a headline or caption for your branded post.';
    }

    if (postFormat === 'video') {
      if (mediaUrls.length === 0) return 'Please upload a video file (MP4/MOV) for a Video post.';
    }

    if (publishMode === 'schedule' && !scheduledAt) return 'Pick a date and time to schedule.';

    if (hasGbp && gbpPostType === 'offer') {
      if (!gbpOfferTitle.trim()) return 'Google Business offer requires a title.';
      if (!gbpOfferStartDate || !gbpOfferEndDate) return 'Google Business offer requires start and end dates.';
    }

    const effectiveText = content || `${brandHeadline} ${brandSubtitle}`;
    if (effectiveText.length > charLimit) {
      return `Caption is ${effectiveText.length} chars — exceeds the ${charLimit}-char limit for the selected platforms.`;
    }

    return null;
  };

  const buildPayload = (status: 'draft' | 'scheduled' | 'published') => {
    const targets = selectedAccountIds.map((accId) => {
      const acc = accounts.find((a) => a.id === accId)!;
      return { platform: acc.platform, socialAccountId: acc.id };
    });

    // For branded graphic format, ensure caption includes headline if caption is blank
    const effectiveContent = content.trim()
      ? content
      : brandHeadline
        ? `${brandHeadline}\n\n${brandSubtitle}`
        : '';

    const payload: Record<string, unknown> = {
      content: effectiveContent,
      mediaUrls,
      linkUrl: linkUrl || undefined,
      targets,
      status,
      postFormat,
      metadata: {
        postFormat,
        brandHeadline,
        brandSubtitle,
        brandName: displayBrandName,
      },
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
        if (status === 'published') {
          toast.success('Post submitted for instant publishing across selected platforms!');
        } else if (status === 'scheduled') {
          toast.success('Post successfully scheduled.');
        } else {
          toast.success('Draft saved.');
        }
        // Reset form
        setContent('');
        setMediaUrls([]);
        setLinkUrl('');
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
      toast.error('Network error saving post');
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
      <div>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-10 mx-auto text-amber-500" />
            <h2 className="mt-4 text-lg font-semibold">No social accounts connected</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Connect Google Business, Facebook Page, or Instagram Business to compose and publish posts.
            </p>
            <Button
              className="mt-4 bg-primary text-primary-foreground font-semibold"
              onClick={() => (window.location.hash = 'social-accounts')}
            >
              Connect Accounts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Post</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Publish across Google, Facebook, and Instagram with high-converting visual formats.
            </p>
          </div>
        </div>
      )}

      {/* ─── 1. POST FORMAT SELECTOR ─────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Select Post Format
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FORMAT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = postFormat === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPostFormat(opt.key)}
                className={cn(
                  'relative text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2',
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500'
                    : 'border-border bg-card hover:bg-muted/40',
                )}
              >
                {opt.badge && (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                    {opt.badge}
                  </span>
                )}
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'size-8 rounded-lg flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">{opt.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {opt.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main composer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Platform selector */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Publish to</CardTitle>
                  <CardDescription className="text-xs">
                    Select target accounts across Google, Facebook, and Instagram.
                  </CardDescription>
                </div>
                {selectedAccountIds.length > 0 && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {selectedAccountIds.length} selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {PLATFORMS.map((p) => {
                const accs = accountsByPlatform.get(p.key) || [];
                if (accs.length === 0) return null;
                const Icon = p.icon;
                return (
                  <div key={p.key} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Icon className="size-3.5" />
                      {p.label}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {accs.map((acc) => {
                        const checked = selectedAccountIds.includes(acc.id);
                        return (
                          <label
                            key={acc.id}
                            className={cn(
                              'flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors',
                              checked
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20'
                                : 'border-border hover:bg-muted/40',
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleAccount(acc.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{acc.accountName}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {acc.accountId}
                              </div>
                            </div>
                            <div
                              className={cn(
                                'flex items-center justify-center size-6 rounded-md text-white shrink-0',
                                p.color,
                              )}
                            >
                              <Icon className="size-3" />
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* AI Generator Hero Box */}
          <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 via-purple-500/5 to-muted p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <Sparkles className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">AI Post Assistant</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Generate high-converting headlines, body copy, and hashtags instantly.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Topic or offer (e.g. 'Weekend self-care hair spa special 20% off')"
                className="bg-card text-xs h-9"
              />
              <div className="flex gap-2">
                <Input
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  placeholder="Tone (e.g. friendly, editorial, energetic)"
                  className="bg-card text-xs h-9 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiGenerate}
                  disabled={isGenerating || !aiTopic.trim()}
                  className="h-9 px-4 text-xs font-bold rounded-xl bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 text-white hover:opacity-95 shadow-xs"
                >
                  {isGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span>✨ Generate AI Post ✨</span>
                </Button>
              </div>

              {/* Quick Prompt Ideas */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Weekend Self-Care Special',
                  'Meet Your Stylist',
                  'A Fresh Look For You',
                  'New Season Makeover',
                  'Client 5-Star Spotlight',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setAiTopic(prompt);
                      toast.info(`Prompt set: "${prompt}". Click Generate!`);
                    }}
                    className="px-2 py-0.5 rounded-md border bg-card/80 hover:bg-muted text-[10px] font-semibold text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── FORMAT-SPECIFIC FORM CONTROLS ───────────────────────────── */}

          {/* 1. Branded Graphic Fields (if image_text format) */}
          {postFormat === 'image_text' && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <LayoutTemplate className="size-4 text-primary" />
                  Branded Graphic Content (Bloom & Co. Style)
                </CardTitle>
                <CardDescription className="text-xs">
                  This text renders in the editorial card alongside your business photo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Business / Brand Name</Label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Bloom & Co. SALON"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Hero Headline</Label>
                  <Input
                    value={brandHeadline}
                    onChange={(e) => setBrandHeadline(e.target.value)}
                    placeholder="e.g. A little self-care goes a long way."
                    className="h-9 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Sub-Headline / Body</Label>
                  <Textarea
                    value={brandSubtitle}
                    onChange={(e) => setBrandSubtitle(e.target.value)}
                    placeholder="e.g. Refresh your look with a personalised hair consultation. Book your next visit."
                    className="min-h-20 text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. Media Upload (Photos or Videos) */}
          {(postFormat === 'image_text' || postFormat === 'image_only' || postFormat === 'video') && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {postFormat === 'video' ? (
                      <Video className="size-4 text-primary" />
                    ) : (
                      <ImageIcon className="size-4 text-primary" />
                    )}
                    {postFormat === 'video' ? 'Upload Video Clip' : 'Upload Photos'}
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">
                    {postFormat === 'video' ? 'MP4, MOV (up to 100MB)' : 'PNG, JPG, WEBP'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {mediaUrls.map((url) => {
                      const isVid = url.match(/\.(mp4|mov|webm|m4v)/i);
                      return (
                        <div
                          key={url}
                          className="relative aspect-video rounded-lg overflow-hidden border bg-muted"
                        >
                          {isVid ? (
                            <div className="relative size-full flex items-center justify-center bg-black/90">
                              <Play className="size-6 text-white/80" />
                              <span className="absolute bottom-1 left-2 text-[10px] text-white font-mono font-bold">
                                VIDEO
                              </span>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt="Upload preview"
                              className="size-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(url)}
                            className="absolute top-1.5 right-1.5 size-5 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black transition-colors"
                            aria-label="Remove media"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 p-3.5 border border-dashed rounded-xl cursor-pointer hover:bg-muted/40 text-xs font-semibold text-muted-foreground transition-colors">
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Uploading to cloud storage…</span>
                    </>
                  ) : (
                    <>
                      {postFormat === 'video' ? (
                        <Video className="size-4 text-primary" />
                      ) : (
                        <ImagePlus className="size-4 text-primary" />
                      )}
                      <span>
                        {postFormat === 'video'
                          ? 'Select video clip (.mp4, .mov)'
                          : 'Select images (upload or drag & drop)'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept={postFormat === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/*'}
                    multiple={postFormat !== 'video'}
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </CardContent>
            </Card>
          )}

          {/* 3. Caption Textarea */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">
                    {postFormat === 'image_text' ? 'Feed Caption & Hashtags' : 'Post Caption'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Social text accompanying your post on Facebook, Instagram, and Google.
                  </CardDescription>
                </div>
                <Badge
                  variant={content.length > charLimit ? 'destructive' : 'secondary'}
                  className="font-mono text-xs"
                >
                  {content.length} / {charLimit}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post caption or generate with AI above…"
                className="min-h-28 text-xs resize-y"
              />

              {/* Instagram Media Warning */}
              {hasInstagram && postFormat === 'text' && (
                <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-300 text-xs flex items-center gap-2">
                  <Instagram className="size-4 shrink-0" />
                  <span>
                    Instagram requires an image or video. Switch format to <strong>Image with Text</strong> or <strong>Video</strong> to publish to Instagram.
                  </span>
                </div>
              )}

              {/* Link URL */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <LinkIcon className="size-3.5" />
                  Link URL (Optional)
                </Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://your-business.com/booking"
                  type="url"
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Platform-specific options (Google Business & Pinterest) */}
          {hasGbp && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-600" />
                  Google Business Profile Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Post Type</Label>
                  <Select value={gbpPostType} onValueChange={setGbpPostType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whats_new">What's New (Standard Update)</SelectItem>
                      <SelectItem value="offer">Special Offer / Promotion</SelectItem>
                      <SelectItem value="event">Event Announcement</SelectItem>
                      <SelectItem value="product">Product Spotlight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {gbpPostType === 'offer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border p-3 bg-muted/20">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Offer Title</Label>
                      <Input
                        value={gbpOfferTitle}
                        onChange={(e) => setGbpOfferTitle(e.target.value)}
                        placeholder="e.g. 20% Off Weekend Hair Styling"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={gbpOfferStartDate}
                        onChange={(e) => setGbpOfferStartDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={gbpOfferEndDate}
                        onChange={(e) => setGbpOfferEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Coupon Code (optional)</Label>
                      <Input
                        value={gbpOfferCoupon}
                        onChange={(e) => setGbpOfferCoupon(e.target.value)}
                        placeholder="e.g. SAVE20"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar / Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scheduling & Publish Actions Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Publishing Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={publishMode === 'now' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPublishMode('now')}
                  className={cn(
                    'h-9 text-xs font-semibold rounded-xl',
                    publishMode === 'now' && 'bg-primary text-primary-foreground',
                  )}
                >
                  <Send className="size-3.5 mr-1" />
                  Publish Now
                </Button>
                <Button
                  type="button"
                  variant={publishMode === 'schedule' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPublishMode('schedule')}
                  className={cn(
                    'h-9 text-xs font-semibold rounded-xl',
                    publishMode === 'schedule' && 'bg-primary text-primary-foreground',
                  )}
                >
                  <CalendarClock className="size-3.5 mr-1" />
                  Schedule
                </Button>
              </div>

              {publishMode === 'schedule' && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold">Choose Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <Button
                className="w-full h-10 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
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
                {publishMode === 'schedule' ? 'Schedule Post' : 'Publish to Channels'}
              </Button>

              <Button
                variant="outline"
                className="w-full h-9 text-xs font-semibold rounded-xl"
                disabled={isSaving}
                onClick={() => submitPost('draft')}
              >
                <Save className="size-3.5 mr-1" />
                Save as Draft
              </Button>
            </CardContent>
          </Card>

          {/* ─── LIVE PREVIEW MOCKUP (Matches Screenshot 2: Bloom & Co. split card) ─── */}
          <Card className="border-border shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Live Preview Mockup
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                  {selectedPlatforms[0] || 'Omnichannel'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Profile Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-9 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {displayBrandName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {displayBrandName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {publishMode === 'schedule' && scheduledAt
                        ? `Scheduled for ${new Date(scheduledAt).toLocaleDateString()}`
                        : 'Just now • Public'}
                    </p>
                  </div>
                </div>
                <Share2 className="size-4 text-muted-foreground/60" />
              </div>

              {/* ─── FORMAT-BASED PREVIEWS ─── */}

              {/* 1. Bloom & Co. Style Split Card (Format: image_text) */}
              {postFormat === 'image_text' && (
                <div className="rounded-2xl overflow-hidden border border-border shadow-xs bg-[#FBF9F5] dark:bg-zinc-900 grid grid-cols-1 sm:grid-cols-2">
                  {/* Left Side: Photo */}
                  <div className="relative aspect-square sm:aspect-auto min-h-[180px] bg-muted overflow-hidden">
                    {mediaUrls.length > 0 ? (
                      <img
                        src={mediaUrls[0]}
                        alt="Post media preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-primary/10 via-amber-500/10 to-muted">
                        <ImageIcon className="size-8 text-muted-foreground/50 mb-1.5" />
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Attach business photo
                        </span>
                        <span className="text-[9px] text-muted-foreground/70">
                          Renders side-by-side with your brand message
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Editorial Branded Card */}
                  <div className="p-4 flex flex-col justify-between space-y-3 bg-[#FBF9F5] dark:bg-zinc-900 border-t sm:border-t-0 sm:border-l border-border/60">
                    <div className="space-y-2">
                      {/* Logo / Header */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          🌿 {displayBrandName}
                        </span>
                      </div>
                      <div className="w-8 h-[1.5px] bg-foreground/30" />

                      {/* Serif Editorial Headline */}
                      <h4 className="text-sm sm:text-base font-serif font-bold text-foreground leading-snug">
                        {brandHeadline || 'A little self-care goes a long way.'}
                      </h4>

                      {/* Subtitle / Description */}
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                        {brandSubtitle ||
                          'Refresh your look with a personalised consultation. Book your next visit with our expert team.'}
                      </p>
                    </div>

                    {/* Action Buttons Mockup */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <div className="flex-1 py-1 rounded-md border border-border text-[10px] font-semibold text-center text-foreground flex items-center justify-center gap-1">
                        <Pencil className="size-2.5" /> Edit
                      </div>
                      <div className="flex-1 py-1 rounded-md bg-emerald-600 text-[10px] font-bold text-center text-white flex items-center justify-center gap-1 shadow-2xs">
                        <CalendarClock className="size-2.5" /> Schedule
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Video Post Preview */}
              {postFormat === 'video' && (
                <div className="rounded-xl overflow-hidden border border-border bg-black relative aspect-video flex items-center justify-center">
                  {mediaUrls.length > 0 && mediaUrls[0].match(/\.(mp4|mov|webm|m4v)/i) ? (
                    <video
                      src={mediaUrls[0]}
                      controls
                      className="size-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <div className="size-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white">
                        <Play className="size-6" />
                      </div>
                      <p className="text-xs font-semibold text-white">
                        Upload video clip to preview reel
                      </p>
                      <p className="text-[10px] text-white/60">
                        Plays natively on Instagram Reels & Facebook Watch
                      </p>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                    <Video className="size-3" /> Reel
                  </span>
                </div>
              )}

              {/* 3. Image Only Preview */}
              {postFormat === 'image_only' && (
                <div className="rounded-xl overflow-hidden border border-border bg-muted relative aspect-square">
                  {mediaUrls.length > 0 ? (
                    <img
                      src={mediaUrls[0]}
                      alt="Full bleed preview"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center p-4 text-center">
                      <ImageIcon className="size-8 text-muted-foreground/50 mb-1" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        Upload high-res photo
                      </span>
                    </div>
                  )}
                  {mediaUrls.length > 1 && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      +{mediaUrls.length - 1} more
                    </span>
                  )}
                </div>
              )}

              {/* Caption Preview */}
              <div className="text-xs text-foreground space-y-1">
                <p className="whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {content || (
                    <span className="italic text-muted-foreground">
                      Caption text will appear here. Write above or generate with AI…
                    </span>
                  )}
                </p>
                {linkUrl && (
                  <p className="text-[11px] text-primary underline truncate font-medium">
                    {linkUrl}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PostComposerView;
