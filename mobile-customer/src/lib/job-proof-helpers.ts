/**
 * Job Proof Capture Helpers — shared by:
 *   - mobile-app/app/(employee)/jobs/[id]/photos.tsx        (dedicated sub-route)
 *   - mobile-app/app/(employee)/jobs/[id]/signature.tsx     (dedicated sub-route)
 *   - mobile-app/app/(employee)/jobs/[id]/completion.tsx    (all-in-one inline screen)
 *
 * Extracted so the all-in-one completion screen can reuse the same photo FormData
 * + signature rendering logic without duplicating ~120 lines of platform-specific
 * code (RN FormData blob shape, web canvas fallback, SVG path builder, etc.).
 *
 * The dedicated sub-routes still import these helpers too — keeping a single
 * source of truth for the upload payload shape.
 */
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { GpsCoords } from './gps';

// ── Photo FormData ──────────────────────────────────────────────────

/**
 * Build a FormData for upload from an expo-image-picker asset.
 * - Native: append `{ uri, name, type }` object.
 * - Web: append the File object directly (asset.file), fall back to fetching
 *   the blob URI.
 *
 * GPS coordinates (if captured) are appended as `latitude` / `longitude` /
 * `accuracy` form fields — the backend JobPhoto schema has these columns and
 * the PWA already sends them, so this brings mobile to parity.
 */
export async function buildPhotoFormData(
  asset: ImagePicker.ImagePickerAsset,
  gps?: GpsCoords | null
): Promise<FormData> {
  const fd = new FormData();
  const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  if (Platform.OS === 'web') {
    const webAsset = asset as ImagePicker.ImagePickerAsset & { file?: File };
    if (webAsset.file instanceof File) {
      fd.append('file', webAsset.file, fileName);
    } else {
      // Fallback: fetch the blob URL.
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      fd.append('file', blob, fileName);
    }
  } else {
    // React Native FormData accepts a blob-like object.
    fd.append('file', {
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  if (gps) {
    fd.append('latitude', String(gps.latitude));
    fd.append('longitude', String(gps.longitude));
    if (gps.accuracy !== null && gps.accuracy !== undefined) {
      fd.append('accuracy', String(gps.accuracy));
    }
  }

  return fd;
}

// ── Signature rendering ─────────────────────────────────────────────

export type Point = { x: number; y: number };
export type Stroke = Point[];

export const SIGNATURE_STROKE_COLOR = '#1F2937';
export const SIGNATURE_STROKE_WIDTH = 2.5;

/**
 * Build an SVG path `d` string from a stroke (M/L commands). For single-point
 * strokes we emit a tiny line so a dot still shows up.
 */
export function strokeToPath(stroke: Stroke): string {
  if (stroke.length === 0) return '';
  if (stroke.length === 1) {
    const p = stroke[0];
    return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} l 0.1 0.1`;
  }
  let d = `M ${stroke[0].x.toFixed(2)} ${stroke[0].y.toFixed(2)}`;
  for (let i = 1; i < stroke.length; i++) {
    d += ` L ${stroke[i].x.toFixed(2)} ${stroke[i].y.toFixed(2)}`;
  }
  return d;
}

/**
 * Web: render the strokes to an HTML5 canvas and return its PNG data URL.
 */
export function strokesToPngDataUrlWeb(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const scale = 2; // retina
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(scale, scale);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.strokeStyle = SIGNATURE_STROKE_COLOR;
  ctx.lineWidth = SIGNATURE_STROKE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    if (stroke.length === 1) {
      ctx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
    } else {
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
    }
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

/** Convert a base64 data URL to a Blob (web only). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+)/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
