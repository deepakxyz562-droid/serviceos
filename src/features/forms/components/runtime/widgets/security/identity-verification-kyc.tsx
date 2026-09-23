'use client';

import React, { useMemo, useState } from 'react';
import { ScanFace, ShieldCheck, ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, bool } from '../widget-props';

type Status = 'idle' | 'started' | 'in_progress' | 'approved' | 'declined' | 'error';

interface KycValue {
  status: Status;
  provider?: string;
  inquiryId?: string;
  startedAt?: string;
  completedAt?: string;
  applicantName?: string;
}

interface ProviderCfg {
  id: string;
  label: string;
  embedUrl: string;
}

const DEFAULT_PROVIDERS: ProviderCfg[] = [
  { id: 'persona', label: 'Persona', embedUrl: 'https://withpersona.com/widget/inquiry/PLACEHOLDER' },
  { id: 'onfido', label: 'Onfido', embedUrl: 'https://onfido.com/inquiry/PLACEHOLDER' },
];

export function IdentityVerificationKyc({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Identity verification (KYC)');
  const provider = str(config.provider, 'persona');
  const showProviderToggle = bool(config.showProviderToggle, true);

  const providers = useMemo<ProviderCfg[]>(() => {
    const raw = config.providers;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((p) => ({
        id: str((p as Record<string, unknown>).id, ''),
        label: str((p as Record<string, unknown>).label, 'Provider'),
        embedUrl: str((p as Record<string, unknown>).embedUrl, ''),
      }));
    }
    return DEFAULT_PROVIDERS;
  }, [config.providers]);

  const initialProvider = providers.find((p) => p.id === provider) ?? providers[0];

  const v: KycValue = value && typeof value === 'object' ? (value as KycValue) : { status: 'idle' };
  const [selected, setSelected] = useState<ProviderCfg>(initialProvider);
  const [applicantName, setApplicantName] = useState(v.applicantName ?? '');

  const emit = (patch: Partial<KycValue>) => onChange({ ...v, ...patch });

  const start = () => {
    if (disabled) return;
    emit({
      status: 'started',
      provider: selected.id,
      inquiryId: `inq_${Math.random().toString(36).slice(2, 12)}`,
      startedAt: new Date().toISOString(),
      applicantName,
    });
    // Mock progression: idle → started → in_progress → approved (no real API in Phase 2).
    setTimeout(() => emit({ status: 'in_progress' }), 600);
    setTimeout(() => {
      emit({ status: 'approved', completedAt: new Date().toISOString() });
    }, 2200);
  };

  const reset = () => emit({ status: 'idle', inquiryId: undefined, startedAt: undefined, completedAt: undefined });

  const isFinal = v.status === 'approved' || v.status === 'declined' || v.status === 'error';

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
        <ShieldCheck className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
          <strong>Demo Mode.</strong> Add your Persona/Onfido API key in the inspector to enable real KYC verification.
        </p>
      </div>
      {v.status === 'approved' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Identity verified</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
              {v.provider} · {v.inquiryId}
            </p>
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      ) : v.status === 'declined' || v.status === 'error' ? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 flex items-center gap-2">
          <XCircle className="size-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-900 dark:text-red-200">Verification failed</p>
            <p className="text-[11px] text-red-700 dark:text-red-400">{v.inquiryId}</p>
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={reset}>
              Retry
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ScanFace className="size-3.5" /> KYC verification
          </div>

          <Input
            placeholder="Full legal name"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            disabled={disabled || v.status !== 'idle'}
            aria-label="Applicant full name"
            className="text-xs h-9"
          />

          {showProviderToggle && (
            <div className="flex gap-1.5">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled || v.status !== 'idle'}
                  onClick={() => setSelected(p)}
                  aria-label={`Use ${p.label}`}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    selected.id === p.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ExternalLink className="size-2.5" /> Embed URL:
            </p>
            <code className="text-[10px] block break-all text-foreground/80 font-mono">{selected.embedUrl}</code>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={disabled || v.status !== 'idle' || !applicantName}
            onClick={start}
            className="w-full text-xs h-9 gap-1.5"
          >
            {v.status === 'idle' ? (
              <>
                <ShieldCheck className="size-3.5" /> Start verification
              </>
            ) : (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Verifying…
              </>
            )}
          </Button>

          <Badge variant="outline" className="text-[9px] gap-1">
            <ScanFace className="size-2.5" />
            Phase 2 placeholder — no real KYC API call.
          </Badge>
        </>
      )}
    </div>
  );
}

export default IdentityVerificationKyc;
