'use client';

import React, { useState } from 'react';
import { ScrollText, CheckCircle2, Clock, Fingerprint, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface ConsentLogValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  ipHash?: string;
  userAgent?: string;
  statement?: string;
  logId?: string;
}

interface ConsentStatement {
  id: string;
  label: string;
  required: boolean;
}

const DEFAULT_STATEMENTS: ConsentStatement[] = [
  { id: 'terms', label: 'I agree to the Terms of Service', required: true },
  { id: 'privacy', label: 'I consent to data processing per the Privacy Policy', required: true },
  { id: 'marketing', label: 'I opt in to receive marketing communications', required: false },
];

export function ConsentLog({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Consent log');
  const policyVersion = str(config.version, '1.0.0');
  const showIp = bool(config.captureIp, true);
  const captureUa = bool(config.captureUserAgent, true);

  const statements = React.useMemo<ConsentStatement[]>(() => {
    const raw = config.statements;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((s, i) => ({
        id: str((s as Record<string, unknown>).id, `stmt-${i + 1}`),
        label: str((s as Record<string, unknown>).label, 'Consent statement'),
        required: bool((s as Record<string, unknown>).required, false),
      }));
    }
    return DEFAULT_STATEMENTS;
  }, [config.statements]);

  const v: ConsentLogValue = value && typeof value === 'object' ? (value as ConsentLogValue) : { accepted: false };

  // Track which statements are checked individually.
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    statements.forEach((s) => { initial[s.id] = false; });
    if (v.accepted) {
      statements.forEach((s) => { initial[s.id] = true; });
    }
    return initial;
  });

  const requiredMet = statements.filter((s) => s.required).every((s) => checks[s.id]);

  const toggle = (id: string, checked: boolean) => {
    if (disabled) return;
    const next = { ...checks, [id]: checked };
    setChecks(next);
    const allRequired = statements.filter((s) => s.required).every((s) => next[s.id]);
    const allOptional = statements.filter((s) => !s.required).every((s) => next[s.id]);
    const accepted = allRequired; // require only mandatory
    if (accepted) {
      // Generate a mock IP hash (no real backend in Phase 2).
      const ipHash = showIp ? `sha256:${Math.random().toString(36).slice(2, 14)}` : undefined;
      const ua = captureUa && typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : undefined;
      onChange({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: policyVersion,
        ipHash,
        userAgent: ua,
        statement: statements.filter((s) => next[s.id]).map((s) => s.label).join(' | '),
        logId: `log_${Math.random().toString(36).slice(2, 12)}`,
      });
    } else if (v.accepted) {
      // Previously accepted, now revoked.
      onChange({ accepted: false, timestamp: undefined, version: policyVersion, logId: undefined, ipHash: undefined, userAgent: undefined });
    }
  };

  const requiredCount = statements.filter((s) => s.required).length;
  const checkedRequired = statements.filter((s) => s.required && checks[s.id]).length;

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <ScrollText className="size-3.5 text-primary" /> Consent log
          <Badge variant="outline" className="ml-auto text-[9px] gap-1">
            <FileText className="size-2.5" /> v{policyVersion}
          </Badge>
        </div>

        <ul className="space-y-2">
          {statements.map((s) => {
            const checked = checks[s.id] ?? false;
            return (
              <li key={s.id} className="flex items-start gap-2">
                <Checkbox
                  id={`consent-${str(field?.id, 'field')}-${s.id}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(c) => toggle(s.id, c === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`consent-${str(field?.id, 'field')}-${s.id}`}
                  className="text-[11px] text-muted-foreground cursor-pointer leading-relaxed"
                >
                  {s.label}
                  {s.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/60">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            {checkedRequired}/{requiredCount} required consents
          </span>
          {v.accepted ? (
            <Badge variant="default" className="gap-1 bg-emerald-600">
              <CheckCircle2 className="size-3" /> Logged
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px]">Pending</Badge>
          )}
        </div>
      </div>

      {v.accepted && v.timestamp && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 space-y-0.5 text-[10px]">
          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <Fingerprint className="size-3" /> Consent recorded
          </div>
          <p className="text-muted-foreground">
            Time: <span className="font-mono">{new Date(v.timestamp).toLocaleString()}</span>
          </p>
          {v.logId && <p className="text-muted-foreground">Log ID: <span className="font-mono">{v.logId}</span></p>}
          {v.ipHash && <p className="text-muted-foreground">IP hash: <span className="font-mono">{v.ipHash}</span></p>}
          {v.userAgent && <p className="text-muted-foreground truncate">UA: <span className="font-mono">{v.userAgent.slice(0, 40)}…</span></p>}
          <p className="text-muted-foreground">Version: <span className="font-mono">{v.version}</span></p>
        </div>
      )}

      {!requiredMet && !v.accepted && (
        <p className={cn('text-[10px] text-amber-600')}>
          Required consents must be checked to submit the form.
        </p>
      )}
    </div>
  );
}

export default ConsentLog;
