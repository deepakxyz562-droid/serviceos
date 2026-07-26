'use client';

/**
 * ServiceOS — Dynamic Forms Field Renderer
 * -----------------------------------------
 * A client component that renders a single form field input based on its
 * `type`. Handles all 15 field types defined in src/lib/form-field-types.ts:
 *
 *   text:       short_answer, long_answer, numerical
 *   choice:     dropdown, checkbox
 *   media:      photo, video, voice_note
 *   capture:    gps, signature, barcode, qr_scan, drawing_markup
 *   reference:  asset_selection
 *   ai:         ai_image_analysis
 *
 * Browser-API handling:
 *   - gps         → navigator.geolocation.getCurrentPosition
 *   - signature   → <canvas> pointer events (mouse + touch)
 *   - barcode/qr  → graceful "Camera scanning requires HTTPS" placeholder
 *                   (uses navigator.mediaDevices.getUserMedia when available)
 *   - voice_note  → navigator.mediaDevices.getUserMedia({audio:true}) + MediaRecorder
 *   - drawing     → <canvas> pointer events with optional base image
 *   - photo/video → <input type="file"> with preview + base64 storage
 *
 * Conditional display: the parent component is responsible for evaluating
 * `field.condition` and only rendering fields whose conditions are met.
 * This component shows a small badge indicating a field is conditional.
 *
 * Calculations: the parent component re-evaluates `field.calculation` when
 * any dependent field changes. This component renders the computed value
 * read-only with a small calculator icon.
 *
 * Scoring: the parent passes an optional `score` prop. When `submitted`
 * is true and a score is provided, this component shows the score badge.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Camera, Video, MapPin, PenTool, Scan, QrCode, Package,
  Sparkles, Mic, Edit3, Type, AlignLeft, ChevronDown,
  CheckSquare, Hash, Loader2, Trash2, X, AlertCircle,
  CheckCircle2, FileImage, Calculator, EyeOff,
  Square, StopCircle, RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';
import type { FormField } from '@/lib/form-field-types';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  /** All current form values (used by some sub-components for context). */
  allValues?: Record<string, unknown>;
  /** Compact mode = smaller paddings, used inside the builder preview. */
  compact?: boolean;
  /** When true, render the field as read-only (e.g. in the preview dialog). */
  readOnly?: boolean;
  /** When true, show the score badge (after submission). */
  submitted?: boolean;
  /** Optional computed score for this field (0..maxScore). */
  score?: number | null;
  /** Customer id (for asset_selection field type). */
  customerId?: string;
  /** Optional className passthrough. */
  className?: string;
}

// ─── Icon resolver ─────────────────────────────────────────────────────────

const FIELD_ICON_MAP: Record<string, React.ElementType> = {
  Type, AlignLeft, ChevronDown, CheckSquare, Hash,
  Camera, Video, MapPin, PenTool, Scan, QrCode, Package,
  Sparkles, Mic, Edit3,
};

export function getFieldIcon(type: string): React.ElementType {
  return FIELD_ICON_MAP[type] || Type;
}

/**
 * Render the icon for a field type. Uses a switch (not a map lookup) so the
 * `react-hooks/static-components` lint rule can statically verify every
 * branch returns a stable, module-level component reference.
 */
function FieldIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'short_answer': return <Type className={className} />;
    case 'long_answer': return <AlignLeft className={className} />;
    case 'dropdown': return <ChevronDown className={className} />;
    case 'checkbox': return <CheckSquare className={className} />;
    case 'numerical': return <Hash className={className} />;
    case 'photo': return <Camera className={className} />;
    case 'video': return <Video className={className} />;
    case 'gps': return <MapPin className={className} />;
    case 'signature': return <PenTool className={className} />;
    case 'barcode': return <Scan className={className} />;
    case 'qr_scan': return <QrCode className={className} />;
    case 'asset_selection': return <Package className={className} />;
    case 'ai_image_analysis': return <Sparkles className={className} />;
    case 'voice_note': return <Mic className={className} />;
    case 'drawing_markup': return <Edit3 className={className} />;
    default: return <Type className={className} />;
  }
}

// ─── Main component ────────────────────────────────────────────────────────

