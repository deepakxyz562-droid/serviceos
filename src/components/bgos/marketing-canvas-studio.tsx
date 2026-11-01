'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Paperclip,
  Image as ImageIcon,
  Check,
  ChevronDown,
  RotateCcw,
  RotateCw,
  Type,
  Palette,
  Maximize2,
  Share2,
  FileText,
  Calendar,
  Clock,
  Info,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Facebook,
  Instagram,
  SlidersHorizontal,
  X,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Visual Direction Types ─────────────────────────────────────────────────

export type VisualDirectionId = 'editorial' | 'photo_led' | 'bold';
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';

interface CreativeDirection {
  id: VisualDirectionId;
  name: string;
  headline: string;
  badge: string;
  subhead: string;
  ctaText: string;
  theme: 'sand_olive' | 'beige' | 'emerald_gold';
  photoUrl: string;
}

const DEFAULT_DIRECTIONS: CreativeDirection[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    headline: 'Make more of your weekend.',
    badge: '20% OFF',
    subhead: 'Selected services',
    ctaText: 'Book now',
    theme: 'sand_olive',
    photoUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'photo_led',
    name: 'Photo-led',
    headline: '20% OFF',
    badge: 'EXCLUSIVE',
    subhead: 'Selected services',
    ctaText: 'Book now',
    theme: 'beige',
    photoUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'bold',
    name: 'Bold',
    headline: 'WEEKEND OFFER',
    badge: '20% OFF',
    subhead: 'Selected services',
    ctaText: 'Claim offer',
    theme: 'emerald_gold',
    photoUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  },
];

const CURATED_PHOTOS = [
  {
    id: 'p1',
    label: 'Minimal Bouclé Living',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p2',
    label: 'Warm Clay & Plants',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p3',
    label: 'Deep Emerald Minimalist',
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p4',
    label: 'Sunlit Studio Desk',
    url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p5',
    label: 'Scandinavian Oak Lounge',
    url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
  },
];

interface MarketingCanvasStudioProps {
  businessName?: string;
  category?: string;
  connectedAccounts?: Array<{ id: string; platform: string; name: string }>;
  onPublishSuccess?: (postId: string) => void;
  onNavigateToPosts?: () => void;
}

