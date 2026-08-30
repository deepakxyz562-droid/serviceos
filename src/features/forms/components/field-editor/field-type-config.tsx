'use client';

/**
 * FieldTypeConfig — type-specific advanced configuration UI shown inside a
 * FieldEditorCard's expandable section.
 *
 * Renders different controls for: photo, video, barcode/qr_scan,
 * ai_image_analysis, drawing_markup, numerical. Returns null for types with
 * no special config.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { FieldConfig } from '@/lib/form-field-types';
import type { FormField } from '@/features/forms/types';

export type FieldEditorChangeFn = (
  key: keyof FormField,
  value:
    | string
    | boolean
    | string[]
    | FormField['condition']
    | FormField['calculation']
    | FormField['scoring']
    | FieldConfig
    | undefined,
) => void;

export interface FieldTypeConfigProps {
  field: FormField;
  onChange: FieldEditorChangeFn;
}

export function FieldTypeConfig({ field, onChange }: FieldTypeConfigProps) {
  const config = field.config || {};
  const updateConfig = (patch: Partial<FieldConfig>) => {
    onChange('config', { ...config, ...patch });
  };

  switch (field.type) {
    case 'photo':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Photo Settings</Label>
          <div className="flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center gap-2">
              <Switch
                id={`multi-${field.id}`}
                checked={config.multiple ?? false}
                onCheckedChange={(v) => updateConfig({ multiple: v })}
              />
              <Label htmlFor={`multi-${field.id}`} className="text-xs cursor-pointer">
                Allow multiple photos
              </Label>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Capture Mode</Label>
            <Select
              value={config.captureMode || 'both'}
              onValueChange={(v) =>
                updateConfig({ captureMode: v as 'camera' | 'upload' | 'both' })
              }
            >
              <SelectTrigger className="h-7 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Camera + Upload</SelectItem>
                <SelectItem value="camera">Camera Only</SelectItem>
                <SelectItem value="upload">Upload Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    case 'video':
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Video Settings</Label>
          <Select
            value={config.captureMode || 'both'}
            onValueChange={(v) =>
              updateConfig({ captureMode: v as 'camera' | 'upload' | 'both' })
            }
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Camera + Upload</SelectItem>
              <SelectItem value="camera">Camera Only</SelectItem>
              <SelectItem value="upload">Upload Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case 'barcode':
    case 'qr_scan':
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Scan Formats</Label>
          <Input
            className="h-7 text-xs"
            placeholder="qr, code128, ean13"
            value={(config.scanFormats || []).join(', ')}
            onChange={(e) =>
              updateConfig({
                scanFormats: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Comma-separated list of supported barcode formats.
          </p>
        </div>
      );
    case 'ai_image_analysis':
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium">AI Analysis Prompt</Label>
          <Textarea
            className="text-xs"
            rows={3}
            placeholder="Custom instructions for the AI image analyzer..."
            value={config.aiPrompt || ''}
            onChange={(e) => updateConfig({ aiPrompt: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground">
            Sent to the VLM along with the uploaded image. Leave blank for the
            default field-service analysis prompt.
          </p>
        </div>
      );
    case 'drawing_markup':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Drawing Markup Settings</Label>
          <div className="flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center gap-2">
              <Switch
                id={`draw-img-${field.id}`}
                checked={config.drawOnImage ?? false}
                onCheckedChange={(v) => updateConfig({ drawOnImage: v })}
              />
              <Label
                htmlFor={`draw-img-${field.id}`}
                className="text-xs cursor-pointer"
              >
                Allow drawing on a base image
              </Label>
            </div>
          </div>
          {config.drawOnImage && (
            <Input
              className="h-7 text-xs"
              placeholder="Base image URL (https://...)"
              value={config.baseImage || ''}
              onChange={(e) => updateConfig({ baseImage: e.target.value })}
            />
          )}
        </div>
      );
    case 'numerical':
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Number Constraints</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              className="h-7 text-xs"
              type="number"
              placeholder="Min"
              value={config.min ?? ''}
              onChange={(e) =>
                updateConfig({
                  min: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
            <Input
              className="h-7 text-xs"
              type="number"
              placeholder="Max"
              value={config.max ?? ''}
              onChange={(e) =>
                updateConfig({
                  max: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
            <Input
              className="h-7 text-xs"
              type="number"
              placeholder="Step"
              value={config.step ?? ''}
              onChange={(e) =>
                updateConfig({
                  step: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}
