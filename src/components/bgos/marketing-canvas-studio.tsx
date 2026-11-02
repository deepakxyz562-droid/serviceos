'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createDesign, validateDesign, createFieserosCampaignDesign, type MarketingDesign, type DesignLayer } from '../../../shared/marketing-design';
import { EditableMarketingDesign } from './editable-marketing-design';
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
  Copy,
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
  Upload,
  Download,
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
    category: 'interior',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p2',
    label: 'Warm Clay & Plants',
    category: 'interior',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p3',
    label: 'Deep Emerald Minimalist',
    category: 'luxury',
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p4',
    label: 'Sunlit Studio Desk',
    category: 'interior',
    url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p5',
    label: 'Salon & Spa Treatment',
    category: 'salon',
    url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p6',
    label: 'Artisanal Cafe & Dining',
    category: 'food',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p7',
    label: 'Luxury Auto & Detailing',
    category: 'auto',
    url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p8',
    label: 'Modern Home & Craft',
    category: 'service',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p9',
    label: 'Wellness & Fitness Studio',
    category: 'wellness',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
  },
];

interface MarketingCanvasStudioProps {
  businessName?: string;
  category?: string;
  activeProfileId?: string;
  connectedAccounts?: Array<{ id: string; platform: string; name: string; accountId?: string }>;
  onPublishSuccess?: (postId: string) => void;
  onNavigateToPosts?: () => void;
}

const DEFAULT_CAPTION = `Switching between customer calls, job diaries, quote calculators, and messaging apps eats away the hours you should be spending on the tools or growing your business.

Meet the Fieseros AI Assistant—turning natural conversation into connected field service workflows.

Just say: “Schedule a boiler repair for Sarah tomorrow, assign Mike, create a £350 quote, and prepare her confirmation.”

In seconds, Fieseros maps the customer, books the job, drafts the quote, and queues her confirmation for your review. Less repetitive admin, zero lost paperwork, and more time to focus on your customers and high-value jobs.

Discover what Fieseros can do for your business: https://fieseros.com

#Fieseros #FieldServiceManagement #TradeBusiness #HVAC #Plumbing`;

const DEFAULT_ALT_HEADLINES = [
  'From one instruction to a connected workflow.',
  'Run your field service business in plain English.',
  'Stop juggling apps. Just tell your assistant.',
];

