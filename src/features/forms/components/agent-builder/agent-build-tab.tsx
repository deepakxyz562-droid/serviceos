'use client';

import React, { useState } from 'react';
import {
  FormAgentData,
  QuickActionButton,
  ConnectedFormRef,
  AVATAR_CATALOG,
  AgentAvatarItem,
} from '@/features/forms/types/agent-types';
import {
  Sparkles,
  User,
  Palette,
  Image as ImageIcon,
  Wand2,
  Upload,
  Search,
  CheckCircle2,
  Plus,
  Trash2,
  Type,
  Layers,
  Sliders,
  Paintbrush,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentBuildTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
  availableForms?: ConnectedFormRef[];
}

const THEME_PRESETS = [
  { id: 'modern-blue', name: 'Modern Sky', pageStart: '#0f172a', pageEnd: '#1e293b', agentBg: '#0284c7', chatBg: '#ffffff', brand: '#0284c7' },
  { id: 'emerald-serene', name: 'Serene Emerald', pageStart: '#064e3b', pageEnd: '#022c22', agentBg: '#059669', chatBg: '#ffffff', brand: '#059669' },
  { id: 'midnight-dark', name: 'Midnight Obsidian', pageStart: '#030712', pageEnd: '#111827', agentBg: '#3b82f6', chatBg: '#1f2937', brand: '#3b82f6' },
  { id: 'sunset-purple', name: 'Imperial Violet', pageStart: '#2e1065', pageEnd: '#1e1b4b', agentBg: '#7c3aed', chatBg: '#ffffff', brand: '#7c3aed' },
  { id: 'pure-light', name: 'Clean Minimalist', pageStart: '#f8fafc', pageEnd: '#f1f5f9', agentBg: '#2563eb', chatBg: '#ffffff', brand: '#2563eb' },
];

const AVATAR_CATEGORIES = [
  { id: 'all', label: 'All (36)' },
  { id: 'finance', label: 'Finance & Loan' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'support', label: 'Support & Help' },
  { id: 'business', label: 'Business & Sales' },
  { id: 'tech', label: 'Tech & AI' },
  { id: 'creative', label: 'Creative' },
];

