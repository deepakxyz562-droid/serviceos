'use client';

/**
 * StudioAppDesignTab — Full Turnkey AI Business App & PWA Designer.
 *
 * Provides a dedicated Jotform App / Retool-style visual app builder:
 * 1. App Shell & PWA Settings (Name, Icon, Splash, Colors, Install prompts).
 * 2. Multi-Tab Navigation Architecture (Home Hub, Booking, AI Concierge, Passports, Invoices).
 * 3. Bundled Sub-Forms Suite (Emergency dispatch, Quote calc, Inspections, CSAT).
 * 4. Pinned 24/7 AI Assistant Dock.
 * 5. Live Interactive Mobile (iPhone) & Desktop Web App Simulator with live clickable tabs.
 */

import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Monitor,
  Tablet,
  Home,
  Calendar,
  CreditCard,
  ShieldCheck,
  Bot,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  FileText,
  Phone,
  MessageCircle,
  Wrench,
  Flame,
  HeartPulse,
  Car,
  Building2,
  Star,
  Copy,
  Check,
  Download,
  Share2,
  QrCode,
  Palette,
  Sliders,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { EditorFormData } from '@/features/forms/types';

export interface AppNavTab {
  id: string;
  label: string;
  icon: string;
  type: 'home' | 'form' | 'agent' | 'passport' | 'invoices' | 'custom';
  formId?: string;
  customUrl?: string;
}

export interface BundledFormItem {
  id: string;
  title: string;
  description?: string;
  fieldCount: number;
  type: string;
}

export interface AppConfigState {
  appName: string;
  appSubtitle: string;
  appIcon: string;
  primaryColor: string;
  accentColor: string;
  pwaEnabled: boolean;
  offlineSupport: boolean;
  pinnedAgentEnabled: boolean;
  pinnedAgentName: string;
  navigationTabs: AppNavTab[];
  bundledForms: BundledFormItem[];
  quickActionTiles: Array<{ id: string; title: string; subtitle: string; icon: string; tabId: string }>;
}

interface StudioAppDesignTabProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  siteOrigin?: string;
  onOpenLiveApp?: (slug: string) => void;
}

const DEFAULT_ICONS = ['Wrench', 'Flame', 'HeartPulse', 'Car', 'Building2', 'Bot', 'Sparkles', 'ShieldCheck'];

