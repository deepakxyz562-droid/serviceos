'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { FormSchema } from '@/lib/forms/form-schema-types';

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
  return (
    <FormRuntimeRenderer
      formName={formName}
      schema={schema}
      previewMode={true}
    />
  );
}
