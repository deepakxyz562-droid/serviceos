'use client';

import React, { useState } from 'react';
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

// 8 Curated Color Schemes with Letter 'A' (Matching Screenshot 2)
const COLOR_SCHEMES = [
  { id: 'scheme_1', name: 'Sky White', bg: '#C5E3FA', endBg: '#D6E1E7', titleColor: '#0A1551', textBg: '#FFFFFF', letterColor: '#0284c7', isDark: false },
  { id: 'scheme_2', name: 'Emerald Mint', bg: '#D1FAE5', endBg: '#E0F2FE', titleColor: '#064E3B', textBg: '#FFFFFF', letterColor: '#059669', isDark: false },
  { id: 'scheme_3', name: 'Warm Amber', bg: '#FFEDD5', endBg: '#FEF3C7', titleColor: '#7C2D12', textBg: '#FFFFFF', letterColor: '#EA580C', isDark: false },
  { id: 'scheme_4', name: 'Slate Dark', bg: '#E2E8F0', endBg: '#CBD5E1', titleColor: '#0F172A', textBg: '#334155', letterColor: '#F8FAFC', isDark: true },
  { id: 'scheme_5', name: 'Olive Lime', bg: '#ECFCCB', endBg: '#F7FEE7', titleColor: '#365314', textBg: '#FFFFFF', letterColor: '#65A30D', isDark: false },
  { id: 'scheme_6', name: 'Midnight Blue', bg: '#0F172A', endBg: '#1E293B', titleColor: '#FFFFFF', textBg: '#020617', letterColor: '#60A5FA', isDark: true },
  { id: 'scheme_7', name: 'Magenta Berry', bg: '#FCE7F3', endBg: '#F3E8FF', titleColor: '#831843', textBg: '#831843', letterColor: '#FDF2F8', isDark: true },
  { id: 'scheme_8', name: 'Royal Purple', bg: '#EDE9FE', endBg: '#DDD6FE', titleColor: '#4C1D95', textBg: '#4C1D95', letterColor: '#F5F3FF', isDark: true },
];

interface AgentBuildTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
  availableForms?: ConnectedFormRef[];
  activeChannel?: AgentChannelType;
  mode?: 'channel_settings' | 'designer';
  onClose?: () => void;
}