export function StudioAppDesignTab({
  formData,
  onFormDataChange,
  siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com',
  onOpenLiveApp,
}: StudioAppDesignTabProps) {
  const appSlug = useMemo(
    () => (formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'my-business-app'),
    [formData.name]
  );

  const [appConfig, setAppConfig] = useState<AppConfigState>(() => ({
    appName: formData.name ? `${formData.name} App` : 'Apex Field Service Hub',
    appSubtitle: 'Your 24/7 customer service & equipment passport app',
    appIcon: 'Wrench',
    primaryColor: formData.theme?.primaryColor || formData.primaryColor || '#059669',
    accentColor: '#10b981',
    pwaEnabled: true,
    offlineSupport: true,
    pinnedAgentEnabled: true,
    pinnedAgentName: `${(formData.name || 'Apex').split(' ')[0]} 24/7 AI Concierge`,
    navigationTabs: [
      { id: 'home', label: 'Home Hub', icon: 'Home', type: 'home' },
      { id: 'services', label: 'Book Services', icon: 'Calendar', type: 'form' },
      { id: 'ai-concierge', label: 'AI Concierge', icon: 'Bot', type: 'agent' },
      { id: 'passport', label: 'My Equipment', icon: 'ShieldCheck', type: 'passport' },
      { id: 'invoices', label: 'Pay Bills', icon: 'CreditCard', type: 'invoices' },
    ],
    bundledForms: [
      { id: 'form_1', title: formData.name || 'Emergency Service Request', fieldCount: formData.fields?.length || 6, type: 'emergency' },
      { id: 'form_2', title: 'Instant Quote Calculator', fieldCount: 5, type: 'quote' },
      { id: 'form_3', title: 'Seasonal Maintenance Tuneup', fieldCount: 4, type: 'maintenance' },
      { id: 'form_4', title: 'Customer CSAT & Review', fieldCount: 3, type: 'review' },
    ],
    quickActionTiles: [
      { id: 'tile_1', title: 'Emergency Dispatch', subtitle: 'On-call tech in 30 mins', icon: 'Flame', tabId: 'services' },
      { id: 'tile_2', title: 'Instant Price Quote', subtitle: 'Transparent pricing calculator', icon: 'CreditCard', tabId: 'services' },
      { id: 'tile_3', title: 'Equipment Passport', subtitle: 'View warranty & history', icon: 'ShieldCheck', tabId: 'passport' },
      { id: 'tile_4', title: 'Ask AI Concierge', subtitle: '24/7 Instant Diagnostics', icon: 'Bot', tabId: 'ai-concierge' },
    ],
  }));

  // Device simulator state
  const [simDevice, setSimDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [activeSimTab, setActiveSimTab] = useState<string>('home');
  const [simChatMessages, setSimChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: `Hello! 👋 I'm your ${appConfig.pinnedAgentName}. How can I help you today with quotes, equipment diagnostics, or bookings?`,
    },
  ]);
  const [simChatInput, setSimChatInput] = useState('');
  const [simChatSending, setSimChatSending] = useState(false);
  const [activeSubFormPreview, setActiveSubFormPreview] = useState<BundledFormItem | null>(null);

  const publicAppUrl = `${siteOrigin}/app/${appSlug}`;

  const handleSendSimChat = (msgText?: string) => {
    const text = (msgText || simChatInput).trim();
    if (!text || simChatSending) return;
    setSimChatMessages((prev) => [...prev, { sender: 'user', text }]);
    setSimChatInput('');
    setSimChatSending(true);

    setTimeout(() => {
      setSimChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Got it! For "${text}", our technicians are available today. Would you like me to book a priority service window or calculate an estimate?`,
        },
      ]);
      setSimChatSending(false);
    }, 600);
  };

  const handleAddNavTab = () => {
    const newId = `tab_${Date.now()}`;
    setAppConfig((prev) => ({
      ...prev,
      navigationTabs: [
        ...prev.navigationTabs,
        { id: newId, label: 'New Tab', icon: 'Layers', type: 'custom' },
      ],
    }));
    toast.success('Added navigation tab');
  };

  const handleDeleteNavTab = (tabId: string) => {
    if (appConfig.navigationTabs.length <= 1) {
      toast.error('App must have at least one navigation tab');
      return;
    }
    setAppConfig((prev) => ({
      ...prev,
      navigationTabs: prev.navigationTabs.filter((t) => t.id !== tabId),
    }));
  };

  const handleAddBundledForm = () => {
    const newForm: BundledFormItem = {
      id: `form_${Date.now()}`,
      title: 'New Service Intake Form',
      fieldCount: 4,
      type: 'custom',
    };
    setAppConfig((prev) => ({
      ...prev,
      bundledForms: [...prev.bundledForms, newForm],
    }));
    toast.success('Attached new sub-form to app');
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 select-none font-sans">
      {/* ─── LEFT: APP DESIGN CONTROLS & SETTINGS (Scrollable) ─── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] border-r border-border/80 bg-background flex flex-col h-full overflow-hidden shrink-0">
        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-purple-50/40 dark:bg-purple-950/20">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
              <Smartphone className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Turnkey AI App Studio</h3>
              <p className="text-[11px] text-muted-foreground">PWA Shell, Multi-Form Workflows &amp; AI Concierge</p>
            </div>
          </div>
          <Badge className="bg-purple-600 text-white text-[9px] font-bold">PWA APP</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 1. APP BRANDING & PWA MANIFEST */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Palette className="size-3.5 text-purple-600" />
                App Identity &amp; PWA Manifest
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">App Title (Home Screen Name)</Label>
                <Input
                  value={appConfig.appName}
                  onChange={(e) => setAppConfig((p) => ({ ...p, appName: e.target.value }))}
                  className="text-xs h-8"
                  placeholder="e.g. Apex Air Contractor Hub"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">App Tagline / Subtitle</Label>
                <Input
                  value={appConfig.appSubtitle}
                  onChange={(e) => setAppConfig((p) => ({ ...p, appSubtitle: e.target.value }))}
                  className="text-xs h-8"
                  placeholder="e.g. Your 24/7 service & equipment portal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Theme Color */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={appConfig.primaryColor}
                      onChange={(e) => setAppConfig((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="w-9 h-8 p-0.5 rounded-lg cursor-pointer"
                    />
                    <Input
                      value={appConfig.primaryColor}
                      onChange={(e) => setAppConfig((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="text-xs font-mono h-8"
                    />
                  </div>
                </div>

                {/* App Icon Picker */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">App Icon</Label>
                  <div className="flex items-center gap-1">
                    {DEFAULT_ICONS.slice(0, 5).map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setAppConfig((p) => ({ ...p, appIcon: ic }))}
                        className={`size-8 rounded-lg border flex items-center justify-center transition-all ${
                          appConfig.appIcon === ic
                            ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/60 font-bold'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {ic === 'Wrench' && <Wrench className="size-3.5" />}
                        {ic === 'Flame' && <Flame className="size-3.5" />}
                        {ic === 'HeartPulse' && <HeartPulse className="size-3.5" />}
                        {ic === 'Car' && <Car className="size-3.5" />}
                        {ic === 'Building2' && <Building2 className="size-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PWA Settings Switchers */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">1-Tap PWA Installation</p>
                    <p className="text-[10px] text-muted-foreground">Prompts iOS &amp; Android users to install to home screen</p>
                  </div>
                  <Switch
                    checked={appConfig.pwaEnabled}
                    onCheckedChange={(v) => setAppConfig((p) => ({ ...p, pwaEnabled: v }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. NAVIGATION TABS ARCHITECTURE */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-purple-600" />
                Bottom Navigation Tabs ({appConfig.navigationTabs.length})
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={handleAddNavTab} className="h-6 px-2 text-[10px] font-bold text-purple-600 hover:text-purple-700">
                <Plus className="size-3 mr-1" /> Add Tab
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {appConfig.navigationTabs.map((tab, idx) => (
                <div key={tab.id} className="p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground w-4">{idx + 1}.</span>
                    <Input
                      value={tab.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAppConfig((prev) => ({
                          ...prev,
                          navigationTabs: prev.navigationTabs.map((t) => (t.id === tab.id ? { ...t, label: val } : t)),
                        }));
                      }}
                      className="h-7 text-xs w-36 font-semibold"
                    />
                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                      {tab.type}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNavTab(tab.id)}
                    className="text-muted-foreground hover:text-red-500 p-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. BUNDLED SUB-FORMS SUITE */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-purple-600" />
                Bundled Sub-Forms ({appConfig.bundledForms.length})
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={handleAddBundledForm} className="h-6 px-2 text-[10px] font-bold text-purple-600 hover:text-purple-700">
                <Plus className="size-3 mr-1" /> Attach Form
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {appConfig.bundledForms.map((f) => (
                <div key={f.id} className="p-2.5 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">{f.title}</span>
                    <Badge variant="secondary" className="text-[9px] font-mono shrink-0">{f.fieldCount} fields</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveSubFormPreview(f)}
                    className="h-6 text-[10px] px-2 font-semibold"
                  >
                    Preview
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 4. PINNED 24/7 AI CONCIERGE DOCK */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bot className="size-3.5 text-purple-600" />
                  Pinned 24/7 AI Concierge
                </CardTitle>
                <Switch
                  checked={appConfig.pinnedAgentEnabled}
                  onCheckedChange={(v) => setAppConfig((p) => ({ ...p, pinnedAgentEnabled: v }))}
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Assistant Persona Name</Label>
                <Input
                  value={appConfig.pinnedAgentName}
                  onChange={(e) => setAppConfig((p) => ({ ...p, pinnedAgentName: e.target.value }))}
                  className="text-xs h-8"
                  placeholder="e.g. Apex 24/7 AI Master Tech"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── RIGHT: LIVE INTERACTIVE APP SIMULATOR (Mobile & Desktop) ─── */}
      <div className="flex-1 min-h-0 h-full flex flex-col bg-slate-900 text-white overflow-hidden">
        {/* Device Switcher & Launch Header */}
        <div className="h-12 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Smartphone className="size-4 text-purple-400" />
              Live App Preview
            </span>
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSimDevice('mobile')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  simDevice === 'mobile' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                📱 Mobile PWA
              </button>
              <button
                type="button"
                onClick={() => setSimDevice('desktop')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  simDevice === 'desktop' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                🖥️ Desktop Portal
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={publicAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md"
            >
              Open Live App <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        {/* Center Canvas / Device Frame */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex items-center justify-center">
          {simDevice === 'mobile' ? (
            /* ─── IPHONE 16 PRO MOBILE FRAME ─── */
            <div className="w-[360px] h-[680px] bg-slate-950 rounded-[44px] border-[6px] border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
              {/* Dynamic Island / Header */}
              <div className="h-6 bg-slate-950 flex items-center justify-center shrink-0 pt-1">
                <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                  <div className="size-2 rounded-full bg-slate-800 mr-2" />
                  <div className="size-2 rounded-full bg-blue-900/60" />
                </div>
              </div>

              {/* App Brand Header */}
              <div
                className="p-4 text-white shrink-0 shadow-md"
                style={{ backgroundColor: appConfig.primaryColor }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                      <Wrench className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs leading-tight">{appConfig.appName}</h4>
                      <p className="text-[10px] text-white/80 line-clamp-1">{appConfig.appSubtitle}</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white text-[8px] border-none font-bold">24/7 ONLINE</Badge>
                </div>
              </div>

              {/* Scrollable App Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-slate-900 text-slate-100">
                {activeSimTab === 'home' && (
                  <>
                    {/* Welcome Banner */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">⚡ Instant Service Hub</span>
                      <h3 className="text-sm font-black text-white">How can we help your home today?</h3>
                      <p className="text-[11px] text-slate-400">
                        Book emergency dispatch, calculate instant quote, or ask our AI technician.
                      </p>
                    </div>

                    {/* Quick Action Tiles Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {appConfig.quickActionTiles.map((tile) => (
                        <button
                          key={tile.id}
                          type="button"
                          onClick={() => setActiveSimTab(tile.tabId)}
                          className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-left space-y-1 transition-all group"
                        >
                          <div className="size-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {tile.icon === 'Flame' && <Flame className="size-4 text-rose-400" />}
                            {tile.icon === 'CreditCard' && <CreditCard className="size-4 text-blue-400" />}
                            {tile.icon === 'ShieldCheck' && <ShieldCheck className="size-4 text-emerald-400" />}
                            {tile.icon === 'Bot' && <Bot className="size-4 text-purple-400" />}
                          </div>
                          <p className="text-xs font-bold text-white line-clamp-1">{tile.title}</p>
                          <p className="text-[9px] text-slate-400 line-clamp-1">{tile.subtitle}</p>
                        </button>
                      ))}
                    </div>

                    {/* Bundled Forms Card */}
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AVAILABLE WORKFLOWS</span>
                      <div className="space-y-1.5">
                        {appConfig.bundledForms.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => setActiveSimTab('services')}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 flex items-center justify-between text-xs cursor-pointer"
                          >
                            <span className="font-semibold truncate max-w-[200px]">{f.title}</span>
                            <ChevronRight className="size-3 text-slate-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {activeSimTab === 'services' && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Available Sub-Forms</h3>
                    {appConfig.bundledForms.map((f) => (
                      <div key={f.id} className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs">{f.title}</h4>
                          <Badge variant="secondary" className="text-[9px]">{f.fieldCount} fields</Badge>
                        </div>
                        <p className="text-[10px] text-slate-400">Instant digital submission synced with CRM.</p>
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700 font-bold"
                          onClick={() => toast.success(`Opened ${f.title}`)}
                        >
                          Start Form
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {activeSimTab === 'ai-concierge' && (
                  <div className="h-full flex flex-col justify-between space-y-2 pb-2">
                    <div className="space-y-2 overflow-y-auto max-h-[380px] p-1">
                      {simChatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-purple-600 text-white rounded-br-xs'
                                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1 pt-1">
                      <Input
                        value={simChatInput}
                        onChange={(e) => setSimChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendSimChat()}
                        placeholder="Ask AI Concierge anything..."
                        className="h-8 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSendSimChat()}
                        className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                )}

                {activeSimTab === 'passport' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">🛡️ Service Passport</span>
                      <h4 className="font-bold text-xs">Customer Equipment Health</h4>
                      <p className="text-[10px] text-slate-300">Carrier Infinity 19 Heat Pump — 100% Active Warranty</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Service:</span>
                        <span className="font-bold text-emerald-400">Oct 14, 2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Next Tune-Up:</span>
                        <span className="font-bold text-amber-400">Due April 2026</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeSimTab === 'invoices' && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Bills &amp; Invoices</h3>
                    <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold">Annual Maintenance #1042</span>
                        <span className="font-mono font-bold text-emerald-400">$189.00</span>
                      </div>
                      <Button size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 font-bold">
                        1-Tap Apple Pay / Card
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation Dock */}
              <div className="h-14 bg-slate-950 border-t border-slate-800 px-2 flex items-center justify-around shrink-0">
                {appConfig.navigationTabs.map((tab) => {
                  const isActive = activeSimTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSimTab(tab.id)}
                      className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
                        isActive ? 'text-purple-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab.icon === 'Home' && <Home className="size-4" />}
                      {tab.icon === 'Calendar' && <Calendar className="size-4" />}
                      {tab.icon === 'Bot' && <Bot className="size-4" />}
                      {tab.icon === 'ShieldCheck' && <ShieldCheck className="size-4" />}
                      {tab.icon === 'CreditCard' && <CreditCard className="size-4" />}
                      {tab.icon === 'Layers' && <Layers className="size-4" />}
                      <span className="text-[9px] tracking-tight">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ─── DESKTOP PORTAL VIEW ─── */
            <div className="w-full max-w-3xl h-[580px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
              <div
                className="p-4 text-white shrink-0 flex items-center justify-between"
                style={{ backgroundColor: appConfig.primaryColor }}
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                    <Wrench className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{appConfig.appName}</h3>
                    <p className="text-xs text-white/80">{appConfig.appSubtitle}</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white text-xs font-bold">Desktop Customer Portal</Badge>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 bg-slate-900 border-r border-slate-800 p-2 space-y-1">
                  {appConfig.navigationTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSimTab(tab.id)}
                      className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-left transition-all ${
                        activeSimTab === tab.id
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-slate-400 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tab.icon === 'Home' && <Home className="size-3.5" />}
                      {tab.icon === 'Calendar' && <Calendar className="size-3.5" />}
                      {tab.icon === 'Bot' && <Bot className="size-3.5" />}
                      {tab.icon === 'ShieldCheck' && <ShieldCheck className="size-3.5" />}
                      {tab.icon === 'CreditCard' && <CreditCard className="size-3.5" />}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950 text-slate-100">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h2 className="text-base font-bold text-white">Welcome to {appConfig.appName}</h2>
                    <p className="text-xs text-slate-400">
                      Access all services, emergency dispatch, live equipment health, and 24/7 AI concierge.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {appConfig.bundledForms.map((f) => (
                      <div key={f.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <h4 className="font-bold text-xs text-white">{f.title}</h4>
                        <p className="text-[11px] text-slate-400">Ready to accept submissions.</p>
                        <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 font-bold">
                          Launch Form
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