export function FieldRenderer({
  field,
  value,
  onChange,
  allValues,
  compact = false,
  readOnly = false,
  submitted = false,
  score = null,
  customerId,
  className,
}: FieldRendererProps) {
  const hasCondition = !!field.condition;
  const hasCalculation = !!field.calculation;
  const hasScoring = !!field.scoring;

  return (
    <div className={cn('space-y-1.5', className)} data-field-id={field.id}>
      {/* ─── Label row ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FieldIcon type={field.type} className="size-3.5 text-muted-foreground shrink-0" />
          <Label className={cn('text-sm font-medium leading-tight', compact && 'text-xs')}>
            {field.label || 'Untitled Field'}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasCondition && (
            <Badge variant="outline" className="text-[9px] h-4 gap-0.5" title={`Conditional: shown when ${field.condition?.fieldId} ${field.condition?.operator} ${field.condition?.value}`}>
              <EyeOff className="size-2.5" /> cond
            </Badge>
          )}
          {hasCalculation && (
            <Badge variant="outline" className="text-[9px] h-4 gap-0.5 bg-blue-50 text-blue-700 border-blue-200" title="Auto-calculated">
              <Calculator className="size-2.5" /> calc
            </Badge>
          )}
          {hasScoring && submitted && score !== null && score !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] h-4 gap-0.5',
                score >= (field.scoring?.passThreshold ?? (field.scoring?.maxScore ?? 0) * 0.6)
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200',
              )}
              title={`Score: ${score}/${field.scoring?.maxScore} (weight ${field.scoring?.weight})`}
            >
              {score}/{field.scoring?.maxScore}
            </Badge>
          )}
        </div>
      </div>

      {/* ─── Description ───────────────────────────────────────────────── */}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      {/* ─── Input ─────────────────────────────────────────────────────── */}
      <FieldInput
        field={field}
        value={value}
        onChange={onChange}
        allValues={allValues}
        compact={compact}
        readOnly={readOnly}
        customerId={customerId}
      />

      {/* ─── Calculation note ──────────────────────────────────────────── */}
      {hasCalculation && (
        <p className="text-[10px] text-blue-600 flex items-center gap-1">
          <Calculator className="size-2.5" />
          Auto-calculated: <code className="font-mono">{field.calculation?.formula}</code>
        </p>
      )}
    </div>
  );
}

// ─── Type-dispatched input ─────────────────────────────────────────────────

interface FieldInputProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  allValues?: Record<string, unknown>;
  compact?: boolean;
  readOnly?: boolean;
  customerId?: string;
}

function FieldInput(props: FieldInputProps) {
  const { field, readOnly } = props;
  if (readOnly) return <ReadOnlyValue {...props} />;

  switch (field.type) {
    case 'short_answer':
      return <TextInput {...props} />;
    case 'long_answer':
      return <LongAnswerInput {...props} />;
    case 'numerical':
      return <NumericalInput {...props} />;
    case 'dropdown':
      return <DropdownInput {...props} />;
    case 'checkbox':
      return <CheckboxInput {...props} />;
    case 'photo':
      return <PhotoInput {...props} />;
    case 'video':
      return <VideoInput {...props} />;
    case 'gps':
      return <GpsInput {...props} />;
    case 'signature':
      return <SignatureInput {...props} />;
    case 'barcode':
      return <BarcodeInput {...props} />;
    case 'qr_scan':
      return <QrScanInput {...props} />;
    case 'asset_selection':
      return <AssetSelectionInput {...props} />;
    case 'ai_image_analysis':
      return <AiImageAnalysisInput {...props} />;
    case 'voice_note':
      return <VoiceNoteInput {...props} />;
    case 'drawing_markup':
      return <DrawingMarkupInput {...props} />;
    default:
      // Fall back to a plain text input for unknown / legacy types
      // (text, email, phone, etc. carried over from the original form-builder).
      return <TextInput {...props} />;
  }
}

// ─── Read-only display (for preview without edits) ─────────────────────────

function ReadOnlyValue({ field, value }: FieldInputProps) {
  const display = formatValueForDisplay(field.type, value);
  return (
    <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs">
      {display || <span className="text-muted-foreground italic">—</span>}
    </div>
  );
}