export function AgentBuildTab({
  agent,
  onChange,
  availableForms = [],
  activeChannel = 'chatbot',
  mode = 'channel_settings',
  onClose,
}: AgentBuildTabProps) {
  // Chatbot subtabs: 'layout' | 'welcome' | 'navigation' | 'greeting'
  const [chatbotSubTab, setChatbotSubTab] = useState<'layout' | 'welcome' | 'navigation' | 'greeting'>('layout');
  // Designer subtabs: 'avatar' | 'style'
  const [designerSubTab, setDesignerSubTab] = useState<'avatar' | 'style'>('style');

  const [avatarMode, setAvatarMode] = useState<'gallery' | 'generate' | 'upload'>('gallery');
  const [avatarCategory, setAvatarCategory] = useState<string>('all');
  const [avatarSearch, setAvatarSearch] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('Professional female loan officer in modern office');
  const [isGeneratingAiAvatar, setIsGeneratingAiAvatar] = useState<boolean>(false);

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
      style: {
        ...(agent.style as any),
        colorSchemeId: scheme.id,
        agentBackgroundStart: scheme.bg,
        agentBackgroundEnd: scheme.endBg,
        pageBackgroundStart: scheme.bg,
        pageBackgroundEnd: scheme.endBg,
        titleColor: scheme.titleColor,
        chatBg: '#ffffff',
      },
    });
    toast.success(`Applied ${scheme.name} color scheme!`);
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
          MODE 1: DESIGNER DRAWER (AVATAR | STYLE) (Screenshot 2)
         ═══════════════════════════════════════════════════════════════════════ */}
      {mode === 'designer' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-slate-800 px-4">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDesignerSubTab('avatar')}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2',
                  designerSubTab === 'avatar'
                    ? 'border-blue-500 text-blue-400 font-bold'
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
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                STYLE
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* ── DESIGNER: AVATAR ── */}
            {designerSubTab === 'avatar' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    value={avatarSearch}
                    onChange={(e) => setAvatarSearch(e.target.value)}
                    placeholder="Search 36+ realistic avatars..."
                    className="text-xs h-8 pl-8 bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredAvatars.map((av) => {
                    const isSelected = agent.avatarUrl === av.url;
                    return (
                      <div
                        key={av.id}
                        onClick={() => selectAvatar(av)}
                        className={cn(
                          'relative group rounded-xl p-1 border cursor-pointer transition-all aspect-square flex flex-col items-center justify-center overflow-hidden bg-slate-800/60',
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                            : 'border-slate-700 hover:border-slate-500'
                        )}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform" />
                        {isSelected && (
                          <div className="absolute top-1 right-1 size-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="size-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DESIGNER: STYLE (Exact from Screenshot 2) ── */}
            {designerSubTab === 'style' && (
              <div className="space-y-5">
                {/* 1. COLOR SCHEME (8 Swatches with letter A) */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    COLOR SCHEME
                  </Label>
                  <div className="grid grid-cols-4 gap-2.5 pt-1">
                    {COLOR_SCHEMES.map((scheme) => {
                      const isSelected = agent.style?.colorSchemeId === scheme.id;
                      return (
                        <div
                          key={scheme.id}
                          onClick={() => applyColorScheme(scheme)}
                          className={cn(
                            'size-14 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center shadow-xs relative overflow-hidden',
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
                              : 'border-slate-700 hover:border-slate-500'
                          )}
                          style={{
                            background: `linear-gradient(135deg, ${scheme.bg}, ${scheme.endBg})`,
                          }}
                        >
                          <div
                            className="size-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs border border-black/10"
                            style={{
                              background: scheme.textBg,
                              color: scheme.letterColor,
                            }}
                          >
                            A
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. AGENT BACKGROUND STYLE (Start & End Gradients) */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    AGENT BACKGROUND STYLE
                  </Label>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">Start Color</span>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                        <input
                          type="color"
                          value={agent.style?.agentBackgroundStart || '#C5E3FA'}
                          onChange={(e) =>
                            onChange({
                              ...agent,
                              style: { ...(agent.style as any), agentBackgroundStart: e.target.value, pageBackgroundStart: e.target.value },
                            })
                          }
                          className="size-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {agent.style?.agentBackgroundStart || '#C5E3FA'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">End Color</span>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                        <input
                          type="color"
                          value={agent.style?.agentBackgroundEnd || '#D6E1E7'}
                          onChange={(e) =>
                            onChange({
                              ...agent,
                              style: { ...(agent.style as any), agentBackgroundEnd: e.target.value, pageBackgroundEnd: e.target.value },
                            })
                          }
                          className="size-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {agent.style?.agentBackgroundEnd || '#D6E1E7'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. AGENT TITLE (Title Color, Name, Role) */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <Label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    AGENT TITLE
                  </Label>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Title Color</span>
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                      <input
                        type="color"
                        value={agent.style?.titleColor || '#0A1551'}
                        onChange={(e) =>
                          onChange({
                            ...agent,
                            style: { ...(agent.style as any), titleColor: e.target.value },
                          })
                        }
                        className="size-6 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {agent.style?.titleColor || '#0A1551'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Agent Name</span>
                    <Input
                      value={agent.name}
                      onChange={(e) => onChange({ ...agent, name: e.target.value })}
                      className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-100 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Agent Role</span>
                    <Input
                      value={agent.roleTitle}
                      onChange={(e) => onChange({ ...agent, roleTitle: e.target.value })}
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
          <div className="border-b border-slate-800 px-3">
            <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setChatbotSubTab('layout')}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2',
                  chatbotSubTab === 'layout'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                LAYOUT
              </button>
              <button
                type="button"
                onClick={() => setChatbotSubTab('welcome')}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2',
                  chatbotSubTab === 'welcome'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                WELCOME
              </button>
              <button
                type="button"
                onClick={() => setChatbotSubTab('navigation')}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2',
                  chatbotSubTab === 'navigation'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                NAVIGATION
              </button>
              <button
                type="button"
                onClick={() => setChatbotSubTab('greeting')}
                className={cn(
                  'py-2.5 text-center transition-all border-b-2',
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
              </div>
            )}

            {/* ── 3. NAVIGATION TAB (Screenshot 3 - 6 exact switches) ── */}
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

                {/* 3. Whatsapp */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Whatsapp</p>
                    <p className="text-[10px] text-slate-400">Provide support on WhatsApp</p>
                  </div>
                  <Switch
                    checked={agent.navigation?.whatsappEnabled ?? false}
                    onCheckedChange={(c) => onChange({ ...agent, navigation: { ...agent.navigation, whatsappEnabled: c } })}
                  />
                </div>

                {/* 4. Forms */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Forms</p>
                    <p className="text-[10px] text-slate-400">Allow users to view and fill connected forms</p>
                  </div>
                  <Switch
                    checked={agent.navigation?.formsEnabled ?? true}
                    onCheckedChange={(c) => onChange({ ...agent, navigation: { ...agent.navigation, formsEnabled: c } })}
                  />
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
              <span className="text-xs font-bold text-slate-200 capitalize">{activeChannel} Integration</span>
              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                Ready
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Configure parameters, webhooks, phone routes, or direct messaging rules for {activeChannel}.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Channel Status</Label>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                <span className="text-xs text-slate-200">Enable {activeChannel}</span>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Webhook / Target Endpoint</Label>
              <Input
                defaultValue={`https://api.fieseros.com/channels/${activeChannel}/webhook`}
                className="text-xs h-8 bg-slate-800 border-slate-700 font-mono text-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
