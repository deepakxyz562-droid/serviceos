'use client';

import React, { useState, useRef } from 'react';
import {
  FormAgentData,
  QuickActionButton,
  ConnectedFormRef,
  AgentChannelType,
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
  GripVertical,
  Type,
  Layers,
  Sliders,
  Paintbrush,
  RefreshCw,
  LayoutTemplate,
  Mic,
  MessageSquare,
  FileText,
  History,
  Bot,
  Globe,
  Instagram,
  Phone,
  Mail,
  Presentation,
  Send,
  MessageCircle,
  X,
  Code,
  Copy,
  Check,
  ExternalLink,
  QrCode,
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
import { COLOR_SCHEMES } from '@/lib/theme/agent-theme';
import { useAppStore } from '@/store/app-store';

interface AgentBuildTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
  availableForms?: ConnectedFormRef[];
  activeChannel?: AgentChannelType;
  mode?: 'channel_settings' | 'designer';
  onClose?: () => void;
  onPreviewPageChange?: (page: 'conversation' | 'greeting') => void;
}

export function AgentBuildTab({
  agent,
  onChange,
  availableForms = [],
  activeChannel = 'chatbot',
  mode = 'channel_settings',
  onClose,
  onPreviewPageChange,
}: AgentBuildTabProps) {
  // Chatbot subtabs: 'layout' | 'welcome' | 'forms' | 'navigation' | 'greeting'
  const [chatbotSubTab, setChatbotSubTab] = useState<'layout' | 'welcome' | 'forms' | 'navigation' | 'greeting'>('layout');
  // Designer subtabs: 'avatar' | 'style'
  const [designerSubTab, setDesignerSubTab] = useState<'avatar' | 'style'>('style');

  const [avatarMode, setAvatarMode] = useState<'gallery' | 'generate' | 'upload'>('gallery');
  const [avatarCategory, setAvatarCategory] = useState<string>('all');
  const [avatarSearch, setAvatarSearch] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('Professional female loan officer in modern office');
  const [isGeneratingAiAvatar, setIsGeneratingAiAvatar] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange({
          ...agent,
          avatarUrl: dataUrl,
        });
        toast.success('Agent avatar photo updated successfully!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const chatbotConfig = agent.channels?.chatbot || {
    enabled: true,
    layoutMode: 'floating' as const,
    position: 'right' as const,
    layoutButtonToggle: true,
    sidebarBehavior: 'overlay' as const,
    welcomeStyle: 'quick_input' as const,
    greetingToggle: true,
    placeholderMessage: 'Ask AI',
    aiGeneratedGreeting: true,
    showButtons: true,
    primaryColor: '#0284c7',
    greetingBubble: '👋 Need help? Chat with Nell!',
  };

  const updateChatbotConfig = (updater: (prev: typeof chatbotConfig) => typeof chatbotConfig) => {
    const updated = updater(chatbotConfig);
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        chatbot: updated,
      },
    });
  };

  const updateWhatsappConfig = (updates: Partial<typeof agent.channels.whatsapp>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        whatsapp: {
          ...agent.channels?.whatsapp,
          enabled: updates.enabled ?? agent.channels?.whatsapp?.enabled ?? true,
          phoneNumber: updates.phoneNumber ?? agent.channels?.whatsapp?.phoneNumber ?? '',
          welcomeTemplate: updates.welcomeTemplate ?? agent.channels?.whatsapp?.welcomeTemplate ?? '',
          paired: updates.paired ?? agent.channels?.whatsapp?.paired ?? true,
        },
      },
    });
  };

  const updatePhoneConfig = (updates: Partial<typeof agent.channels.phone>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        phone: {
          ...agent.channels?.phone,
          enabled: updates.enabled ?? agent.channels?.phone?.enabled ?? true,
          phoneNumber: updates.phoneNumber ?? agent.channels?.phone?.phoneNumber ?? '',
          voiceId: updates.voiceId ?? agent.channels?.phone?.voiceId ?? 'default',
          recordCalls: updates.recordCalls ?? agent.channels?.phone?.recordCalls ?? true,
          forwardingNumber: updates.forwardingNumber ?? agent.channels?.phone?.forwardingNumber ?? '',
        },
      },
    });
  };

  const updateInstagramConfig = (updates: Partial<typeof agent.channels.instagram>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        instagram: {
          ...agent.channels?.instagram,
          enabled: updates.enabled ?? agent.channels?.instagram?.enabled ?? true,
          accountHandle: updates.accountHandle ?? agent.channels?.instagram?.accountHandle ?? '',
          autoReply: updates.autoReply ?? agent.channels?.instagram?.autoReply ?? true,
          paired: updates.paired ?? agent.channels?.instagram?.paired ?? false,
        },
      },
    });
  };

  const updateSmsConfig = (updates: Partial<typeof agent.channels.sms>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        sms: {
          ...agent.channels?.sms,
          enabled: updates.enabled ?? agent.channels?.sms?.enabled ?? true,
          phoneNumber: updates.phoneNumber ?? agent.channels?.sms?.phoneNumber ?? '',
          optOutKeyword: updates.optOutKeyword ?? agent.channels?.sms?.optOutKeyword ?? 'STOP',
        },
      },
    });
  };

  const updateGmailConfig = (updates: Partial<typeof agent.channels.gmail>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        gmail: {
          ...agent.channels?.gmail,
          enabled: updates.enabled ?? agent.channels?.gmail?.enabled ?? true,
          autoReply: updates.autoReply ?? agent.channels?.gmail?.autoReply ?? true,
          replyDelaySeconds: updates.replyDelaySeconds ?? agent.channels?.gmail?.replyDelaySeconds ?? 30,
          signature: updates.signature ?? agent.channels?.gmail?.signature ?? '',
        },
      },
    });
  };

  const updateVoiceConfig = (updates: Partial<typeof agent.channels.voice>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        voice: {
          ...agent.channels?.voice,
          enabled: updates.enabled ?? agent.channels?.voice?.enabled ?? true,
          realtimeStreaming: updates.realtimeStreaming ?? agent.channels?.voice?.realtimeStreaming ?? true,
          voiceProvider: updates.voiceProvider ?? agent.channels?.voice?.voiceProvider ?? 'elevenlabs',
        },
      },
    });
  };

  const updateMessengerConfig = (updates: Partial<typeof agent.channels.messenger>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        messenger: {
          ...agent.channels?.messenger,
          enabled: updates.enabled ?? agent.channels?.messenger?.enabled ?? true,
          facebookPageId: updates.facebookPageId ?? agent.channels?.messenger?.facebookPageId ?? '',
          greetingMessage: updates.greetingMessage ?? agent.channels?.messenger?.greetingMessage ?? '',
        },
      },
    });
  };

  const updateCrmConfig = (updates: Partial<typeof agent.channels.crm>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        crm: {
          ...agent.channels?.crm,
          enabled: updates.enabled ?? agent.channels?.crm?.enabled ?? true,
          provider: updates.provider ?? agent.channels?.crm?.provider ?? 'fieseros',
          autoCreateLead: updates.autoCreateLead ?? agent.channels?.crm?.autoCreateLead ?? true,
          syncNotes: updates.syncNotes ?? agent.channels?.crm?.syncNotes ?? true,
        },
      },
    });
  };

  const updatePresentationConfig = (updates: Partial<typeof agent.channels.presentation>) => {
    onChange({
      ...agent,
      channels: {
        ...agent.channels,
        presentation: {
          ...agent.channels?.presentation,
          enabled: updates.enabled ?? agent.channels?.presentation?.enabled ?? true,
          slideDeckUrl: updates.slideDeckUrl ?? agent.channels?.presentation?.slideDeckUrl ?? '',
          autoPresentVoice: updates.autoPresentVoice ?? agent.channels?.presentation?.autoPresentVoice ?? true,
        },
      },
    });
  };

  const selectAvatar = (av: AgentAvatarItem) => {
    onChange({
      ...agent,
      avatarUrl: av.url,
    });
    toast.success(`Selected ${av.name} as avatar!`);
  };

  const applyColorScheme = (scheme: typeof COLOR_SCHEMES[0]) => {
    onChange({
      ...agent,
      brandColor: scheme.letterColor,
      channels: {
        ...agent.channels,
        chatbot: {
          ...agent.channels?.chatbot,
          primaryColor: scheme.letterColor,
        },
      },
      style: {
        ...(agent.style as any),
        colorSchemeId: scheme.id,
        agentBackgroundStart: scheme.bg,
        agentBackgroundEnd: scheme.endBg,
        pageBackgroundStart: scheme.bg,
        pageBackgroundEnd: scheme.endBg,
        titleColor: scheme.titleColor,
        chatBg: scheme.isDark ? '#0f172a' : '#ffffff',
        isDark: scheme.isDark,
      },
    });
    toast.success(`Applied ${scheme.name} color scheme!`);
  };

  const setThemeMode = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';
    onChange({
      ...agent,
      style: {
        ...(agent.style as any),
        isDark,
        chatBg: isDark ? '#0f172a' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#0A1551',
      },
    });
    toast.success(`Switched to ${isDark ? 'Dark' : 'Light'} theme`);
  };

  const addQuickActionButton = () => {
    const newBtn: QuickActionButton = {
      id: `qa_${Date.now()}`,
      label: 'New Button',
      actionType: 'message',
      payload: 'I would like more information.',
    };
    onChange({
      ...agent,
      quickActions: [...(agent.quickActions || []), newBtn],
    });
  };

  const removeQuickActionButton = (id: string) => {
    onChange({
      ...agent,
      quickActions: (agent.quickActions || []).filter((b) => b.id !== id),
    });
  };

  const updateQuickActionButton = (id: string, label: string) => {
    onChange({
      ...agent,
      quickActions: (agent.quickActions || []).map((b) => (b.id === id ? { ...b, label } : b)),
    });
  };

  const filteredAvatars = AVATAR_CATALOG.filter((av) => {
    const matchesCat = avatarCategory === 'all' || av.category === avatarCategory;
    const matchesSearch = !avatarSearch || av.name.toLowerCase().includes(avatarSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const whatsappPhone = agent.channels?.whatsapp?.phoneNumber || '';
  const cleanWhatsappNumber = whatsappPhone.replace(/[^0-9]/g, '');
  const whatsappWelcome = agent.channels?.whatsapp?.welcomeTemplate || `Hi! I am chatting with ${agent.name} and would like to continue on WhatsApp.`;
  const whatsappUrl = cleanWhatsappNumber ? `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(whatsappWelcome)}` : '';

  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-900 text-slate-100 select-none border-l border-slate-800">
      {/* ═══════════════════════════════════════════════════════════════════════
          TOP DRAWER HEADER (Title + Close X)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-3 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold text-slate-100 tracking-wide">
          {mode === 'designer'
            ? 'Designer'
            : `${activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)} Settings`}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors p-1"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODE 1: DESIGNER DRAWER (AVATAR | STYLE)
         ═══════════════════════════════════════════════════════════════════════ */}
      {mode === 'designer' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-slate-800 px-3">
            <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setDesignerSubTab('avatar')}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2',
                  designerSubTab === 'avatar'
                    ? 'border-purple-500 text-purple-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                AVATAR
              </button>
              <button
                type="button"
                onClick={() => setDesignerSubTab('style')}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2',
                  designerSubTab === 'style'
                    ? 'border-purple-500 text-purple-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                STYLE
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ── AVATAR TAB ── */}
            {designerSubTab === 'avatar' && (
              <div className="space-y-4">
                <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAvatarMode('gallery')}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg transition-all text-center',
                      avatarMode === 'gallery' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarMode('generate')}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg transition-all text-center',
                      avatarMode === 'generate' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    AI Generator
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarMode('upload')}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg transition-all text-center',
                      avatarMode === 'upload' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Upload
                  </button>
                </div>

                {/* Gallery Mode */}
                {avatarMode === 'gallery' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="size-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <Input
                        value={avatarSearch}
                        onChange={(e) => setAvatarSearch(e.target.value)}
                        placeholder="Search 36+ realistic avatars..."
                        className="pl-8 text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1">
                      {filteredAvatars.map((av) => (
                        <div
                          key={av.id}
                          onClick={() => selectAvatar(av)}
                          className={cn(
                            'group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-square',
                            agent.avatarUrl === av.url
                              ? 'border-purple-500 ring-2 ring-purple-500/30'
                              : 'border-slate-800 hover:border-slate-600'
                          )}
                        >
                          <img src={av.url} alt={av.name} className="size-full object-cover group-hover:scale-105 transition-transform" />
                          {agent.avatarUrl === av.url && (
                            <div className="absolute top-1 right-1 size-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                              <CheckCircle2 className="size-2.5" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Generator Mode */}
                {avatarMode === 'generate' && (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-300">Prompt AI to Generate Realistic Avatar</Label>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="text-xs bg-slate-800 border-slate-700 text-slate-100 min-h-[80px]"
                    />
                    <Button
                      type="button"
                      disabled={isGeneratingAiAvatar}
                      onClick={async () => {
                        setIsGeneratingAiAvatar(true);
                        setTimeout(() => {
                          const generated = AVATAR_CATALOG[Math.floor(Math.random() * AVATAR_CATALOG.length)];
                          onChange({ ...agent, avatarUrl: generated.url });
                          setIsGeneratingAiAvatar(false);
                          toast.success('✨ Synthesized high-resolution AI avatar!');
                        }, 1200);
                      }}
                      className="w-full h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-md"
                    >
                      <Sparkles className="size-3.5" />
                      {isGeneratingAiAvatar ? 'Synthesizing Avatar...' : 'Generate Realistic Face'}
                    </Button>
                  </div>
                )}

                {/* Upload Mode */}
                {avatarMode === 'upload' && (
                  <div className="space-y-3">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />

                    {agent.avatarUrl ? (
                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={agent.avatarUrl}
                            alt="Current Avatar"
                            className="size-12 rounded-full object-cover border-2 border-purple-500 shadow-xs"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-200">Active Avatar Photo</p>
                            <p className="text-[10px] text-slate-400">Custom profile photo applied</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => avatarFileInputRef.current?.click()}
                            className="h-7 text-xs border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 gap-1"
                          >
                            <Upload className="size-3" /> Change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              onChange({
                                ...agent,
                                avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                              });
                              toast.info('Avatar reset to default');
                            }}
                            className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center space-y-2 hover:border-purple-500 hover:bg-purple-950/10 transition-all cursor-pointer"
                    >
                      <div className="size-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                        <Upload className="size-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-200">Upload New Photo</p>
                      <p className="text-[10px] text-slate-400">PNG, JPG or WebP up to 5MB</p>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          avatarFileInputRef.current?.click();
                        }}
                      >
                        Choose File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STYLE TAB ── */}
            {designerSubTab === 'style' && (
              <div className="space-y-4">
                {/* 1. Theme Mode Switcher */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">THEME MODE</Label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-800/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setThemeMode('light')}
                      className={cn(
                        'py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
                        !agent.style?.isDark && (agent.style?.chatBg === '#ffffff' || !agent.style?.chatBg)
                          ? 'bg-white text-slate-900 shadow-sm font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <span>☀️</span> Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('dark')}
                      className={cn(
                        'py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
                        agent.style?.isDark || agent.style?.chatBg === '#0f172a'
                          ? 'bg-slate-950 text-white shadow-sm font-bold border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <span>🌙</span> Dark
                    </button>
                  </div>
                </div>

                {/* 2. Curated Color Presets */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">PRESET SCHEMES</Label>
                    <span className="text-[10px] text-slate-400">8 Styles</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_SCHEMES.map((scheme) => (
                      <div
                        key={scheme.id}
                        onClick={() => applyColorScheme(scheme)}
                        className={cn(
                          'p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 aspect-square relative',
                          (agent.style?.colorSchemeId === scheme.id || (!agent.style?.colorSchemeId && agent.brandColor === scheme.letterColor))
                            ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md scale-105'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-800/40'
                        )}
                        style={{
                          background: `linear-gradient(135deg, ${scheme.bg}, ${scheme.endBg})`,
                        }}
                      >
                        <span
                          className="text-lg font-black"
                          style={{ color: scheme.titleColor }}
                        >
                          A
                        </span>
                        <span className="text-[9px] font-bold text-slate-900 truncate max-w-[48px]">
                          {scheme.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Custom Color Pickers */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">CUSTOM COLORS</Label>

                  {/* Primary Brand Color */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Primary Brand Color</p>
                      <p className="text-[10px] text-slate-400">Top bar, user bubble & accents</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={agent.brandColor || '#0284c7'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange({
                            ...agent,
                            brandColor: val,
                            channels: {
                              ...agent.channels,
                              chatbot: {
                                ...agent.channels?.chatbot,
                                primaryColor: val,
                              },
                            },
                          });
                        }}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {agent.brandColor || '#0284c7'}
                      </span>
                    </div>
                  </div>

                  {/* Chat Background Color */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Chat Window Background</p>
                      <p className="text-[10px] text-slate-400">Custom body backdrop hex</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={agent.style?.chatBg || '#ffffff'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange({
                            ...agent,
                            style: {
                              ...(agent.style as any),
                              chatBg: val,
                            },
                          });
                        }}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {agent.style?.chatBg || '#ffffff'}
                      </span>
                    </div>
                  </div>

                  {/* Header Title Color */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Header Title Color</p>
                      <p className="text-[10px] text-slate-400">Agent top bar name text</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={agent.style?.titleColor || '#ffffff'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange({
                            ...agent,
                            style: {
                              ...(agent.style as any),
                              titleColor: val,
                            },
                          });
                        }}
                        className="size-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {agent.style?.titleColor || '#ffffff'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Agent Identity */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">AGENT IDENTITY</Label>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-300">Agent Name</span>
                    <Input
                      value={agent.name}
                      onChange={(e) => onChange({ ...agent, name: e.target.value })}
                      className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-300">Agent Role Title</span>
                    <Input
                      value={agent.roleTitle}
                      onChange={(e) => onChange({ ...agent, roleTitle: e.target.value })}
                      className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-300">Status Indicator Text</span>
                    <Input
                      value={agent.statusText || 'Online'}
                      onChange={(e) => onChange({ ...agent, statusText: e.target.value })}
                      placeholder="Online / Ready to help"
                      className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODE 2: CHATBOT SETTINGS (LAYOUT | WELCOME | NAVIGATION | GREETING)
         ═══════════════════════════════════════════════════════════════════════ */}
      {mode === 'channel_settings' && activeChannel === 'chatbot' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-tabs header */}
          <div className="border-b border-slate-800 px-2">
            <div className="grid grid-cols-5 gap-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setChatbotSubTab('layout');
                  onPreviewPageChange?.('conversation');
                }}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2 truncate',
                  chatbotSubTab === 'layout'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                LAYOUT
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatbotSubTab('welcome');
                  onPreviewPageChange?.('greeting');
                }}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2 truncate',
                  chatbotSubTab === 'welcome'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                WELCOME
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatbotSubTab('forms');
                  onPreviewPageChange?.('conversation');
                }}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2 flex items-center justify-center gap-1',
                  chatbotSubTab === 'forms'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                <span>FORMS</span>
                {(agent.connectedForms?.length ?? 0) > 0 && (
                  <span className="size-3.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold">
                    {agent.connectedForms?.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatbotSubTab('navigation');
                  onPreviewPageChange?.('conversation');
                }}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2 truncate',
                  chatbotSubTab === 'navigation'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                NAV
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatbotSubTab('greeting');
                  onPreviewPageChange?.('conversation');
                }}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2 truncate',
                  chatbotSubTab === 'greeting'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                GREETING
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ── 1. LAYOUT TAB (Screenshot 1) ── */}
            {chatbotSubTab === 'layout' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">LAYOUT</Label>
                  <p className="text-[11px] text-slate-400">Choose how the chatbot appears on your website</p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Floating Card */}
                    <div
                      onClick={() => updateChatbotConfig((prev) => ({ ...prev, layoutMode: 'floating' }))}
                      className={cn(
                        'p-2.5 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-2 bg-slate-800/80',
                        chatbotConfig.layoutMode === 'floating'
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-slate-700 hover:border-slate-600'
                      )}
                    >
                      <div className="w-full h-20 bg-slate-900/60 rounded-lg p-2 flex flex-col justify-end items-end relative overflow-hidden border border-slate-700/60">
                        <div className="w-10 h-12 bg-blue-500/20 border border-blue-400 rounded-md p-1 flex flex-col gap-0.5">
                          <div className="size-2 rounded-full bg-blue-400" />
                          <div className="w-full h-1 bg-slate-500/40 rounded" />
                          <div className="w-3/4 h-1 bg-slate-500/40 rounded" />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-200">Floating</span>
                    </div>

                    {/* Sidebar Card */}
                    <div
                      onClick={() => updateChatbotConfig((prev) => ({ ...prev, layoutMode: 'sidebar' }))}
                      className={cn(
                        'p-2.5 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-2 bg-slate-800/80',
                        chatbotConfig.layoutMode === 'sidebar'
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-slate-700 hover:border-slate-600'
                      )}
                    >
                      <div className="w-full h-20 bg-slate-900/60 rounded-lg p-1 flex justify-end relative overflow-hidden border border-slate-700/60">
                        <div className="w-10 h-full bg-blue-500/20 border-l border-blue-400 p-1 flex flex-col gap-1">
                          <div className="size-2 rounded-full bg-blue-400" />
                          <div className="w-full h-1 bg-slate-500/40 rounded" />
                          <div className="w-full h-1 bg-slate-500/40 rounded" />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-200">Sidebar</span>
                    </div>
                  </div>
                </div>

                {/* POSITION (Left vs Right) */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">POSITION</Label>
                  <p className="text-[11px] text-slate-400">Choose the chatbot&apos;s position on your website</p>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="radio"
                        name="position"
                        checked={chatbotConfig.position === 'left'}
                        onChange={() => updateChatbotConfig((prev) => ({ ...prev, position: 'left' }))}
                        className="text-blue-500"
                      />
                      <span>Left</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="radio"
                        name="position"
                        checked={chatbotConfig.position === 'right'}
                        onChange={() => updateChatbotConfig((prev) => ({ ...prev, position: 'right' }))}
                        className="text-blue-500"
                      />
                      <span>Right</span>
                    </label>
                  </div>
                </div>

                {/* LAYOUT BUTTON Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-slate-800">
                  <div className="space-y-0.5 max-w-[260px]">
                    <p className="text-xs font-bold text-slate-200">LAYOUT BUTTON</p>
                    <p className="text-[11px] text-slate-400">Allow users to change your agent&apos;s layout</p>
                  </div>
                  <Switch
                    checked={chatbotConfig.layoutButtonToggle}
                    onCheckedChange={(c) => updateChatbotConfig((prev) => ({ ...prev, layoutButtonToggle: c }))}
                  />
                </div>

                {/* SIDEBAR BEHAVIOR (Overlay Panel vs Push Content) */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    SIDEBAR BEHAVIOR
                  </Label>
                  <p className="text-[11px] text-slate-400">
                    By default, the sidebar takes the entire height of your website.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <label
                      onClick={() => updateChatbotConfig((prev) => ({ ...prev, sidebarBehavior: 'overlay' }))}
                      className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg bg-slate-800/40 border border-slate-700/60"
                    >
                      <input
                        type="radio"
                        name="sidebarBehavior"
                        checked={chatbotConfig.sidebarBehavior === 'overlay'}
                        onChange={() => updateChatbotConfig((prev) => ({ ...prev, sidebarBehavior: 'overlay' }))}
                        className="mt-0.5 text-blue-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-200">Overlay Panel</p>
                        <p className="text-[10px] text-slate-400">
                          Your agent will appear above your page as a layered panel when sidebar layout is selected.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => updateChatbotConfig((prev) => ({ ...prev, sidebarBehavior: 'push' }))}
                      className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg bg-slate-800/40 border border-slate-700/60"
                    >
                      <input
                        type="radio"
                        name="sidebarBehavior"
                        checked={chatbotConfig.sidebarBehavior === 'push'}
                        onChange={() => updateChatbotConfig((prev) => ({ ...prev, sidebarBehavior: 'push' }))}
                        className="mt-0.5 text-blue-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-200">Push Content</p>
                        <p className="text-[10px] text-slate-400">
                          Your agent will appear next to your page and push the content automatically when sidebar layout is selected.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. WELCOME TAB (Screenshot 4) ── */}
            {chatbotSubTab === 'welcome' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300">Welcome Style</Label>
                  <p className="text-[11px] text-slate-400">
                    Choose how the chatbot is displayed on your website when minimized.
                  </p>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="radio"
                        name="welcomeStyle"
                        checked={chatbotConfig.welcomeStyle === 'avatar'}
                        onChange={() => updateChatbotConfig((prev) => ({ ...prev, welcomeStyle: 'avatar' }))}
                        className="text-blue-500"
                      />
                      <span>Avatar</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="radio"
                        name="welcomeStyle"
                        checked={chatbotConfig.welcomeStyle === 'quick_input'}
                        onChange={() => updateChatbotConfig((prev) => ({ ...prev, welcomeStyle: 'quick_input' }))}
                        className="text-blue-500"
                      />
                      <span>Quick Input</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-800">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Greeting</p>
                    <p className="text-[11px] text-slate-400">Show a message to greet users</p>
                  </div>
                  <Switch
                    checked={chatbotConfig.greetingToggle}
                    onCheckedChange={(c) => updateChatbotConfig((prev) => ({ ...prev, greetingToggle: c }))}
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <Label className="text-xs font-bold text-slate-300">Placeholder Message</Label>
                  <p className="text-[11px] text-slate-400">Set a placeholder text for the chat input field</p>
                  <Input
                    value={chatbotConfig.placeholderMessage || 'Ask AI'}
                    onChange={(e) => updateChatbotConfig((prev) => ({ ...prev, placeholderMessage: e.target.value }))}
                    className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <Label className="text-xs font-bold text-slate-300">Avatar Bubble Greeting Tooltip</Label>
                  <p className="text-[11px] text-slate-400">Shown next to the circular avatar bubble</p>
                  <Input
                    value={chatbotConfig.greetingBubble || `👋 Need help? Chat with ${agent.name}!`}
                    onChange={(e) => updateChatbotConfig((prev) => ({ ...prev, greetingBubble: e.target.value }))}
                    className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* ── 3. FORMS TAB (Dedicated Connected Forms Manager) ── */}
            {chatbotSubTab === 'forms' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                    <FileText className="size-3.5" />
                    <span>Connected Forms Engine</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Forms connected here are automatically accessible in chat, suggested when visitors ask about quotes or appointments, and rendered as interactive cards.
                  </p>
                </div>

                {/* Primary Connected Form */}
                {agent.connectedForms && agent.connectedForms.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-800/90 border-2 border-blue-500/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 flex items-center gap-1">
                        <Sparkles className="size-3 text-amber-400" /> Primary Connected Form
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold">
                        Auto-attached in Greeting
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-100 text-xs truncate">{agent.connectedForms[0].name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{agent.connectedForms[0].description || 'Form responses auto-create CRM leads & calendar bookings'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 shrink-0"
                        onClick={() => {
                          const updated = agent.connectedForms.slice(1);
                          onChange({ ...agent, connectedForms: updated });
                          toast.success(`Removed primary form "${agent.connectedForms[0].name}"`);
                        }}
                        title="Disconnect form"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Additional Connected Forms */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">
                      All Connected Forms ({(agent.connectedForms || []).length})
                    </span>
                  </div>

                  {(agent.connectedForms || []).length > 1 ? (
                    <div className="space-y-1.5">
                      {agent.connectedForms.slice(1).map((cf) => (
                        <div key={cf.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-semibold text-slate-200 truncate">{cf.name}</p>
                            {cf.description && <p className="text-[10px] text-slate-400 truncate">{cf.description}</p>}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                            onClick={() => {
                              const updated = (agent.connectedForms || []).filter((f) => f.id !== cf.id);
                              onChange({ ...agent, connectedForms: updated });
                              toast.success(`Removed form "${cf.name}"`);
                            }}
                            title="Disconnect form"
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (agent.connectedForms || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 text-center space-y-1.5">
                      <p className="text-xs font-semibold text-slate-300">No forms connected yet</p>
                      <p className="text-[10px] text-slate-400">Connect an existing form or attach a 1-click starter form below.</p>
                    </div>
                  ) : null}

                  {/* Connect Available Forms from Account */}
                  {availableForms.filter((af) => !(agent.connectedForms || []).some((cf) => cf.id === af.id)).length > 0 && (
                    <div className="pt-2">
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">Available forms in your account:</label>
                      <div className="space-y-1">
                        {availableForms
                          .filter((af) => !(agent.connectedForms || []).some((cf) => cf.id === af.id))
                          .map((af) => (
                            <button
                              key={af.id}
                              type="button"
                              onClick={() => {
                                const newConnected = [...(agent.connectedForms || []), { id: af.id, name: af.name, description: af.description }];
                                onChange({ ...agent, connectedForms: newConnected });
                                toast.success(`Connected form "${af.name}" to AI Agent`);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left text-xs transition-colors"
                            >
                              <span className="text-slate-300 truncate max-w-[200px]">{af.name}</span>
                              <span className="text-[10px] text-blue-400 font-bold flex items-center gap-0.5">
                                <Plus className="size-3" /> Connect
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 1-Click Starter Forms */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="text-[10px] font-bold text-slate-300 block">✨ 1-Click Starter AI Forms:</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { id: `form_booking_${agent.id || 'default'}`, name: `${agent.name} - Consultation Booking Form`, description: 'Collect respondent contact details & appointment timeslot' },
                        { id: `form_intake_${agent.id || 'default'}`, name: `${agent.name} - Service Intake Form`, description: 'Capture customer requirements, timeline, and budget' },
                      ].filter((sf) => !(agent.connectedForms || []).some((cf) => cf.id === sf.id)).map((sf) => (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => {
                            const updated = [...(agent.connectedForms || []), sf];
                            onChange({ ...agent, connectedForms: updated });
                            toast.success(`Attached "${sf.name}" to AI Agent!`);
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-700/50 text-left text-xs transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-blue-200 truncate">{sf.name}</p>
                            <p className="text-[9px] text-blue-300/80 truncate">{sf.description}</p>
                          </div>
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-md font-bold shrink-0">
                            + Connect
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. NAVIGATION TAB (Screenshot 3 - 6 exact switches + WhatsApp Phone Number configuration) ── */}
            {chatbotSubTab === 'navigation' && (
              <div className="space-y-3">
                {/* 1. Chat */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Chat</p>
                    <p className="text-[10px] text-slate-400">Allow users to chat with your agent</p>
                  </div>
                  <Switch
                    checked={agent.navigation?.chatEnabled ?? true}
                    onCheckedChange={(c) => onChange({ ...agent, navigation: { ...agent.navigation, chatEnabled: c } })}
                  />
                </div>

                {/* 2. Voice */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Voice</p>
                    <p className="text-[10px] text-slate-400">Allow users to talk with your agent</p>
                  </div>
                  <Switch
                    checked={agent.navigation?.voiceEnabled ?? true}
                    onCheckedChange={(c) => onChange({ ...agent, navigation: { ...agent.navigation, voiceEnabled: c } })}
                  />
                </div>

                {/* 3. Whatsapp with Inline Number Configuration */}
                <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="size-3.5 text-emerald-400" />
                        <p className="text-xs font-bold text-slate-200">WhatsApp Support</p>
                      </div>
                      <p className="text-[10px] text-slate-400">Provide direct support via WhatsApp</p>
                    </div>
                    <Switch
                      checked={agent.navigation?.whatsappEnabled ?? false}
                      onCheckedChange={(c) => {
                        onChange({
                          ...agent,
                          navigation: { ...agent.navigation, whatsappEnabled: c },
                          channels: {
                            ...agent.channels,
                            whatsapp: {
                              ...agent.channels?.whatsapp,
                              enabled: c,
                              phoneNumber: agent.channels?.whatsapp?.phoneNumber || '',
                              welcomeTemplate: agent.channels?.whatsapp?.welcomeTemplate || '',
                              paired: true,
                            },
                          },
                        });
                      }}
                    />
                  </div>

                  {/* Inline Number Config when WhatsApp is Enabled */}
                  {(agent.navigation?.whatsappEnabled ?? false) && (
                    <div className="pt-2 border-t border-slate-700/60 space-y-2.5 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-300">WhatsApp Phone Number</span>
                        <Input
                          placeholder="+1 (555) 019-2834"
                          value={whatsappPhone}
                          onChange={(e) => updateWhatsappConfig({ phoneNumber: e.target.value })}
                          className="text-xs h-7 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-300">Pre-filled Message</span>
                        <Input
                          placeholder="Hi! I would like to chat on WhatsApp."
                          value={agent.channels?.whatsapp?.welcomeTemplate || ''}
                          onChange={(e) => updateWhatsappConfig({ welcomeTemplate: e.target.value })}
                          className="text-xs h-7 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>

                      {whatsappUrl && (
                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <span className="text-emerald-400 font-medium">wa.me/{cleanWhatsappNumber}</span>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            Test Link <ExternalLink className="size-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Forms */}
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-200">Forms</p>
                      <p className="text-[10px] text-slate-400">Allow users to view and fill connected forms</p>
                    </div>
                    <Switch
                      checked={agent.navigation?.formsEnabled ?? true}
                      onCheckedChange={(c) => onChange({ ...agent, navigation: { ...agent.navigation, formsEnabled: c } })}
                    />
                  </div>

                  {(agent.navigation?.formsEnabled ?? true) && (
                    <div className="pt-2 border-t border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300">Connected Forms ({(agent.connectedForms || []).length})</span>
                      </div>

                      {/* List of currently connected forms */}
                      {(agent.connectedForms || []).length > 0 ? (
                        <div className="space-y-1.5">
                          {agent.connectedForms.map((cf) => (
                            <div key={cf.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs">
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-semibold text-slate-200 truncate">{cf.name}</p>
                                {cf.description && <p className="text-[10px] text-slate-400 truncate">{cf.description}</p>}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                                onClick={() => {
                                  const updated = (agent.connectedForms || []).filter((f) => f.id !== cf.id);
                                  onChange({ ...agent, connectedForms: updated });
                                  toast.success(`Removed form "${cf.name}"`);
                                }}
                                title="Disconnect form"
                              >
                                <X className="size-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No forms attached to this agent yet.</p>
                      )}

                      {/* Dropdown / list of available forms to connect */}
                      {availableForms.filter((af) => !(agent.connectedForms || []).some((cf) => cf.id === af.id)).length > 0 && (
                        <div className="pt-1.5">
                          <label className="text-[10px] font-medium text-slate-400 block mb-1">Add available form:</label>
                          <div className="space-y-1">
                            {availableForms
                              .filter((af) => !(agent.connectedForms || []).some((cf) => cf.id === af.id))
                              .map((af) => (
                                <button
                                  key={af.id}
                                  type="button"
                                  onClick={() => {
                                    const newConnected = [...(agent.connectedForms || []), { id: af.id, name: af.name, description: af.description }];
                                    onChange({ ...agent, connectedForms: newConnected });
                                    toast.success(`Connected form "${af.name}" to AI Agent`);
                                  }}
                                  className="w-full flex items-center justify-between p-1.5 rounded bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 text-left text-xs transition-colors"
                                >
                                  <span className="text-slate-300 truncate max-w-[180px]">{af.name}</span>
                                  <span className="text-[10px] text-blue-400 font-bold flex items-center gap-0.5">
                                    <Plus className="size-3" /> Connect
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* 1-Click Starter Form Connector */}
                      <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                        <label className="text-[10px] font-medium text-slate-400 block">1-Click Starter Forms:</label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {[
                            { id: `form_booking_${agent.id || 'default'}`, name: `${agent.name} - Consultation Booking Form`, description: 'Collect respondent contact details & appointment timeslot' },
                            { id: `form_intake_${agent.id || 'default'}`, name: `${agent.name} - Service Intake Form`, description: 'Capture customer requirements, timeline, and budget' },
                          ].filter((sf) => !(agent.connectedForms || []).some((cf) => cf.id === sf.id)).map((sf) => (
                            <button
                              key={sf.id}
                              type="button"
                              onClick={() => {
                                const updated = [...(agent.connectedForms || []), sf];
                                onChange({ ...agent, connectedForms: updated });
                                toast.success(`Attached "${sf.name}" to AI Agent!`);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-700/50 text-left text-xs transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-semibold text-blue-200 truncate">{sf.name}</p>
                                <p className="text-[9px] text-blue-300/80 truncate">{sf.description}</p>
                              </div>
                              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold shrink-0">
                                + Connect
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Presentation */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Presentation</p>
                    <p className="text-[10px] text-slate-400">Allow users to view your agent&apos;s presentations</p>
                  </div>
                  <Switch
                    checked={agent.navigation?.presentationEnabled ?? false}
                    onCheckedChange={(c) => onChange({ ...agent, navigation: { ...agent.navigation, presentationEnabled: c } })}
                  />
                </div>

                {/* 6. Chat history */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Chat history</p>
                    <p className="text-[10px] text-slate-400">Allow users to view previous conversations</p>
                  </div>
                  <Switch
                    checked={agent.navigation?.historyEnabled ?? true}
                    onCheckedChange={(c) => onChange({ ...agent, navigation: { ...agent.navigation, historyEnabled: c } })}
                  />
                </div>
              </div>
            )}

            {/* ── 4. GREETING TAB (Screenshot 5) ── */}
            {chatbotSubTab === 'greeting' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-slate-200">AI Generated Greeting Message</p>
                  <Switch
                    checked={chatbotConfig.aiGeneratedGreeting}
                    onCheckedChange={(c) => updateChatbotConfig((prev) => ({ ...prev, aiGeneratedGreeting: c }))}
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-slate-200">Show Buttons</p>
                  <Switch
                    checked={chatbotConfig.showButtons}
                    onCheckedChange={(c) => updateChatbotConfig((prev) => ({ ...prev, showButtons: c }))}
                  />
                </div>

                {chatbotConfig.showButtons && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-bold text-slate-300">Buttons</Label>
                    <div className="space-y-2">
                      {(agent.quickActions || []).map((b) => (
                        <div key={b.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-700">
                          <GripVertical className="size-3.5 text-slate-400 cursor-grab shrink-0" />
                          <Input
                            value={b.label}
                            onChange={(e) => updateQuickActionButton(b.id, e.target.value)}
                            className="text-xs h-7 bg-transparent border-0 text-slate-100 font-medium focus-visible:ring-0 p-0"
                          />
                          <button
                            type="button"
                            onClick={() => removeQuickActionButton(b.id)}
                            className="text-slate-400 hover:text-rose-400 p-1 shrink-0"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addQuickActionButton}
                        className="w-full h-8 text-xs font-bold gap-1 bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700"
                      >
                        <Plus className="size-3.5" /> Add New Button
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODE 3: OTHER 10 CHANNEL SETTINGS DRAWERS
         ═══════════════════════════════════════════════════════════════════════ */}
      {mode === 'channel_settings' && activeChannel !== 'chatbot' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 capitalize">{activeChannel} Channel</span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                Ready to Deploy
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Configure parameters, automated routing, webhooks, and rules for {activeChannel}.
            </p>
          </div>

          {/* Standalone Channel Settings */}
          {activeChannel === 'standalone' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Public Agent URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`https://fieseros.com/chat/${agent.slug || agent.id}`}
                    className="text-xs h-8 bg-slate-800 border-slate-700 font-mono text-slate-200"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://fieseros.com/chat/${agent.slug || agent.id}`);
                      toast.success('Agent URL copied to clipboard!');
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Full-Page Background Mode</Label>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                  <span className="text-xs text-slate-200">Show Brand Gradient Backdrop</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Channel Settings */}
          {activeChannel === 'whatsapp' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">WhatsApp Business Number</Label>
                <Input
                  placeholder="+1 (555) 019-2834"
                  value={whatsappPhone}
                  onChange={(e) => updateWhatsappConfig({ phoneNumber: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
                <p className="text-[10px] text-slate-400">Enter full international format including country code</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Default WhatsApp Greeting Message</Label>
                <Textarea
                  value={agent.channels?.whatsapp?.welcomeTemplate || `Hi! I am ${agent.name}, your AI Assistant. How can I help you today?`}
                  onChange={(e) => updateWhatsappConfig({ welcomeTemplate: e.target.value })}
                  className="text-xs bg-slate-800 border-slate-700 text-slate-100 min-h-[60px]"
                />
              </div>

              {whatsappUrl && (
                <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                    <span>Direct WhatsApp Link</span>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      Test <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={whatsappUrl}
                      className="text-[11px] h-7 bg-slate-900 border-slate-700 font-mono text-slate-300"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(whatsappUrl);
                        toast.success('WhatsApp link copied!');
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phone Channel Settings */}
          {activeChannel === 'phone' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-purple-200">AI Phone Receptionist Addon</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-purple-300 border-purple-500/50 bg-purple-900/50">
                    $29 / month
                  </Badge>
                </div>
                <p className="text-[11px] text-purple-300/80 leading-relaxed">
                  Includes 1 dedicated inbound phone number + 150 AI voice minutes per month. Answers incoming calls 24/7, captures caller requests, and books appointments.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useAppStore.getState().setCurrentView('aiReceptionist')}
                  className="w-full text-xs h-7 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border-purple-500/50 font-semibold"
                >
                  Manage Addon &amp; Voice Numbers &rarr;
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Dedicated AI Reception Phone Number</Label>
                <Input
                  placeholder="+1 (800) 555-0199"
                  value={agent.channels?.phone?.phoneNumber || ''}
                  onChange={(e) => updatePhoneConfig({ phoneNumber: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
                <p className="text-[10px] text-slate-400">Your provisioned phone number routed to AI voice receptionist.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">After-Hours Emergency Escalation</Label>
                <Input
                  placeholder="+1 (555) 234-5678"
                  value={agent.channels?.phone?.forwardingNumber || ''}
                  onChange={(e) => updatePhoneConfig({ forwardingNumber: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
                <p className="text-[10px] text-slate-400">Calls transferred here if customer requests urgent human escalation.</p>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-200">Record &amp; Transcribe Calls</span>
                  <p className="text-[10px] text-slate-400">Generate transcripts and AI call summaries automatically</p>
                </div>
                <Switch
                  checked={agent.channels?.phone?.recordCalls ?? true}
                  onCheckedChange={(c) => updatePhoneConfig({ recordCalls: c })}
                />
              </div>
            </div>
          )}

          {/* Instagram Channel Settings */}
          {activeChannel === 'instagram' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Instagram Professional Handle</Label>
                <Input
                  placeholder="@yourbusiness"
                  value={agent.channels?.instagram?.accountHandle || ''}
                  onChange={(e) => updateInstagramConfig({ accountHandle: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-200">AI Direct Message Auto-Reply</span>
                  <p className="text-[10px] text-slate-400">Respond to customer DMs with form booking links and assistance</p>
                </div>
                <Switch
                  checked={agent.channels?.instagram?.autoReply ?? true}
                  onCheckedChange={(c) => updateInstagramConfig({ autoReply: c })}
                />
              </div>
            </div>
          )}

          {/* SMS Channel Settings */}
          {activeChannel === 'sms' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Inbound SMS Phone Number</Label>
                <Input
                  placeholder="+1 (555) 987-6543"
                  value={agent.channels?.sms?.phoneNumber || ''}
                  onChange={(e) => updateSmsConfig({ phoneNumber: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Opt-Out / STOP Keyword</Label>
                <Input
                  placeholder="STOP"
                  value={agent.channels?.sms?.optOutKeyword || 'STOP'}
                  onChange={(e) => updateSmsConfig({ optOutKeyword: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
              </div>
            </div>
          )}

          {/* Gmail Channel Settings */}
          {activeChannel === 'gmail' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-200">Auto-Reply to Inbound Inquiries</span>
                  <p className="text-[10px] text-slate-400">Draft or send immediate answers to inbound emails</p>
                </div>
                <Switch
                  checked={agent.channels?.gmail?.autoReply ?? true}
                  onCheckedChange={(c) => updateGmailConfig({ autoReply: c })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Reply Delay (Seconds)</Label>
                <Input
                  type="number"
                  min="0"
                  max="300"
                  value={agent.channels?.gmail?.replyDelaySeconds ?? 30}
                  onChange={(e) => updateGmailConfig({ replyDelaySeconds: parseInt(e.target.value) || 0 })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
                <p className="text-[10px] text-slate-400">Simulates human review pacing before automated dispatch.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Email Footer Signature</Label>
                <Textarea
                  placeholder="Best regards,&#10;AI Concierge Team"
                  value={agent.channels?.gmail?.signature || ''}
                  onChange={(e) => updateGmailConfig({ signature: e.target.value })}
                  className="text-xs bg-slate-800 border-slate-700 text-slate-100 min-h-[60px]"
                />
              </div>
            </div>
          )}

          {/* Voice Channel Settings */}
          {activeChannel === 'voice' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Voice Synthesis Engine</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['elevenlabs', 'openai', 'cartesia'] as const).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => updateVoiceConfig({ voiceProvider: prov })}
                      className={cn(
                        'py-2 px-2.5 rounded-lg border text-xs font-medium capitalize text-center transition-all',
                        (agent.channels?.voice?.voiceProvider || 'elevenlabs') === prov
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600',
                      )}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-200">Real-time Audio Streaming</span>
                  <p className="text-[10px] text-slate-400">Sub-500ms voice turnaround with interrupted speech handling</p>
                </div>
                <Switch
                  checked={agent.channels?.voice?.realtimeStreaming ?? true}
                  onCheckedChange={(c) => updateVoiceConfig({ realtimeStreaming: c })}
                />
              </div>
            </div>
          )}

          {/* Messenger Channel Settings */}
          {activeChannel === 'messenger' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Facebook Page ID / Username</Label>
                <Input
                  placeholder="fieseros_official"
                  value={agent.channels?.messenger?.facebookPageId || ''}
                  onChange={(e) => updateMessengerConfig({ facebookPageId: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Messenger Greeting</Label>
                <Textarea
                  placeholder="Hello! Welcome to our Facebook page. How can we help today?"
                  value={agent.channels?.messenger?.greetingMessage || ''}
                  onChange={(e) => updateMessengerConfig({ greetingMessage: e.target.value })}
                  className="text-xs bg-slate-800 border-slate-700 text-slate-100 min-h-[60px]"
                />
              </div>
            </div>
          )}

          {/* CRM Channel Settings */}
          {activeChannel === 'crm' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Target CRM System</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fieseros', 'hubspot', 'salesforce'] as const).map((crm) => (
                    <button
                      key={crm}
                      type="button"
                      onClick={() => updateCrmConfig({ provider: crm })}
                      className={cn(
                        'py-2 px-2.5 rounded-lg border text-xs font-medium capitalize text-center transition-all',
                        (agent.channels?.crm?.provider || 'fieseros') === crm
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600',
                      )}
                    >
                      {crm}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-200">Auto-Create Lead on New Inquiries</span>
                  <p className="text-[10px] text-slate-400">Automatically creates contact & customer profile in CRM</p>
                </div>
                <Switch
                  checked={agent.channels?.crm?.autoCreateLead ?? true}
                  onCheckedChange={(c) => updateCrmConfig({ autoCreateLead: c })}
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-200">Sync Notes & Transcripts</span>
                  <p className="text-[10px] text-slate-400">Append conversation summaries directly into customer timeline</p>
                </div>
                <Switch
                  checked={agent.channels?.crm?.syncNotes ?? true}
                  onCheckedChange={(c) => updateCrmConfig({ syncNotes: c })}
                />
              </div>
            </div>
          )}

          {/* Presentation Channel Settings */}
          {activeChannel === 'presentation' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Slide Deck URL</Label>
                <Input
                  placeholder="https://slides.google.com/..."
                  value={agent.channels?.presentation?.slideDeckUrl || ''}
                  onChange={(e) => updatePresentationConfig({ slideDeckUrl: e.target.value })}
                  className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-200">Auto-Present Slides with AI Voice</span>
                  <p className="text-[10px] text-slate-400">AI automatically narrates each slide during customer viewings</p>
                </div>
                <Switch
                  checked={agent.channels?.presentation?.autoPresentVoice ?? true}
                  onCheckedChange={(c) => updatePresentationConfig({ autoPresentVoice: c })}
                />
              </div>
            </div>
          )}

          {/* WordPress Channel Settings */}
          {activeChannel === 'wordpress' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">WordPress Snippet (functions.php or WPCode)</Label>
                <div className="relative">
                  <Textarea
                    readOnly
                    rows={6}
                    value={`// Add to functions.php or Code Snippets plugin:\nadd_action('wp_footer', function () {\n    ?>\n    <script src="https://fieseros.com/api/public/agents/${agent.slug || agent.id}/embed.js" async></script>\n    <?php\n});`}
                    className="text-[11px] bg-slate-800 border-slate-700 font-mono text-slate-200"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`add_action('wp_footer', function () {\n    ?>\n    <script src="https://fieseros.com/api/public/agents/${agent.slug || agent.id}/embed.js" async></script>\n    <?php\n});`);
                      toast.success('WordPress snippet copied!');
                    }}
                    className="absolute top-2 right-2 h-6 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    <Copy className="size-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1.5 text-xs text-slate-300">
                <p className="font-semibold text-white">How to Install on WordPress:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  <li>In WP Admin, install the free <strong>WPCode</strong> plugin.</li>
                  <li>Click <em>Code Snippets &rarr; Add Snippet &rarr; Custom Code</em>.</li>
                  <li>Set code type to <strong>PHP Snippet</strong> and paste the code above.</li>
                  <li>Activate the snippet to engage visitors 24/7!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Shopify Channel Settings */}
          {activeChannel === 'shopify' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Shopify Liquid Code (theme.liquid)</Label>
                <div className="relative">
                  <Textarea
                    readOnly
                    rows={4}
                    value={`<!-- Paste right before </body> in layout/theme.liquid -->\n<script src="https://fieseros.com/api/public/agents/${agent.slug || agent.id}/embed.js" async></script>`}
                    className="text-[11px] bg-slate-800 border-slate-700 font-mono text-slate-200"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`<script src="https://fieseros.com/api/public/agents/${agent.slug || agent.id}/embed.js" async></script>`);
                      toast.success('Shopify script copied!');
                    }}
                    className="absolute top-2 right-2 h-6 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    <Copy className="size-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1.5 text-xs text-slate-300">
                <p className="font-semibold text-white">How to Install on Shopify:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  <li>In Shopify Admin &rarr; <em>Online Store &rarr; Themes</em>.</li>
                  <li>Click <em>Actions &rarr; Edit code</em>.</li>
                  <li>Open <code>layout/theme.liquid</code>.</li>
                  <li>Paste the script tag directly above <code>&lt;/body&gt;</code> and save!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Agent App (PWA) Channel Settings */}
          {activeChannel === 'agent_app' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Shareable Agent Web App Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`https://fieseros.com/chat/${agent.slug || agent.id}`}
                    className="text-xs h-8 bg-slate-800 border-slate-700 font-mono text-slate-200"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://fieseros.com/chat/${agent.slug || agent.id}`);
                      toast.success('Agent App link copied!');
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2 text-xs text-slate-300">
                <p className="font-semibold text-white">Mobile PWA Capabilities:</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When visited on mobile Safari or Chrome, customers and technicians can tap <em>&quot;Add to Home Screen&quot;</em> to install your AI Agent as a standalone app with offline asset caching and full-screen UI.
                </p>
              </div>
            </div>
          )}

          {/* Canva AI Chatbot Channel Settings */}
          {activeChannel === 'canva' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Canva Website Embed Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`https://fieseros.com/chat/${agent.slug || agent.id}?embed=1`}
                    className="text-xs h-8 bg-slate-800 border-slate-700 font-mono text-slate-200"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://fieseros.com/chat/${agent.slug || agent.id}?embed=1`);
                      toast.success('Canva embed URL copied!');
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1.5 text-xs text-slate-300">
                <p className="font-semibold text-white">How to Embed in Canva:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  <li>In your Canva site editor, click <em>Apps &rarr; Embed</em> on the left bar.</li>
                  <li>Paste the URL copied above into the Canva embed field.</li>
                  <li>Resize the chatbot box to fit your site layout!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Platforms (Webflow, Wix, Squarespace, GTM, HTML) */}
          {activeChannel === 'platforms' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Universal JavaScript Embed Code</Label>
                <div className="relative">
                  <Textarea
                    readOnly
                    rows={4}
                    value={`<!-- Fieseros AI Agent Embed -->\n<script src="https://fieseros.com/api/public/agents/${agent.slug || agent.id}/embed.js" async></script>`}
                    className="text-[11px] bg-slate-800 border-slate-700 font-mono text-slate-200"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`<script src="https://fieseros.com/api/public/agents/${agent.slug || agent.id}/embed.js" async></script>`);
                      toast.success('Embed script copied!');
                    }}
                    className="absolute top-2 right-2 h-6 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    <Copy className="size-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1 text-xs text-slate-300">
                <p className="font-semibold text-white">Compatible Platforms:</p>
                <p className="text-[11px] text-slate-400">
                  Works instantly with <strong>Webflow</strong> (Custom Code), <strong>Wix</strong> (Custom Element / Tracking Tools), <strong>Squarespace</strong> (Code Injection), <strong>Google Tag Manager</strong> (Custom HTML tag), and any custom HTML website.
                </p>
              </div>
            </div>
          )}

          {/* General Webhook / API Parameters for Other Custom Channels */}
          {!['standalone', 'whatsapp', 'phone', 'instagram', 'sms', 'gmail', 'voice', 'messenger', 'crm', 'presentation', 'wordpress', 'shopify', 'agent_app', 'canva', 'platforms'].includes(activeChannel) && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Webhook / Dispatch Endpoint</Label>
                <Input
                  defaultValue={`https://api.fieseros.com/channels/${activeChannel}/webhook`}
                  className="text-xs h-8 bg-slate-800 border-slate-700 font-mono text-slate-200"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
