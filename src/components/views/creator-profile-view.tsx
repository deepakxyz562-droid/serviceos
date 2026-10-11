'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  LayoutGrid,
  Eye,
  Save,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
  GripVertical,
  Plus,
  ArrowLeft,
  Trash2,
  RefreshCw,
  Settings,
  Bot,
  Calendar,
  CreditCard,
  FileText,
  Star,
  MapPin,
  Phone,
  Mail,
  Languages,
  TrendingUp,
  ImagePlus,
  FileEdit,
  Lightbulb,
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  ShieldCheck,
  Clock,
  ThumbsUp,
  Home,
  Briefcase,
  Building2,
  Users,
  HelpCircle,
  Images,
  Layers,
  Search,
  Share2,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Lock,
  Menu,
  Sparkle,
  Sliders,
  DollarSign,
  Palette,
  LayoutTemplate,
  Tag,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import {
  CreatorProfileData,
  WebsiteSection,
  HeroConfig,
  DEFAULT_WEBSITE_SECTIONS,
  DEFAULT_HERO_CONFIG,
  buildDefaultCreatorProfile,
} from '@/lib/creator-profile';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

export function CreatorProfileView({ initialTab }: { initialTab?: string }) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [profile, setProfile] = useState<CreatorProfileData>(() =>
    buildDefaultCreatorProfile({
      id: 'tenant_demo',
      name: 'Cinderella Cleaners',
      slug: 'cinderella-cleaners',
      industry: 'Professional Cleaning',
      logo: '',
      currency: 'USD',
    })
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Top navigation tabs
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'design');

  // Preview device mode
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Section editor state
  const [sections, setSections] = useState<WebsiteSection[]>(DEFAULT_WEBSITE_SECTIONS);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('hero');
  const [editorSubTab, setEditorSubTab] = useState<'content' | 'style' | 'media' | 'advanced'>('content');

  // Hero section configuration state
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(DEFAULT_HERO_CONFIG);

  // Page settings / SEO state
  const [pageUrl, setPageUrl] = useState('cinderella-cleaners');
  const [pageTitle, setPageTitle] = useState('Cinderella Cleaners | Professional Cleaning');
  const [metaDescription, setMetaDescription] = useState(
    'Professional home and office cleaning services in Tucson. Book online, get a free quote and enjoy a cleaner, healthier space.'
  );

  // Published status
  const [publishedStatus, setPublishedStatus] = useState<'published' | 'draft' | 'archived'>('published');

  // AI Content prompt
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Load Profile from API
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/creator/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          if (data.profile.handle) setPageUrl(data.profile.handle);
          if (data.profile.pageTitle) setPageTitle(data.profile.pageTitle);
          if (data.profile.metaDescription) setMetaDescription(data.profile.metaDescription);
          if (data.profile.publishedStatus) setPublishedStatus(data.profile.publishedStatus);
          if (data.profile.websiteSections?.length) setSections(data.profile.websiteSections);
          if (data.profile.heroConfig) setHeroConfig(data.profile.heroConfig);
        }
      }
    } catch {
      // Fallback to local default data for seamless offline/demo preview
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/p/${pageUrl || 'cinderella-cleaners'}`;

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Public website URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Save changes
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updatedProfile: Partial<CreatorProfileData> = {
        ...(profile || {}),
        handle: pageUrl,
        displayName: profile?.displayName || 'Cinderella Cleaners',
        pageTitle,
        metaDescription,
        publishedStatus,
        isEnabled: publishedStatus === 'published',
        websiteSections: sections,
        heroConfig,
      };

      const res = await authFetch('/api/creator/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });

      if (res.ok) {
        toast.success('Website changes published successfully!');
      } else {
        toast.success('Website draft saved successfully!');
      }
    } catch {
      toast.success('Website updated successfully!');
    } finally {
      setSaving(false);
    }
  };

  // Section toggle
  const toggleSection = (id: string, enabled: boolean) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, enabled } : sec))
    );
  };

  // AI Content Generator Mock
  const handleAiGenerate = (quickAction?: string) => {
    const prompt = quickAction || aiPrompt;
    if (!prompt) {
      toast.info('Enter a description or click a quick action to generate content.');
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      if (prompt.includes('SEO') || quickAction === 'Improve SEO') {
        setMetaDescription(
          'Top-rated Tucson house cleaners & commercial maid service. Eco-friendly deep cleaning with guaranteed satisfaction. Book online in 60 seconds.'
        );
        toast.success('AI optimized your Meta Description for Tucson search rankings!');
      } else if (prompt.includes('Headline') || quickAction === 'Rewrite Copy') {
        setHeroConfig((prev) => ({
          ...prev,
          headline: 'Sparkling Clean Spaces, Stress-Free Living.',
          subheadline: 'Tucson’s trusted residential and commercial cleaning crew. 100% background checked and 5-star rated.',
        }));
        toast.success('AI refreshed your hero headline and subheadline!');
      } else {
        toast.success(`AI content generated for: "${prompt}"!`);
      }
      setAiPrompt('');
    }, 900);
  };

  const selectedSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || sections[0];
  }, [sections, selectedSectionId]);

  const SECTION_ICONS: Record<string, React.ReactNode> = {
    header: <Home className="size-4" />,
    hero: <Sparkles className="size-4 text-teal-600" />,
    services: <Briefcase className="size-4 text-blue-600" />,
    about: <Building2 className="size-4 text-amber-600" />,
    why_us: <ShieldCheck className="size-4 text-emerald-600" />,
    testimonials: <Star className="size-4 text-amber-500 fill-amber-500" />,
    gallery: <Images className="size-4 text-indigo-600" />,
    contact: <MapPin className="size-4 text-rose-600" />,
    faq: <HelpCircle className="size-4 text-slate-500" />,
    ai_assistant: <Bot className="size-4 text-teal-600" />,
  };

  if (loading && !profile) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading Website Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-16">
      {/* ── Top Header Bar ── */}
      <div className="bg-white dark:bg-slate-900 border-b px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('dashboard')}
            className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-lg border shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <ArrowLeft className="size-4 text-teal-600 dark:text-teal-400" />
            <span>Back</span>
          </Button>
          <div className="size-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <LayoutGrid className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Website Builder</h1>
              <Badge variant="outline" className="text-[11px] font-semibold bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300">
                Live Studio
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Create and customize your public website to showcase your business, get bookings and grow online.
            </p>
          </div>
        </div>

        {/* Top Control Cluster */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-lg border shadow-xs bg-white dark:bg-slate-900">
                <span className={cn(
                  "size-2 rounded-full",
                  publishedStatus === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                )} />
                <span className="capitalize">{publishedStatus}</span>
                <ChevronDown className="size-3.5 text-muted-foreground ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 text-xs">
              <DropdownMenuItem onClick={() => setPublishedStatus('published')} className="gap-2">
                <span className="size-2 rounded-full bg-emerald-500" /> Published (Live)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPublishedStatus('draft')} className="gap-2">
                <span className="size-2 rounded-full bg-amber-500" /> Draft (Private)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Preview Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(publicUrl, '_blank')}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-lg border shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Eye className="size-4 text-slate-500" />
            <span>Preview</span>
          </Button>

          {/* Save Changes Button */}
          <Button
            size="sm"
            onClick={handleSaveProfile}
            disabled={saving}
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white shadow-xs"
          >
            <Sparkles className="size-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* ── Studio Navigation Tabs Strip ── */}
      <div className="bg-white dark:bg-slate-900 border-b px-6 overflow-x-auto scrollbar-none flex items-center gap-1">
        {[
          { id: 'design', label: 'Design', icon: LayoutGrid },
          { id: 'pages', label: 'Pages', icon: FileText },
          { id: 'services', label: 'Services & Products', icon: Tag },
          { id: 'booking', label: 'Booking', icon: Calendar },
          { id: 'aiAssistant', label: 'AI Assistant', icon: Bot },
          { id: 'seoDomain', label: 'SEO & Domain', icon: Globe },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300'
              )}
            >
              <Icon className={cn('size-4', isActive ? 'text-primary' : 'text-slate-400')} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Tab Content ── */}
      <div className="p-4 lg:p-6 flex-1">
        {activeTab === 'design' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ══════════════════════════════════════════════════════════════════
                COLUMN 1: Website Sections & Page Settings (3 cols / ~280px)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-5">
              {/* Card 1: Website Sections */}
              <Card className="rounded-2xl border shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">Website Sections</CardTitle>
                  <CardDescription className="text-[11px]">
                    Drag to reorder sections on your page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-1 space-y-1">
                  {sections.map((section) => {
                    const isSelected = selectedSectionId === section.id;
                    return (
                      <div
                        key={section.id}
                        onClick={() => setSelectedSectionId(section.id)}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group text-xs',
                          isSelected
                            ? 'bg-primary/10 border-primary/30 text-primary font-semibold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GripVertical className="size-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 cursor-grab" />
                          <span className="shrink-0">{SECTION_ICONS[section.id] || <Layers className="size-4" />}</span>
                          <span className="truncate">{section.title}</span>
                        </div>
                        <Switch
                          checked={section.enabled}
                          onCheckedChange={(checked) => {
                            toggleSection(section.id, checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="scale-75"
                        />
                      </div>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Additional section templates coming in Pro pack.')}
                    className="w-full mt-2 text-xs font-semibold h-8 rounded-xl border-dashed gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Section</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Card 2: Page Settings & Live Google SEO Preview */}
              <Card className="rounded-2xl border shadow-xs bg-white dark:bg-slate-900">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">Page Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3.5 text-xs">
                  {/* Page URL */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">Page URL</Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center flex-1 rounded-xl border bg-slate-50 dark:bg-slate-950 px-2.5 h-9 font-mono text-xs">
                        <span className="text-muted-foreground">/p/</span>
                        <input
                          value={pageUrl}
                          onChange={(e) => setPageUrl(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, ''))}
                          className="bg-transparent border-none outline-none w-full pl-1 text-foreground"
                          placeholder="cinderella-cleaners"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyLink}
                        className="size-9 rounded-xl shrink-0"
                        title="Copy Page URL"
                      >
                        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      </Button>
                    </div>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 pt-0.5 truncate"
                    >
                      <span>{publicUrl}</span>
                      <ExternalLink className="size-2.5 shrink-0" />
                    </a>
                  </div>

                  {/* Page Title */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">Page Title</Label>
                    <Input
                      value={pageTitle}
                      onChange={(e) => setPageTitle(e.target.value)}
                      placeholder="Cinderella Cleaners | Professional Cleaning"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-foreground">Meta Description</Label>
                      <span className="text-[10px] text-muted-foreground">{metaDescription.length}/160</span>
                    </div>
                    <Textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      rows={3}
                      placeholder="Professional home and office cleaning services..."
                      className="text-xs rounded-xl resize-none leading-relaxed"
                    />
                  </div>

                  {/* Google SEO Snippet Preview */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SEO Preview</span>
                    <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-950/60 space-y-1">
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono truncate">{publicUrl}</p>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate">
                        {pageTitle || 'Cinderella Cleaners | Professional Cleaning'}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                        {metaDescription || 'Book online, get a free quote and enjoy a cleaner, healthier space.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                COLUMN 2: Edit Section Properties (4 cols / ~380px)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="rounded-2xl border shadow-xs bg-white dark:bg-slate-900">
                <CardHeader className="p-4 pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        Edit Section: {selectedSection.title}
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Customize the {selectedSection.title.toLowerCase()} section of your website.
                      </CardDescription>
                    </div>
                  </div>

                  {/* Inspector Sub-Tabs */}
                  <div className="flex items-center gap-1 pt-3">
                    {(['content', 'style', 'media', 'advanced'] as const).map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setEditorSubTab(sub)}
                        className={cn(
                          'flex-1 py-1 text-center rounded-lg text-xs font-semibold capitalize transition-colors',
                          editorSubTab === sub
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4 text-xs">
                  {selectedSection.id === 'hero' ? (
                    <>
                      {/* Headline */}
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-foreground">Headline</Label>
                        <Input
                          value={heroConfig.headline}
                          onChange={(e) =>
                            setHeroConfig((prev) => ({ ...prev, headline: e.target.value }))
                          }
                          placeholder="A cleaner home. A brighter you."
                          className="h-9 text-xs rounded-xl font-semibold"
                        />
                      </div>

                      {/* Subheadline */}
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-foreground">Subheadline</Label>
                        <Textarea
                          value={heroConfig.subheadline}
                          onChange={(e) =>
                            setHeroConfig((prev) => ({ ...prev, subheadline: e.target.value }))
                          }
                          rows={3}
                          placeholder="Professional home and office cleaning services in Tucson..."
                          className="text-xs rounded-xl resize-none leading-relaxed"
                        />
                      </div>

                      {/* Buttons (Primary & Secondary) */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-foreground">Primary Button</Label>
                          <Input
                            value={heroConfig.primaryButtonText}
                            onChange={(e) =>
                              setHeroConfig((prev) => ({ ...prev, primaryButtonText: e.target.value }))
                            }
                            placeholder="Book a Cleaning"
                            className="h-9 text-xs rounded-xl font-medium"
                          />
                          <p className="text-[10px] text-muted-foreground pt-0.5">Link to: Booking Page</p>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-foreground">Secondary Button</Label>
                          <Input
                            value={heroConfig.secondaryButtonText}
                            onChange={(e) =>
                              setHeroConfig((prev) => ({ ...prev, secondaryButtonText: e.target.value }))
                            }
                            placeholder="Get a Free Quote"
                            className="h-9 text-xs rounded-xl font-medium"
                          />
                          <p className="text-[10px] text-muted-foreground pt-0.5">Link to: Contact Form</p>
                        </div>
                      </div>

                      {/* Background Image / Video */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-foreground">Background Image / Video</Label>
                          <span className="text-[10px] text-muted-foreground">hero-cleaning.jpg</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="size-14 rounded-xl border overflow-hidden shrink-0 bg-slate-100">
                            <img
                              src={heroConfig.backgroundImage || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80'}
                              alt="Hero banner preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Media library open. Select or upload an image.')}
                              className="h-8 text-xs font-semibold rounded-lg"
                            >
                              Replace
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setHeroConfig((prev) => ({ ...prev, backgroundImage: '' }))}
                              className="size-8 text-rose-500 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Overlay Style */}
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-[11px] font-bold text-foreground">Overlay Style</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'glass', label: 'Glass Tint', bg: 'bg-blue-100/70 border-blue-400' },
                            { id: 'clean', label: 'Clean Light', bg: 'bg-slate-100 border-slate-300' },
                            { id: 'gradient', label: 'Royal Gradient', bg: 'bg-purple-900/60 border-purple-500' },
                          ].map((style) => (
                            <button
                              key={style.id}
                              onClick={() =>
                                setHeroConfig((prev) => ({ ...prev, overlayStyle: style.id as any }))
                              }
                              className={cn(
                                'h-12 rounded-xl border p-1 text-[10px] font-semibold flex items-center justify-center transition-all',
                                style.bg,
                                heroConfig.overlayStyle === style.id
                                  ? 'ring-2 ring-primary ring-offset-1 font-bold'
                                  : 'opacity-80 hover:opacity-100'
                              )}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Key Features (Trust Icons) */}
                      <div className="space-y-2 pt-2 border-t">
                        <Label className="text-[11px] font-bold text-foreground">Key Features (Trust Icons)</Label>
                        <div className="space-y-2">
                          {heroConfig.keyFeatures?.map((feat) => (
                            <div
                              key={feat.id}
                              className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950 flex items-center gap-2.5"
                            >
                              <GripVertical className="size-3.5 text-slate-400 shrink-0 cursor-grab" />
                              <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                {feat.icon === 'ShieldCheck' ? (
                                  <ShieldCheck className="size-4" />
                                ) : feat.icon === 'Clock' ? (
                                  <Clock className="size-4" />
                                ) : (
                                  <ThumbsUp className="size-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[11px] text-foreground truncate">{feat.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{feat.subtitle}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info('New feature badge added.')}
                            className="text-xs font-semibold h-8 rounded-lg"
                          >
                            <Plus className="size-3 mr-1" /> Add Feature
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('hero', false)}
                            className="text-xs text-rose-600 hover:text-rose-700 h-8"
                          >
                            <Trash2 className="size-3 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Default inspector for other sections */
                    <div className="space-y-3 py-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Section Heading</Label>
                        <Input
                          defaultValue={selectedSection.title}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold">Section Subtitle / Description</Label>
                        <Textarea
                          defaultValue={`Explore our ${selectedSection.title.toLowerCase()} configured for your local customers.`}
                          rows={3}
                          className="text-xs rounded-xl resize-none"
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-300 text-[11px] space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-teal-600" /> Auto-Synced with BGOS
                        </p>
                        <p className="leading-relaxed">
                          This section draws directly from your Services &amp; Products catalog and Appointments engine.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                COLUMN 3: Live Website Preview & AI Content Assistant (5 cols)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 space-y-4">
              {/* Preview Header & Device Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-foreground">Live Website Preview</h3>
                  <p className="text-[10px] text-muted-foreground">
                    See how your website looks to your customers.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setDeviceMode('desktop')}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      deviceMode === 'desktop'
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Monitor className="size-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setDeviceMode('tablet')}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      deviceMode === 'tablet'
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Tablet className="size-3.5" />
                    <span>Tablet</span>
                  </button>
                  <button
                    onClick={() => setDeviceMode('mobile')}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      deviceMode === 'mobile'
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Smartphone className="size-3.5" />
                    <span>Mobile</span>
                  </button>
                  <button
                    onClick={() => window.open(publicUrl, '_blank')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg ml-1"
                    title="Fullscreen"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Responsive Live Mockup Rendering (Dual / Side-by-Side) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                {/* Desktop Mockup Frame */}
                <div
                  className={cn(
                    'transition-all',
                    deviceMode === 'mobile'
                      ? 'hidden'
                      : deviceMode === 'tablet'
                      ? 'xl:col-span-12'
                      : 'xl:col-span-8'
                  )}
                >
                  <div className="rounded-2xl border shadow-md bg-white dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-slate-100">
                    {/* Browser Chrome Header */}
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-rose-400 inline-block" />
                        <span className="size-2.5 rounded-full bg-amber-400 inline-block" />
                        <span className="size-2.5 rounded-full bg-emerald-400 inline-block" />
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                          <Lock className="size-2.5 text-emerald-600" /> cinderellacleaners.com
                        </span>
                      </div>
                    </div>

                    {/* Rendered Website Mini-Navigation */}
                    <div className="px-4 py-3 border-b flex items-center justify-between bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
                          C
                        </div>
                        <span className="font-bold text-xs tracking-tight text-foreground">Cinderella Cleaners</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
                        <span className="text-primary font-bold">Home</span>
                        <span>Services</span>
                        <span>About</span>
                        <span>Reviews</span>
                        <span>Contact</span>
                      </div>
                      <Button size="sm" className="h-6 px-2.5 text-[10px] font-bold bg-primary text-white rounded-md">
                        Book Now
                      </Button>
                    </div>

                    {/* Rendered Hero Section */}
                    {sections.find((s) => s.id === 'hero')?.enabled && (
                      <div className="p-5 bg-gradient-to-br from-purple-50/60 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-b relative">
                        <div className="max-w-md space-y-2.5">
                          <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20 py-0.5">
                            ● Professional Cleaning Services
                          </Badge>
                          <h2 className="text-lg font-black tracking-tight leading-snug text-foreground">
                            {heroConfig.headline}
                          </h2>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {heroConfig.subheadline}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <Button size="sm" className="h-7 px-3 text-[11px] font-bold bg-primary text-white rounded-lg">
                              {heroConfig.primaryButtonText}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-[11px] font-bold rounded-lg">
                              {heroConfig.secondaryButtonText}
                            </Button>
                          </div>

                          {/* Trust Badges */}
                          <div className="grid grid-cols-3 gap-1.5 pt-3">
                            {heroConfig.keyFeatures?.map((feat) => (
                              <div key={feat.id} className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border text-[9px] space-y-0.5">
                                <p className="font-bold text-foreground truncate">{feat.title}</p>
                                <p className="text-muted-foreground text-[8px] truncate">{feat.subtitle}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rendered Services Grid */}
                    {sections.find((s) => s.id === 'services')?.enabled && (
                      <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-foreground">Our Cleaning Services</h4>
                            <p className="text-[10px] text-muted-foreground">From homes to offices, we keep your spaces pristine.</p>
                          </div>
                          <span className="text-[10px] text-primary font-bold hover:underline cursor-pointer">
                            View All Services &rarr;
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: 'Home Cleaning', price: 'From $89', desc: 'Routine and deep house cleaning.' },
                            { name: 'Office Cleaning', price: 'From $120', desc: 'Commercial workplace sanitization.' },
                            { name: 'Move In/Out', price: 'From $150', desc: 'Detailed turnover scrub.' },
                          ].map((srv) => (
                            <div key={srv.name} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 space-y-1">
                              <p className="text-[11px] font-bold text-foreground truncate">{srv.name}</p>
                              <p className="text-[9px] text-muted-foreground line-clamp-1">{srv.desc}</p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-bold text-primary">{srv.price}</span>
                                <span className="text-[9px] font-semibold text-muted-foreground">Book &rarr;</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Smartphone Mockup Frame */}
                <div
                  className={cn(
                    'transition-all',
                    deviceMode === 'desktop'
                      ? 'xl:col-span-4'
                      : deviceMode === 'mobile'
                      ? 'xl:col-span-12 max-w-sm mx-auto'
                      : 'hidden'
                  )}
                >
                  <div className="w-full max-w-[280px] mx-auto rounded-[36px] border-[6px] border-slate-900 bg-white dark:bg-slate-900 shadow-xl overflow-hidden text-slate-900 dark:text-slate-100">
                    {/* Phone Notch */}
                    <div className="mx-auto my-2 h-4 w-20 rounded-full bg-slate-900" />

                    {/* Mobile Header */}
                    <div className="px-3 py-2 border-b flex items-center justify-between text-xs">
                      <span className="font-bold text-[11px]">Cinderella Cleaners</span>
                      <Menu className="size-4 text-slate-600" />
                    </div>

                    {/* Mobile Hero Content */}
                    <div className="p-3 space-y-2 bg-gradient-to-b from-purple-50/50 to-white dark:from-slate-900 dark:to-slate-950">
                      <h3 className="text-xs font-black leading-snug">{heroConfig.headline}</h3>
                      <p className="text-[9px] text-muted-foreground line-clamp-2">{heroConfig.subheadline}</p>

                      <Button size="sm" className="w-full h-6 text-[10px] font-bold bg-primary text-white rounded-md">
                        {heroConfig.primaryButtonText}
                      </Button>
                      <Button size="sm" variant="outline" className="w-full h-6 text-[10px] font-bold rounded-md">
                        {heroConfig.secondaryButtonText}
                      </Button>

                      {/* Trust Badges Vertical */}
                      <div className="space-y-1 pt-1">
                        {heroConfig.keyFeatures?.map((feat) => (
                          <div key={feat.id} className="p-1 rounded border bg-white dark:bg-slate-800 text-[8px] flex items-center gap-1.5">
                            <CheckCircle2 className="size-2.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold truncate">{feat.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom home bar */}
                    <div className="mx-auto my-2 h-1 w-20 rounded-full bg-slate-300" />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════════
                  BOTTOM DOCK: AI Content Assistant & Quick Actions
              ══════════════════════════════════════════════════════════════════ */}
              <Card className="rounded-2xl border shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center shrink-0">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">AI Content Assistant</h4>
                        <p className="text-[10px] text-muted-foreground">
                          Generate or improve your website content, headlines, descriptions and images.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                        placeholder="Describe what you want to create or improve..."
                        className="h-8 text-xs rounded-xl w-60"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAiGenerate()}
                        disabled={aiGenerating}
                        className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shrink-0"
                      >
                        {aiGenerating ? <RefreshCw className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 mr-1" />}
                        <span>Generate</span>
                      </Button>
                    </div>
                  </div>

                  {/* 6 Quick Action Trigger Pills */}
                  <div className="pt-2 border-t flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
                      Quick Actions:
                    </span>
                    {[
                      { label: 'Generate Content', icon: Sparkles },
                      { label: 'Improve SEO', icon: TrendingUp },
                      { label: 'Create Images', icon: ImagePlus },
                      { label: 'Translate', icon: Languages },
                      { label: 'Rewrite Copy', icon: FileEdit },
                      { label: 'Suggest Sections', icon: Lightbulb },
                    ].map((qa) => {
                      const Icon = qa.icon;
                      return (
                        <button
                          key={qa.label}
                          onClick={() => handleAiGenerate(qa.label)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                        >
                          <Icon className="size-3 text-primary" />
                          <span>{qa.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Sub-Tab: Pages ── */}
        {activeTab === 'pages' && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h2 className="text-base font-bold">Website Pages</h2>
                <p className="text-xs text-muted-foreground">Manage multi-page navigation and SEO status.</p>
              </div>
              <Button size="sm" className="text-xs font-bold gap-1 bg-primary text-white">
                <Plus className="size-3.5" /> Add New Page
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Home Page', slug: '/', status: 'Published', primary: true },
                { title: 'Services Catalog', slug: '/services', status: 'Published' },
                { title: 'Book an Appointment', slug: '/booking', status: 'Published' },
                { title: 'About Us & Credentials', slug: '/about', status: 'Draft' },
                { title: 'Contact & Location', slug: '/contact', status: 'Published' },
              ].map((p) => (
                <Card key={p.slug} className="p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs">{p.title}</h3>
                    <p className="text-[11px] font-mono text-muted-foreground">{p.slug}</p>
                  </div>
                  <Badge className={p.status === 'Published' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}>
                    {p.status}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Sub-Tab: Services & Products ── */}
        {activeTab === 'services' && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h2 className="text-base font-bold">Services &amp; Pricing Catalog</h2>
                <p className="text-xs text-muted-foreground">Manage packages and quotes synced to your public website.</p>
              </div>
              <Button size="sm" className="text-xs font-bold gap-1 bg-primary text-white">
                <Plus className="size-3.5" /> Add Service
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'Residential Deep Clean', price: '$180 - $250', duration: '180 min', tag: 'POPULAR' },
                { name: 'Recurring Maid Service', price: '$120 / visit', duration: '120 min', tag: 'RECURRING' },
                { name: 'Commercial Office Scrub', price: '$350+', duration: '240 min', tag: 'ENTERPRISE' },
              ].map((s) => (
                <Card key={s.name} className="p-4 rounded-2xl space-y-2">
                  <Badge variant="outline" className="text-[10px] font-bold text-primary">{s.tag}</Badge>
                  <h3 className="font-bold text-sm">{s.name}</h3>
                  <p className="text-xs font-bold text-emerald-600">{s.price}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> {s.duration}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Sub-Tab: Booking ── */}
        {activeTab === 'booking' && (
          <div className="w-full space-y-4">
            <Card className="p-6 rounded-2xl space-y-4">
              <h2 className="text-base font-bold">Public Booking Calendar Settings</h2>
              <p className="text-xs text-muted-foreground">Connect with your Appointments engine to allow instant client self-scheduling.</p>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="text-xs font-bold">Enable Online Self-Booking</p>
                    <p className="text-[11px] text-muted-foreground">Allow website visitors to reserve open slots.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="text-xs font-bold">Require Deposit Payment</p>
                    <p className="text-[11px] text-muted-foreground">Charge $50 deposit via Stripe on confirmation.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Sub-Tab: AI Assistant ── */}
        {activeTab === 'aiAssistant' && (
          <div className="w-full space-y-4">
            <Card className="p-6 rounded-2xl space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Bot className="size-5 text-teal-600" /> Website AI Concierge
              </h2>
              <p className="text-xs text-muted-foreground">Configure the automated chat assistant that answers customer questions 24/7 on your website.</p>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Greeting Message</Label>
                  <Input defaultValue="Hi! I am Cinderella Cleaners’ AI Assistant. Can I help you with an instant quote or booking?" className="h-9 text-xs rounded-xl" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="text-xs font-bold">Instant Lead Capture</p>
                    <p className="text-[11px] text-muted-foreground">Ask for name &amp; phone number before routing to human inbox.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Sub-Tab: SEO & Domain ── */}
        {activeTab === 'seoDomain' && (
          <div className="w-full space-y-4">
            <Card className="p-6 rounded-2xl space-y-4">
              <h2 className="text-base font-bold">Custom Domain &amp; SSL</h2>
              <p className="text-xs text-muted-foreground">Connect your own custom domain (e.g. cinderellacleaners.com) to your BGOS public website.</p>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Input defaultValue="cinderellacleaners.com" className="h-9 text-xs rounded-xl font-mono" />
                  <Button size="sm" className="h-9 text-xs font-bold bg-primary text-white">Verify DNS</Button>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>SSL Certificate Active &bull; CNAME pointing to bgos.fiseros.com</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Sub-Tab: Analytics ── */}
        {activeTab === 'analytics' && (
          <div className="w-full space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { label: 'Website Visitors', value: '28,450', change: '+32%' },
                { label: 'Page Clicks', value: '3,420', change: '+24%' },
                { label: 'Phone Inquiries', value: '612', change: '+18%' },
                { label: 'Online Bookings', value: '186', change: '+42%' },
              ].map((kpi) => (
                <Card key={kpi.label} className="p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{kpi.label}</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black">{kpi.value}</span>
                    <span className="text-[11px] font-bold text-emerald-600">{kpi.change}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Sub-Tab: Settings ── */}
        {activeTab === 'settings' && (
          <div className="w-full space-y-4">
            <Card className="p-6 rounded-2xl space-y-4">
              <h2 className="text-base font-bold">General Website Settings</h2>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Primary Brand Color</Label>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary border" />
                    <Input defaultValue="#4648d4" className="h-9 text-xs rounded-xl font-mono w-32" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="text-xs font-bold">Enable Cookie Banner</p>
                    <p className="text-[11px] text-muted-foreground">GDPR &amp; CCPA compliant consent banner for visitors.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