export function MarketingCanvasStudio({
  businessName = 'Fieseros',
  category = 'Professional Services',
  activeProfileId,
  connectedAccounts = [],
  onPublishSuccess,
  onNavigateToPosts,
}: MarketingCanvasStudioProps) {
  // ─── Studio State ─────────────────────────────────────────────────────────

  const [promptInput, setPromptInput] = useState('');
  const [activeUserPrompt, setActiveUserPrompt] = useState(
    'Create a professional social media marketing post promoting the Fieseros AI Assistant for field service businesses (plumbing, HVAC, electrical, cleaning, landscaping).'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStage, setGeneratingStage] = useState<string>('');
  const [generationMode, setGenerationMode] = useState<'poster' | 'graphic' | 'image_only'>('poster');
  const [activeVisualFormat, setActiveVisualFormat] = useState<'poster' | 'canvas'>('poster');
  const [posterUrl, setPosterUrl] = useState<string>('/images/fieseros-ai-assistant-poster.jpg?v=1');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; category?: string; chipLabel?: string; icon?: string; title?: string; prompt: string }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [alternativeHeadlines, setAlternativeHeadlines] = useState<string[]>(DEFAULT_ALT_HEADLINES);

  // Active Direction & Design Elements
  const [directions, setDirections] = useState<CreativeDirection[]>(DEFAULT_DIRECTIONS);
  const [selectedDirectionId, setSelectedDirectionId] = useState<VisualDirectionId>('bold');

  const activeDirection = useMemo(
    () => directions.find((d) => d.id === selectedDirectionId) || directions[0],
    [directions, selectedDirectionId]
  );

  // Canvas overrides — initialized for Fieseros AI Assistant campaign
  const [headline, setHeadline] = useState('Less admin. More jobs.');
  const [badgeText, setBadgeText] = useState('AI WORKFLOW');
  const [subheadText, setSubheadText] = useState('Meet your Fieseros AI Assistant.');
  const [ctaText, setCtaText] = useState('Explore Fieseros');
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
  );
  const [theme, setTheme] = useState<'sand_olive' | 'beige' | 'emerald_gold'>('emerald_gold');

  // Caption state
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  const [isEditingCaption, setIsEditingCaption] = useState(false);

  // Canvas Settings — 4:5 Portrait default
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5');
  const [activeRightTab, setActiveRightTab] = useState<'design' | 'preview'>('design');

  // Social & Scheduling Settings — Default to Google Business + Instagram + Facebook
  const [linkUrl, setLinkUrl] = useState('https://fieseros.com');
  const [offerStartDate, setOfferStartDate] = useState('6 Nov');
  const [offerEndDate, setOfferEndDate] = useState('8 Nov');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['googlebusiness', 'instagram', 'facebook']);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Auto-sync selectedChannels with connected accounts
  useEffect(() => {
    if (connectedAccounts && connectedAccounts.length > 0) {
      const activePlatforms = Array.from(
        new Set(
          connectedAccounts.map((a) =>
            a.platform === 'gbp' || a.platform === 'google_business' || a.platform === 'google'
              ? 'googlebusiness'
              : a.platform
          )
        )
      );
      if (activePlatforms.length > 0) {
        setSelectedChannels((prev) => {
          const valid = prev.filter((p) => activePlatforms.includes(p));
          const withGbp = activePlatforms.includes('googlebusiness') && !valid.includes('googlebusiness')
            ? ['googlebusiness', ...valid]
            : valid;
          return withGbp.length > 0 ? withGbp : [activePlatforms[0]];
        });
      }
    }
  }, [connectedAccounts]);

  const isPlatformConnected = useCallback(
    (platform: string) =>
      connectedAccounts.some((a) => {
        if (a.platform === platform) return true;
        if (platform === 'googlebusiness' && (a.platform === 'gbp' || a.platform === 'google_business' || a.platform === 'google')) {
          return true;
        }
        return false;
      }),
    [connectedAccounts]
  );

  const [customDesign, setCustomDesign] = useState<MarketingDesign | null>(() => createFieserosCampaignDesign());
  const design = customDesign || createDesign({ brand: businessName, headline, subtitle: subheadText, badge: badgeText, cta: ctaText, photo: photoUrl, ratio: aspectRatio });

  const [designDrafts, setDesignDrafts] = useState<Array<{ id: string; content: string; designJson?: string; mediaUrls?: string[]; updatedAt: string }>>([]);
  const [draftRevision, setDraftRevision] = useState<string | null>(null);
  const savedDesignSnapshot = useRef('');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftPage, setDraftPage] = useState(1);
  const [moreDrafts, setMoreDrafts] = useState(false);
  const loadDesignDrafts = async (page = 1) => {
    try {
      const res = await authFetch(`/api/social/posts?status=draft&limit=20&page=${page}`);
      if (!res.ok) throw new Error('Load failed');
      const json = await res.json();
      const rows = (json.data || []).filter((p: { designJson?: string; mediaUrls?: string[] }) => p.designJson || (Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0));
      setDesignDrafts((previous) => (page === 1 ? rows : [...previous, ...rows]));
      setDraftPage(page);
      setMoreDrafts((json.data || []).length === 20);
    } catch {
      toast.error('Could not load saved designs');
    }
  };

  const fetchSuggestions = useCallback(async (refresh = false) => {
    setLoadingSuggestions(true);
    try {
      const params = new URLSearchParams();
      if (refresh) params.set('refresh', '1');
      if (activeProfileId) params.set('profileId', activeProfileId);
      if (businessName) params.set('businessName', businessName);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await authFetch(`/api/social/prompts/suggestions${query}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingSuggestions(false);
    }
  }, [activeProfileId, businessName]);

  useEffect(() => {
    void fetchSuggestions(false);
  }, [fetchSuggestions]);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPosterUrl(result);
        setActiveVisualFormat('poster');
        toast.success('Custom promotional graphic uploaded!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Modals
  const [editTextOpen, setEditTextOpen] = useState(false);
  const [replaceImageOpen, setReplaceImageOpen] = useState(false);
  const [photoCategory, setPhotoCategory] = useState<string>('all');
  const [brandColoursOpen, setBrandColoursOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        pushHistory();
        setPhotoUrl(result);
        setReplaceImageOpen(false);
        toast.success('Custom photo applied to canvas!');
      }
    };
    reader.readAsDataURL(file);
  };

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

  const handleSelectHeadline = (newHeadline: string) => {
    pushHistory();
    setHeadline(newHeadline);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) =>
          l.id === 'headline' ? { ...l, text: newHeadline } : l
        ),
      });
    }
    toast.success('Headline updated on canvas!');
  };

  // AI Prompt Send — Direct generation on canvas or high-res poster
  const handleSendPrompt = async () => {
    const text = promptInput.trim();
    if (!text) return;

    setIsGenerating(true);
    setGeneratingStage('Synthesizing marketing message and headlines...');
    setActiveUserPrompt(text);
    setPromptInput('');

    if (generationMode === 'poster') {
      try {
        const requestId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const [genRes, imageRes] = await Promise.all([
          authFetch('/api/social/designs/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text, design, caption, mode: 'graphic' }),
          }),
          authFetch('/api/social/designs/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: text,
              provider: 'gemini',
              requestId,
              isPoster: true,
            }),
          }),
        ]);

        if (genRes.ok) {
          const json = await genRes.json();
          setCaption(json.caption);
          if (Array.isArray(json.alternativeHeadlines) && json.alternativeHeadlines.length > 0) {
            setAlternativeHeadlines(json.alternativeHeadlines);
          }
          if (json.design) setCustomDesign(json.design);
        }

        if (imageRes.ok) {
          const imageJson = await imageRes.json().catch(() => null);
          const targetJobId = imageJson?.jobId || requestId;
          setGeneratingStage('Rendering high-resolution AI poster graphic (1080 × 1350)...');
          const pollStart = Date.now();
          const poll = setInterval(async () => {
            try {
              const check = await authFetch(`/api/social/designs/image?id=${encodeURIComponent(targetJobId)}`);
              if (check.ok) {
                const job = await check.json();
                if (job.status === 'completed' && job.result?.url) {
                  clearInterval(poll);
                  setPosterUrl(job.result.url);
                  setActiveVisualFormat('poster');
                  setIsGenerating(false);
                  setGeneratingStage('');
                  toast.success('Finished AI Poster generated successfully!');
                } else if (job.status === 'failed' || job.status === 'cancelled' || job.status === 'uncertain') {
                  clearInterval(poll);
                  setIsGenerating(false);
                  setGeneratingStage('');
                  toast.info(job.error || 'AI generation key pending. Retaining sample.');
                }
              }
              if (Date.now() - pollStart > 60000) {
                clearInterval(poll);
                setIsGenerating(false);
                setGeneratingStage('');
              }
            } catch {
              clearInterval(poll);
              setIsGenerating(false);
              setGeneratingStage('');
            }
          }, 2500);
          return;
        } else {
          setActiveVisualFormat('poster');
          setIsGenerating(false);
          setGeneratingStage('');
          toast.success('Campaign copy updated! Ready for publishing.');
        }
      } catch {
        setIsGenerating(false);
        setGeneratingStage('');
        toast.error('Generation failed. Retaining current poster.');
      }
      return;
    }

    try {
      setGeneratingStage('Synthesizing canvas design layers...');
      const res = await authFetch('/api/social/designs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, design, caption, mode: generationMode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      setCustomDesign(json.design);
      setCaption(json.caption);
      if (Array.isArray(json.alternativeHeadlines) && json.alternativeHeadlines.length > 0) {
        setAlternativeHeadlines(json.alternativeHeadlines);
      }
      const hlLayer = json.design?.layers?.find((l: DesignLayer) => l.id === 'headline');
      if (hlLayer?.text) {
        setHeadline(hlLayer.text);
      }
      toast.success(
        generationMode === 'image_only'
          ? 'Image background generated without text overlays.'
          : 'Design updated. Every layer remains editable.'
      );
    } catch {
      setPromptInput(text);
      toast.error('Generation failed. Your design is unchanged. Please retry.');
    } finally {
      setIsGenerating(false);
      setGeneratingStage('');
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

  // Normalize relative media URLs to absolute URLs
  const toAbsoluteUrl = useCallback((url: string) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://bgos.fieseros.com';
    return `${origin.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
  }, []);

  // Build resolved target list for publish / save
  const getResolvedTargets = useCallback(() => {
    return selectedChannels
      .map((p) => {
        if (p === 'googlebusiness') {
          const gbpList = connectedAccounts.filter(
            (a) => a.platform === 'googlebusiness' || a.platform === 'gbp' || a.platform === 'google_business' || a.platform === 'google'
          );
          if (gbpList.length === 0) return null;
          // Smart match: activeProfileId, location ID 10777612572223040949 (FieserOS), businessName, or first active GBP
          const target =
            gbpList.find(
              (a) =>
                (activeProfileId && (a.id === activeProfileId || a.accountId === activeProfileId)) ||
                a.accountId === '10777612572223040949' ||
                a.name?.toLowerCase().includes('fieser') ||
                (businessName && a.name?.toLowerCase().includes(businessName.toLowerCase()))
            ) || gbpList[0];
          return { platform: 'googlebusiness', socialAccountId: target.id };
        }
        const found = connectedAccounts.find((a) => a.platform === p);
        return found ? { platform: p, socialAccountId: found.id } : null;
      })
      .filter(Boolean);
  }, [selectedChannels, connectedAccounts, activeProfileId, businessName]);

  // Save Draft
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const handleSaveDraft = async (silent=false) => {
    if(isSavingDraft || isPublishing)return;
    const snapshot=JSON.stringify({design,caption});
    savedDesignSnapshot.current=snapshot;
    setIsSavingDraft(true);
    try {
      const targets = getResolvedTargets();
      const isPosterMode = activeVisualFormat === 'poster';
      const resolvedPosterUrl = toAbsoluteUrl(posterUrl || '/images/fieseros-ai-assistant-poster.jpg?v=1');
      const mediaList = isPosterMode ? [resolvedPosterUrl] : photoUrl ? [toAbsoluteUrl(photoUrl)] : [];

      const res = await authFetch(editingDraftId ? `/api/social/posts/${editingDraftId}` : '/api/social/posts', {
        method: editingDraftId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          expectedUpdatedAt: draftRevision,
          content: caption,
          mediaUrls: mediaList,
          isPoster: isPosterMode,
          design: isPosterMode ? undefined : design,
          linkUrl,
          platforms: selectedChannels,
          targets: targets.length > 0 ? targets : undefined,
          headline,
          gbpPostType: headline || badgeText ? 'offer' : 'whats_new',
          gbpOfferData: {
            title: headline,
            couponCode: badgeText.replace(/[^A-Za-z0-9]/g, ''),
            redeemUrl: linkUrl,
          },
        }),
      });
      if (res.ok) {
        const saved=await res.json();
        if(saved.data?.id)setEditingDraftId(saved.data.id);
        if(saved.data?.updatedAt)setDraftRevision(saved.data.updatedAt);
        savedDesignSnapshot.current=snapshot;
        if(!silent)toast.success('Draft saved successfully!');
      } else {
        toast.error('Draft could not be saved. Please retry.');
      }
    } catch {
      toast.error('Draft could not be saved. Check your connection and retry.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Final Publish
  const [isPublishing, setIsPublishing] = useState(false);
  const handlePublishNow = async () => {
    setIsPublishing(true);
    try {
      const targets = getResolvedTargets();
      const isPosterMode = activeVisualFormat === 'poster';
      const resolvedPosterUrl = toAbsoluteUrl(posterUrl || '/images/fieseros-ai-assistant-poster.jpg?v=1');
      const mediaList = isPosterMode ? [resolvedPosterUrl] : photoUrl ? [toAbsoluteUrl(photoUrl)] : [];

      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: editingDraftId || undefined,
          expectedUpdatedAt: draftRevision,
          status: publishMode === 'schedule' ? 'scheduled' : 'published',
          scheduledAt: publishMode === 'schedule' ? scheduledDateTime : null,
          content: caption,
          mediaUrls: mediaList,
          isPoster: isPosterMode,
          design: isPosterMode ? undefined : design,
          linkUrl,
          platforms: selectedChannels,
          targets: targets.length > 0 ? targets : undefined,
          headline,
          gbpPostType: headline || badgeText ? 'offer' : 'whats_new',
          gbpOfferData: {
            title: headline,
            couponCode: badgeText.replace(/[^A-Za-z0-9]/g, ''),
            redeemUrl: linkUrl,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success(
          publishMode === 'schedule'
            ? 'Post scheduled successfully!'
            : 'Post queued for publishing. Check Posts for delivery status.'
        );
        setReviewModalOpen(false);
        if (onPublishSuccess && json.post?.id) {
          onPublishSuccess(json.post.id);
        } else if (onNavigateToPosts) {
          onNavigateToPosts();
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson?.error || 'Failed to publish post. Please check connected accounts.');
      }
    } catch {
      toast.error('Network error during publishing.');
    } finally {
      setIsPublishing(false);
    }
  };

  const currentDesignSnapshot=JSON.stringify({design,caption});
  useEffect(()=>{
    if(!editingDraftId||isSavingDraft||isPublishing||savedDesignSnapshot.current===currentDesignSnapshot)return;
    const timer=setTimeout(()=>{void handleSaveDraft(true);},1500);
    return ()=>clearTimeout(timer);
  },[currentDesignSnapshot,editingDraftId,isSavingDraft,isPublishing]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="rounded border px-3 py-2" onClick={()=>loadDesignDrafts()}>Open saved design</button>
        {moreDrafts&&<button type="button" onClick={()=>loadDesignDrafts(draftPage+1)}>Load more drafts</button>}
        {designDrafts.length>0&&<select aria-label="Saved designs" className="rounded-xl border border-border/80 bg-card text-xs p-2" value={editingDraftId||''} onChange={e=>{
          const draft=designDrafts.find(d=>d.id===e.target.value);
          if(!draft)return;
          try{
            if (Array.isArray(draft.mediaUrls) && draft.mediaUrls.length > 0 && typeof draft.mediaUrls[0] === 'string') {
              setPosterUrl(draft.mediaUrls[0]);
              setActiveVisualFormat('poster');
            }
            if (draft.designJson) {
              try {
                setCustomDesign(validateDesign(JSON.parse(draft.designJson)));
                savedDesignSnapshot.current=JSON.stringify({design:JSON.parse(draft.designJson),caption:draft.content});
              } catch {
                // Ignore if pure poster
              }
            } else {
              savedDesignSnapshot.current=JSON.stringify({design:null,caption:draft.content});
            }
            setCaption(draft.content || '');
            setEditingDraftId(draft.id);
            setDraftRevision(draft.updatedAt);
            toast.success('Design draft loaded!');
          }catch{
            toast.error('This design could not be opened');
          }
        }}>
          <option value="">Choose a draft</option>{designDrafts.map(d=><option key={d.id} value={d.id}>{d.content ? d.content.slice(0,70) : 'Saved draft'}</option>)}
        </select>}
      </div>
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
                {activeUserPrompt}
              </div>
              <div className="size-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-1">
                DC
              </div>
            </div>

            {/* AI Assistant Direct Generation State */}
            <div className="flex items-start gap-2.5">
              <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-1 border border-primary/20">
                <Sparkles className="size-3.5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground">
                    {isGenerating
                      ? generatingStage || 'Synthesizing creative post...'
                      : 'Content & design synthesized directly to canvas.'}
                  </p>
                  <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/20 bg-primary/5">
                    {generationMode === 'image_only' ? '🖼️ Image Only' : generationMode === 'poster' ? '🖼️ AI Poster' : '🎨 Graphic + Copy'}
                  </Badge>
                </div>

                {/* Generated Creative Preview Card in Chat */}
                <div className="border border-border/80 rounded-xl p-2.5 bg-background/80 flex items-center gap-3 shadow-2xs">
                  <div className="size-14 rounded-lg overflow-hidden shrink-0 border border-border/60 bg-muted/30 relative">
                    <img
                      src={activeVisualFormat === 'poster' ? posterUrl : photoUrl}
                      alt="Visual Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/fieseros-ai-assistant-poster.jpg?v=1';
                      }}
                    />
                    {isGenerating && (
                      <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center">
                        <Sparkles className="size-4 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{headline}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{subheadText || caption.slice(0, 50)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRightTab('design');
                        setActiveVisualFormat('poster');
                      }}
                      className="text-[10px] font-bold text-primary hover:underline mt-0.5 flex items-center gap-1"
                    >
                      <span>View full canvas</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* Alternative Headlines Chips */}
                <div className="space-y-2 pt-1 bg-muted/20 border border-border/60 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3 text-primary" />
                      Alternative Headlines
                    </span>
                    <span className="text-[10px] text-muted-foreground">Click to apply to canvas</span>
                  </div>
                  <div className="space-y-1.5">
                    {alternativeHeadlines.map((altHl, idx) => {
                      const isActive = headline === altHl;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectHeadline(altHl)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs font-medium border transition-all flex items-start justify-between gap-2 ${
                            isActive
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs'
                              : 'bg-card border-border/80 hover:border-primary/40 text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <span className="leading-snug flex-1">"{altHl}"</span>
                          {isActive && <Check className="size-3.5 text-primary shrink-0 mt-0.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Caption Card */}
            <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <FileText className="size-3.5 text-primary" />
                  <span>Marketing Caption</span>
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                    ({caption.trim().split(/\s+/).filter(Boolean).length} words · 5 hashtags)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(caption);
                      toast.success('Caption copied to clipboard!');
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </button>
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
                  rows={6}
                  className="text-xs bg-card resize-none"
                />
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed select-text whitespace-pre-line">
                  {caption}
                </p>
              )}
            </div>

            {/* 4. Info Alert */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="size-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <span>Click any text or element on the canvas to edit inline. All changes are saved automatically.</span>
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

            {/* Dynamic Prompt Suggestions based on Google Business Profile & Website */}
            {suggestions.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>💡 Suggested for your business:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchSuggestions(true)}
                    disabled={loadingSuggestions}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCw className={`size-3 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                    <span>Refresh Ideas</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setPromptInput(s.prompt);
                        toast.info(`Loaded suggestion: ${s.title || s.chipLabel || 'Marketing idea'}`);
                      }}
                      className="shrink-0 px-2.5 py-1 rounded-xl text-xs font-semibold bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>{s.icon || '💡'}</span>
                      <span>{s.title || s.chipLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Prompt Input Bar with Mode Switcher */}
            <div className="space-y-2">
              {/* 3-Way Mode Switcher Pill */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setGenerationMode('poster');
                    setActiveVisualFormat('poster');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    generationMode === 'poster'
                      ? 'bg-card text-foreground shadow-2xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <span>🖼️ AI Poster</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGenerationMode('graphic');
                    setActiveVisualFormat('canvas');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    generationMode === 'graphic'
                      ? 'bg-card text-foreground shadow-2xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Palette className="size-3.5 text-primary" />
                  <span>✏️ Editable Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationMode('image_only')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    generationMode === 'image_only'
                      ? 'bg-card text-foreground shadow-2xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ImageIcon className="size-3.5 text-primary" />
                  <span>📷 Photo Only</span>
                </button>
              </div>

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
                  placeholder={
                    generationMode === 'poster'
                      ? 'Describe your campaign to generate a finished AI creative poster (e.g. Fieseros AI Assistant)...'
                      : generationMode === 'image_only'
                      ? 'Describe the image or photography to generate...'
                      : 'Describe your promotional campaign, offer or layout adjustments...'
                  }
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
      </div>

      {/* ─── RIGHT COLUMN: Live Visual Canvas & Editor (7 cols) ───────────── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top View Selector Tabs: Finished AI Poster | Editable Canvas | Channel preview */}
          <div className="flex items-center justify-between border-b border-border pb-1">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() => {
                  setActiveRightTab('design');
                  setActiveVisualFormat('poster');
                }}
                className={`relative py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeRightTab === 'design' && activeVisualFormat === 'poster'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>🖼️ Finished AI Poster</span>
                {activeRightTab === 'design' && activeVisualFormat === 'poster' && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] rounded-t-full bg-primary" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRightTab('design');
                  setActiveVisualFormat('canvas');
                }}
                className={`relative py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeRightTab === 'design' && activeVisualFormat === 'canvas'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>✏️ Editable Canvas</span>
                {activeRightTab === 'design' && activeVisualFormat === 'canvas' && (
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
              <button
                type="button"
                onClick={() => {
                  const ratios: AspectRatio[] = ['4:5', '1:1', '9:16', '16:9'];
                  const nextRatio = ratios[(ratios.indexOf(aspectRatio) + 1) % ratios.length];
                  setAspectRatio(nextRatio);
                  toast.info(`Aspect ratio changed to ${nextRatio}`);
                }}
                className="flex items-center gap-1 bg-card hover:bg-muted/50 border border-border rounded-xl px-2.5 py-1 text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                <span className="size-2.5 border border-foreground/60 rounded-xs" />
                <span>
                  {aspectRatio === '4:5'
                    ? 'Portrait'
                    : aspectRatio === '1:1'
                    ? 'Square'
                    : aspectRatio === '9:16'
                    ? 'Story'
                    : 'Landscape'}{' '}
                  · {aspectRatio}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground ml-1" />
              </button>

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
            activeVisualFormat === 'poster' ? (
              /* ─── FINISHED AI CREATIVE POSTER VIEW ────────────────────────── */
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-border shadow-md bg-gradient-to-b from-card to-muted/20 flex flex-col items-center justify-center p-3 sm:p-5">
                  <div className="relative max-w-[420px] w-full aspect-[4/5] rounded-xl overflow-hidden shadow-2xl bg-zinc-950 border border-border/80 group">
                    <img
                      src={posterUrl}
                      alt="Promotional marketing poster"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/fieseros-ai-assistant-poster.jpg?v=1';
                      }}
                      className={`w-full h-full object-cover transition-all duration-500 ${isGenerating ? 'opacity-30 scale-95 blur-xs' : 'opacity-100 scale-100'}`}
                    />

                    {/* Animated AI Generator Overlay */}
                    {isGenerating && (
                      <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in duration-300">
                        <div className="size-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-3 shadow-inner">
                          <Sparkles className="size-7 text-primary animate-pulse" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground">Creating Your AI Campaign</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                          {generatingStage || 'Synthesizing professional poster layout & copy...'}
                        </p>
                        <div className="flex items-center gap-2 mt-4">
                          <span className="size-2 rounded-full bg-primary animate-ping" />
                          <span className="text-[11px] font-semibold text-primary">Gemini Vision & Layout</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white tracking-wide uppercase border border-white/20 shadow-xs">
                      Finished Creative Poster • 1080 × 1350
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <a
                        href={posterUrl}
                        download="marketing-poster.jpg"
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md border border-white/20 shadow-xs transition-colors"
                        title="Download image"
                      >
                        <Download className="size-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Poster Quick Tools Bar */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer h-8 px-3 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-foreground shadow-2xs">
                    <Upload className="size-3.5 text-primary" />
                    <span>Upload custom graphic</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePosterUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <a
                      href={posterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>View full size</span>
                    </a>
                    <a
                      href={posterUrl}
                      download="marketing-poster.jpg"
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                    >
                      <Download className="size-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* ─── LIVE VISUAL CANVAS ─────────────────────────────────────────── */
              <div className="space-y-3">
                <EditableMarketingDesign design={design} onChange={setCustomDesign} />

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
            )
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
                  style={{ backgroundImage: `url(${activeVisualFormat === 'poster' ? posterUrl : photoUrl})` }}
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
                onClick={()=>handleSaveDraft()}
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
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Replace Canvas Background Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary cursor-pointer text-xs font-bold transition-all">
              <Upload className="size-4" />
              <span>Upload Custom Photo (from Computer/Device)</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Photos' },
                { id: 'interior', label: 'Minimal Living' },
                { id: 'salon', label: 'Salon & Spa' },
                { id: 'food', label: 'Cafe & Dining' },
                { id: 'auto', label: 'Auto & Tech' },
                { id: 'luxury', label: 'Emerald Luxury' },
                { id: 'service', label: 'Home Services' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPhotoCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                    photoCategory === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CURATED_PHOTOS.filter(
                (p) => photoCategory === 'all' || p.category === photoCategory
              ).map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    pushHistory();
                    setPhotoUrl(photo.url);
                    setReplaceImageOpen(false);
                    toast.success('Updated canvas photography!');
                  }}
                  className={`group rounded-xl overflow-hidden border transition-all text-left relative ${
                    photoUrl === photo.url ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/60'
                  }`}
                >
                  <div
                    className="h-24 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${photo.url})` }}
                  />
                  <div className="p-2 bg-card">
                    <p className="text-[10px] font-bold text-foreground truncate">{photo.label}</p>
                  </div>
                  {photoUrl === photo.url && (
                    <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-bold text-foreground">Or Direct Image URL</label>
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
              Done
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
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span>Feed & Story</span>
                      <span>·</span>
                      <span className={isPlatformConnected('instagram') ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                        {isPlatformConnected('instagram') ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
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
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span>Official Business Page</span>
                      <span>·</span>
                      <span className={isPlatformConnected('facebook') ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                        {isPlatformConnected('facebook') ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
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
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span>Local Search & Maps Update</span>
                      <span>·</span>
                      <span className={isPlatformConnected('googlebusiness') ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                        {isPlatformConnected('googlebusiness') ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
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
            {connectedAccounts.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <Info className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">No social accounts connected yet</p>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                    Connect your Google Business Profile, Facebook, or Instagram in the Accounts tab to publish live, or save this design as a draft.
                  </p>
                </div>
              </div>
            )}

            {/* Platform toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('instagram') ? prev.filter((c) => c !== 'instagram') : [...prev, 'instagram']
                  );
                }}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedChannels.includes('instagram')
                    ? 'border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Instagram className="size-4" />
                  <span>Instagram</span>
                </div>
                <span className="text-[10px] font-normal opacity-75">
                  {isPlatformConnected('instagram') ? '🟢 Connected' : '⚪ Not connected'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('facebook') ? prev.filter((c) => c !== 'facebook') : [...prev, 'facebook']
                  );
                }}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedChannels.includes('facebook')
                    ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Facebook className="size-4" />
                  <span>Facebook</span>
                </div>
                <span className="text-[10px] font-normal opacity-75">
                  {isPlatformConnected('facebook') ? '🟢 Connected' : '⚪ Not connected'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedChannels((prev) =>
                    prev.includes('googlebusiness') ? prev.filter((c) => c !== 'googlebusiness') : [...prev, 'googlebusiness']
                  );
                }}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedChannels.includes('googlebusiness')
                    ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-emerald-600" />
                  <span>Google</span>
                </div>
                <span className="text-[10px] font-normal opacity-75">
                  {isPlatformConnected('googlebusiness') ? '🟢 Connected' : '⚪ Not connected'}
                </span>
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
            {connectedAccounts.length > 0 && selectedChannels.some((p) => isPlatformConnected(p)) ? (
              <Button
                type="button"
                disabled={isPublishing || selectedChannels.length === 0}
                onClick={handlePublishNow}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-6"
              >
                {isPublishing
                  ? 'Publishing...'
                  : publishMode === 'schedule'
                  ? `Schedule to ${selectedChannels.filter((p) => isPlatformConnected(p)).length} accounts`
                  : `Publish to ${selectedChannels.filter((p) => isPlatformConnected(p)).length} accounts`}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSavingDraft}
                onClick={() => {
                  void handleSaveDraft(false);
                  setReviewModalOpen(false);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-6"
              >
                {isSavingDraft ? 'Saving draft...' : 'Save as Draft'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
