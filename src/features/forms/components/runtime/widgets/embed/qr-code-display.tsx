'use client';

import React, { useMemo, useState } from 'react';
import { QrCode, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface QrCodeValue {
  data: string;
  version: number;
  modules: number;
  encoder: 'svg' | 'api';
  apiUrl?: string;
}

/* === Galois Field GF(256) (primitive poly 0x11D) === */
const EXP: number[] = new Array(512);
const LOG: number[] = new Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x & 0x100 ? 0x11d : 0); }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gfMul = (a: number, b: number): number => (!a || !b) ? 0 : EXP[LOG[a] + LOG[b]];

function rsRemainder(data: number[], ecLen: number): number[] {
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) { next[j] ^= gen[j]; next[j + 1] ^= gfMul(gen[j], EXP[i]); }
    gen = next;
  }
  const buf = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const c = buf[i]; if (!c) continue;
    for (let j = 1; j < gen.length; j++) buf[i + j] ^= gfMul(gen[j], c);
  }
  return buf.slice(data.length);
}

/* QR version table — byte mode, L ECC — caps + EC codewords + total data codewords */
const CAPS: { cap: number; ec: number; data: number; blocks: number }[] = [
  { cap: 0, ec: 0, data: 0, blocks: 0 },
  { cap: 17, ec: 7, data: 19, blocks: 1 },
  { cap: 32, ec: 10, data: 34, blocks: 1 },
  { cap: 53, ec: 15, data: 55, blocks: 1 },
  { cap: 78, ec: 20, data: 80, blocks: 1 },
  { cap: 106, ec: 26, data: 108, blocks: 1 },
  { cap: 134, ec: 18, data: 68, blocks: 2 },
  { cap: 154, ec: 20, data: 78, blocks: 2 },
  { cap: 192, ec: 24, data: 97, blocks: 2 },
  { cap: 230, ec: 30, data: 116, blocks: 2 },
  { cap: 271, ec: 18, data: 68, blocks: 4 },
];

const ALIGN_POS: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

function pickVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v++) if (CAPS[v].cap >= byteLen) return v;
  return 0;
}

function utf8Bytes(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 128) out.push(c);
    else if (c < 2048) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
    else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
  }
  return out;
}

function buildDataCodewords(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  const push = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const totalBits = CAPS[version].data * 8;
  const term = Math.min(4, totalBits - bits.length);
  push(0, term);
  while (bits.length % 8 !== 0) bits.push(0);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push((bits[i] << 7) | (bits[i + 1] << 6) | (bits[i + 2] << 5) | (bits[i + 3] << 4) | (bits[i + 4] << 3) | (bits[i + 5] << 2) | (bits[i + 6] << 1) | bits[i + 7]);
  }
  const pad = [0xec, 0x11];
  let i = 0;
  while (codewords.length < CAPS[version].data) { codewords.push(pad[i % 2]); i++; }
  return codewords;
}

function interleave(codewords: number[], version: number): number[] {
  const { data: total, ec: ecLen, blocks } = CAPS[version];
  const blockSize = Math.floor(total / blocks);
  const remainder = total % blocks;
  const dataBlocks: number[][] = [];
  let off = 0;
  for (let i = 0; i < blocks; i++) {
    const sz = blockSize + (i < remainder ? 1 : 0);
    dataBlocks.push(codewords.slice(off, off + sz));
    off += sz;
  }
  const ecBlocks = dataBlocks.map(b => rsRemainder(b, ecLen));
  const out: number[] = [];
  const maxData = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxData; i++) dataBlocks.forEach(b => { if (i < b.length) out.push(b[i]); });
  for (let i = 0; i < ecLen; i++) ecBlocks.forEach(b => out.push(b[i]));
  return out;
}

function applyMask(maskId: number, r: number, c: number, bit: boolean): boolean {
  switch (maskId) {
    case 0: return (r + c) % 2 === 0 ? !bit : bit;
    case 1: return r % 2 === 0 ? !bit : bit;
    case 2: return c % 3 === 0 ? !bit : bit;
    case 3: return (r + c) % 3 === 0 ? !bit : bit;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0 ? !bit : bit;
    case 5: return ((r * c) % 2 + (r * c) % 3) === 0 ? !bit : bit;
    case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0 ? !bit : bit;
    default: return ((r + c) % 2 + (r * c) % 3) % 2 === 0 ? !bit : bit;
  }
}

function computeFormatBits(maskId: number): number {
  const data = (0b01 << 3) | maskId; // L = 01
  let bch = data << 10;
  const G15 = 0b10100110111;
  for (let i = 4; i >= 0; i--) if (((bch >> (i + 10)) & 1) === 1) bch ^= G15 << i;
  return ((data << 10) | bch) ^ 0b101010000010010;
}

