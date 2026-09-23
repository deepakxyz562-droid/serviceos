'use client';

import React, { Component, useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { normalizeFormSchema } from '@/lib/forms/form-schema-types';
import type { FormTemplate } from '@/lib/forms/templates';
import { Button } from '@/components/ui/button';

const FormRuntimeRenderer = dynamic(
  () => import('@/features/forms/components/runtime/form-runtime-renderer').then((m) => ({ default: m.FormRuntimeRenderer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
        <span className="text-xs text-muted-foreground">Loading preview canvas...</span>
      </div>
    ),
  }
);

interface ErrorBoundaryProps {
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class FormErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[FormPreviewCanvas] Error in runtime renderer:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

interface FormPreviewCanvasProps {
  template: FormTemplate;
  device: 'desktop' | 'tablet' | 'mobile';
}

export function FormPreviewCanvas({ template, device }: FormPreviewCanvasProps) {
  const normalizedSchema = useMemo(() => {
    return normalizeFormSchema(template?.schema);
  }, [template?.schema]);

  const renderFallback = () => (
    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-1">
          Official Fieseros Form Blueprint
        </div>
        <h2 className="text-xl font-bold text-foreground">{template.name}</h2>
        <p className="text-xs text-muted-foreground mt-1">{template.shortDescription}</p>
      </div>

      <div className="space-y-4">
        {(normalizedSchema?.fields || []).map((field, idx) => (
          <div key={field.id || idx} className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>
                {field.label || `Field ${idx + 1}`}
                {field.required && <span className="text-rose-500 ml-0.5">*</span>}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize font-normal">
                {field.type}
              </span>
            </label>
            <div className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2 text-xs text-muted-foreground flex items-center">
              {field.placeholder || `Enter ${field.label || 'value'}...`}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Button disabled className="w-full bg-emerald-600 text-white text-xs font-bold rounded-xl h-10">
          Submit Form
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-w-0 bg-slate-100/80 dark:bg-slate-950 p-4 sm:p-6 overflow-y-auto flex items-start justify-center">
      {device === 'mobile' ? (
        /* Mobile Frame */
        <div className="w-[360px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 transition-all my-2">
          <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-3 flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[24px] p-2 sm:p-4 max-h-[68vh] overflow-y-auto shadow-inner">
            <FormErrorBoundary fallback={renderFallback}>
              <FormRuntimeRenderer
                formName={template.name}
                formDescription={template.shortDescription}
                schema={normalizedSchema}
                previewMode={true}
              />
            </FormErrorBoundary>
          </div>
        </div>
      ) : device === 'tablet' ? (
        /* Tablet Frame */
        <div className="w-full max-w-xl bg-slate-900 rounded-[28px] p-4 shadow-2xl border-4 border-slate-800 transition-all my-2">
          <div className="bg-white dark:bg-slate-900 rounded-[18px] p-4 sm:p-6 max-h-[70vh] overflow-y-auto shadow-inner">
            <FormErrorBoundary fallback={renderFallback}>
              <FormRuntimeRenderer
                formName={template.name}
                formDescription={template.shortDescription}
                schema={normalizedSchema}
                previewMode={true}
              />
            </FormErrorBoundary>
          </div>
        </div>
      ) : (
        /* Desktop Paper Canvas */
        <div className="w-full max-w-2xl transition-all my-2">
          <FormErrorBoundary fallback={renderFallback}>
            <FormRuntimeRenderer
              formName={template.name}
              formDescription={template.shortDescription}
              schema={normalizedSchema}
              previewMode={true}
            />
          </FormErrorBoundary>
        </div>
      )}
    </div>
  );
}

export default FormPreviewCanvas;
