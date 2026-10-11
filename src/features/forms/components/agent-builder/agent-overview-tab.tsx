'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Smartphone,
  Tablet,
  Monitor,
  Minus,
  X,
  Palette,
  Paintbrush,
  Receipt,
  ExternalLink,
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
  onNavigateTab: (tab: any) => void;
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

const THEME_SWATCHES = [
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Magenta', hex: '#DB2777' },
];

export function AgentOverviewTab({
  agent,
  onChange,
  onNavigateTab,
  onOpenSettings,
  businessName = 'deepak chandra\'s Workspace',
}: AgentOverviewTabProps) {
  // Device Preview Mode (Desktop vs Mobile)
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  // Channel Preview Tab Filter
  const [activeChannelPill, setActiveChannelPill] = useState<'website' | 'whatsapp' | 'phone' | 'instagram' | 'email'>('website');

  // Right Inspector Sub-Tabs
  const [settingsSubTab, setSettingsSubTab] = useState<'layout' | 'welcome' | 'messages' | 'forms' | 'more'>('layout');

  // Chatbot channel properties with defaults
  const chatbotConfig = agent.channels?.chatbot || {
    enabled: true,
    layoutMode: 'floating',
    position: 'right',
    layoutButtonToggle: true,
    sidebarBehavior: 'overlay',
    welcomeStyle: 'quick_input',
    greetingToggle: true,
    placeholderMessage: 'Type your message...',
    aiGeneratedGreeting: true,
    showButtons: true,
    primaryColor: '#7C3AED',
    greetingBubble: '👋 Need help? Chat with us!',
    showAgentName: true,
    showOnlineStatus: true,
    showWatermark: true,
    launcherIcon: 'chat',
  };

  const primaryColor = chatbotConfig.primaryColor || '#7C3AED';
  const layoutMode = chatbotConfig.layoutMode || 'floating';
  const position = chatbotConfig.position || 'right';
  const showAgentName = chatbotConfig.showAgentName !== false;
  const showOnlineStatus = chatbotConfig.showOnlineStatus !== false;
  const showWatermark = chatbotConfig.showWatermark !== false;
  const launcherIcon = chatbotConfig.launcherIcon || 'chat';

  // State to toggle widget minimization in preview
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);

  // Initial greeting matching reference design
  const defaultGreetingText = agent.welcomeGreeting || `Hi! Welcome to ${businessName}. 👋\nHow can I help you today?`;

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: defaultGreetingText,
      chips: ['Get Instant Estimate', 'Book Appointment', 'Ask a Question', 'Our Services', 'Yes, show slots'],
      time: '10:24 AM',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (typeof chatBottomRef.current?.scrollIntoView === 'function') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Keep welcome greeting in sync if updated from settings
  useEffect(() => {
    if (agent.welcomeGreeting && chatMessages.length === 1 && chatMessages[0].id === 'msg_welcome') {
      setChatMessages([
        {
          id: 'msg_welcome',
          sender: 'bot',
          text: agent.welcomeGreeting,
          chips: ['Get Instant Estimate', 'Book Appointment', 'Ask a Question', 'Our Services', 'Yes, show slots'],
          time: '10:24 AM',
        },
      ]);
    }
  }, [agent.welcomeGreeting]);

  // Handle Quick Action Chip Click
  const handleChipClick = (chip: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: chip,
      time,
    };

    let replyText = `I'd be delighted to help you with ${chip}!`;
    let nextChips: string[] | undefined;

    if (chip === 'Get Instant Estimate') {
      replyText = `Our instant estimates start at ₹1,999 for Standard Cleaning and ₹3,999 for Full Deep Cleaning. Would you like to select your home size to see exact pricing?`;
      nextChips = ['1 BHK (₹1,999)', '2 BHK (₹2,999)', '3 BHK (₹3,999)', 'Villa / Commercial'];
    } else if (chip === 'Book Appointment') {
      replyText = `Great! We have available certified service specialists ready this week. Which day works best for you?`;
      nextChips = ['Tomorrow (10:00 AM)', 'Thursday (2:00 PM)', 'Friday (9:30 AM)', 'Custom Schedule'];
    } else if (chip === 'Yes, show slots') {
      replyText = `Here are the next available slots for this week: Tomorrow 10:00 AM, Thursday 2:00 PM, and Friday 9:30 AM. Would you like to confirm any of these?`;
      nextChips = ['Tomorrow 10:00 AM', 'Thursday 2:00 PM', 'Friday 9:30 AM'];
    } else if (chip === 'Ask a Question') {
      replyText = `Feel free to ask me anything about our cleaning supplies, insurance, rescheduling policies, or package details!`;
      nextChips = ['Eco-friendly supplies?', 'Cancellation policy?', 'Are specialists insured?'];
    } else if (chip === 'Our Services') {
      replyText = `Here is our full service menu:\n• Deep Home Cleaning\n• Kitchen & Bathroom Sanitization\n• Sofa & Mattress Shampooing\n• Commercial / Move-In Cleaning\n\nWhich service can I book for you?`;
      nextChips = ['Deep Home Cleaning', 'Sofa Shampooing', 'Move-In Cleaning'];
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
        text: `Thank you for asking about "${text}"! Our specialists at ${businessName} ensure guaranteed satisfaction. Would you like me to book this or provide a personalized quote?`,
        chips: ['Get Instant Estimate', 'Book Appointment', 'Talk to a Human'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 550);
  };

  const resetChat = () => {
    setChatMessages([
      {
        id: 'msg_welcome',
        sender: 'bot',
        text: defaultGreetingText,
        chips: ['Get Instant Estimate', 'Book Appointment', 'Ask a Question', 'Our Services'],
        time: '10:24 AM',
      },
    ]);
    setIsWidgetMinimized(false);
    toast.info('Interactive preview reset to welcome state');
  };

  // Helper to update chatbot configuration in real-time
  const updateChatbot = (patch: Partial<NonNullable<FormAgentData['channels']['chatbot']>>) => {
    onChange((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        chatbot: {
          ...prev.channels?.chatbot,
          ...patch,
        },
      },
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-4 lg:p-6 text-slate-900 dark:text-slate-100 select-none">
      <div className="max-w-[1680px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ═══════════════════════════════════════════════════════════════════
            LEFT COLUMN: ASSISTANT STATUS & CONNECTED CHANNELS (~3 Cols)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          {/* 1. Assistant Status Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Assistant Status</h3>
              <Badge
                variant="secondary"
                className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold gap-1.5 py-0.5 px-2.5 rounded-full"
              >
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
              </Badge>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Your AI Assistant is live and ready to help customers across all channels.
            </p>

            {/* Profile Row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-full bg-gradient-to-tr from-[#7C3AED] to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden">
                  {agent.avatarUrl ? (
                    <img src={agent.avatarUrl} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    <Bot className="size-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('setup')}
                    className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-[#7C3AED] flex items-center gap-1 group text-left truncate"
                  >
                    <span className="truncate">{agent.name || 'Business AI Assistant'}</span>
                    <ChevronRight className="size-3 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {agent.roleTitle || 'Customer Support & Booking'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('setup')}
                className="size-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 flex items-center justify-center transition-colors shrink-0"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>

            {/* Capabilities Checkmarks */}
            <div className="space-y-2.5 pt-1">
              {[
                'Answer customer questions',
                'Capture leads',
                'Book appointments',
                'Provide quotes',
                'Escalate to human when needed',
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Connected Channels Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Connected Channels</h3>
              <button
                type="button"
                onClick={() => onNavigateTab('channels')}
                className="text-xs font-semibold text-[#7C3AED] hover:text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-0.5"
              >
                Manage all channels <ChevronRight className="size-3" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: 'website',
                  name: 'Website Chat',
                  icon: MessageSquare,
                  colorClass: 'bg-purple-100 text-[#7C3AED] dark:bg-purple-950/60 dark:text-purple-300',
                  status: 'Online',
                  tabTarget: 'appearance',
                },
                {
                  id: 'whatsapp',
                  name: 'WhatsApp',
                  icon: MessageCircle,
                  colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
                  status: 'Connected',
                  tabTarget: 'channels',
                },
                {
                  id: 'facebook',
                  name: 'Facebook Messenger',
                  icon: MessageSquare,
                  colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
                  status: 'Connected',
                  tabTarget: 'channels',
                },
                {
                  id: 'instagram',
                  name: 'Instagram',
                  icon: Instagram,
                  colorClass: 'bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-300',
                  status: 'Connected',
                  tabTarget: 'channels',
                },
                {
                  id: 'google',
                  name: 'Google Business',
                  icon: Globe,
                  colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
                  status: 'Connected',
                  tabTarget: 'channels',
                },
                {
                  id: 'email',
                  name: 'Email',
                  icon: Mail,
                  colorClass: 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
                  status: 'Connected',
                  tabTarget: 'channels',
                },
                {
                  id: 'sms',
                  name: 'SMS',
                  icon: MessageSquare,
                  colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300',
                  status: 'Connected',
                  tabTarget: 'channels',
                },
                {
                  id: 'phone',
                  name: 'Phone (AI Receptionist)',
                  icon: Phone,
                  colorClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300',
                  status: 'Connected',
                  tabTarget: 'channels',
                },
              ].map((ch) => {
                const Icon = ch.icon;
                return (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
                    onClick={() => onNavigateTab(ch.tabTarget)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', ch.colorClass)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{ch.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span>{ch.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateTab(ch.tabTarget);
                        }}
                        className="size-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-center"
                      >
                        <Settings className="size-3.5" />
                      </button>
                      <ChevronRight className="size-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('channels')}
              className="w-full h-9 text-xs font-bold rounded-xl border-[#7C3AED]/40 text-[#7C3AED] hover:bg-purple-50 dark:hover:bg-purple-950/30 gap-1.5"
            >
              <Plus className="size-3.5" /> Connect New Channel
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CENTER COLUMN: WEBSITE CANVAS PREVIEW & OVERLAID CHATBOT WIDGET (~6 Cols)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 space-y-4">
          {/* Top Bar: Channel Filter Pills & Device Switcher */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            {/* Left Channel Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {[
                { id: 'website', label: 'Website Chat', icon: MessageSquare },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                { id: 'phone', label: 'Phone', icon: Phone },
                { id: 'instagram', label: 'Instagram', icon: Instagram },
                { id: 'email', label: 'Email', icon: Mail },
              ].map((ch) => {
                const Icon = ch.icon;
                const active = activeChannelPill === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannelPill(ch.id as any);
                      if (ch.id !== 'website') {
                        toast.info(`Switched preview context to ${ch.label}`);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0',
                      active
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-[#7C3AED] dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Device Mode + Reset */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                    deviceMode === 'desktop'
                      ? 'bg-white dark:bg-slate-900 text-[#7C3AED] shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Monitor className="size-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                    deviceMode === 'mobile'
                      ? 'bg-white dark:bg-slate-900 text-[#7C3AED] shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Smartphone className="size-3.5" />
                  <span>Mobile</span>
                </button>
              </div>

              <button
                type="button"
                onClick={resetChat}
                title="Reset preview conversation"
                className="size-8 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Browser Window Mockup Canvas */}
          <div
            className={cn(
              'relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col transition-all',
              deviceMode === 'desktop'
                ? 'h-[580px]'
                : 'h-[620px] max-w-[380px] mx-auto border-[6px] border-slate-800 rounded-[36px]'
            )}
          >
            {/* Desktop Chrome Bar with Mac Dots */}
            {deviceMode === 'desktop' ? (
              <div className="h-9 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-4 flex items-center gap-2 shrink-0">
                <span className="size-2.5 rounded-full bg-[#EF4444]" />
                <span className="size-2.5 rounded-full bg-[#F59E0B]" />
                <span className="size-2.5 rounded-full bg-[#10B981]" />
                <div className="flex-1 max-w-sm mx-auto h-5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 flex items-center px-2 text-[10px] text-slate-400 truncate">
                  https://yourbusiness.com
                </div>
              </div>
            ) : (
              /* Mobile Notch Header */
              <div className="h-6 bg-slate-900 flex items-center justify-center shrink-0">
                <div className="h-3 w-28 bg-slate-800 rounded-full" />
              </div>
            )}

            {/* Simulated Website Landing Page */}
            <div className="flex-1 relative overflow-hidden bg-slate-50 flex flex-col">
              {/* Mock Website Navbar */}
              <div className="px-6 py-3.5 bg-white/95 backdrop-blur-xs border-b border-slate-100 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                    C
                  </div>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">Your Business</span>
                </div>

                <div className="hidden sm:flex items-center gap-5 text-[11px] font-medium text-slate-600">
                  <span className="hover:text-slate-900 cursor-pointer">Home</span>
                  <span className="hover:text-slate-900 cursor-pointer">Services</span>
                  <span className="hover:text-slate-900 cursor-pointer">About</span>
                  <span className="hover:text-slate-900 cursor-pointer">Contact</span>
                </div>

                <button
                  type="button"
                  className="bg-slate-900 hover:bg-black text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg shadow-2xs"
                >
                  Book Now
                </button>
              </div>

              {/* Mock Website Hero Section */}
              <div className="flex-1 relative p-6 sm:p-10 flex flex-col justify-center overflow-hidden">
                {/* Hero Room Aesthetic Background */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-multiply"
                  style={{
                    backgroundImage:
                      'url(https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent" />

                <div className="relative z-10 max-w-sm space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    Professional Cleaning Services
                  </h1>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A cleaner, healthier space for your home or business. Certified professionals with guaranteed satisfaction.
                  </p>
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
                    >
                      Get a Free Quote
                    </button>
                    <button
                      type="button"
                      className="bg-white/90 hover:bg-white text-slate-800 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xs"
                    >
                      Our Services
                    </button>
                  </div>
                </div>
              </div>

              {/* ═════════════════════════════════════════════════════════════
                  OVERLAID INTERACTIVE CHATBOT WIDGET
                 ═════════════════════════════════════════════════════════════ */}
              {!isWidgetMinimized && (
                <div
                  className={cn(
                    'z-30 transition-all duration-300 flex flex-col shadow-2xl',
                    layoutMode === 'sidebar'
                      ? 'absolute top-0 bottom-0 right-0 w-[340px] sm:w-[360px] bg-white border-l border-slate-200'
                      : cn(
                          'absolute w-[330px] sm:w-[350px] max-h-[480px] h-[480px] bg-white rounded-2xl border border-slate-200 overflow-hidden',
                          position === 'left' ? 'left-4 bottom-4' : 'right-4 bottom-4'
                        )
                  )}
                >
                  {/* Widget Header */}
                  <div
                    className="p-3.5 text-white flex items-center justify-between shrink-0 shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative size-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-white/30">
                        {agent.avatarUrl ? (
                          <img src={agent.avatarUrl} alt="Avatar" className="size-full object-cover" />
                        ) : (
                          <Bot className="size-4.5" />
                        )}
                        {showOnlineStatus && (
                          <span className="absolute bottom-0 right-0 size-2 bg-emerald-400 rounded-full ring-2 ring-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        {showAgentName && (
                          <div className="text-xs font-bold text-white truncate leading-tight">
                            {agent.name || 'Your Business Assistant'}
                          </div>
                        )}
                        {showOnlineStatus && (
                          <div className="text-[10px] text-white/80 font-medium flex items-center gap-1">
                            <span className="size-1 rounded-full bg-emerald-400" />
                            <span>Online • Usually replies instantly</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-white/80">
                      <button
                        type="button"
                        onClick={() => setIsWidgetMinimized(true)}
                        className="size-6 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors"
                        title="Minimize"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsWidgetMinimized(true)}
                        className="size-6 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors"
                        title="Close"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F8FAFC]">
                    {chatMessages.map((msg) => {
                      const isBot = msg.sender === 'bot';
                      return (
                        <div key={msg.id} className={cn('flex flex-col', isBot ? 'items-start' : 'items-end')}>
                          <div className="flex items-start gap-2 max-w-[88%]">
                            {isBot && (
                              <div
                                className="size-6 rounded-full text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 shadow-2xs"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <Bot className="size-3.5" />
                              </div>
                            )}
                            <div>
                              <div
                                className={cn(
                                  'p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-2xs',
                                  isBot
                                    ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                                    : 'text-white rounded-tr-xs'
                                )}
                                style={!isBot ? { backgroundColor: primaryColor } : undefined}
                              >
                                {msg.text}
                              </div>
                              <span className="text-[9px] text-slate-400 px-1 mt-0.5 block">{msg.time}</span>
                            </div>
                          </div>

                          {/* Action Chips */}
                          {isBot && msg.chips && msg.chips.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 pl-8">
                              {msg.chips.map((chip, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleChipClick(chip)}
                                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border text-slate-700 hover:text-white transition-all shadow-2xs hover:scale-102"
                                  style={{
                                    borderColor: `${primaryColor}40`,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = primaryColor;
                                    e.currentTarget.style.color = '#FFFFFF';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                    e.currentTarget.style.color = '#334155';
                                  }}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Field */}
                  <div className="p-2.5 bg-white border-t border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-[#7C3AED]">
                      <button type="button" className="text-slate-400 hover:text-slate-600">
                        <Paperclip className="size-3.5" />
                      </button>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={chatbotConfig.placeholderMessage || 'Type your message...'}
                        className="flex-1 text-xs bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        className="size-6 rounded-lg text-white flex items-center justify-center transition-transform hover:scale-105 shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Send className="size-3" />
                      </button>
                    </div>

                    {showWatermark && (
                      <div className="text-center text-[9px] text-slate-400 font-medium">
                        Powered by <span className="font-bold text-slate-600">BGOS AI</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Floating Launcher Bubble */}
              <button
                type="button"
                onClick={() => setIsWidgetMinimized(!isWidgetMinimized)}
                className={cn(
                  'absolute z-40 size-12 rounded-full text-white shadow-xl flex items-center justify-center transition-all hover:scale-105',
                  position === 'left' ? 'left-4 bottom-4' : 'right-4 bottom-4'
                )}
                style={{ backgroundColor: primaryColor }}
                title={isWidgetMinimized ? 'Open Chatbot' : 'Close Chatbot'}
              >
                {isWidgetMinimized ? (
                  launcherIcon === 'bot' ? (
                    <Bot className="size-6" />
                  ) : (
                    <MessageSquare className="size-6" />
                  )
                ) : (
                  <X className="size-6" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Action Cards Beneath Canvas (Matching Screenshot) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                id: 'book',
                title: 'Book Appointment',
                subtitle: 'Let customers book instantly',
                icon: Calendar,
                colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
                query: 'Book Appointment',
              },
              {
                id: 'quote',
                title: 'Get a Quote',
                subtitle: 'Provide instant estimates',
                icon: Receipt,
                colorClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
                query: 'Get Instant Estimate',
              },
              {
                id: 'question',
                title: 'Ask a Question',
                subtitle: 'Answer common queries',
                icon: HelpCircle,
                colorClass: 'bg-purple-50 text-[#7C3AED] dark:bg-purple-950/50 dark:text-purple-300',
                query: 'Ask a Question',
              },
              {
                id: 'custom',
                title: 'Custom Action',
                subtitle: 'Add your own quick action',
                icon: Plus,
                colorClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300',
                query: 'Our Services',
              },
            ].map((action) => {
              const ActionIcon = action.icon;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    handleChipClick(action.query);
                    setIsWidgetMinimized(false);
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex items-start gap-2.5"
                >
                  <div className={cn('size-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', action.colorClass)}>
                    <ActionIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#7C3AED] transition-colors truncate">
                      {action.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {action.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT COLUMN: CHATBOT SETTINGS INSPECTOR (~3 Cols)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
            {/* Header with Title and Device Icons */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] dark:text-purple-400 block mb-0.5">
                  Assistant Configuration
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chatbot Settings</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Customize how the chatbot appears on your website
                </p>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={cn(
                    'size-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                    deviceMode === 'mobile' ? 'text-[#7C3AED] bg-purple-50 dark:bg-purple-950/40' : ''
                  )}
                  title="Mobile View"
                >
                  <Smartphone className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={cn(
                    'size-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                    deviceMode === 'desktop' ? 'text-[#7C3AED] bg-purple-50 dark:bg-purple-950/40' : ''
                  )}
                  title="Tablet/Desktop View"
                >
                  <Tablet className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-Tabs: Layout, Welcome, Messages, Forms, More */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
              {[
                { id: 'layout', label: 'Layout' },
                { id: 'welcome', label: 'Welcome' },
                { id: 'messages', label: 'Messages' },
                { id: 'forms', label: 'Forms' },
                { id: 'more', label: 'More' },
              ].map((tab) => {
                const active = settingsSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsSubTab(tab.id as any)}
                    className={cn(
                      'text-xs font-semibold px-2 py-1 rounded-md transition-all whitespace-nowrap',
                      active
                        ? 'text-[#7C3AED] bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: LAYOUT */}
            {settingsSubTab === 'layout' && (
              <div className="space-y-4">
                {/* 1. Chatbot Layout (Floating Widget vs Sidebar) */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Chatbot Layout
                    </label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Choose how the chatbot appears on your website
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* Floating Widget Card */}
                    <div
                      onClick={() => updateChatbot({ layoutMode: 'floating' })}
                      className={cn(
                        'relative p-3 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center justify-between h-28',
                        layoutMode === 'floating'
                          ? 'border-[#7C3AED] bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-[#7C3AED]'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                      )}
                    >
                      {layoutMode === 'floating' && (
                        <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-[#7C3AED] text-white flex items-center justify-center">
                          <Check className="size-2.5" />
                        </div>
                      )}
                      <div className="w-12 h-10 border border-slate-300 dark:border-slate-700 rounded-lg p-1 relative flex items-end justify-end bg-slate-50 dark:bg-slate-800 mt-1">
                        <div className="size-3.5 rounded-sm bg-[#7C3AED]" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Floating Widget
                      </span>
                    </div>

                    {/* Sidebar Card */}
                    <div
                      onClick={() => updateChatbot({ layoutMode: 'sidebar' })}
                      className={cn(
                        'relative p-3 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center justify-between h-28',
                        layoutMode === 'sidebar'
                          ? 'border-[#7C3AED] bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-[#7C3AED]'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                      )}
                    >
                      {layoutMode === 'sidebar' && (
                        <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-[#7C3AED] text-white flex items-center justify-center">
                          <Check className="size-2.5" />
                        </div>
                      )}
                      <div className="w-12 h-10 border border-slate-300 dark:border-slate-700 rounded-lg relative overflow-hidden bg-slate-50 dark:bg-slate-800 mt-1">
                        <div className="absolute top-0 bottom-0 right-0 w-4 bg-[#7C3AED]" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Sidebar</span>
                    </div>
                  </div>
                </div>

                {/* 2. Widget Position */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Widget Position
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'right', label: 'Bottom Right' },
                      { id: 'left', label: 'Bottom Left' },
                      { id: 'custom', label: 'Custom Position' },
                    ].map((pos) => {
                      const isSelected = position === pos.id;
                      return (
                        <label
                          key={pos.id}
                          className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <input
                            type="radio"
                            name="widget_pos"
                            checked={isSelected}
                            onChange={() => updateChatbot({ position: pos.id as any })}
                            className="accent-[#7C3AED]"
                          />
                          <span>{pos.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Widget Theme Swatches */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Widget Theme
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {THEME_SWATCHES.map((swatch) => {
                      const isSelected = primaryColor.toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.name}
                          type="button"
                          onClick={() => updateChatbot({ primaryColor: swatch.hex })}
                          className={cn(
                            'size-6 rounded-full transition-transform hover:scale-110 shadow-2xs relative flex items-center justify-center',
                            isSelected ? 'ring-2 ring-offset-2 ring-[#7C3AED]' : ''
                          )}
                          style={{ backgroundColor: swatch.hex }}
                          title={swatch.name}
                        >
                          {isSelected && <Check className="size-3 text-white" />}
                        </button>
                      );
                    })}
                    {/* Rainbow Picker Input */}
                    <label className="size-6 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 p-0.5 shadow-2xs cursor-pointer flex items-center justify-center relative">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => updateChatbot({ primaryColor: e.target.value })}
                        className="opacity-0 absolute inset-0 size-full cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 4. Widget Icon Selector */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Widget Icon
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'chat', label: 'Chat', icon: MessageSquare },
                      { id: 'bot', label: 'Robot', icon: Bot },
                      { id: 'custom', label: 'Custom', icon: Pencil },
                    ].map((item) => {
                      const ItemIcon = item.icon;
                      const active = launcherIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => updateChatbot({ launcherIcon: item.id as any })}
                          className={cn(
                            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all',
                            active
                              ? 'border-[#7C3AED] bg-purple-50/50 dark:bg-purple-950/40 text-[#7C3AED]'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          <ItemIcon className="size-3.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Display Toggles */}
                <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 dark:text-slate-300">Show agent name</span>
                    <Switch
                      checked={showAgentName}
                      onCheckedChange={(val) => updateChatbot({ showAgentName: val })}
                      className="scale-80 data-[state=checked]:bg-[#7C3AED]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 dark:text-slate-300">Show online status</span>
                    <Switch
                      checked={showOnlineStatus}
                      onCheckedChange={(val) => updateChatbot({ showOnlineStatus: val })}
                      className="scale-80 data-[state=checked]:bg-[#7C3AED]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Show completion by BGOS
                    </span>
                    <Switch
                      checked={showWatermark}
                      onCheckedChange={(val) => updateChatbot({ showWatermark: val })}
                      className="scale-80 data-[state=checked]:bg-[#7C3AED]"
                    />
                  </div>
                </div>

                {/* 6. Advanced Design Options Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab('appearance')}
                  className="w-full h-9 text-xs font-bold rounded-xl bg-purple-50/60 dark:bg-purple-950/40 text-[#7C3AED] border-purple-200 dark:border-purple-800 hover:bg-purple-100 gap-1.5"
                >
                  <Settings className="size-3.5" /> Advanced Design Options
                </Button>
              </div>
            )}

            {/* TAB CONTENT: WELCOME */}
            {settingsSubTab === 'welcome' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Welcome Greeting
                  </label>
                  <textarea
                    rows={4}
                    value={agent.welcomeGreeting || ''}
                    onChange={(e) => onChange((prev) => ({ ...prev, welcomeGreeting: e.target.value }))}
                    placeholder="Hi! Welcome. How can I help you today?"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Greeting Bubble Text
                  </label>
                  <input
                    type="text"
                    value={chatbotConfig.greetingBubble || ''}
                    onChange={(e) => updateChatbot({ greetingBubble: e.target.value })}
                    placeholder="👋 Need help? Chat with us!"
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Show greeting bubble popup</span>
                  <Switch
                    checked={chatbotConfig.greetingToggle !== false}
                    onCheckedChange={(val) => updateChatbot({ greetingToggle: val })}
                    className="scale-80 data-[state=checked]:bg-[#7C3AED]"
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: MESSAGES */}
            {settingsSubTab === 'messages' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1.5">
                    Response Tone
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['friendly', 'professional', 'empathetic', 'concise'].map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => onChange((prev) => ({ ...prev, voiceTone: tone as any }))}
                        className={cn(
                          'p-2 rounded-xl text-xs font-semibold capitalize border transition-all text-center',
                          agent.voiceTone === tone
                            ? 'bg-purple-50 border-[#7C3AED] text-[#7C3AED]'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    AI Model Engine
                  </label>
                  <select className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]">
                    <option value="gpt-4o">GPT-4o (High Speed &amp; Accuracy)</option>
                    <option value="claude-3.5">Claude 3.5 Sonnet (Nuanced Reasoning)</option>
                    <option value="gemini-1.5">Gemini 1.5 Pro (Multimodal)</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FORMS */}
            {settingsSubTab === 'forms' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-slate-100">
                      Collect Visitor Contact Info
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Ask for Name, Phone, and Email during chat
                    </span>
                  </div>
                  <Switch defaultChecked className="scale-80 data-[state=checked]:bg-[#7C3AED]" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-slate-100">
                      Auto-Create Leads in CRM
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Sync completed conversations into Leads dossier
                    </span>
                  </div>
                  <Switch defaultChecked className="scale-80 data-[state=checked]:bg-[#7C3AED]" />
                </div>
              </div>
            )}

            {/* TAB CONTENT: MORE */}
            {settingsSubTab === 'more' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Play chime sound on open</span>
                  <Switch defaultChecked className="scale-80 data-[state=checked]:bg-[#7C3AED]" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Escalate to human on 2 failed attempts</span>
                  <Switch defaultChecked className="scale-80 data-[state=checked]:bg-[#7C3AED]" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenSettings?.()}
                  className="w-full h-8 text-xs font-semibold rounded-xl"
                >
                  Open General Settings Dialog
                </Button>
              </div>
            )}
          </div>

          {/* Assistant Analytics Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Assistant Analytics</h4>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
