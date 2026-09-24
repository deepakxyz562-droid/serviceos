'use client';

/**
 * FormShell — Shared form container used by BOTH editor and runtime.
 *
 * This component renders the form's outer structure:
 *   - Card container with theme borderRadius
 *   - Form header (name + description + branding)
 *   - Form body (children — fields are rendered by the parent)
 *   - Theme CSS variables
 *
 * By sharing this shell, the editor and runtime produce the SAME outer
 * structure — eliminating the "form inside a box inside another box"
 * problem where the editor added extra padding/cards that the runtime
 * didn't have.
 *
 * Usage:
 *   <FormShell schema={schema} formName={formName} mode="live">
 *     {fields.map(field => <FormFieldRenderer ... />)}
 *   </FormShell>
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { FormSchema } from '@/lib/forms/form-schema-types';
import { cn } from '@/lib/utils';

export interface FormShellProps {
  schema: FormSchema;
  formName: string;
  formDescription?: string | null;
  branding?: { businessName?: string; logoUrl?: string } | null;
  mode?: 'live' | 'editor';
  isEstimatorForm?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormShell({
  schema,
  formName,
  formDescription,
  branding,
  mode = 'live',
  isEstimatorForm = false,
  children,
  className,
}: FormShellProps) {
  const primaryColor = schema.theme?.primaryColor || '#059669';
  const buttonColor = schema.theme?.buttonColor || primaryColor;
  const borderRadius = schema.theme?.borderRadius || '16px';
  const fontFamily = schema.theme?.fontFamily || 'Inter, sans-serif';
  const textColor = schema.theme?.textColor || '#0f172a';
  const backgroundColor = schema.theme?.backgroundColor || '#ffffff';

  return (
    <Card
      className={cn(
        'w-full overflow-hidden border border-border/60 shadow-lg transition-all',
        className,
      )}
      style={{
        borderRadius,
        fontFamily,
        backgroundColor,
        color: textColor,
        ['--form-primary' as any]: primaryColor,
        ['--form-btn-color' as any]: buttonColor,
      }}
    >
      {/* Form Header — shared between editor and runtime */}
      {(formName || branding?.businessName) && (
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-border/40">
          {branding?.logoUrl && (
            <img
              src={branding.logoUrl}
              alt={branding.businessName || formName}
              className="h-8 mb-3 object-contain"
            />
          )}
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            {formName}
          </h1>
          {formDescription && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-lg">
              {formDescription}
            </p>
          )}
          {isEstimatorForm && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mt-2">
              ✨ Real-time Calculation
            </span>
          )}
        </div>
      )}

      {/* Form Body — fields are rendered by the parent */}
      <CardContent className="p-6 sm:p-8 pt-6 flex-1">
        {children}
      </CardContent>
    </Card>
  );
}
