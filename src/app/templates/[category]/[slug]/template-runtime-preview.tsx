'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { normalizeFormSchema } from '@/lib/forms/form-schema-types';
import type { FormSchema } from '@/lib/forms/form-schema-types';
import { resolveFormLayout, layoutToRuntimeMode } from '@/lib/forms/resolve-form-layout';

const FormRuntimeRenderer = dynamic(
  () => import('@/features/forms/components/runtime/form-runtime-renderer').then((m) => ({ default: m.FormRuntimeRenderer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
        <span className="text-xs text-muted-foreground">Loading interactive form preview...</span>
      </div>
    ),
  }
);

interface TemplateRuntimePreviewProps {
  formName: string;
  schema: FormSchema;
}

export function TemplateRuntimePreview({ formName, schema }: TemplateRuntimePreviewProps) {
  // Normalize the schema before rendering — matches the gallery modal preview path
  // (FormPreviewCanvas). This ensures show* mediaPanel flags default to true when
  // undefined, so canonical templates that declare mediaPanel.enabled + content
  // but omit explicit show* flags still render the left hero column.
  const normalizedSchema = React.useMemo(() => normalizeFormSchema(schema), [schema]);
  const mode = React.useMemo(() => layoutToRuntimeMode(resolveFormLayout(normalizedSchema)), [normalizedSchema]);
  return (
    <FormRuntimeRenderer
      formName={formName}
      schema={normalizedSchema}
      previewMode={true}
      mode={mode}
    />
  );
}
