'use client';

/**
 * SectionWidget — A container that groups fields into a visual section.
 *
 * Sections can have:
 *   - A title (heading)
 *   - A description (subtext)
 *   - A background color
 *   - Padding
 *   - Border
 *
 * Fields are rendered as children inside the section.
 *
 * This is the Elementor "Section" concept — a visual grouping container.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { FormFieldRenderer } from '../../shared-field-renderer';
import type { FormField } from '@/lib/forms/form-schema-types';

export interface SectionWidgetProps {
  title?: string;
  description?: string;
  backgroundColor?: string;
  padding?: string;
  borderRadius?: string;
  showBorder?: boolean;
  borderColor?: string;
  // Children fields
  childFields?: FormField[];
  formData?: Record<string, any>;
  onChange?: (fieldId: string, value: any) => void;
  allFormData?: Record<string, any>;
  inputBorderRadius?: string;
  defaultInputHeightCls?: string;
}

export function SectionWidget({
  title,
  description,
  backgroundColor = 'transparent',
  padding = '24px',
  borderRadius = '16px',
  showBorder = true,
  borderColor,
  childFields = [],
  formData = {},
  onChange,
  allFormData = {},
  inputBorderRadius = '12px',
  defaultInputHeightCls = 'h-11 text-xs',
}: SectionWidgetProps) {
  return (
    <div
      className="w-full space-y-4"
      style={{
        backgroundColor,
        padding,
        borderRadius,
        border: showBorder ? `1px solid ${borderColor || 'rgba(0,0,0,0.08)'}` : 'none',
      }}
    >
      {title && (
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {description && (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-y-4 gap-x-3">
        {childFields.map((field) => (
          <FormFieldRenderer
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={(val) => onChange?.(field.id, val)}
            allFormData={allFormData}
            mode="live"
            inputBorderRadius={inputBorderRadius}
            defaultInputHeightCls={defaultInputHeightCls}
          />
        ))}
      </div>
    </div>
  );
}

export default SectionWidget;
