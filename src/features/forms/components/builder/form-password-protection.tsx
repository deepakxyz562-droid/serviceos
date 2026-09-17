'use client';

/**
 * Form Password Protection (UI)
 * ------------------------------
 * UI for setting a form password. Runtime checks password before showing form.
 *
 * The password is hashed client-side using SHA-256 (via Web Crypto) before
 * being stored in `field.widgetConfig.passwordHash` or form settings.
 */

import { useState } from 'react';
import { Lock, KeyRound, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface PasswordProtection {
  enabled: boolean;
  passwordHash: string; // sha-256 hex
  message?: string;
}

export interface FormPasswordProtectionProps {
  value?: PasswordProtection;
  onChange?: (cfg: PasswordProtection) => void;
  className?: string;
}

async function sha256(text: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // Fallback: simple hash (NOT cryptographically secure — server should re-hash).
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return `fallback_${(h >>> 0).toString(16)}`;
  }
  const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(plain: string): Promise<string> {
  return sha256(plain);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const computed = await sha256(plain);
  return computed === hash;
}

export function FormPasswordProtection({ value, onChange, className }: FormPasswordProtectionProps) {
  const [cfg, setCfg] = useState<PasswordProtection>(
    value ?? { enabled: false, passwordHash: '', message: 'This form is password protected. Please enter the password to continue.' },
  );
  const [plain, setPlain] = useState('');
  const [show, setShow] = useState(false);

  async function update(patch: Partial<PasswordProtection>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    onChange?.(next);
  }

  async function handleSetPassword() {
    if (!plain.trim()) return;
    const hash = await hashPassword(plain);
    await update({ passwordHash: hash });
    setPlain('');
  }

  async function handleToggle(enabled: boolean) {
    await update({ enabled });
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" />
          Password Protection
          <Switch
            checked={cfg.enabled}
            onCheckedChange={handleToggle}
            aria-label="Enable password protection"
            className="ml-auto"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!cfg.enabled ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            Form is publicly accessible. Enable password protection to restrict access.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="fp-password">Set Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fp-password"
                    type={show ? 'text' : 'password'}
                    placeholder="Enter a password..."
                    value={plain}
                    onChange={(e) => setPlain(e.target.value)}
                    className="pl-8 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={handleSetPassword} disabled={!plain.trim()}>
                  Save
                </Button>
              </div>
              {cfg.passwordHash && (
                <p className="text-[10px] text-green-700">
                  ✓ Password set (hash: <code className="font-mono">{cfg.passwordHash.slice(0, 16)}...</code>)
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-message">Access Denied Message</Label>
              <Textarea
                id="fp-message"
                rows={2}
                value={cfg.message ?? ''}
                onChange={(e) => update({ message: e.target.value })}
                placeholder="Message shown to users before they enter the password."
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default FormPasswordProtection;
