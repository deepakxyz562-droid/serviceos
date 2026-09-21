'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UniversalProject } from '@/lib/forms/universal-component-types';
import { generateUniversalProjectFromPrompt } from '@/lib/forms/generators/ai-universal-generator';
import {
  Bot,
  Calendar,
  Phone,
  MessageCircle,
  FileText,
  Sparkles,
  Download,
  Share2,
  ChevronRight,
  Home,
  Layers,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function UniversalAppPublicPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'service-portal';

  const project = React.useMemo(() => {
    return generateUniversalProjectFromPrompt(
      slug.replace(/-/g, ' '),
      slug.includes('dental') ? 'dental' : slug.includes('auto') ? 'automotive' : 'general'
    );
  }, [slug]);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'info'>('home');
  const [activeSubFormId, setActiveSubFormId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'ai' | 'user'; text: string }>>([
    {
      id: 'init',
      sender: 'ai',
      text: 'Hi there! 👋 I am your 24/7 Service Concierge. How can I assist you with quotes, inquiries, or form questions today?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  const handleSendChat = (text?: string) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatSending) return;

    setChatMessages((prev) => [...prev, { id: `u_${Date.now()}`, sender: 'user', text: msg }]);
    setChatInput('');
    setChatSending(true);

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'ai',
          text: `Thank you for asking! For "${msg}", our team will review your inquiry immediately. Would you like to fill out the direct request form now?`,
        },
      ]);
      setChatSending(false);
    }, 600);
  };

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-slate-400">Loading Mobile Portal...</p>
        </div>
      </div>
    );
  }

  const brandColor = project.brandColor || '#059669';

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-start p-0 sm:p-4 select-none">
      {/* Mobile App Shell Container */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[840px] sm:max-h-[90vh] bg-slate-900 sm:rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden relative">
        {/* ─── APP HEADER ─── */}
        <div
          className="p-4 pt-6 text-white shrink-0 border-b border-white/10"
          style={{ backgroundColor: brandColor }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center font-bold text-lg border border-white/20 shadow-sm">
                📱
              </div>
              <div>
                <h1 className="text-sm font-extrabold leading-tight">{project.name}</h1>
                <p className="text-[11px] text-white/80 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Verified Business Portal • 24/7 AI
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => toast.success('App added to your Home Screen!')}
              className="h-7 text-[10px] bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl gap-1"
            >
              <Download className="size-3" /> Install
            </Button>
          </div>
        </div>

        {/* ─── APP BODY TABS ─── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'home' && (
            <>
              {/* Pinned 24/7 AI Service Concierge Tile */}
              <div
                onClick={() => setActiveTab('chat')}
                className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-white/15 rounded-2xl shadow-xl space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                      <Bot className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        Meet Clara — 24/7 AI Concierge
                        <Sparkles className="size-3 text-amber-300" />
                      </p>
                      <p className="text-[10px] text-emerald-400">Ask questions, get estimates &amp; book</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="p-2.5 bg-white/5 rounded-xl text-[11px] text-slate-300 italic border border-white/5">
                  &quot;Have a question about services or pricing? I can answer your questions in seconds.&quot;
                </div>
              </div>

              {/* Quick Action Tiles Grid */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveSubFormId('quote_form')}
                    className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="size-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                      ⚡
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">Instant Estimate</p>
                    <p className="text-[10px] text-slate-400">Submit request &amp; details</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubFormId('booking_form')}
                    className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      📅
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">Book Service</p>
                    <p className="text-[10px] text-slate-400">Pick preferred appointment</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="size-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                      💬
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">Live Chat</p>
                    <p className="text-[10px] text-slate-400">Talk with AI concierge</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="size-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      ℹ️
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">Business Info</p>
                    <p className="text-[10px] text-slate-400">Hours, FAQ &amp; policy</p>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* AI Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[520px] justify-between">
              <div className="overflow-y-auto space-y-2.5 pr-1">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-slate-800 text-slate-100 border border-slate-700'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Clara anything or request quote..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                  >
                    Send
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* Business Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2">
                <h3 className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  About {project.name}
                </h3>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Welcome to our verified mobile service portal. Submit forms, calculate instant estimates, and chat with our 24/7 AI assistant directly from your smartphone.
                </p>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                Powered by Fieseros GPTForm
              </div>
            </div>
          )}
        </div>

        {/* ─── BOTTOM APP NAVIGATION DOCK ─── */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/90 backdrop-blur flex items-center justify-around shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-3 rounded-xl transition-all ${
              activeTab === 'home' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="size-4" /> Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-3 rounded-xl transition-all ${
              activeTab === 'chat' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="size-4" /> AI Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-3 rounded-xl transition-all ${
              activeTab === 'info' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="size-4" /> Info
          </button>
        </div>

        {/* ─── SUB-FORM MODAL DRAWER ─── */}
        {activeSubFormId && (
          <Dialog open={Boolean(activeSubFormId)} onOpenChange={() => setActiveSubFormId(null)}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white p-6 rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  {activeSubFormId === 'quote_form' ? 'Instant Request Estimator' : 'Schedule Appointment'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Your Full Name</label>
                  <input placeholder="Jane Doe" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Phone Number or Email</label>
                  <input placeholder="(555) 000-0000" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Project Details</label>
                  <textarea placeholder="Describe your service request..." rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white resize-none" />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    toast.success('Service request submitted successfully!');
                    setActiveSubFormId(null);
                  }}
                  className="w-full text-xs font-bold h-9 rounded-xl text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  Submit Request ⚡
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
