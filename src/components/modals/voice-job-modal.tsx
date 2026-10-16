'use client';

/**
 * VoiceCreateJobModal
 * ===================
 * Hands-free AI Voice Command modal for business owners and dispatchers.
 *
 * Features:
 *   • Web Speech API integration with live transcript wave animation
 *   • Automatic intent extraction & entity parsing via /api/ai/voice-command
 *   • Instant Creation Card with Job #, Customer, Schedule, Price, Assignee
 *   • 1-Click "View Job", "Create Another", and fallback text input
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  DollarSign,
  ArrowRight,
  RotateCcw,
  Volume2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

interface VoiceCreateJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated?: (job: any) => void;
}

export function VoiceCreateJobModal({
  open,
  onOpenChange,
  onJobCreated,
}: VoiceCreateJobModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const setPendingOpenEntity = useAppStore((s) => s.setPendingOpenEntity);
  const setActiveView = useAppStore((s) => s.setActiveView);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition initialization failed:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Auto-start listening when modal opens
  useEffect(() => {
    if (open) {
      setTranscript('');
      setResult(null);
      setIsProcessing(false);
      if (recognitionRef.current && speechSupported) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    }
  }, [open, speechSupported]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          setIsListening(true);
        }
      }
    }
  };

  const handleExecuteVoiceCommand = async () => {
    const text = transcript.trim();
    if (!text) {
      toast.error('Please speak or type a command first.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/ai/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.spokenFeedback || data.error || 'Could not understand command.');
        setIsProcessing(false);
        return;
      }

      setResult(data);
      toast.success(data.spokenFeedback || 'Action completed successfully!');
      if (onJobCreated && data.data?.job) {
        onJobCreated(data.data.job);
      }
    } catch (err: any) {
      console.error('Voice command error:', err);
      toast.error(err.message || 'Failed to execute voice command.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setTranscript('');
    setResult(null);
    setIsProcessing(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  };

  const handleOpenCreatedJob = () => {
    if (result?.data?.job?.id) {
      setPendingOpenEntity({ type: 'job', id: result.data.job.id });
      setActiveView('jobs');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent border-b border-border/50">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Voice AI Dispatcher
                <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  HANDS-FREE
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Speak naturally to create jobs, schedule technicians, or bill customers.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">
          {!result ? (
            <>
              {/* Mic Visualizer Button */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative flex items-center justify-center">
                  {/* Wave Pulse Rings */}
                  {isListening && (
                    <>
                      <div className="absolute size-32 rounded-full bg-emerald-500/15 animate-ping duration-1000" />
                      <div className="absolute size-28 rounded-full bg-emerald-500/25 animate-pulse" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={isProcessing}
                    className={cn(
                      'relative z-10 size-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer',
                      isListening
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white ring-4 ring-emerald-500/30 scale-105'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={isListening ? 'Stop listening' : 'Start listening'}
                  >
                    {isProcessing ? (
                      <Loader2 className="size-8 animate-spin text-white" />
                    ) : isListening ? (
                      <Mic className="size-8 animate-bounce text-white" />
                    ) : (
                      <MicOff className="size-8" />
                    )}
                  </button>
                </div>

                <p className="mt-4 text-xs font-medium text-muted-foreground text-center">
                  {isProcessing
                    ? 'AI is parsing entities & creating record...'
                    : isListening
                    ? 'Listening... Speak your command now'
                    : 'Tap microphone to speak'}
                </p>
              </div>

              {/* Transcript Preview Box */}
              <div className="relative">
                <div className="min-h-[90px] p-4 rounded-xl bg-muted/40 border border-border/80 focus-within:border-emerald-500/60 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Spoken Transcript
                    </span>
                    {transcript && (
                      <button
                        onClick={() => setTranscript('')}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <X className="size-3" /> Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder='e.g., "Schedule an AC service for Rahul Sharma tomorrow at 3pm for ₹2500, assign to Amit"'
                    rows={3}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 resize-none outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Quick Prompt Ideas */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Try speaking:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Schedule AC repair for John Doe tomorrow 10am $150',
                    'Create job for Sarah leak inspection Friday 2pm assign to David',
                    'Create invoice for Deepak $400 for drain cleaning',
                  ].map((tip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTranscript(tip)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors text-left truncate max-w-full"
                    >
                      "{tip}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExecuteVoiceCommand}
                  disabled={!transcript.trim() || isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-sm font-semibold"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Execute AI Command
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Success Confirmation Card */
            <div className="space-y-5 animate-in fade-in-50 zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {result.data?.job
                          ? `Job Created: ${result.data.job.jobNumber}`
                          : result.spokenFeedback || 'Command Executed'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {result.spokenFeedback}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    SUCCESS
                  </Badge>
                </div>

                {/* Job Entity Details Grid */}
                {result.data?.job && (
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-emerald-500/20">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="size-3.5 text-emerald-600" />
                      <span>Customer: <strong className="text-foreground">{result.data.job.customerName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-3.5 text-emerald-600" />
                      <span>Date: <strong className="text-foreground">{result.data.job.scheduledDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="size-3.5 text-emerald-600" />
                      <span>Time: <strong className="text-foreground">{result.data.job.scheduledTime || 'TBD'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="size-3.5 text-emerald-600" />
                      <span>Amount: <strong className="text-foreground">${result.data.job.amount || '0'}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                  <RotateCcw className="size-3.5" />
                  Create Another
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  {result.data?.job && (
                    <Button
                      size="sm"
                      onClick={handleOpenCreatedJob}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 font-semibold"
                    >
                      View Job
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
