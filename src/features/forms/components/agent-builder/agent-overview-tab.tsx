'use client';

import React, { useState } from 'react';
import {
  Bot,
  MessageSquare,
  Instagram,
  Phone,
  Mail,
  Send,
  MessageCircle,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Settings,
  Pencil,
  Play,
  Paperclip,
  Smile,
  Mic,
  TrendingUp,
  TrendingDown,
  FileText,
  HelpCircle,
  Globe,
  ShoppingBag,
  Plus,
  ArrowRight,
  UserCheck,
  Calendar,
  Layers,
  Shield,
  Eye,
  Sliders,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FormAgentData, AgentChannelType } from '@/features/forms/types/agent-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface AgentOverviewTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData | ((prev: FormAgentData) => FormAgentData)) => void;
  onNavigateTab: (tab: 'overview' | 'personality' | 'knowledge' | 'skills' | 'channels' | 'widget' | 'phone' | 'test' | 'publish') => void;
  onOpenSettings?: () => void;
  businessName?: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  chips?: string[];
  time: string;
}

export function AgentOverviewTab({
  agent,
  onChange,
  onNavigateTab,
  onOpenSettings,
  businessName = 'Cinderella Cleaners',
}: AgentOverviewTabProps) {
  // Live Preview Channel Mode
  const [previewChannel, setPreviewChannel] = useState<'website' | 'whatsapp' | 'instagram' | 'facebook' | 'phone' | 'email'>('website');

  // Interactive Live Chat State
  const initialGreeting = agent.welcomeGreeting || `Hi! 👋 Welcome to ${businessName}!\nI can help you with:\n• Book a cleaning service\n• Get a quote\n• Check pricing\n• Answer your questions\n\nHow can I help you today?`;

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      sender: 'bot',
      text: initialGreeting,
      time: '10:24 AM',
    },
    {
      id: 'msg_2',
      sender: 'user',
      text: 'I need a one-time deep cleaning for a 3BHK house.',
      time: '10:25 AM',
    },
    {
      id: 'msg_3',
      sender: 'bot',
      text: `Great! I can help you with that.\n\nA 3BHK deep cleaning includes:\n• Complete home cleaning\n• Kitchen & bathroom sanitization\n• Floor and surface cleaning\n• Optional extras (sofa, mattress, etc.)\n\nThe package starts at ₹3,999.\n\nWould you like to see available slots for this week?`,
      chips: ['Yes, show slots', 'Share detailed pricing', 'Tell me more', 'Talk to a human'],
      time: '10:25 AM',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [visitorInfoCollection, setVisitorInfoCollection] = useState(true);
  const [multiStepFlow, setMultiStepFlow] = useState(true);
  const [websiteChatActive, setWebsiteChatActive] = useState(true);

  // Channels config
  const [channelsActive, setChannelsActive] = useState<Record<string, boolean>>({
    website: true,
    whatsapp: true,
    facebook: true,
    instagram: true,
    google: true,
    email: true,
    sms: true,
    phone: true,
  });

  const toggleChannel = (key: string, val: boolean) => {
    setChannelsActive((prev) => ({ ...prev, [key]: val }));
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} channel ${val ? 'enabled' : 'disabled'}`);
  };

  // Quick Action Chips in Chat
  const handleChipClick = (chip: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: chip,
      time,
    };

    let replyText = `I'd be happy to assist with "${chip}". Let me get that sorted for you.`;
    let nextChips: string[] | undefined;

    if (chip === 'Yes, show slots') {
      replyText = `Here are the next available slots for ${businessName}:\n• Tomorrow, 10:00 AM - 1:00 PM\n• Thursday, 2:00 PM - 5:00 PM\n• Friday, 9:00 AM - 12:00 PM\n\nWhich time works best for you?`;
      nextChips = ['Tomorrow 10 AM', 'Thursday 2 PM', 'Friday 9 AM'];
    } else if (chip === 'Share detailed pricing') {
      replyText = `Here is our complete pricing structure:\n• 1BHK: ₹1,999\n• 2BHK: ₹2,999\n• 3BHK: ₹3,999\n• Villa / 4BHK+: Custom Quote\n\nAll bookings include complete eco-friendly sanitization.`;
      nextChips = ['Book Now', 'Add Sofa Cleaning', 'Contact Team'];
    } else if (chip === 'Talk to a human') {
      replyText = `Connecting you with a team representative right away. An agent has been alerted and will join this conversation shortly.`;
    }

    const botMsg: ChatMessage = {
      id: `bot_${Date.now() + 1}`,
      sender: 'bot',
      text: replyText,
      chips: nextChips,
      time,
    };

    setChatMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const text = inputMessage.trim();
    setInputMessage('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      time,
    };

    setChatMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: `Thanks for asking about that! For "${text}", our service specialists at ${businessName} ensure prompt and reliable assistance. Would you like me to book this for you or check current discounts?`,
        chips: ['Check Discounts', 'Book Service', 'More Info'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  const handleRunScenario = (question: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `scenario_usr_${Date.now()}`,
      sender: 'user',
      text: question,
      time,
    };

    let reply = `Here is our guidance regarding "${question}":\nWe offer specialized packages with instant confirmation. Please let us know if you need to confirm this schedule!`;
    if (question.includes('2BHK')) {
      reply = `A 2BHK standard clean starts at ₹2,999 and takes approximately 3-4 hours. We bring all professional supplies and eco-safe solutions.`;
    } else if (question.includes('prices')) {
      reply = `Our standard pricing starts from ₹1,999 for 1BHK up to ₹3,999 for 3BHK. Custom packages available for commercial spaces.`;
    } else if (question.includes('sofas')) {
      reply = `Yes! We provide professional shampooing and hot-water extraction for fabric and leather sofas starting at ₹499 per seat.`;
    }

    const botMsg: ChatMessage = {
      id: `scenario_bot_${Date.now()}`,
      sender: 'bot',
      text: reply,
      chips: ['Book This', 'Check Availability', 'Talk to a human'],
      time,
    };

    setChatMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const resetChat = () => {
    setChatMessages([
      {
        id: 'msg_1',
        sender: 'bot',
        text: initialGreeting,
        time: '10:24 AM',
      },
    ]);
    toast.info('Chat preview reset');
  };

  // Personality Traits
  const [personalityTraits, setPersonalityTraits] = useState([
    { label: 'Friendly', active: true },
    { label: 'Professional', active: true },
    { label: 'Helpful', active: true },
    { label: 'Concise', active: true },
    { label: 'Action-oriented', active: true },
  ]);

  const toggleTrait = (idx: number) => {
    setPersonalityTraits((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, active: !t.active } : t))
    );
  };

  // Skills & Actions
  const [skillsList, setSkillsList] = useState([
    { label: 'Check Availability', checked: true },
    { label: 'Create Booking', checked: true },
    { label: 'Get Quote', checked: true },
    { label: 'Create Lead', checked: true },
    { label: 'Update CRM', checked: true },
    { label: 'Send Follow-up', checked: true },
    { label: 'Answer FAQ', checked: true },
    { label: 'Transfer to Human', checked: true },
    { label: 'Collect Feedback', checked: true },
  ]);

  const toggleSkill = (idx: number) => {
    setSkillsList((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, checked: !s.checked } : s))
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4FAF9] dark:bg-slate-950 p-4 lg:p-6 text-slate-800 dark:text-slate-100">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ═══════════════════════════════════════════════════════════════════
            LEFT COLUMN (Channels, Channel Settings, Scenarios) — 3 Cols
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          {/* 1. Connected Channels Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Connected Channels</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('channels')}
                className="h-7 text-xs font-semibold px-2.5 rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1"
              >
                <Plus className="size-3" /> Add Channel
              </Button>
            </div>

            <div className="space-y-2">
              {[
                { key: 'website', name: 'Website Chat', icon: Globe, iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
                { key: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                { key: 'facebook', name: 'Facebook Messenger', icon: MessageSquare, iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
                { key: 'instagram', name: 'Instagram', icon: Instagram, iconColor: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40' },
                { key: 'google', name: 'Google Business', icon: Globe, iconColor: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' },
                { key: 'email', name: 'Email', icon: Mail, iconColor: 'text-red-500 bg-red-50 dark:bg-red-950/40' },
                { key: 'sms', name: 'SMS', icon: MessageSquare, iconColor: 'text-green-600 bg-green-50 dark:bg-green-950/40' },
                { key: 'phone', name: 'Phone (AI Receptionist)', icon: Phone, iconColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
              ].map((ch) => {
                const Icon = ch.icon;
                const active = channelsActive[ch.key] ?? false;
                return (
                  <div
                    key={ch.key}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', ch.iconColor)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{ch.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-300')} />
                          <span>{active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={active}
                        onCheckedChange={(val) => toggleChannel(ch.key, val)}
                        className="scale-75 data-[state=checked]:bg-indigo-600"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (ch.key === 'website') onNavigateTab('widget');
                          else if (ch.key === 'phone') onNavigateTab('phone');
                          else onNavigateTab('channels');
                        }}
                        className="h-6 px-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Channel Settings Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Channel Settings</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <Globe className="size-3.5 text-blue-600" /> Website Chat
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Status</span>
                <Switch
                  checked={websiteChatActive}
                  onCheckedChange={setWebsiteChatActive}
                  className="scale-75 data-[state=checked]:bg-indigo-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Widget Appearance</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('widget')}
                  className="h-5 px-1.5 text-xs text-indigo-600 font-semibold"
                >
                  Customize
                </Button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Welcome Message
              </label>
              <textarea
                rows={2}
                value={agent.welcomeGreeting || ''}
                onChange={(e) => onChange((prev) => ({ ...prev, welcomeGreeting: e.target.value }))}
                placeholder="Hi! 👋 How can I help you today?"
                className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Collect visitor info (name, email, phone)
              </span>
              <Switch
                checked={visitorInfoCollection}
                onCheckedChange={setVisitorInfoCollection}
                className="scale-75 data-[state=checked]:bg-indigo-600"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('widget')}
              className="w-full h-8 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Preview Widget
            </Button>
          </div>

          {/* 3. Test Scenarios Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Test Scenarios</h4>
                <p className="text-[11px] text-muted-foreground">Try these example questions</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('test')}
                className="h-6 px-1.5 text-xs text-indigo-600 font-semibold"
              >
                Run Test
              </Button>
            </div>

            <div className="space-y-1.5">
              {[
                'Get a quote for 2BHK cleaning',
                'Book an appointment',
                'What are your prices?',
                'Do you clean sofas?',
                'Change my booking',
              ].map((scenario, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRunScenario(scenario)}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="size-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-muted-foreground group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 group-hover:text-indigo-600">
                      {idx + 1}
                    </span>
                    <span className="truncate">{scenario}</span>
                  </div>
                  <Play className="size-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CENTER COLUMN (Live Preview & Conversation Flow) — 5 Cols
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Live Interactive Preview Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[650px]">
            {/* Header: Channel Switcher Pills */}
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {[
                  { id: 'website', label: 'Website', icon: Globe },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                  { id: 'instagram', label: 'Instagram', icon: Instagram },
                  { id: 'facebook', label: 'Facebook', icon: MessageSquare },
                  { id: 'phone', label: 'Phone', icon: Phone },
                  { id: 'email', label: 'Email', icon: Mail },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = previewChannel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPreviewChannel(tab.id as any)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0',
                        active
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                      )}
                    >
                      <Icon className="size-3" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab('test')}
                  className="h-7 text-xs px-2 rounded-lg border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Test as Customer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetChat}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="size-3" /> Reset
                </Button>
              </div>
            </div>

            {/* Inner Chat Container */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40 dark:bg-slate-950/40">
              {/* Chat Sub-header */}
              <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative size-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                    {agent.avatarUrl ? (
                      <img src={agent.avatarUrl} alt="Avatar" className="size-full object-cover" />
                    ) : (
                      <Bot className="size-4" />
                    )}
                    <span className="absolute bottom-0 right-0 size-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {agent.name || `${businessName} AI`}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="size-1 rounded-full bg-emerald-500" /> Online
                    </div>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800 font-semibold gap-1"
                >
                  <Sparkles className="size-2.5 text-indigo-600" /> AI Assistant
                </Badge>
              </div>

              {/* Chat Messages Scrollable Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {chatMessages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex flex-col', isBot ? 'items-start' : 'items-end')}
                    >
                      <div className="flex items-start gap-2 max-w-[85%]">
                        {isBot && (
                          <div className="size-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-2xs">
                            <Bot className="size-3.5" />
                          </div>
                        )}
                        <div>
                          <div
                            className={cn(
                              'p-3 rounded-2xl text-xs shadow-2xs whitespace-pre-line leading-relaxed',
                              isBot
                                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-sm'
                                : 'bg-indigo-600 text-white rounded-tr-sm'
                            )}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1 mt-0.5 block">
                            {msg.time}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Action Chips */}
                      {isBot && msg.chips && msg.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pl-8">
                          {msg.chips.map((chip, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleChipClick(chip)}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors shadow-2xs"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 text-xs bg-transparent focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <button type="button" className="hover:text-slate-600 transition-colors">
                      <Paperclip className="size-3.5" />
                    </button>
                    <button type="button" className="hover:text-slate-600 transition-colors">
                      <Smile className="size-3.5" />
                    </button>
                    <button type="button" className="hover:text-slate-600 transition-colors">
                      <Mic className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      className="size-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-2xs ml-0.5"
                    >
                      <Send className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Conversation Flow Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Conversation Flow</h4>
                <p className="text-[11px] text-muted-foreground">Typical customer journey</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('skills')}
                className="h-7 text-xs font-semibold px-2.5 rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                Customize Flow
              </Button>
            </div>

            {/* Visual Step Diagram */}
            <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
              {[
                { title: 'Greeting', sub: 'Welcome message', icon: Sparkles },
                { title: 'Collect Info', sub: 'Name, address, service', icon: UserCheck },
                { title: 'Provide Info', sub: 'Pricing, availability', icon: HelpCircle },
                { title: 'Take Action', sub: 'Book, quote, lead', icon: Calendar },
                { title: 'Follow Up', sub: 'Confirmation, reminders', icon: MessageSquare },
              ].map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div key={idx} className="relative flex flex-col items-center">
                    <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-1.5 shadow-2xs">
                      <StepIcon className="size-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">{step.title}</span>
                    <span className="text-[9px] text-muted-foreground line-clamp-1">{step.sub}</span>
                    {idx < 4 && (
                      <ArrowRight className="size-3 text-slate-300 absolute -right-2 top-2.5 hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Enable multi-step conversation flow
              </span>
              <Switch
                checked={multiStepFlow}
                onCheckedChange={setMultiStepFlow}
                className="scale-75 data-[state=checked]:bg-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT COLUMN (Configuration, Knowledge, Analytics) — 4 Cols
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Assistant Configuration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Assistant Configuration</h3>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Settings className="size-3.5" />
                </button>
              )}
            </div>

            {/* Assistant Identity */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Assistant Identity
              </span>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  <Bot className="size-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div>
                    <label className="text-[10px] text-muted-foreground block">Assistant Name</label>
                    <input
                      type="text"
                      value={agent.name || ''}
                      onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Cinderella AI"
                      className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block">Tagline (for internal use)</label>
                    <input
                      type="text"
                      value={agent.roleTitle || ''}
                      onChange={(e) => onChange((prev) => ({ ...prev, roleTitle: e.target.value }))}
                      placeholder="Customer Concierge & Booking Assistant"
                      className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personality & Behavior */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Personality & Behavior</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('personality')}
                  className="h-5 px-1.5 text-xs text-indigo-600 font-semibold"
                >
                  Configure
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {personalityTraits.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleTrait(idx)}
                    className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all',
                      t.active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-transparent'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Business Instructions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Business Instructions</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('personality')}
                  className="h-5 px-1.5 text-xs text-indigo-600 font-semibold"
                >
                  Edit
                </Button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 space-y-1 leading-relaxed">
                <p>• You are the AI assistant for {businessName}.</p>
                <p>• Help customers with cleaning services, pricing, booking and questions.</p>
                <p>• Use a friendly and professional tone.</p>
                <p>• Collect necessary information before booking.</p>
                <p>• Transfer to human for complex issues or complaints.</p>
              </div>
            </div>

            {/* Knowledge Base Summary */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Knowledge Base</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('knowledge')}
                  className="h-5 px-1.5 text-xs text-indigo-600 font-semibold"
                >
                  Manage
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { count: agent.knowledge?.documents?.length || 18, label: 'Documents', icon: FileText },
                  { count: agent.knowledge?.faqPairs?.length || 342, label: 'FAQ Items', icon: HelpCircle },
                  { count: agent.knowledge?.crawledUrls?.length || 12, label: 'Web Pages', icon: Globe },
                  { count: 8, label: 'Products/Services', icon: ShoppingBag },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <Icon className="size-3.5 mx-auto text-indigo-600 dark:text-indigo-400 mb-0.5" />
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.count}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skills & Actions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Skills & Actions</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('skills')}
                  className="h-5 px-1.5 text-xs text-indigo-600 font-semibold"
                >
                  Configure
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleSkill(idx)}
                    className={cn(
                      'flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-all',
                      skill.checked
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 font-medium'
                        : 'bg-slate-50 dark:bg-slate-800 text-muted-foreground border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <Check className={cn('size-3', skill.checked ? 'text-blue-600' : 'text-slate-400')} />
                    <span>{skill.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Advanced Settings</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('skills')}
                  className="h-5 px-1.5 text-xs text-indigo-600 font-semibold"
                >
                  Manage
                </Button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="text-muted-foreground">Response style</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">Balanced</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="text-muted-foreground">Max conversation length</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">20 messages</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="text-muted-foreground">AI model</span>
                  <span className="font-semibold text-indigo-600">GPT-4o (Recommended)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="text-muted-foreground">Human handoff rules</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">After 3 failed attempts</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Assistant Analytics Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Assistant Analytics</h4>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Last 7 days
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">248</div>
                <div className="text-[11px] text-muted-foreground">Conversations</div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="size-2.5" /> 18%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">92%</div>
                <div className="text-[11px] text-muted-foreground">Resolved by AI</div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="size-2.5" /> 5%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">48</div>
                <div className="text-[11px] text-muted-foreground">Bookings Created</div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="size-2.5" /> 33%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">12</div>
                <div className="text-[11px] text-muted-foreground">Transferred to Human</div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                  <TrendingDown className="size-2.5" /> 25%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.info('Navigating to full analytics report')}
                className="flex-1 h-7 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700"
              >
                View Detailed Analytics
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toast.success('Analytics report exported as PDF')}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