export function AgentBuildTab({
  agent,
  onChange,
  availableForms = [
    { id: 'form_loan', name: 'Loan Application Form', description: 'Full borrower financial and property intake form.' },
    { id: 'form_dental', name: 'Dental Appointment & Inquiry Form', description: 'Patient registration form' },
    { id: 'form_hvac', name: 'HVAC Service Request Form', description: 'Technician dispatch & diagnostics intake' },
  ],
}: AgentBuildTabProps) {
  const [designerTab, setDesignerTab] = useState<'avatar' | 'style' | 'quickactions'>('avatar');
  const [avatarMode, setAvatarMode] = useState<'gallery' | 'generate' | 'upload'>('gallery');
  const [avatarCategory, setAvatarCategory] = useState<string>('all');
  const [avatarSearch, setAvatarSearch] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('Professional female loan officer with warm smile in modern office setting');
  const [isGeneratingAiAvatar, setIsGeneratingAiAvatar] = useState<boolean>(false);
  const [faceSwapEnabled, setFaceSwapEnabled] = useState<boolean>(false);

  // Avatar filter
  const filteredAvatars = AVATAR_CATALOG.filter((av) => {
    const matchesCat = avatarCategory === 'all' || av.category === avatarCategory;
    const matchesSearch = !avatarSearch || av.name.toLowerCase().includes(avatarSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const selectAvatar = (av: AgentAvatarItem) => {
    onChange({
      ...agent,
      avatarUrl: av.url,
      // optional default title sync if blank
    });
    toast.success(`Selected ${av.name} as agent avatar!`);
  };

  const generateAiAvatar = () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAiAvatar(true);
    // Simulate high-quality AI avatar generation
    setTimeout(() => {
      setIsGeneratingAiAvatar(false);
      const generatedUrl = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80';
      onChange({
        ...agent,
        avatarUrl: generatedUrl,
      });
      toast.success('AI Avatar generated and applied successfully!');
    }, 1800);
  };

  const applyThemePreset = (preset: typeof THEME_PRESETS[0]) => {
    onChange({
      ...agent,
      brandColor: preset.brand,
      style: {
        themePreset: preset.id as any,
        pageBackgroundStart: preset.pageStart,
        pageBackgroundEnd: preset.pageEnd,
        chatBg: preset.chatBg,
        inputTextColor: '#0f172a',
        agentBackgroundStart: preset.agentBg,
        fontFamily: agent.style?.fontFamily || 'Plus Jakarta Sans',
        borderRadius: agent.style?.borderRadius || 'lg',
      },
    });
    toast.success(`Applied ${preset.name} theme!`);
  };

  const addQuickAction = () => {
    const newAction: QuickActionButton = {
      id: `qa_${Date.now()}`,
      label: 'New Action',
      actionType: 'message',
      payload: 'Tell me more about your services.',
    };
    onChange({
      ...agent,
      quickActions: [...(agent.quickActions || []), newAction],
    });
  };

  const removeQuickAction = (id: string) => {
    onChange({
      ...agent,
      quickActions: agent.quickActions.filter((qa) => qa.id !== id),
    });
  };

  const updateQuickAction = (id: string, updates: Partial<QuickActionButton>) => {
    onChange({
      ...agent,
      quickActions: agent.quickActions.map((qa) => (qa.id === id ? { ...qa, ...updates } : qa)),
    });
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-background text-foreground select-none">
      {/* ── TOP DESIGNER TABS: AVATAR | STYLE | ACTIONS ── */}
      <div className="p-3 pb-2 border-b border-border/70 shrink-0">
        <Tabs value={designerTab} onValueChange={(v) => setDesignerTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="avatar" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background">
              <User className="size-3.5 text-blue-600" /> AVATAR
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background">
              <Palette className="size-3.5 text-purple-600" /> STYLE
            </TabsTrigger>
            <TabsTrigger value="quickactions" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background">
              <Sparkles className="size-3.5 text-amber-500" /> ACTIONS
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── DESIGNER CONTENT SCROLL ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ═══════════════════════════════════════════════════════════════════════
            1. AVATAR DESIGNER (GALLERY 36+ | AI GENERATE | UPLOAD | FACE SWAP)
           ═══════════════════════════════════════════════════════════════════════ */}
        {designerTab === 'avatar' && (
          <div className="space-y-4">
            {/* Avatar Sub-mode switch */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/70">
              <button
                type="button"
                onClick={() => setAvatarMode('gallery')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1',
                  avatarMode === 'gallery' ? 'bg-background text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ImageIcon className="size-3" /> Gallery (36)
              </button>
              <button
                type="button"
                onClick={() => setAvatarMode('generate')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1',
                  avatarMode === 'generate' ? 'bg-background text-purple-600 shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Wand2 className="size-3" /> AI Generate
              </button>
              <button
                type="button"
                onClick={() => setAvatarMode('upload')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1',
                  avatarMode === 'upload' ? 'bg-background text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Upload className="size-3" /> Upload
              </button>
            </div>

            {/* A. GALLERY MODE */}
            {avatarMode === 'gallery' && (
              <div className="space-y-3">
                {/* Search & Category Chips */}
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={avatarSearch}
                    onChange={(e) => setAvatarSearch(e.target.value)}
                    placeholder="Search realistic avatars..."
                    className="text-xs h-8 pl-8"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {AVATAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAvatarCategory(cat.id)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-medium rounded-full shrink-0 transition-all',
                        avatarCategory === cat.id
                          ? 'bg-blue-600 text-white shadow-2xs font-bold'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 36+ Avatars Grid */}
                <div className="grid grid-cols-4 gap-2 pt-1 max-h-[380px] overflow-y-auto pr-1">
                  {filteredAvatars.map((av) => {
                    const isSelected = agent.avatarUrl === av.url;
                    return (
                      <div
                        key={av.id}
                        onClick={() => selectAvatar(av)}
                        className={cn(
                          'relative group rounded-xl p-1 border cursor-pointer transition-all aspect-square flex flex-col items-center justify-center overflow-hidden bg-muted/20',
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-xs'
                            : 'border-border/70 hover:border-border hover:shadow-2xs'
                        )}
                      >
                        <img
                          src={av.url}
                          alt={av.name}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 size-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="size-3.5" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[9px] font-bold text-white truncate text-center">{av.name.split(' ')[0]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* B. AI GENERATOR MODE */}
            {avatarMode === 'generate' && (
              <div className="space-y-3 p-4 rounded-xl border border-purple-500/30 bg-purple-50/20 dark:bg-purple-950/10">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-purple-600 text-white flex items-center justify-center text-xs">
                    <Wand2 className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">AI Avatar Generator</h4>
                    <p className="text-[10px] text-muted-foreground">Synthesize a custom ultra-realistic photorealistic persona.</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] font-semibold">Avatar Description Prompt</Label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="text-xs font-medium"
                    placeholder="e.g. Friendly male dentist in blue scrubs with glasses, bright clinical background..."
                  />
                </div>

                <Button
                  type="button"
                  disabled={isGeneratingAiAvatar}
                  onClick={generateAiAvatar}
                  className="w-full h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                >
                  {isGeneratingAiAvatar ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" /> Synthesizing AI Avatar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> Generate & Apply Avatar
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* C. UPLOAD MODE */}
            {avatarMode === 'upload' && (
              <div className="space-y-3 p-4 rounded-xl border border-dashed border-border/80 text-center bg-muted/20">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Upload className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Upload Custom Portrait</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, or WEBP up to 5MB.</p>
                </div>
                <Input
                  type="text"
                  value={agent.avatarUrl}
                  onChange={(e) => onChange({ ...agent, avatarUrl: e.target.value })}
                  placeholder="Paste image URL directly..."
                  className="text-xs h-8"
                />
              </div>
            )}

            {/* Face Swap AI Feature */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3 text-blue-600" /> Face Swap AI Mode
                </p>
                <p className="text-[10px] text-muted-foreground">Swap user or founder face onto selected avatar dynamically.</p>
              </div>
              <Switch checked={faceSwapEnabled} onCheckedChange={setFaceSwapEnabled} />
            </div>

            {/* Agent Persona Quick Edit */}
            <div className="space-y-2 pt-2 border-t border-border/70">
              <Label className="text-xs font-bold">Agent Name & Title</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={agent.name}
                  onChange={(e) => onChange({ ...agent, name: e.target.value })}
                  placeholder="Agent Name"
                  className="text-xs h-8 font-bold"
                />
                <Input
                  value={agent.roleTitle}
                  onChange={(e) => onChange({ ...agent, roleTitle: e.target.value })}
                  placeholder="Role Title"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            2. STYLE & CSS TOKENS DESIGNER
           ═══════════════════════════════════════════════════════════════════════ */}
        {designerTab === 'style' && (
          <div className="space-y-4">
            {/* Theme Presets */}
            <div>
              <Label className="text-xs font-bold">Curated Theme Presets</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {THEME_PRESETS.map((t) => {
                  const isSelected = agent.style?.themePreset === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => applyThemePreset(t)}
                      className={cn(
                        'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5',
                        isSelected ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-600' : 'border-border/70 hover:bg-muted/40'
                      )}
                    >
                      <div
                        className="size-6 rounded-full shrink-0 shadow-2xs border"
                        style={{ background: `linear-gradient(135deg, ${t.pageStart}, ${t.agentBg})` }}
                      />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Tokens */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/70">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Paintbrush className="size-3.5 text-blue-600" /> Color & Gradient Tokens
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Brand Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={agent.brandColor || '#0284c7'}
                      onChange={(e) => onChange({ ...agent, brandColor: e.target.value })}
                      className="size-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      value={agent.brandColor || '#0284c7'}
                      onChange={(e) => onChange({ ...agent, brandColor: e.target.value })}
                      className="text-xs h-7 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Background Start</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={agent.style?.pageBackgroundStart || '#0f172a'}
                      onChange={(e) =>
                        onChange({
                          ...agent,
                          style: { ...(agent.style as any), pageBackgroundStart: e.target.value },
                        })
                      }
                      className="size-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      value={agent.style?.pageBackgroundStart || '#0f172a'}
                      onChange={(e) =>
                        onChange({
                          ...agent,
                          style: { ...(agent.style as any), pageBackgroundStart: e.target.value },
                        })
                      }
                      className="text-xs h-7 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography & Radii */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/70">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Type className="size-3.5 text-purple-600" /> Typography & Rounding
              </Label>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold">Font Family</Label>
                <select
                  value={agent.style?.fontFamily || 'Plus Jakarta Sans'}
                  onChange={(e) =>
                    onChange({
                      ...agent,
                      style: { ...(agent.style as any), fontFamily: e.target.value as any },
                    })
                  }
                  className="w-full text-xs h-8 rounded-lg border border-border bg-background px-2 font-medium"
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                  <option value="Inter">Inter (Ultra Legible)</option>
                  <option value="Outfit">Outfit (Geometric Tech)</option>
                  <option value="Geist">Geist (Sleek Minimal)</option>
                  <option value="DM Sans">DM Sans (Friendly Rounded)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold">Border Radius</Label>
                <select
                  value={agent.style?.borderRadius || 'lg'}
                  onChange={(e) =>
                    onChange({
                      ...agent,
                      style: { ...(agent.style as any), borderRadius: e.target.value as any },
                    })
                  }
                  className="w-full text-xs h-8 rounded-lg border border-border bg-background px-2 font-medium"
                >
                  <option value="sm">Small (6px Rounded)</option>
                  <option value="md">Medium (10px Rounded)</option>
                  <option value="lg">Large (16px Floating Pill)</option>
                  <option value="full">Full Rounded (Bubbles)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            3. QUICK ACTIONS & GREETINGS
           ═══════════════════════════════════════════════════════════════════════ */}
        {designerTab === 'quickactions' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Welcome Greeting Headline</Label>
              <Input
                value={agent.welcomeGreeting}
                onChange={(e) => onChange({ ...agent, welcomeGreeting: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Greeting Subtitle</Label>
              <Input
                value={agent.greetingSubtitle || ''}
                onChange={(e) => onChange({ ...agent, greetingSubtitle: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            {/* Quick Actions List */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Multi-Choice Action Chips</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuickAction}
                  className="h-7 text-xs px-2 gap-1"
                >
                  <Plus className="size-3" /> Add Chip
                </Button>
              </div>

              <div className="space-y-2">
                {(agent.quickActions || []).map((qa, index) => (
                  <div
                    key={qa.id}
                    className="p-2.5 rounded-xl border border-border/80 bg-card space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground w-4">#{index + 1}</span>
                      <Input
                        value={qa.label}
                        onChange={(e) => updateQuickAction(qa.id, { label: e.target.value })}
                        placeholder="Button Label"
                        className="text-xs h-7 flex-1 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeQuickAction(qa.id)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <Input
                      value={qa.payload || ''}
                      onChange={(e) => updateQuickAction(qa.id, { payload: e.target.value })}
                      placeholder="Prompt payload on click..."
                      className="text-[11px] h-7 text-muted-foreground"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
