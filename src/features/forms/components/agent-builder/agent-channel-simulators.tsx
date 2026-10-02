'use client';

import React, { useState, useRef } from 'react';
import { FormAgentData, AgentChannelType } from '@/features/forms/types/agent-types';
import {
  Settings,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Paperclip,
  Smile,
  Camera,
  Image as ImageIcon,
  ChevronLeft,
  Video,
  MoreVertical,
  Search,
  Mail,
  Trash2,
  RefreshCw,
  ExternalLink,
  Volume2,
  Play,
  Square,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChannelSimulatorProps {
  agent: FormAgentData;
  isTestMode?: boolean;
  onOpenSettings?: () => void;
  siteOrigin?: string;
}

// ══════════════════════════════════════════════════════════════════════════
// 1. INSTAGRAM DM SIMULATOR (Screenshot 1)
// ══════════════════════════════════════════════════════════════════════════
export function InstagramSimulator({
  agent,
  isTestMode = true,
  onOpenSettings,
}: ChannelSimulatorProps) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    { sender: 'user', text: 'I would like to learn more.' },
    { sender: 'agent', text: `Hi! How can I help you today?` },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');

    if (isTestMode) {
      setIsTyping(true);
      try {
        const res = await fetch(`/api/forms/agents/${agent.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg, history: messages }),
        });
        const data = await res.json();
        const reply = data.reply || `Thank you for your message! How else may I assist you?`;
        setMessages((prev) => [...prev, { sender: 'agent', text: reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { sender: 'agent', text: 'Thanks for reaching out! A team member will respond shortly.' },
        ]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full py-2">
      {/* Smartphone Frame */}
      <div className="w-[360px] h-[660px] max-h-[85vh] bg-white dark:bg-slate-950 rounded-[44px] border-[10px] border-slate-900 shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-purple-500/20">
        {/* Status Bar */}
        <div className="h-9 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200 select-none shrink-0 pt-1">
          <span>11:04</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 rounded-sm border border-slate-600 dark:border-slate-400 p-0.5">
              <div className="h-full w-3.5 bg-slate-800 dark:bg-slate-200 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Instagram DM Header */}
        <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ChevronLeft className="size-5 text-slate-700 dark:text-slate-300 cursor-pointer" />
            <div className="flex items-center gap-2">
              <img
                src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={agent.name}
                className="size-7 rounded-full object-cover ring-1 ring-purple-500/30"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {agent.name}
                </span>
                <span className="text-[10px] text-slate-400 leading-none">
                  {agent.channels?.instagram?.accountHandle || `@${agent.name.toLowerCase().replace(/\s+/g, '')}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <Video className="size-4" />
            <Phone className="size-4" />
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-end">
          {/* Centered Profile Hero */}
          <div className="text-center my-auto py-4">
            <img
              src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={agent.name}
              className="size-16 rounded-full object-cover mx-auto ring-2 ring-purple-500/40 shadow-sm"
            />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{agent.name}</h4>
            <p className="text-[11px] text-slate-400">Instagram Business Account</p>
          </div>

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                'flex w-full',
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed',
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-1.5 text-xs text-slate-400 animate-pulse">
                typing...
              </div>
            </div>
          )}
        </div>

        {/* Instagram Footer Input */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-950 shrink-0">
          <div className="size-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 cursor-pointer">
            <Camera className="size-3.5" />
          </div>
          <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-900 rounded-full px-3 py-1 text-xs">
            <input
              type="text"
              placeholder="Message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-transparent border-0 outline-hidden text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {inputText ? (
              <button
                type="button"
                onClick={handleSend}
                className="text-blue-600 font-bold text-xs hover:text-blue-500"
              >
                Send
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                <Mic className="size-3.5" />
                <ImageIcon className="size-3.5" />
                <Smile className="size-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Home Indicator */}
        <div className="h-4 flex items-center justify-center shrink-0 bg-white dark:bg-slate-950">
          <div className="w-28 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>
      </div>

      {/* Floating Side Gear (Matching Screenshot 1) */}
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 size-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 ring-4 ring-purple-600/20"
          title="Open Instagram Settings"
        >
          <Settings className="size-4.5" />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 2. WHATSAPP CHAT SIMULATOR (Screenshot 2)
// ══════════════════════════════════════════════════════════════════════════
export function WhatsAppSimulator({
  agent,
  isTestMode = true,
  onOpenSettings,
}: ChannelSimulatorProps) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    { sender: 'user', text: 'I would like to learn more.', time: '11:05' },
    { sender: 'agent', text: agent.channels?.whatsapp?.welcomeTemplate || `Hi! How can I help you today?`, time: '11:05' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg, time }]);
    setInputText('');

    if (isTestMode) {
      setIsTyping(true);
      try {
        const res = await fetch(`/api/forms/agents/${agent.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg, history: messages.map((m) => ({ role: m.sender, content: m.text })) }),
        });
        const data = await res.json();
        const reply = data.reply || `Thank you for your WhatsApp message! Let me find that for you.`;
        setMessages((prev) => [...prev, { sender: 'agent', text: reply, time }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { sender: 'agent', text: 'Message received. We will get back to you shortly.', time },
        ]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full py-2">
      {/* Smartphone Frame */}
      <div className="w-[360px] h-[660px] max-h-[85vh] bg-[#efeae2] dark:bg-[#0b141a] rounded-[44px] border-[10px] border-slate-900 shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-emerald-500/20">
        {/* Status Bar */}
        <div className="h-9 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200 select-none shrink-0 pt-1 bg-[#efeae2] dark:bg-[#0b141a]">
          <span>11:05</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 rounded-sm border border-slate-600 dark:border-slate-400 p-0.5">
              <div className="h-full w-3.5 bg-slate-800 dark:bg-slate-200 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* WhatsApp Green App Bar */}
        <div className="h-13 bg-[#f0f2f5] dark:bg-[#202c33] px-3 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ChevronLeft className="size-5 text-emerald-600 dark:text-emerald-400 cursor-pointer" />
            <div className="relative">
              <img
                src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={agent.name}
                className="size-8 rounded-full object-cover ring-1 ring-emerald-500/50"
              />
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {agent.name}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-none">
                online
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <Video className="size-4.5 cursor-pointer hover:text-emerald-600" />
            <Phone className="size-4 cursor-pointer hover:text-emerald-600" />
            <MoreVertical className="size-4 cursor-pointer" />
          </div>
        </div>

        {/* WhatsApp Doodle Wallpaper Chat Body */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-end"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        >
          {/* Centered Date Pill (Matching Screenshot 2) */}
          <div className="mx-auto my-1">
            <span className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs text-slate-600 dark:text-slate-400 text-[10px] font-semibold px-3 py-1 rounded-md shadow-2xs">
              Today
            </span>
          </div>

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                'flex w-full',
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[78%] rounded-xl px-3 py-2 text-xs leading-relaxed shadow-2xs relative',
                  m.sender === 'user'
                    ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs'
                    : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-tl-xs'
                )}
              >
                <p className="pr-8">{m.text}</p>
                <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 mt-0.5">
                  <span>{m.time}</span>
                  {m.sender === 'user' && (
                    <span className="text-sky-500 font-bold">✓✓</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-1.5 text-xs text-slate-400 shadow-2xs animate-pulse">
                typing...
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp Footer Input Bar */}
        <div className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center gap-1.5 shrink-0">
          <button type="button" className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <Smile className="size-5" />
          </button>
          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 rounded-full px-3 py-1.5 text-xs shadow-2xs">
            <input
              type="text"
              placeholder="Message"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-transparent border-0 outline-hidden text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            <div className="flex items-center gap-2 text-slate-400 shrink-0 ml-1">
              <Paperclip className="size-4 cursor-pointer hover:text-slate-600" />
              <Camera className="size-4 cursor-pointer hover:text-slate-600" />
            </div>
          </div>
          <button
            type="button"
            onClick={inputText ? handleSend : undefined}
            className="size-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors"
          >
            {inputText ? <Send className="size-4" /> : <Mic className="size-4" />}
          </button>
        </div>

        {/* Home Indicator */}
        <div className="h-4 flex items-center justify-center shrink-0 bg-[#f0f2f5] dark:bg-[#202c33]">
          <div className="w-28 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>
      </div>

      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 size-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 ring-4 ring-emerald-600/20"
          title="Open WhatsApp Settings"
        >
          <Settings className="size-4.5" />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 3. PHONE CALL SIMULATOR (Screenshot 4)
// ══════════════════════════════════════════════════════════════════════════
export function PhoneSimulator({
  agent,
  onOpenSettings,
}: ChannelSimulatorProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => setCallState('connected'), 2000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full py-2">
      <div className="w-[360px] h-[660px] max-h-[85vh] bg-[#334155] text-white rounded-[44px] border-[10px] border-slate-900 shadow-2xl flex flex-col justify-between p-6 relative overflow-hidden ring-1 ring-blue-500/20">
        {/* Top Bar */}
        <div className="h-6 flex items-center justify-between text-[11px] font-semibold text-slate-300">
          <span>11:06</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 rounded-sm border border-slate-300 p-0.5">
              <div className="h-full w-3.5 bg-white rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Center Calling Card */}
        <div className="text-center my-auto flex flex-col items-center">
          <img
            src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
            alt={agent.name}
            className="size-24 rounded-full object-cover ring-4 ring-white/10 shadow-xl mb-4"
          />
          <h3 className="text-xl font-bold text-white tracking-wide">{agent.name}</h3>
          <p className="text-xs text-slate-300 mt-1">
            {callState === 'connecting'
              ? 'Connecting...'
              : callState === 'connected'
              ? formatDuration(callDuration)
              : 'Call Ended'}
          </p>

          {/* Audio Waveform Animation */}
          {callState === 'connected' && (
            <div className="flex items-center gap-1 mt-6 h-6">
              {[40, 75, 100, 60, 90, 45, 80, 50].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-sky-400 rounded-full animate-pulse"
                  style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-around pb-6">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                'size-14 rounded-full flex items-center justify-center transition-colors',
                isMuted ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
              )}
            >
              {isMuted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (callState === 'ended') {
                setCallState('connecting');
                setCallDuration(0);
                setTimeout(() => setCallState('connected'), 1500);
              } else {
                setCallState('ended');
              }
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                'size-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105',
                callState === 'ended' ? 'bg-emerald-600' : 'bg-red-600'
              )}
            >
              {callState === 'ended' ? <Phone className="size-6" /> : <PhoneOff className="size-6" />}
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              {callState === 'ended' ? 'Call Again' : 'End Call'}
            </span>
          </button>
        </div>

        {/* Home Indicator */}
        <div className="h-2 flex items-center justify-center">
          <div className="w-28 h-1 bg-white/40 rounded-full" />
        </div>
      </div>

      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 size-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 ring-4 ring-blue-600/20"
          title="Open Phone Settings"
        >
          <Settings className="size-4.5" />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 4. GMAIL WEB INBOX SIMULATOR (Screenshot 6)
// ══════════════════════════════════════════════════════════════════════════
export function GmailSimulator({
  agent,
  onOpenSettings,
}: ChannelSimulatorProps) {
  return (
    <div className="relative flex items-center justify-center w-full h-full p-4">
      {/* Browser / Gmail Window */}
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Gmail Navigation Bar */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            {/* Google M Icon */}
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <Mail className="size-5 text-red-500" />
              <span className="text-sm font-bold">Gmail</span>
            </div>
          </div>

          <div className="flex-1 max-w-md flex items-center bg-slate-200/80 dark:bg-slate-800 rounded-full px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Search className="size-3.5 mr-2 shrink-0" />
            <span className="truncate">Search mail</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
              {agent.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* Email Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Thread Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Inquiry About Recent Order Issue
              </h2>
              <Badge variant="secondary" className="text-[10px] bg-slate-200 dark:bg-slate-800">
                Inbox
              </Badge>
            </div>
            <span className="text-xs text-slate-400">10:42 AM (1 hour ago)</span>
          </div>

          {/* Customer Email Message */}
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              JS
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white mr-1.5">John Smith</span>
                  <span className="text-[11px] text-slate-400">&lt;john.smith@example.com&gt;</span>
                </div>
                <span className="text-[11px] text-slate-400">to me</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-2">
                Dear Customer Support,<br /><br />
                I hope this message finds you well. I am writing to inquire about an issue with my recent order (#123456). I received the wrong item and would like to know how to proceed with a return or exchange.<br /><br />
                Thank you for your assistance!<br /><br />
                Best regards,<br />
                John Smith
              </p>
            </div>
          </div>

          {/* AI Agent Draft Reply Card (Matching Screenshot 6) */}
          <div className="ml-10 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={agent.name}
                  className="size-6 rounded-full object-cover"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {agent.name}
                </span>
                <span className="text-[11px] text-slate-400">&lt;john.smith@example.com&gt;</span>
                <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold px-1.5">
                  Draft
                </Badge>
              </div>
              <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 gap-1">
                <Sparkles className="size-3" /> AI Generated
              </Badge>
            </div>

            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
              Hi John,<br /><br />
              Thank you for reaching out regarding your order issue. I&apos;m sorry to hear that you received the wrong item. To get this resolved immediately, I can initiate a replacement shipment or provide a prepaid return label.<br /><br />
              Could you please confirm if you&apos;d prefer a replacement or a full refund?<br /><br />
              Best regards,<br />
              {agent.name} — Customer Support Team
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-purple-200/60 dark:border-purple-900/40">
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3">
                  Send Reply
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Edit Draft
                </Button>
              </div>
              <button type="button" className="text-slate-400 hover:text-red-500">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 size-9 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 ring-4 ring-red-600/20"
          title="Open Gmail Settings"
        >
          <Settings className="size-4.5" />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 5. VOICE AGENT HERO CARD SIMULATOR (Screenshot 8)
// ══════════════════════════════════════════════════════════════════════════
export function VoiceSimulator({
  agent,
  onOpenSettings,
}: ChannelSimulatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTalk = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    try {
      setIsPlaying(true);
      const voice = agent.channels?.voice?.voiceProvider || 'alloy';
      const speed = agent.channels?.voice?.speed || 1.0;
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hello! I am ${agent.name}, your voice assistant. How can I help you today?`,
          voice,
          speed,
        }),
      });

      if (!res.ok) throw new Error('Voice TTS not available');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsPlaying(false);
      toast.info(`Voice engine active. Audition available in Voice Settings.`);
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center text-center space-y-4">
        {/* Large Avatar */}
        <div className="relative">
          <img
            src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240'}
            alt={agent.name}
            className="size-32 rounded-full object-cover ring-4 ring-blue-500/20 shadow-md"
          />
          {isPlaying && (
            <span className="absolute inset-0 rounded-full ring-4 ring-blue-500 animate-ping opacity-30" />
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{agent.name}</h2>
            <span className="px-1.5 py-0.5 rounded-sm bg-blue-600 text-white font-bold text-[10px]">
              AI
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {agent.roleTitle || 'Customer Support'}
          </p>
        </div>

        {/* Talk Button (Screenshot 8) */}
        <Button
          type="button"
          onClick={handleTalk}
          className="h-10 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md gap-2 transition-transform hover:scale-105"
        >
          {isPlaying ? (
            <>
              <Square className="size-3.5 fill-white" />
              <span>Stop Talking</span>
            </>
          ) : (
            <>
              <Volume2 className="size-4" />
              <span>Talk to {agent.name.split(' ')[0]}</span>
            </>
          )}
        </Button>
      </div>

      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 size-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 ring-4 ring-blue-600/20"
          title="Open Voice Settings"
        >
          <Settings className="size-4.5" />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 6. SMS TEXT CONVERSATION SIMULATOR (Screenshot 10)
// ══════════════════════════════════════════════════════════════════════════
export function SmsSimulator({
  agent,
  isTestMode = true,
  onOpenSettings,
}: ChannelSimulatorProps) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    { sender: 'user', text: 'I would like to learn more.' },
    { sender: 'agent', text: `Hi! Thanks for contacting us. How can I assist you today?` },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputText('');

    if (isTestMode) {
      setIsTyping(true);
      try {
        const res = await fetch(`/api/forms/agents/${agent.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg, history: messages.map((m) => ({ role: m.sender, content: m.text })) }),
        });
        const data = await res.json();
        const reply = data.reply || `We received your text! Let us know if you need anything else.`;
        setMessages((prev) => [...prev, { sender: 'agent', text: reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { sender: 'agent', text: 'Message received. We will reply shortly.' },
        ]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full py-2">
      <div className="w-[360px] h-[660px] max-h-[85vh] bg-white dark:bg-slate-950 rounded-[44px] border-[10px] border-slate-900 shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-blue-500/20">
        {/* Status Bar */}
        <div className="h-9 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200 select-none shrink-0 pt-1">
          <span>11:07</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 rounded-sm border border-slate-600 dark:border-slate-400 p-0.5">
              <div className="h-full w-3.5 bg-slate-800 dark:bg-slate-200 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* SMS Header */}
        <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ChevronLeft className="size-5 text-blue-600 cursor-pointer" />
            <img
              src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={agent.name}
              className="size-7 rounded-full object-cover"
            />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {agent.name}
            </span>
          </div>
          <MoreVertical className="size-4 text-slate-600 dark:text-slate-400 cursor-pointer" />
        </div>

        {/* SMS Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-end">
          <div className="mx-auto my-1">
            <span className="text-[10px] text-slate-400 font-medium">Today</span>
          </div>

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                'flex w-full',
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed',
                  m.sender === 'user'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-br-xs'
                    : 'bg-blue-600 text-white rounded-bl-xs'
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-blue-600 text-white rounded-2xl px-3 py-1.5 text-xs animate-pulse">
                typing...
              </div>
            </div>
          )}
        </div>

        {/* SMS Input Footer */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-950 shrink-0">
          <Paperclip className="size-4 text-slate-400 cursor-pointer hover:text-slate-600" />
          <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-900 rounded-full px-3 py-1 text-xs">
            <input
              type="text"
              placeholder="Write a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-transparent border-0 outline-hidden text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={inputText ? handleSend : undefined}
            className="size-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-xs"
          >
            {inputText ? <Send className="size-3.5" /> : <Mic className="size-3.5" />}
          </button>
        </div>

        {/* Home Indicator */}
        <div className="h-4 flex items-center justify-center shrink-0 bg-white dark:bg-slate-950">
          <div className="w-28 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>
      </div>

      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 size-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 ring-4 ring-purple-600/20"
          title="Open SMS Settings"
        >
          <Settings className="size-4.5" />
        </button>
      )}
    </div>
  );
}
