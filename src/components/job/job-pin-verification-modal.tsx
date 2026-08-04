'use client';

import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

interface JobPinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void>;
  jobTitle?: string;
  jobNumber?: string;
}

export function JobPinVerificationModal({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  jobNumber,
}: JobPinVerificationModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length !== 4) {
      setError('Please enter the 4-digit PIN provided by the customer');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onConfirm(pin.trim());
      setPin('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <KeyRound className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Verify Customer PIN</h3>
            <p className="text-xs text-muted-foreground">
              {jobNumber ? `Job #${jobNumber}` : 'Job Arrival Verification'}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Ask the customer or property owner for their 4-digit Job Verification PIN sent to them via SMS/Email upon assignment.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              4-Digit PIN
            </label>
            <input
              type="text"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                if (error) setError(null);
              }}
              placeholder="e.g. 4829"
              className="w-full text-center text-3xl font-mono tracking-[0.5em] font-bold py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl border border-input text-sm font-semibold hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Verify & Start</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
