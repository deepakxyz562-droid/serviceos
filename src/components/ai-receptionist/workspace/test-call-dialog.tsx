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
 *   3. Show "Calling..." state
 *   4. Show success (with link to view the call) or error
 *
 * The call goes through the same admission + reservation + Vapi path as
 * a real inbound call — this proves the full pipeline works.
 */

import { useState } from 'react';
import {
  PhoneOutgoing,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  X,
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
import { toast } from 'sonner';

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
        toast.success('Test call started!');
      } else {
        setResult(data);
        setState('error');
        toast.error(data.error || 'Failed to start test call');
      }
    } catch {
      setState('error');
      setResult({ ok: false, error: 'Network error — please try again' });
      toast.error('Network error — please try again');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset state when dialog closes
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
          <DialogTitle className="flex items-center gap-2">
            <PhoneOutgoing className="size-5 text-emerald-600" />
            Call your receptionist
          </DialogTitle>
          <DialogDescription>
            We&apos;ll call you and connect you to your AI Receptionist. This
            proves your number → Twilio → Vapi → AI pipeline works.
          </DialogDescription>
        </DialogHeader>

        {state === 'idle' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test-number">Your phone number</Label>
              <Input
                id="test-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+1 415 555 0123"
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                Enter your number in international format (country code + number).
                Standard call rates may apply.
              </p>
            </div>
          </div>
        )}

        {state === 'calling' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="relative">
              <PhoneCall className="size-12 text-emerald-600 animate-pulse" />
              <span className="absolute -inset-2 rounded-full border-2 border-emerald-200 dark:border-emerald-900 animate-ping opacity-75" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Calling {number}...</p>
              <p className="text-xs text-muted-foreground">
                Connecting you to your AI Receptionist
              </p>
            </div>
          </div>
        )}

        {state === 'success' && result && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <div className="flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="size-6 text-emerald-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">Test call started</p>
                <p className="text-xs text-muted-foreground">
                  Answer your phone — your AI Receptionist will be on the line.
                </p>
              </div>
            </div>
            {result.fromNumber && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">{result.fromNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">{result.customerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{result.status}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'error' && result && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-3">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-red-900 dark:text-red-300">
                  {result.error || 'Failed to start test call'}
                </p>
                {result.detail && (
                  <p className="text-xs text-red-700 dark:text-red-400 break-words">
                    {result.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {state === 'idle' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!number.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <PhoneOutgoing className="size-4" />
                Start Test Call
              </Button>
            </>
          )}
          {state === 'calling' && (
            <Button variant="outline" disabled>
              <Loader2 className="size-4 mr-1 animate-spin" />
              Calling...
            </Button>
          )}
          {state === 'success' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  handleClose(false);
                  // Navigate to calls tab to see the test call
                  const url = new URL(window.location.href);
                  url.searchParams.set('aiTab', 'calls');
                  window.history.pushState({}, '', url.toString());
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="gap-2"
              >
                View Call
              </Button>
            </>
          )}
          {state === 'error' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button onClick={() => setState('idle')}>Try Again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
