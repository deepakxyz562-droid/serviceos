'use client';

/**
 * TestCallDialog
 * ==============
 *
 * Shared dialog for initiating a test call. Used by:
 *   - The workspace header "Test Call" button
 *   - The Overview tab quick action
 *   - The Test Call tab
 *
 * Flow:
 *   1. User enters their phone number
 *   2. POST /api/addons/receptionist/test-call
 *   3. Show "Calling..." state with pulsing ring effect
 *   4. Show success (with 1-click link to view transcript in Call History) or error
 */

import { useState } from 'react';
import {
  PhoneOutgoing,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  X,
  Sparkles,
  Phone,
  ArrowRight,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CallState = 'idle' | 'calling' | 'success' | 'error';

interface TestCallResult {
  ok: boolean;
  callId?: string;
  vapiCallId?: string;
  customerNumber?: string;
  fromNumber?: string;
  status?: string;
  message?: string;
  error?: string;
  detail?: string;
}

export function TestCallDialog({
  open,
  onOpenChange,
  defaultNumber = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultNumber?: string;
}) {
  const [number, setNumber] = useState(defaultNumber);
  const [state, setState] = useState<CallState>('idle');
  const [result, setResult] = useState<TestCallResult | null>(null);

  const handleSubmit = async () => {
    setState('calling');
    setResult(null);
    try {
      const res = await fetch('/api/addons/receptionist/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNumber: number }),
      });
      const data = (await res.json()) as TestCallResult;

      if (res.ok && data.ok) {
        setResult(data);
        setState('success');
        toast.success('Live test call initiated! Answer your phone.');
      } else {
        setResult(data);
        setState('error');
        toast.error(data.error || 'Failed to start test call');
      }
    } catch {
      setState('error');
      setResult({ ok: false, error: 'Network error — please check your connection and try again.' });
      toast.error('Network error');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setState('idle');
        setResult(null);
      }, 200);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
              <PhoneOutgoing className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base">Test Your AI Receptionist</DialogTitle>
              <DialogDescription className="text-xs">
                We&apos;ll dial your personal phone number so you can test conversational flow and appointment booking live.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {state === 'idle' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test-number" className="text-xs font-medium">Your Phone Number</Label>
              <Input
                id="test-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+1 (415) 555-0123"
                autoComplete="tel"
                className="h-9"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && number.trim() && handleSubmit()}
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your mobile number with country code (e.g. +1 for US/Canada).
              </p>
            </div>

            {/* Test prompt hints */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>Things to try saying when you answer:</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1 pl-4 list-disc">
                <li>&quot;I need to schedule a service inspection for Friday.&quot;</li>
                <li>&quot;What are your shop hours and pricing for an oil change?&quot;</li>
                <li>&quot;Can I speak with a real person?&quot; (tests live transfer)</li>
              </ul>
            </div>
          </div>
        )}

        {state === 'calling' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="relative">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <PhoneCall className="size-8 animate-pulse" />
              </div>
              <span className="absolute -inset-2 rounded-2xl border-2 border-primary/30 animate-ping opacity-75" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-foreground">Dialing {number}...</p>
              <p className="text-xs text-muted-foreground">
                Your phone will ring in a few seconds. Pick up and start speaking!
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-primary font-medium px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20">
              <Radio className="size-3 animate-pulse" />
              <span>Voice AI Agent Connected</span>
            </div>
          </div>
        )}

        {state === 'success' && result && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center gap-2.5 py-3 text-center">
              <div className="flex items-center justify-center size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-inner">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Test Call Dispatched</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Answer the incoming call from your AI Receptionist.
                </p>
              </div>
            </div>

            {result.fromNumber && (
              <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">From (AI Line):</span>
                  <span className="font-semibold text-foreground">{result.fromNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">To (Your Phone):</span>
                  <span className="font-semibold text-foreground">{result.customerNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Call Status:</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase font-semibold">
                    {result.status || 'Dispatched'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'error' && result && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-semibold text-destructive">
                  {result.error || 'Failed to start test call'}
                </p>
                {result.detail && (
                  <p className="text-[11px] text-destructive/80 break-words leading-relaxed">
                    {result.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          {state === 'idle' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!number.trim()}
                className="gap-2 font-medium"
              >
                <PhoneOutgoing className="size-3.5" />
                Call My Phone
              </Button>
            </>
          )}
          {state === 'calling' && (
            <Button variant="outline" size="sm" disabled className="gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              Calling in Progress...
            </Button>
          )}
          {state === 'success' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleClose(false);
                  const url = new URL(window.location.href);
                  url.searchParams.set('aiTab', 'calls');
                  window.history.pushState({}, '', url.toString());
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="gap-1.5 font-medium"
              >
                View Call History
                <ArrowRight className="size-3.5" />
              </Button>
            </>
          )}
          {state === 'error' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button size="sm" onClick={() => setState('idle')} className="font-medium">
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
