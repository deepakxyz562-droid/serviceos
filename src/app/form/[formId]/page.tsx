'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { FormSchema } from '@/lib/forms/form-schema-types';
import { FormRuntimeRenderer } from '@/features/forms/components/runtime/form-runtime-renderer';

export default function PublicFormPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState<string | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [branding, setBranding] = useState<{ businessName: string; logoUrl?: string } | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 rounded-2xl border-border/80 shadow-sm">
          <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground">Form Unavailable</h2>
          <p className="text-xs text-muted-foreground mt-1">
            This form does not exist, has been paused, or has been archived.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <FormRuntimeRenderer
        formId={formId}
        formName={formName}
        formDescription={formDescription}
        schema={schema}
        branding={branding}
        allowModeSwitch={true}
        mode={schema.theme?.layout === 'card' ? 'card' : 'paper'}
      />
    </div>
  );
}
