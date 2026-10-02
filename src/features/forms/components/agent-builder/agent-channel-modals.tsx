'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Instagram,
  MessageCircle,
  Presentation,
  Upload,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText,
  Copy,
} from 'lucide-react';
import { FormAgentData } from '@/features/forms/types/agent-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════════════════════
// 1. INSTAGRAM 3-STEP SETUP MODAL (Screenshot 3)
// ══════════════════════════════════════════════════════════════════════════
interface InstagramConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: FormAgentData;
  onSuccess?: () => void;
}

export function InstagramConnectModal({
  open,
  onOpenChange,
  agent,
  onSuccess,
}: InstagramConnectModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [handle, setHandle] = useState(agent.channels?.instagram?.accountHandle || '');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    // Simulate Meta OAuth popup or redirect
    setTimeout(() => {
      setConnecting(false);
      setStep(2);
      toast.success('Instagram Account Authenticated!');
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Instagram className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Instagram Agent
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Enable your AI Agent to respond to messages sent to your Instagram account
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Stepper (Screenshot 3: Authenticate -> Train -> Complete) */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                step >= 1 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              1
            </span>
            <span className={cn('font-semibold', step === 1 ? 'text-purple-600' : 'text-slate-500')}>
              Authenticate
            </span>
          </div>
          <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                step >= 2 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              2
            </span>
            <span className={cn('font-semibold', step === 2 ? 'text-purple-600' : 'text-slate-500')}>
              Train
            </span>
          </div>
          <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                step >= 3 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              3
            </span>
            <span className={cn('font-semibold', step === 3 ? 'text-purple-600' : 'text-slate-500')}>
              Complete
            </span>
          </div>
        </div>

        {/* Step 1: Authenticate */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            {/* Hero Card Graphic matching Screenshot 3 */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-purple-200/60 dark:border-purple-900/40 relative overflow-hidden">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white">
                    <Instagram className="size-5" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Instagram
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                  Let your Instagram Agent respond to DMs to engage with your followers 24/7.
                </p>

                {/* Floating Feature Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Badge variant="secondary" className="text-[11px] bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs gap-1">
                    @ Mentions
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs gap-1">
                    Story replies
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs gap-1">
                    💬 DMs
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs gap-1">
                    Comments
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Instagram Professional Handle
              </Label>
              <Input
                placeholder="@yourbrand"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="text-xs h-9 bg-slate-50 dark:bg-slate-950 font-mono"
              />
            </div>

            <Button
              type="button"
              disabled={connecting}
              onClick={handleConnect}
              className="w-full h-10 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Connecting to Meta...</span>
                </>
              ) : (
                <>
                  <Instagram className="size-4" />
                  <span>Connect your Instagram</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Train */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Verify Knowledge Sources
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your Instagram Agent will use {agent.name}&apos;s verified knowledge base and services to answer customer questions in DMs.
            </p>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Agent Personality</span>
                <span className="capitalize text-purple-600">{agent.voiceTone}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Connected Forms</span>
                <span>{agent.connectedForms?.length || 1} Form</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Auto-Reply to DMs</span>
                <span className="text-emerald-500 font-bold">Enabled</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setStep(3)}
              className="w-full h-10 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
            >
              Continue to Activation &rarr;
            </Button>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="p-6 space-y-4 text-center">
            <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Instagram Agent Ready!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Inbound customer DMs sent to your Instagram account will now be received and answered by {agent.name}.
            </p>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onSuccess?.();
                toast.success('Instagram Agent successfully connected!');
              }}
              className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 2. PRESENTATION "ADD PRESENTATION" MODAL (Screenshot 7)
// ══════════════════════════════════════════════════════════════════════════
interface PresentationAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOption: (option: 'upload' | 'generate' | 'url') => void;
}

export function PresentationAddModal({
  open,
  onOpenChange,
  onSelectOption,
}: PresentationAddModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            Add Presentation
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Choose how you would like to connect slides for AI voice narration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-3">
          {/* Option 1: Upload Presentation (Blue) */}
          <button
            type="button"
            onClick={() => {
              onSelectOption('upload');
              onOpenChange(false);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-blue-500/20 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Upload className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Upload Presentation
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Upload a PDF or PPTX file
                </p>
              </div>
            </div>
            <div className="size-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="size-4" />
            </div>
          </button>

          {/* Option 2: Generate Presentation with AI (Purple) */}
          <button
            type="button"
            onClick={() => {
              onSelectOption('generate');
              onOpenChange(false);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-purple-500/20 hover:border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Generate Presentation with AI
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter a prompt to generate a presentation
                </p>
              </div>
            </div>
            <div className="size-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="size-4" />
            </div>
          </button>

          {/* Option 3: Import from URL (Orange) */}
          <button
            type="button"
            onClick={() => {
              onSelectOption('url');
              onOpenChange(false);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-amber-500/20 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <LinkIcon className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Import from URL
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Import a presentation from Google Slides
                </p>
              </div>
            </div>
            <div className="size-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="size-4" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 3. WHATSAPP CONNECT MODAL (Screenshot 2 + Text.com Pattern)
// ══════════════════════════════════════════════════════════════════════════
interface WhatsAppConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: FormAgentData;
  onSuccess?: (phone: string) => void;
}

export function WhatsAppConnectModal({
  open,
  onOpenChange,
  agent,
  onSuccess,
}: WhatsAppConnectModalProps) {
  const [mode, setMode] = useState<'embedded' | 'manual'>('embedded');
  const [phoneNumber, setPhoneNumber] = useState(agent.channels?.whatsapp?.phoneNumber || '');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleManualSave = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a WhatsApp phone number');
      return;
    }
    setConnecting(true);
    try {
      // Validate or save to provider
      onSuccess?.(phoneNumber.trim());
      toast.success('WhatsApp connected successfully!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Connect WhatsApp Business
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Turn WhatsApp messages into conversations handled 24/7 by your AI Agent
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Hero Banner */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Bring WhatsApp chats into your inbox
            </span>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Connect your Meta WhatsApp Business Account (WABA). {agent.name} will automatically respond to customer inquiries, book appointments, and capture leads.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('embedded')}
              className={cn(
                'flex-1 py-1 rounded-md transition-all text-center',
                mode === 'embedded' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
              )}
            >
              1-Click Meta Login
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={cn(
                'flex-1 py-1 rounded-md transition-all text-center',
                mode === 'manual' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
              )}
            >
              Manual API Tokens
            </button>
          </div>

          {mode === 'embedded' ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Click below to launch Meta&apos;s official Embedded Signup popup to link your WhatsApp Business Account.
              </p>
              <Button
                type="button"
                onClick={() => {
                  toast.info('Launching Meta Facebook Login dialog...');
                  // Simulate or launch
                  setTimeout(() => {
                    onSuccess?.('+1 (555) 019-2834');
                    onOpenChange(false);
                    toast.success('WhatsApp Business Account connected!');
                  }, 1500);
                }}
                className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md gap-2"
              >
                <MessageCircle className="size-4" />
                <span>Connect with Meta</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 dark:text-slate-300">
                  WhatsApp Business Phone Number
                </Label>
                <Input
                  placeholder="+1 (555) 019-2834"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-xs h-8 bg-slate-50 dark:bg-slate-950 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 dark:text-slate-300">
                  Phone Number ID (From Meta Developer Dashboard)
                </Label>
                <Input
                  placeholder="1092837465..."
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="text-xs h-8 bg-slate-50 dark:bg-slate-950 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 dark:text-slate-300">
                  System User Access Token
                </Label>
                <Input
                  type="password"
                  placeholder="EAAG..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="text-xs h-8 bg-slate-50 dark:bg-slate-950 font-mono"
                />
              </div>

              <Button
                type="button"
                disabled={connecting}
                onClick={handleManualSave}
                className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white mt-2"
              >
                Save &amp; Connect WhatsApp
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