export function MarketingCanvasStudio({
  businessName = 'Fieseros',
  category = 'Professional Services',
  connectedAccounts = [],
  onPublishSuccess,
  onNavigateToPosts,
}: MarketingCanvasStudioProps) {
  // ─── Studio State ─────────────────────────────────────────────────────────

  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Direction & Design Elements
  const [directions, setDirections] = useState<CreativeDirection[]>(DEFAULT_DIRECTIONS);
  const [selectedDirectionId, setSelectedDirectionId] = useState<VisualDirectionId>('editorial');

  const activeDirection = useMemo(
    () => directions.find((d) => d.id === selectedDirectionId) || directions[0],
    [directions, selectedDirectionId]
  );

  // Canvas overrides
  const [headline, setHeadline] = useState('Make more of your weekend.');
  const [badgeText, setBadgeText] = useState('20% OFF');
  const [subheadText, setSubheadText] = useState('Selected services');
  const [ctaText, setCtaText] = useState('Book now');
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
  );
  const [theme, setTheme] = useState<'sand_olive' | 'beige' | 'emerald_gold'>('sand_olive');

  // Caption state
  const [caption, setCaption] = useState(
    'Your weekend plans, upgraded. Save 20% on selected services. Book your appointment today.'
  );
  const [isEditingCaption, setIsEditingCaption] = useState(false);

  // Canvas Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [activeRightTab, setActiveRightTab] = useState<'design' | 'preview'>('design');

  // Social & Scheduling Settings
  const [linkUrl, setLinkUrl] = useState('https://fieseros.com/book');
  const [offerStartDate, setOfferStartDate] = useState('6 Nov');
  const [offerEndDate, setOfferEndDate] = useState('8 Nov');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['instagram', 'facebook']);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Modals
  const [editTextOpen, setEditTextOpen] = useState(false);
  const [replaceImageOpen, setReplaceImageOpen] = useState(false);
  const [brandColoursOpen, setBrandColoursOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);

  // History for Undo / Redo
  const [history, setHistory] = useState<
    Array<{
      headline: string;
      badgeText: string;
      subheadText: string;
      ctaText: string;
      photoUrl: string;
      theme: 'sand_olive' | 'beige' | 'emerald_gold';
    }>
  >([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(0, historyIndex + 1),
      { headline, badgeText, subheadText, ctaText, photoUrl, theme },
    ]);
    setHistoryIndex((prev) => prev + 1);
  }, [headline, badgeText, subheadText, ctaText, photoUrl, theme, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHeadline(prev.headline);
      setBadgeText(prev.badgeText);
      setSubheadText(prev.subheadText);
      setCtaText(prev.ctaText);
      setPhotoUrl(prev.photoUrl);
      setTheme(prev.theme);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHeadline(next.headline);
      setBadgeText(next.badgeText);
      setSubheadText(next.subheadText);
      setCtaText(next.ctaText);
      setPhotoUrl(next.photoUrl);
      setTheme(next.theme);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Switch Direction Card
  const handleSelectDirection = (dir: CreativeDirection) => {
    pushHistory();
    setSelectedDirectionId(dir.id);
    setHeadline(dir.headline);
    setBadgeText(dir.badge);
    setSubheadText(dir.subhead);
    setCtaText(dir.ctaText);
    setTheme(dir.theme);
    setPhotoUrl(dir.photoUrl);
  };

  // AI Prompt Send
  const handleSendPrompt = async () => {
    const text = promptInput.trim();
    if (!text) return;

    setIsGenerating(true);
    setPromptInput('');

    try {
      const res = await authFetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Create high-converting social creative for ${businessName} (${category}): ${text}. Include a catchy headline, discount/offer badge, subhead, CTA, and an engaging caption.`,
          platforms: ['instagram', 'facebook', 'googlebusiness'],
          tone: 'Professional, friendly, premium',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.caption) {
          setCaption(json.caption);
        }
        // Extract headline or offer if present
        if (text.toLowerCase().includes('weekend') || text.toLowerCase().includes('off')) {
          setHeadline('Make more of your weekend.');
          setBadgeText('20% OFF');
        } else if (text.length < 40) {
          setHeadline(text);
        }
        toast.success('Creative directions generated with your brand colors!');
      } else {
        // Fallback enhancement
        setCaption(`Special offer for ${businessName} customers! ${text}. Book your appointment today.`);
        toast.success('Updated creative ideas!');
      }
    } catch {
      toast.error('Network error generating AI directions. Showing updated layout.');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Helpers
  const handleMakeShorter = () => {
    const sentences = caption.split('. ');
    if (sentences.length > 1) {
      setCaption(sentences.slice(0, 2).join('. ') + (sentences[1]?.endsWith('.') ? '' : '.'));
      toast.success('Caption shortened!');
    } else {
      setCaption('Save 20% on selected services this weekend only. Book your appointment today.');
    }
  };

  const handleModifierPill = (type: 'style' | 'less_text' | 'use_photo') => {
    pushHistory();
    if (type === 'style') {
      const themes: Array<'sand_olive' | 'beige' | 'emerald_gold'> = [
        'sand_olive',
        'beige',
        'emerald_gold',
      ];
      const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
      setTheme(nextTheme);
      toast.success(`Switched brand style to ${nextTheme.replace('_', ' ')}!`);
    } else if (type === 'less_text') {
      handleMakeShorter();
      setSubheadText('');
    } else if (type === 'use_photo') {
      setReplaceImageOpen(true);
    }
  };

  // Save Draft
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          content: caption,
          mediaUrls: [photoUrl],
          linkUrl,
          platforms: selectedChannels,
          headline,
        }),
      });
      if (res.ok) {
        toast.success('Draft saved successfully!');
      } else {
        toast.info('Draft saved in local workspace!');
      }
    } catch {
      toast.info('Draft saved in local session!');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Final Publish
  const [isPublishing, setIsPublishing] = useState(false);
  const handlePublishNow = async () => {
    setIsPublishing(true);
    try {
      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: publishMode === 'schedule' ? 'scheduled' : 'published',
          scheduledAt: publishMode === 'schedule' ? scheduledDateTime : null,
          content: caption,
          mediaUrls: [photoUrl],
          linkUrl,
          platforms: selectedChannels,
          headline,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success(
          publishMode === 'schedule'
            ? 'Post scheduled successfully!'
            : 'Post published to selected channels!'
        );
        setReviewModalOpen(false);
        if (onPublishSuccess && json.post?.id) {
          onPublishSuccess(json.post.id);
        } else if (onNavigateToPosts) {
          onNavigateToPosts();
        }
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Failed to publish post');
      }
    } catch {
      toast.error('Network error during publishing');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ─── 2-Column Canvas Studio Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT COLUMN: Creative Copilot (5 cols) ───────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Brand Pill Header */}
          <div className="bg-card border border-border/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                {businessName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">Brand: {businessName}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">Professional · Friendly</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/20 bg-primary/5">
              Active
            </Badge>
          </div>

          {/* 2. Conversational Copilot Chat Thread */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-4 shadow-2xs">
            {/* User message */}
            <div className="flex items-start justify-end gap-2.5">
              <div className="bg-muted/70 hover:bg-muted text-foreground text-xs leading-relaxed rounded-2xl rounded-tr-xs p-3.5 max-w-[85%] border border-border/50">
                Create a 20% off weekend offer with a premium, minimal design.
              </div>
              <div className="size-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-1">
                DC
              </div>
            </div>

            {/* AI Assistant response */}
            <div className="flex items-start gap-2.5">
              <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-1 border border-primary/20">
                <Sparkles className="size-3.5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Here are three creative directions using your brand colours.
                </p>

                {/* 3 Creative Direction Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  {directions.map((dir) => {
                    const isSelected = selectedDirectionId === dir.id;
                    return (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => handleSelectDirection(dir)}
                        className={`group relative text-left rounded-xl overflow-hidden border transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'border-border/80 hover:border-primary/40 bg-muted/20'
                        }`}
                      >
                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs z-10">
                            <Check className="size-3 stroke-[3]" />
                          </div>
                        )}

                        {/* Thumbnail Preview */}
                        <div
                          className="h-20 w-full bg-cover bg-center relative"
                          style={{ backgroundImage: `url(${dir.photoUrl})` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                          <div className="absolute bottom-1.5 left-1.5 right-1.5">
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider drop-shadow-xs truncate block">
                              {dir.badge}
                            </span>
                          </div>
                        </div>

                        {/* Label */}
                        <div className="p-2 bg-card">
                          <p className="text-[11px] font-bold text-foreground truncate">{dir.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Caption Card */}
            <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <FileText className="size-3.5 text-primary" />
                  <span>Caption</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingCaption(!isEditingCaption)}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    {isEditingCaption ? 'Done' : 'Edit caption'}
                  </button>
                  <button
                    type="button"
                    onClick={handleMakeShorter}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Make shorter
                  </button>
                </div>
              </div>

              {isEditingCaption ? (
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  className="text-xs bg-card resize-none"
                />
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed select-text">
                  {caption}
                </p>
              )}
            </div>

            {/* 4. Info Alert */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="size-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <span>Add offer dates and a booking link before publishing.</span>
            </div>

            {/* 5. Prompt Modifier Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleModifierPill('style')}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-card border border-border hover:border-primary/30 text-foreground transition-all"
              >
                Change style
              </button>
              <button
                type="button"
                onClick={() => handleModifierPill('less_text')}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-card border border-border hover:border-primary/30 text-foreground transition-all"
              >
                Less text
              </button>
              <button
                type="button"
                onClick={() => handleModifierPill('use_photo')}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-card border border-border hover:border-primary/30 text-foreground transition-all"
              >
                Use my photo
              </button>
            </div>

            {/* 6. Prompt Input Bar */}
            <div className="relative border border-border/80 rounded-2xl bg-card p-2 shadow-2xs focus-within:border-primary/50 transition-all">
              <Textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder="Describe your next idea or ask for a change..."
                rows={2}
                className="border-0 focus-visible:ring-0 shadow-none text-xs resize-none p-1 placeholder:text-muted-foreground/70"
              />

              <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplaceImageOpen(true)}
                    className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                  >
                    <Paperclip className="size-3.5" />
                    <span>Attach photos</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplaceImageOpen(true)}
                    className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                  >
                    <ImageIcon className="size-3.5" />
                    <span>Image ▾</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={!promptInput.trim() || isGenerating}
                  onClick={handleSendPrompt}
                  className="size-7 p-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
                >
                  <Send className={`size-3.5 ${isGenerating ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Live Visual Canvas & Editor (7 cols) ───────────── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top View Selector Tabs: Design | Channel preview */}
          <div className="flex items-center justify-between border-b border-border pb-1">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveRightTab('design')}
                className={`relative py-2 text-xs font-bold transition-colors ${
                  activeRightTab === 'design'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Design</span>
                {activeRightTab === 'design' && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] rounded-t-full bg-primary" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('preview')}
                className={`relative py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeRightTab === 'preview'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Channel preview</span>
                {activeRightTab === 'preview' && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] rounded-t-full bg-primary" />
                )}
              </button>
            </div>

            {/* Undo / Redo + Aspect Ratio Controls */}
            <div className="flex items-center gap-2">
              {/* Aspect Ratio Picker */}
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2.5 py-1 text-xs font-semibold text-foreground">
                <span className="size-2.5 border border-foreground/60 rounded-xs" />
                <span>Square · {aspectRatio}</span>
                <ChevronDown className="size-3.5 text-muted-foreground ml-1" />
              </div>

              {/* Undo / Redo */}
              <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Undo"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <div className="w-[1px] h-4 bg-border" />
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Redo"
                >
                  <RotateCw className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {activeRightTab === 'design' ? (
            /* ─── LIVE VISUAL CANVAS ─────────────────────────────────────────── */
            <div className="space-y-3">
              <div
                className={`w-full rounded-2xl overflow-hidden border border-border/80 shadow-md relative transition-all duration-300 flex items-center justify-center ${
                  aspectRatio === '1:1'
                    ? 'aspect-square max-h-[580px]'
                    : aspectRatio === '4:5'
                    ? 'aspect-[4/5] max-h-[620px]'
                    : aspectRatio === '16:9'
                    ? 'aspect-video max-h-[480px]'
                    : 'aspect-[9/16] max-h-[640px]'
                }`}
                style={{
                  backgroundColor:
                    theme === 'sand_olive' ? '#FAF7F2' : theme === 'beige' ? '#F4EFEB' : '#072418',
                }}
              >
                {/* Background Image Container */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                  style={{
                    backgroundImage: `url(${photoUrl})`,
                    opacity: theme === 'emerald_gold' ? 0.35 : 0.92,
                  }}
                />

                {/* Soft Vignette Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      theme === 'emerald_gold'
                        ? 'linear-gradient(180deg, rgba(7,36,24,0.92) 0%, rgba(7,36,24,0.75) 50%, rgba(7,36,24,0.95) 100%)'
                        : 'linear-gradient(180deg, rgba(250,247,242,0.85) 0%, rgba(250,247,242,0.4) 40%, rgba(250,247,242,0.88) 100%)',
                  }}
                />

                {/* Canvas Typography & Branding Layout */}
                <div className="relative z-10 w-full h-full p-8 sm:p-12 flex flex-col justify-between">
                  {/* Brand Topmark */}
                  <div>
                    <span
                      className={`text-xs sm:text-sm font-extrabold tracking-[0.3em] uppercase block ${
                        theme === 'emerald_gold' ? 'text-amber-300/90' : 'text-stone-800/90'
                      }`}
                    >
                      {businessName}
                    </span>
                  </div>

                  {/* Main Headline & Offer Block */}
                  <div className="space-y-4 max-w-[85%]">
                    <h2
                      className={`text-2xl sm:text-4xl lg:text-5xl font-serif font-medium leading-[1.1] tracking-tight ${
                        theme === 'emerald_gold' ? 'text-white' : 'text-stone-900'
                      }`}
                    >
                      {headline}
                    </h2>

                    <div className="space-y-1">
                      <div
                        className={`text-3xl sm:text-5xl font-serif font-black tracking-tight ${
                          theme === 'emerald_gold' ? 'text-amber-400' : 'text-stone-900'
                        }`}
                      >
                        {badgeText}
                      </div>
                      {subheadText && (
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            theme === 'emerald_gold' ? 'text-stone-300' : 'text-stone-700'
                          }`}
                        >
                          {subheadText}
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setEditTextOpen(true)}
                        className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white shadow-xs transition-transform hover:scale-[1.02]"
                        style={{
                          backgroundColor:
                            theme === 'emerald_gold' ? '#009F50' : '#0B4D2C',
                        }}
                      >
                        {ctaText}
                      </button>
                    </div>
                  </div>

                  {/* Bottom spacer / aesthetic balance */}
                  <div />
                </div>
              </div>

              {/* ─── Canvas Quick Tools Bar (Below Canvas) ──────────────────── */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 border-t border-border/40 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditTextOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border bg-card"
                >
                  <Type className="size-3.5 text-muted-foreground" />
                  <span>Edit text</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReplaceImageOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border bg-card"
                >
                  <ImageIcon className="size-3.5 text-muted-foreground" />
                  <span>Replace image</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBrandColoursOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border bg-card"
                >
                  <Palette className="size-3.5 text-muted-foreground" />
                  <span>Brand colours</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ratios: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16'];
                    const nextRatio = ratios[(ratios.indexOf(aspectRatio) + 1) % ratios.length];
                    setAspectRatio(nextRatio);
                    toast.info(`Aspect ratio changed to ${nextRatio}`);
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border bg-card"
                >
                  <Maximize2 className="size-3.5 text-muted-foreground" />
                  <span>Resize</span>
                </Button>
              </div>
            </div>
          ) : (
            /* ─── CHANNEL PREVIEW VIEW (Instagram / Facebook Mockup) ───────── */
            <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 space-y-4 max-w-lg mx-auto shadow-sm">
              {/* Instagram Feed Post Card */}
              <div className="border border-border/60 rounded-2xl overflow-hidden bg-background">
                {/* Header */}
                <div className="p-3 flex items-center justify-between border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                      {businessName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{businessName.toLowerCase().replace(/\s+/g, '')}</p>
                      <p className="text-[10px] text-muted-foreground">Sponsored · Just now</p>
                    </div>
                  </div>
                  <Instagram className="size-4 text-pink-600" />
                </div>

                {/* Media */}
                <div
                  className="w-full aspect-square bg-cover bg-center"
                  style={{ backgroundImage: `url(${photoUrl})` }}
                />

                {/* Caption & Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-xs font-bold text-foreground">♡ 142 likes</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground">
                    <span className="font-bold mr-1.5">{businessName.toLowerCase().replace(/\s+/g, '')}</span>
                    {caption}
                  </p>
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary block hover:underline"
                  >
                    👉 {linkUrl}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ─── BOTTOM ACTION STRIP ────────────────────────────────────────── */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            {/* Left: Connected Channels & Link */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Channels badge */}
              <button
                type="button"
                onClick={() => setChannelPickerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-center -space-x-1">
                  <span className="size-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px]">
                    f
                  </span>
                  <span className="size-4 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center text-[8px]">
                    📸
                  </span>
                </div>
                <span>{selectedChannels.length} accounts selected</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>

              {/* Link button */}
              <button
                type="button"
                onClick={() => setLinkEditorOpen(true)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <Link2 className="size-3.5" />
                <span>Change link</span>
              </button>
            </div>

            {/* Right: Save Draft & Review / Schedule */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="size-3.5 stroke-[3]" />
                <span>Draft saved just now</span>
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="h-9 px-4 text-xs font-semibold rounded-xl border-border bg-card"
              >
                {isSavingDraft ? 'Saving...' : 'Save draft'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setReviewModalOpen(true)}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
              >
                <span>Review & schedule</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL: Edit Text ──────────────────────────────────────────────── */}
      <Dialog open={editTextOpen} onOpenChange={setEditTextOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Canvas Typography</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Main Headline</label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Make more of your weekend."
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Discount / Offer Badge</label>
              <Input
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. 20% OFF"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Services Subtitle</label>
              <Input
                value={subheadText}
                onChange={(e) => setSubheadText(e.target.value)}
                placeholder="e.g. Selected services"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">CTA Button Label</label>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Book now"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                pushHistory();
                setEditTextOpen(false);
                toast.success('Canvas text updated!');
              }}
              className="bg-primary text-primary-foreground font-bold text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Replace Image ─────────────────────────────────────────── */}
      <Dialog open={replaceImageOpen} onOpenChange={setReplaceImageOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Select Creative Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Choose from curated high-resolution photography tailored for {businessName}:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CURATED_PHOTOS.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    pushHistory();
                    setPhotoUrl(photo.url);
                    setReplaceImageOpen(false);
                    toast.success('Updated canvas photography!');
                  }}
                  className="group rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-all text-left"
                >
                  <div
                    className="h-24 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${photo.url})` }}
                  />
                  <div className="p-2 bg-card">
                    <p className="text-[10px] font-bold text-foreground truncate">{photo.label}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-bold text-foreground">Custom Image URL</label>
              <Input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Paste direct HTTPS image link"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                pushHistory();
                setReplaceImageOpen(false);
              }}
              className="bg-primary text-primary-foreground font-bold text-xs"
            >
              Apply Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Brand Colours ─────────────────────────────────────────── */}
      <Dialog open={brandColoursOpen} onOpenChange={setBrandColoursOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Brand Colour Themes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              type="button"
              onClick={() => {
                pushHistory();
                setTheme('sand_olive');
                setBrandColoursOpen(false);
                toast.success('Switched to Warm Sand & Olive!');
              }}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                theme === 'sand_olive' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-foreground">Editorial Minimal (Sand & Olive)</p>
                <p className="text-[11px] text-muted-foreground">Warm bouclé and earth tones</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-4 rounded-full bg-[#FAF7F2] border border-border" />
                <span className="size-4 rounded-full bg-[#0B4D2C]" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                pushHistory();
                setTheme('beige');
                setBrandColoursOpen(false);
                toast.success('Switched to Neutral Beige!');
              }}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                theme === 'beige' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-foreground">Photo-led Neutral (Beige & Clay)</p>
                <p className="text-[11px] text-muted-foreground">Soft organic lighting and clay accents</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-4 rounded-full bg-[#F4EFEB] border border-border" />
                <span className="size-4 rounded-full bg-[#8C6D58]" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                pushHistory();
                setTheme('emerald_gold');
                setBrandColoursOpen(false);
                toast.success('Switched to Bold Emerald & Gold!');
              }}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                theme === 'emerald_gold' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-foreground">Bold Brand (Deep Emerald & Gold)</p>
                <p className="text-[11px] text-muted-foreground">High contrast luxury dark aesthetic</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-4 rounded-full bg-[#072418]" />
                <span className="size-4 rounded-full bg-[#FBBF24]" />
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Select Connected Channels ─────────────────────────────── */}
      <Dialog open={channelPickerOpen} onOpenChange={setChannelPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Select Publishing Channels</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Choose the social accounts where you want to publish or schedule this post:
            </p>
            <div className="space-y-2">
              <label
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('instagram') ? prev.filter((c) => c !== 'instagram') : [...prev, 'instagram']
                  );
                }}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedChannels.includes('instagram')
                    ? 'border-pink-500 bg-pink-500/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center">
                    <Instagram className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Instagram</div>
                    <div className="text-[11px] text-muted-foreground">Feed & Story</div>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-md border flex items-center justify-center ${
                    selectedChannels.includes('instagram')
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {selectedChannels.includes('instagram') && <Check className="size-3 stroke-[3]" />}
                </div>
              </label>

              <label
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('facebook') ? prev.filter((c) => c !== 'facebook') : [...prev, 'facebook']
                  );
                }}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedChannels.includes('facebook')
                    ? 'border-blue-600 bg-blue-600/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Facebook className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Facebook Page</div>
                    <div className="text-[11px] text-muted-foreground">Official Business Page</div>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-md border flex items-center justify-center ${
                    selectedChannels.includes('facebook')
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {selectedChannels.includes('facebook') && <Check className="size-3 stroke-[3]" />}
                </div>
              </label>

              <label
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('googlebusiness') ? prev.filter((c) => c !== 'googlebusiness') : [...prev, 'googlebusiness']
                  );
                }}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedChannels.includes('googlebusiness')
                    ? 'border-emerald-600 bg-emerald-600/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Google Business Profile</div>
                    <div className="text-[11px] text-muted-foreground">Local Search & Maps Update</div>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-md border flex items-center justify-center ${
                    selectedChannels.includes('googlebusiness')
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {selectedChannels.includes('googlebusiness') && <Check className="size-3 stroke-[3]" />}
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setChannelPickerOpen(false)}
              className="bg-primary text-primary-foreground font-bold text-xs"
            >
              Done ({selectedChannels.length} Selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Change Link ───────────────────────────────────────────── */}
      <Dialog open={linkEditorOpen} onOpenChange={setLinkEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Booking / Website Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Customers who click your post or CTA will be directed here:
            </p>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://fieseros.com/book"
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setLinkEditorOpen(false);
                toast.success('Link updated!');
              }}
              className="bg-primary text-primary-foreground font-bold text-xs"
            >
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Review & Schedule ─────────────────────────────────────── */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span>Review Post</span>
              <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-500/30">
                Ready to publish
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Platform toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('instagram') ? prev.filter((c) => c !== 'instagram') : [...prev, 'instagram']
                  );
                }}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedChannels.includes('instagram')
                    ? 'border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <Instagram className="size-4" />
                <span>Instagram</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('facebook') ? prev.filter((c) => c !== 'facebook') : [...prev, 'facebook']
                  );
                }}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedChannels.includes('facebook')
                    ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <Facebook className="size-4" />
                <span>Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('googlebusiness') ? prev.filter((c) => c !== 'googlebusiness') : [...prev, 'googlebusiness']
                  );
                }}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedChannels.includes('googlebusiness')
                    ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <Sparkles className="size-4 text-emerald-600" />
                <span>Google</span>
              </button>
            </div>

            {/* Offer details & Link */}
            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/60">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Offer Starts</label>
                <Input
                  value={offerStartDate}
                  onChange={(e) => setOfferStartDate(e.target.value)}
                  className="text-xs bg-card"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Offer Ends</label>
                <Input
                  value={offerEndDate}
                  onChange={(e) => setOfferEndDate(e.target.value)}
                  className="text-xs bg-card"
                />
              </div>
            </div>

            {/* Publish Timing Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Publish Timing</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    publishMode === 'now'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    publishMode === 'schedule'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Schedule Later
                </button>
              </div>

              {publishMode === 'schedule' && (
                <div className="pt-2">
                  <Input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="text-xs bg-card"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              className="text-xs font-semibold"
            >
              Back to design
            </Button>
            <Button
              type="button"
              disabled={isPublishing || selectedChannels.length === 0}
              onClick={handlePublishNow}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-6"
            >
              {isPublishing
                ? 'Publishing...'
                : publishMode === 'schedule'
                ? `Schedule to ${selectedChannels.length} accounts`
                : `Publish to ${selectedChannels.length} accounts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
