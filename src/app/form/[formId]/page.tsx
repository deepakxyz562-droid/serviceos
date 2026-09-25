'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { FormSchema } from '@/lib/forms/form-schema-types';
import { resolveFormLayout, layoutToRuntimeMode } from '@/lib/forms/resolve-form-layout';
import dynamic from 'next/dynamic';

const FormRenderer = dynamic(
  () => import('@/features/forms/components/runtime/form-renderer').then((m) => ({ default: m.FormRenderer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
        <span className="text-xs text-muted-foreground">Loading form...</span>
      </div>
    ),
  }
);

/**
 * Published Form Page — /form/[formId]
 *
 * This route renders a PURE FORM in its saved type (Classic Paper or Card
 * Swipe). It does NOT render an AI Agent widget — the AI Agent is a separate
 * product that users add to their site independently via:
 *   - Standalone route: /agent/[agentId]
 *   - Site-wide embed:  <SiteAgentWidget agentId="..." /> (see src/components/site-agent-widget.tsx)
 *
 * This separation matches Jotform's architecture:
 *   - Jotform published forms are pure forms (no chat widget).
 *   - Jotform AI Agent is a separate embeddable widget.
 */
export default function PublicFormPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState<string | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [branding, setBranding] = useState<{ businessName: string; logoUrl?: string } | null>(null);

  // Password protection state
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const fetchForm = useCallback(async () => {
    if (!formId) return;
    try {
      const res = await fetch(`/api/public/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setFormName(data.name);
        setFormDescription(data.description);
        setSchema(data.schema);
        setBranding(data.branding);

        // Check password protection
        const pwdConfig = data.schema?.settings?.passwordProtection;
        if (!pwdConfig?.enabled || !pwdConfig?.password) {
          setIsUnlocked(true);
        }

        // Set document page title if provided
        if (data.schema?.settings?.pageTitle) {
          document.title = data.schema.settings.pageTitle;
        } else if (data.name) {
          document.title = `${data.name} | Fieseros`;
        }
      } else {
        toast.error('Form not found or unavailable');
      }
    } catch {
      toast.error('Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPassword = schema?.settings?.passwordProtection?.password;
    if (passwordInput === targetPassword) {
      setIsUnlocked(true);
      setPasswordError(false);
      toast.success('Access granted');
    } else {
      setPasswordError(true);
      toast.error('Incorrect password');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 rounded-2xl border-border/80 shadow-md">
          <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground">Form Unavailable</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            This form does not exist, has been paused, or has been archived.
          </p>
        </Card>
      </div>
    );
  }

  // Password Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full rounded-2xl border-border/80 shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2 bg-gradient-to-b from-muted/30 to-background">
            <div className="size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
              <Lock className="size-6" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">Protected Form</CardTitle>
            <CardDescription className="text-xs">
              This form requires a password to view and complete
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <form onSubmit={handleUnlock} className="space-y-3">
              <Input
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (passwordError) setPasswordError(false);
                }}
                className={`h-9 text-xs ${passwordError ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                autoFocus
              />
              {passwordError && (
                <p className="text-[11px] text-rose-500 font-medium">Incorrect password. Please try again.</p>
              )}
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-xs cursor-pointer"
              >
                Unlock Form <ArrowRight className="size-3.5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Resolve the form's saved layout using the SHARED resolver ─────────
  // This fixes the Open Live bug where split_media was lost (fell through to 'paper').
  // Now /form/[formId], the builder preview, and the runtime all use the SAME
  // resolver — so editor = preview = live.
  const formLayout = resolveFormLayout(schema);
  const resolvedMode = layoutToRuntimeMode(formLayout);

  const pageBgColor = schema.theme?.backgroundColor && schema.theme.backgroundColor !== '#ffffff'
    ? schema.theme.backgroundColor
    : undefined;

  return (
    <div
      className="min-h-screen bg-slate-50/60 dark:bg-slate-950 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 flex flex-col justify-center items-center"
      style={pageBgColor ? { backgroundColor: pageBgColor } : undefined}
    >
      <div className="w-full max-w-5xl">
        <FormRenderer
          formId={formId}
          schema={schema}
          formName={formName}
          formDescription={formDescription}
          branding={branding}
          mode="live"
        />
      </div>
    </div>
  );
}