function buildMatrix(version: number, finalCodewords: number[], maskId = 0): boolean[][] {
  const size = 17 + 4 * version;
  const m: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));
  const setFinder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const r = r0 + dr, c = c0 + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const border = (dr === 0 || dr === 6) && dc >= 0 && dc <= 6;
      const border2 = (dc === 0 || dc === 6) && dr >= 0 && dr <= 6;
      const center = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      const sep = dr === -1 || dr === 7 || dc === -1 || dc === 7;
      m[r][c] = sep ? false : (border || border2 || center);
    }
  };
  setFinder(0, 0); setFinder(0, size - 7); setFinder(size - 7, 0);
  for (const r of ALIGN_POS[version]) for (const c of ALIGN_POS[version]) {
    if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 8) || (r >= size - 8 && c <= 8)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      m[r + dr][c + dc] = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
    }
  }
  for (let i = 8; i < size - 8; i++) { if (m[6][i] === null) m[6][i] = i % 2 === 0; if (m[i][6] === null) m[i][6] = i % 2 === 0; }
  const isReserved = (r: number, c: number): boolean => {
    if (r === 6 || c === 6) return true;
    if (r <= 8 && c <= 8) return true;
    if (r <= 8 && c >= size - 8) return true;
    if (r >= size - 8 && c <= 8) return true;
    for (const ar of ALIGN_POS[version]) for (const ac of ALIGN_POS[version]) {
      if (r >= ar - 2 && r <= ar + 2 && c >= ac - 2 && c <= ac + 2) return true;
    }
    return false;
  };
  let bitIdx = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const r = up ? size - 1 - i : i;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (c < 0 || isReserved(r, c)) continue;
        const byteIdx = bitIdx >> 3;
        const bit = byteIdx < finalCodewords.length ? ((finalCodewords[byteIdx] >> (7 - (bitIdx & 7))) & 1) === 1 : false;
        m[r][c] = applyMask(maskId, r, c, bit);
        bitIdx++;
      }
    }
    up = !up;
  }
  // Format info
  const fmt = computeFormatBits(maskId);
  for (let i = 0; i <= 5; i++) { m[8][i] = ((fmt >> i) & 1) === 1; m[size - 1 - i][8] = ((fmt >> i) & 1) === 1; }
  m[8][7] = ((fmt >> 6) & 1) === 1; m[8][8] = ((fmt >> 7) & 1) === 1; m[7][8] = ((fmt >> 8) & 1) === 1;
  for (let i = 9; i < 15; i++) { m[14 - i][8] = ((fmt >> i) & 1) === 1; m[8][size - 15 + i] = ((fmt >> i) & 1) === 1; }
  m[size - 8][8] = true;
  return m.map(row => row.map(v => v === true));
}

function matrixToSvg(matrix: boolean[][], scale = 8): string {
  const size = matrix.length;
  const total = size * scale;
  let rects = '';
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (matrix[r][c]) rects += `<rect x="${c * scale}" y="${r * scale}" width="${scale}" height="${scale}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#ffffff"/><g fill="#000000">${rects}</g></svg>`;
}

export function QrCodeDisplay({ value, onChange, config, disabled, field }: WidgetProps) {
  const data = String(config?.data ?? (value as QrCodeValue | undefined)?.data ?? '');
  const size = Number(config?.size ?? 200);
  const ariaLabel = String(field?.label ?? 'QR code');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!data) return null;
    if (data.length > 100) {
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
      return { encoder: 'api' as const, svg: '', apiUrl, version: 0, modules: 0 };
    }
    const bytes = utf8Bytes(data);
    const version = pickVersion(bytes.length);
    if (version === 0) {
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
      return { encoder: 'api' as const, svg: '', apiUrl, version: 0, modules: 0 };
    }
    const codewords = buildDataCodewords(bytes, version);
    const final = interleave(codewords, version);
    const matrix = buildMatrix(version, final, 0);
    const scale = Math.max(4, Math.floor(size / matrix.length));
    return { encoder: 'svg' as const, svg: matrixToSvg(matrix, scale), version, modules: matrix.length, apiUrl: '' };
  }, [data, size]);

  React.useEffect(() => {
    if (!disabled && result) {
      onChange({
        data, version: result.version, modules: result.modules,
        encoder: result.encoder, ...(result.apiUrl ? { apiUrl: result.apiUrl } : {}),
      } as QrCodeValue);
    }
     
  }, [result, data]);

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <QrCode className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No QR code data configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.data</code> to encode text/URL.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-border bg-white p-2 shrink-0" style={{ width: size, height: size }}>
          {result?.encoder === 'svg' ? (
            <div dangerouslySetInnerHTML={{ __html: result.svg }} className="w-full h-full" />
          ) : (
            <img src={result?.apiUrl} alt={ariaLabel} className="w-full h-full object-contain" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[10px] text-muted-foreground break-all line-clamp-3">{data}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60">
              {result?.encoder === 'svg' ? `SVG · v${result.version} · ${result.modules}²` : 'API fallback'}
            </span>
            <Button type="button" variant="ghost" size="sm" disabled={disabled}
              onClick={() => {
                if (navigator?.clipboard) {
                  navigator.clipboard.writeText(data).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
                }
              }} className="size-7 p-0" aria-label="Copy data">
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
            {result?.encoder === 'svg' && (
              <Button asChild variant="ghost" size="sm" className="size-7 p-0" aria-label="Download SVG">
                <a href={`data:image/svg+xml;utf8,${encodeURIComponent(result.svg)}`} download="qr-code.svg">
                  <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QrCodeDisplay;