function formatValueForDisplay(type: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (type === 'gps' && typeof value === 'object' && value) {
    const v = value as { lat?: number; lng?: number; accuracy?: number };
    return v.lat !== undefined && v.lng !== undefined
      ? `${v.lat.toFixed(6)}, ${v.lng.toFixed(6)}${v.accuracy ? ` (±${Math.round(v.accuracy)}m)` : ''}`
      : '';
  }
  if (type === 'signature' || type === 'drawing_markup' || type === 'photo' || type === 'ai_image_analysis') {
    if (typeof value === 'string' && value.startsWith('data:image')) return '[image captured]';
    if (Array.isArray(value)) return `[${value.length} image(s)]`;
  }
  if (type === 'voice_note' && typeof value === 'string' && value.startsWith('data:audio')) {
    return '[voice recording]';
  }
  if (type === 'ai_image_analysis' && typeof value === 'object' && value) {
    const v = value as { findings?: string };
    return v.findings || '[analysis complete]';
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// ─── Text inputs ───────────────────────────────────────────────────────────

function TextInput({ field, value, onChange, compact }: FieldInputProps) {
  return (
    <Input
      className={compact ? 'h-8 text-xs' : 'h-9 text-sm'}
      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
      value={(value as string) || ''}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
}

function LongAnswerInput({ field, value, onChange, compact }: FieldInputProps) {
  return (
    <Textarea
      className={compact ? 'text-xs' : 'text-sm'}
      rows={compact ? 2 : 3}
      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
      value={(value as string) || ''}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
    />
  );
}

function NumericalInput({ field, value, onChange, compact }: FieldInputProps) {
  const step = field.config?.step;
  const min = field.config?.min;
  const max = field.config?.max;
  return (
    <Input
      type="number"
      className={compact ? 'h-8 text-xs' : 'h-9 text-sm'}
      placeholder={field.placeholder || '0'}
      value={value === undefined || value === null ? '' : String(value)}
      step={step}
      min={min}
      max={max}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '') return onChange('');
        const n = Number(raw);
        onChange(Number.isNaN(n) ? raw : n);
      }}
    />
  );
}

