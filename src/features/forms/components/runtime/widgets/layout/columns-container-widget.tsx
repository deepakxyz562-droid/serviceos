'use client';

/**
 * ColumnsContainerWidget — Renders child fields in a multi-column grid.
 *
 * This widget reads `widgetConfig.childFields` (an array of field IDs)
 * and renders those fields inside a CSS grid with 2 or 3 columns.
 *
 * In the editor, the user drags fields into the container. At runtime,
 * the container simply renders its children in the grid.
 *
 * The container itself is a visual layout element — it doesn't collect
 * any data. It's purely for presentation.
 */

import React from 'react';
import { WidgetRuntimeDispatcher } from '../widget-runtime-dispatcher';
import { cn } from '@/lib/utils';
import type { FormField } from '@/lib/forms/form-schema-types';

interface ColumnsContainerWidgetProps {
  field: FormField;
  allFormData: Record<string, any>;
  onChange: (fieldId: string, val: any) => void;
  allFields: FormField[];
  formId?: string;
}

export function ColumnsContainerWidget({
  field,
  allFormData,
  onChange,
  allFields,
  formId,
}: ColumnsContainerWidgetProps) {
  const cfg = (field.widgetConfig as Record<string, any>) || {};
  const columns: number = cfg.columns || 2;
  const gap: string = cfg.gap || '16px';
  const childFieldIds: string[] = cfg.childFields || [];

  // Resolve child field objects from allFields
  const childFields = childFieldIds
    .map((id) => allFields.find((f) => f.id === id))
    .filter(Boolean) as FormField[];

  // CSS grid template based on column count
  const gridTemplateColumns =
    columns === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)';

  if (childFields.length === 0) {
    return (
      <div
        className="w-full p-6 border border-dashed border-border/60 rounded-xl text-center text-xs text-muted-foreground"
        style={{ minHeight: '60px' }}
      >
        Drop fields here to create a {columns}-column layout
      </div>
    );
  }

  return (
    <div
      className="w-full grid gap-4"
      style={{
        gridTemplateColumns,
        gap,
      }}
    >
      {childFields.map((childField) => (
        <div key={childField.id} className="space-y-1.5">
          {/* Label */}
          {!['heading', 'paragraph', 'divider'].includes(childField.type) &&
            childField.labelEnabled !== false && (
              <label className="text-xs font-bold text-foreground block">
                {childField.label}
                {childField.required && <span className="text-rose-500 ml-0.5">*</span>}
              </label>
            )}
          {/* Widget */}
          {!['heading', 'paragraph', 'divider'].includes(childField.type) && (
            <WidgetRuntimeDispatcher
              field={childField}
              value={allFormData[childField.id]}
              onChange={(val) => onChange(childField.id, val)}
              allFormData={allFormData}
              formId={formId}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default ColumnsContainerWidget;
