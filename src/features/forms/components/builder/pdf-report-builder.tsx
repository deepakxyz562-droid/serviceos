'use client';

/**
 * PDF Report Builder
 * ------------------
 * UI skeleton for dragging form fields onto a PDF template. Left panel lists
 * available fields; right panel shows a PDF preview with placed fields.
 *
 * Drag-and-drop is intentionally minimal — the main agent can wire up actual
 * PDF generation (jsPDF / pdfmake / puppeteer) later.
 */
import { useState } from 'react';
import { FileText, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FormField } from '@/lib/forms/form-schema-types';

export interface PdfPlacement {
  fieldId: string;
  label: string;
  x: number; // 0-100 (% of page width)
  y: number; // 0-100 (% of page height)
  width: number; // 0-100 (%)
  height: number; // 0-100 (%)
}

export interface PdfReportBuilderProps {
  fields: FormField[];
  placements?: PdfPlacement[];
  onChange?: (placements: PdfPlacement[]) => void;
  className?: string;
}

export function PdfReportBuilder({ fields, placements: initial = [], onChange, className }: PdfReportBuilderProps) {
  const [placements, setPlacements] = useState<PdfPlacement[]>(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function commit(next: PdfPlacement[]) {
    setPlacements(next);
    onChange?.(next);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const fieldId = e.dataTransfer.getData('text/plain');
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    commit([
      ...placements,
      {
        fieldId,
        label: field.label,
        x: Math.max(0, Math.min(90, x)),
        y: Math.max(0, Math.min(95, y)),
        width: 40,
        height: 6,
      },
    ]);
  }

  function removePlacement(idx: number) {
    commit(placements.filter((_, i) => i !== idx));
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          PDF Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Available Fields</div>
            <ScrollArea className="h-[400px] rounded-md border p-2">
              <div className="space-y-1.5">
                {fields.map((f) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', f.id);
                      setDraggingId(f.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      'cursor-grab rounded border bg-card p-2 text-xs transition hover:bg-accent',
                      draggingId === f.id && 'opacity-50',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Plus className="h-3 w-3" />
                      <span className="truncate font-medium">{f.label}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{f.type}</div>
                  </div>
                ))}
                {fields.length === 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">No fields in form.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="col-span-8">
            <div className="mb-2 text-xs font-medium text-muted-foreground">PDF Page (drag fields here)</div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative aspect-[1/1.414] w-full rounded-md border-2 border-dashed bg-white shadow-inner"
              style={{ aspectRatio: '1 / 1.414' }}
            >
              {placements.map((p, idx) => (
                <div
                  key={`${p.fieldId}_${idx}`}
                  className="group absolute flex items-center justify-between rounded border bg-blue-50/80 px-2 text-[10px] shadow-sm"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.width}%`,
                    height: `${p.height}%`,
                  }}
                >
                  <span className="truncate">{p.label}</span>
                  <button
                    type="button"
                    onClick={() => removePlacement(idx)}
                    className="ml-1 hidden text-red-500 group-hover:block"
                    aria-label="Remove placement"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {placements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Drag fields from the left panel onto this page.
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" className="mt-2 w-full" disabled>
              Generate PDF (coming soon)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PdfReportBuilder;