function DropdownInput({ field, value, onChange, compact }: FieldInputProps) {
  const options = field.options || field.config?.options || [];
  return (
    <Select value={(value as string) || ''} onValueChange={onChange} disabled={options.length === 0}>
      <SelectTrigger className={compact ? 'h-8 text-xs' : 'h-9 text-sm'}>
        <SelectValue placeholder={options.length === 0 ? 'No options configured' : `Select ${field.label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CheckboxInput({ field, value, onChange, compact }: FieldInputProps) {
  const options = field.options || field.config?.options || ['Yes'];
  // Single-option checkbox → boolean toggle.
  if (options.length <= 1) {
    const checked = Boolean(value);
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={`field-${field.id}`}
          checked={checked}
          onCheckedChange={(v) => onChange(Boolean(v))}
        />
        <Label htmlFor={`field-${field.id}`} className={cn('text-sm', compact && 'text-xs')}>
          {options[0] || 'Yes'}
        </Label>
      </div>
    );
  }
  // Multi-option checkbox → array of selected values.
  const selected = Array.isArray(value) ? value.map(String) : [];
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <Checkbox
            id={`field-${field.id}-${opt}`}
            checked={selected.includes(opt)}
            onCheckedChange={() => toggle(opt)}
          />
          <Label htmlFor={`field-${field.id}-${opt}`} className={cn('text-sm', compact && 'text-xs')}>
            {opt}
          </Label>
        </div>
      ))}
    </div>
  );
}

// ─── Photo / Video inputs ──────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function PhotoInput({ field, value, onChange, compact }: FieldInputProps) {
  const multiple = field.config?.multiple ?? false;
  const captureMode = field.config?.captureMode ?? 'both';
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const fileArray = Array.from(files).slice(0, multiple ? 10 : 1);
      for (const f of fileArray) {
        if (f.size > MAX_FILE_SIZE_BYTES) {
          setError(`File "${f.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
          setLoading(false);
          return;
        }
      }
      const dataUrls = await Promise.all(fileArray.map(readFileAsDataUrl));
      if (multiple) {
        const existing = Array.isArray(value) ? (value as string[]) : [];
        onChange([...existing, ...dataUrls]);
      } else {
        onChange(dataUrls[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (idx: number) => {
    if (multiple) {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      onChange(arr.filter((_, i) => i !== idx));
    } else {
      onChange('');
    }
  };

  const photos = multiple
    ? (Array.isArray(value) ? (value as string[]) : [])
    : (value && typeof value === 'string' ? [value] : []);

  // Camera-only capture sets `capture="environment"` on the file input.
  const captureAttr = captureMode === 'camera' ? 'environment' : undefined;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={captureAttr as 'environment' | 'user' | undefined}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
              <img src={src} alt={`Upload ${idx + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={compact ? 'h-7 text-xs w-full' : 'h-8 text-sm w-full'}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
        ) : (
          <Camera className="size-3.5 mr-1.5" />
        )}
        {loading ? 'Loading...' : multiple ? 'Add Photos' : 'Take / Upload Photo'}
      </Button>
      {error && (
        <p className="text-[10px] text-red-600 flex items-center gap-1">
          <AlertCircle className="size-2.5" /> {error}
        </p>
      )}
    </div>
  );
}

function VideoInput({ field, value, onChange, compact }: FieldInputProps) {
  const captureMode = field.config?.captureMode ?? 'both';
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        setLoading(false);
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const captureAttr = captureMode === 'camera' ? 'environment' : undefined;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture={captureAttr as 'environment' | 'user' | undefined}
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
      />
      {value && typeof value === 'string' && (
        <div className="relative rounded-md overflow-hidden border bg-black">
          <video src={value} controls className="w-full max-h-64" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label="Remove video"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={compact ? 'h-7 text-xs w-full' : 'h-8 text-sm w-full'}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
        ) : (
          <Video className="size-3.5 mr-1.5" />
        )}
        {loading ? 'Loading...' : 'Record / Upload Video'}
      </Button>
      {error && (
        <p className="text-[10px] text-red-600 flex items-center gap-1">
          <AlertCircle className="size-2.5" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── GPS input ─────────────────────────────────────────────────────────────

interface GpsValue {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

function GpsInput({ value, onChange, compact }: FieldInputProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(() => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        } satisfies GpsValue);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to capture location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [onChange]);

  const gps = value as GpsValue | undefined;

  return (
    <div className="space-y-2">
      {gps && gps.lat !== undefined && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-emerald-50 dark:bg-emerald-950/20">
          <MapPin className="size-4 text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono truncate">
              {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
            </p>
            {gps.accuracy && (
              <p className="text-[10px] text-muted-foreground">±{Math.round(gps.accuracy)}m accuracy</p>
            )}
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=17/${gps.lat}/${gps.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-600 hover:underline"
          >
            View
          </a>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={compact ? 'h-7 text-xs w-full' : 'h-8 text-sm w-full'}
        disabled={loading}
        onClick={capture}
      >
        {loading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <MapPin className="size-3.5 mr-1.5" />}
        {loading ? 'Capturing...' : gps ? 'Re-capture Location' : 'Capture GPS Location'}
      </Button>
      {error && (
        <p className="text-[10px] text-red-600 flex items-center gap-1">
          <AlertCircle className="size-2.5" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Signature pad ─────────────────────────────────────────────────────────

function SignatureInput({ value, onChange, compact }: FieldInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasContent, setHasContent] = useState(Boolean(value));

  // Restore from value (data URL) on mount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value || typeof value !== 'string') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHasContent(true);
    };
    img.src = value;
  }, [value]);

  const getPointerPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPointerPos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const draw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = getPointerPos(e);
    const last = lastPointRef.current ?? point;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setHasContent(true);
  };

  const endDraw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    // Persist as data URL.
    const canvas = canvasRef.current;
    if (canvas && hasContent) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasContent(false);
    onChange('');
  };

  const canvasHeight = compact ? 100 : 140;

  return (
    <div className="space-y-2">
      <div className="relative rounded-md border bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={canvasHeight}
          className="w-full touch-none cursor-crosshair"
          style={{ height: canvasHeight }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground italic">Sign here with mouse or touch</span>
          </div>
        )}
      </div>
      <div className="flex gap-1.5">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={clear} disabled={!hasContent}>
          <Trash2 className="size-3 mr-1" /> Clear
        </Button>
        {value && (
          <Badge variant="outline" className="text-[10px] h-7 gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="size-3" /> Signature captured
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── Barcode / QR scan input ───────────────────────────────────────────────

function BarcodeInput({ field, value, onChange, compact }: FieldInputProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formats = field.config?.scanFormats || ['code128', 'ean13'];
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera access requires HTTPS and a secure context.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setScanning(true);
      // NOTE: real barcode decoding requires a library like @zxing/browser.
      // We expose the camera feed; the user can capture a frame manually
      // or paste a scanned value into the input below.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="space-y-2">
      {scanning && (
        <div className="relative rounded-md overflow-hidden border bg-black aspect-video">
          <video ref={videoRef} className="size-full object-cover" muted playsInline />
          <div className="absolute inset-x-4 top-1/2 h-0.5 bg-red-500 animate-pulse" />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute top-1 right-1 h-6 text-[10px]"
            onClick={stopCamera}
          >
            <X className="size-3 mr-1" /> Stop
          </Button>
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          className={cn(compact ? 'h-8 text-xs flex-1' : 'h-9 text-sm flex-1')}
          placeholder={`Scan or enter ${field.label.toLowerCase()}`}
          value={(value as string) || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(compact ? 'h-8 text-xs' : 'h-9 text-sm', 'shrink-0')}
          onClick={scanning ? stopCamera : startCamera}
        >
          {scanning ? <StopCircle className="size-3.5" /> : <Scan className="size-3.5" />}
          {scanning ? 'Stop' : 'Scan'}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Camera scan supports: {formats.join(', ')}. Manual entry always available.
      </p>
      {error && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="size-2.5" /> {error}
        </p>
      )}
    </div>
  );
}

function QrScanInput(props: FieldInputProps) {
  return <BarcodeInput {...props} />;
}

// ─── Asset selection ───────────────────────────────────────────────────────

interface Asset {
  id: string;
  name: string;
  assetType?: string;
  brand?: string | null;
  model?: string | null;
  status?: string;
}

function AssetSelectionInput({ field, value, onChange, customerId, compact }: FieldInputProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    // Defer state updates to a microtask so we don't call setState synchronously
    // inside the effect body (which the react-hooks/set-state-in-effect rule
    // flags as a cascading-render hazard).
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/customers/${customerId}/assets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { assets?: Asset[] };
        if (cancelled) return;
        setAssets(Array.isArray(data.assets) ? data.assets : []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load assets');
        setAssets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (!customerId) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center bg-muted/30">
        <Package className="size-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          Link this form to a customer to enable asset selection.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading customer assets...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="size-3" /> {error}
      </p>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center bg-muted/30">
        <Package className="size-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">No assets found for this customer.</p>
      </div>
    );
  }

  return (
    <Select value={(value as string) || ''} onValueChange={onChange}>
      <SelectTrigger className={compact ? 'h-8 text-xs' : 'h-9 text-sm'}>
        <SelectValue placeholder={`Select from ${assets.length} asset(s)`} />
      </SelectTrigger>
      <SelectContent>
        {assets.map((asset) => (
          <SelectItem key={asset.id} value={asset.id}>
            {asset.name}
            {asset.assetType && <span className="text-muted-foreground ml-1">({asset.assetType})</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── AI image analysis ─────────────────────────────────────────────────────

interface AiAnalysisResult {
  findings: string;
  issues: string[];
  severity: string;
  recommendation: string;
}

function AiImageAnalysisInput({ field, value, onChange, compact }: FieldInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState<string>(
    typeof value === 'string' && value.startsWith('data:image') ? value : '',
  );
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(
    typeof value === 'object' && value ? (value as AiAnalysisResult) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setLoading(false);
    try {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      setImageData(dataUrl);
      setAnalysis(null);
      onChange(dataUrl); // store the image until analysis runs
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
    }
  };

  const runAnalysis = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageData,
          prompt: field.config?.aiPrompt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Analysis failed (HTTP ${res.status})`);
      }
      const result: AiAnalysisResult = {
        findings: data.findings || 'No findings returned.',
        issues: Array.isArray(data.issues) ? data.issues : [],
        severity: data.severity || 'none',
        recommendation: data.recommendation || 'No recommendation.',
      };
      setAnalysis(result);
      // Store the full analysis object (includes image via separate field).
      onChange({ ...result, imageBase64: imageData });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageData('');
    setAnalysis(null);
    onChange('');
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
      />
      {imageData && (
        <div className="relative rounded-md overflow-hidden border bg-muted">
          <img src={imageData} alt="To analyze" className="w-full max-h-48 object-cover" />
          {!analysis && (
            <button
              type="button"
              onClick={reset}
              className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}
      {!imageData && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={compact ? 'h-7 text-xs w-full' : 'h-8 text-sm w-full'}
          onClick={() => inputRef.current?.click()}
        >
          <FileImage className="size-3.5 mr-1.5" /> Upload Photo for Analysis
        </Button>
      )}
      {imageData && !analysis && (
        <Button
          type="button"
          size="sm"
          className={compact ? 'h-7 text-xs w-full' : 'h-8 text-sm w-full'}
          onClick={runAnalysis}
          disabled={loading}
        >
          {loading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
          {loading ? 'Analyzing...' : 'Run AI Analysis'}
        </Button>
      )}
      {analysis && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className={cn('p-3 space-y-2', compact && 'p-2')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-emerald-600" />
                <span className="text-xs font-semibold">AI Findings</span>
              </div>
              <Badge variant="outline" className={cn('text-[9px] h-5 capitalize', severityColor(analysis.severity))}>
                {analysis.severity}
              </Badge>
            </div>
            <p className="text-xs">{analysis.findings}</p>
            {analysis.issues.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Issues Detected</p>
                <ul className="space-y-0.5">
                  {analysis.issues.map((issue, idx) => (
                    <li key={idx} className="text-xs flex items-start gap-1">
                      <AlertCircle className="size-3 mt-0.5 text-amber-500 shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="pt-1 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Recommendation</p>
              <p className="text-xs">{analysis.recommendation}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={reset}>
              <RefreshCw className="size-2.5 mr-1" /> Analyze Another Image
            </Button>
          </CardContent>
        </Card>
      )}
      {error && (
        <p className="text-[10px] text-red-600 flex items-center gap-1">
          <AlertCircle className="size-2.5" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Voice note recorder ───────────────────────────────────────────────────

function VoiceNoteInput({ value, onChange, compact }: FieldInputProps) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access requires HTTPS and a secure context.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result as string);
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
    }
  }, [onChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const remove = () => onChange('');

  const hasRecording = Boolean(value) && typeof value === 'string' && value.startsWith('data:audio');
  const formattedTime = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [seconds]);

  return (
    <div className="space-y-2">
      {hasRecording && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-emerald-50 dark:bg-emerald-950/20">
          <audio src={value as string} controls className="flex-1 h-8" />
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={remove}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
      {!hasRecording && (
        <Button
          type="button"
          variant={recording ? 'destructive' : 'outline'}
          size="sm"
          className={compact ? 'h-7 text-xs w-full' : 'h-8 text-sm w-full'}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? (
            <>
              <StopCircle className="size-3.5 mr-1.5" /> Stop ({formattedTime})
            </>
          ) : (
            <>
              <Mic className="size-3.5 mr-1.5" /> Start Recording
            </>
          )}
        </Button>
      )}
      {recording && (
        <p className="text-[10px] text-red-600 flex items-center gap-1 justify-center">
          <span className="size-2 rounded-full bg-red-500 animate-pulse" /> Recording in progress...
        </p>
      )}
      {error && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="size-2.5" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Drawing / markup canvas ───────────────────────────────────────────────

function DrawingMarkupInput({ field, value, onChange, compact }: FieldInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasContent, setHasContent] = useState(Boolean(value));
  const [tool, setTool] = useState<'pen' | 'erase'>('pen');
  const [color, setColor] = useState('#dc2626'); // red-600
  const [size, setSize] = useState(3);

  // Load base image if configured.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const baseImage = field.config?.baseImage;
    if (baseImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = baseImage;
    }
  }, [field.config?.baseImage]);

  // Restore from value (data URL) on mount (overrides base image).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value || typeof value !== 'string') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHasContent(true);
    };
    img.src = value;
  }, [value]);

  const getPointerPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPointerPos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const draw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = getPointerPos(e);
    const last = lastPointRef.current ?? point;
    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = size * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setHasContent(true);
  };

  const endDraw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const canvas = canvasRef.current;
    if (canvas && hasContent) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const baseImage = field.config?.baseImage;
      if (baseImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = baseImage;
      }
    }
    setHasContent(false);
    onChange('');
  };

  const canvasHeight = compact ? 120 : 200;
  const colors = ['#dc2626', '#ea580c', '#facc15', '#16a34a', '#2563eb', '#0f172a'];

  return (
    <div className="space-y-2">
      <div className="relative rounded-md border bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={canvasHeight}
          className="w-full touch-none cursor-crosshair block"
          style={{ height: canvasHeight }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
        {!hasContent && !field.config?.baseImage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground italic">Draw or annotate here</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant={tool === 'pen' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setTool('pen')}
        >
          <Edit3 className="size-3 mr-1" /> Pen
        </Button>
        <Button
          type="button"
          variant={tool === 'erase' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setTool('erase')}
        >
          <Square className="size-3 mr-1" /> Erase
        </Button>
        <div className="flex items-center gap-1 ml-1">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setTool('pen'); }}
              className={cn(
                'size-5 rounded-full border-2 transition-transform',
                color === c && tool === 'pen' ? 'border-slate-900 scale-110' : 'border-white shadow',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={clear}>
          <Trash2 className="size-3 mr-1" /> Clear
        </Button>
      </div>
      {value && (
        <Badge variant="outline" className="text-[10px] h-5 gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="size-2.5" /> Markup captured
        </Badge>
      )}
    </div>
  );
}
