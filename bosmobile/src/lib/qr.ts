import qrcode from 'qrcode-generator';

/** QR rendered fully on-device — no third-party service ever sees the data. */

// qrcode-generator's default byte encoder is Latin-1 (charCodeAt & 0xff),
// which mangles non-ASCII payloads (e.g. a ₹ or Devanagari business name in a
// UPI note). The package's own UTF-8 module (dist/qrcode_UTF8) is not reachable
// through its "exports" map, so install the same encoder here.
function toUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      // Surrogate pair → 4-byte UTF-8 sequence.
      i += 1;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}
qrcode.stringToBytes = toUtf8Bytes;

export interface QrSvgOptions {
  /** Minimum QR version (1–40). Auto-sizing never goes below this. */
  minVersion?: number;
  /** Quiet-zone width in modules (the retired third-party QR endpoint defaulted to 4). */
  margin?: number;
}

/**
 * Encode `data` into a single SVG path (module units).
 * Returns `{ d, size }` where `size = moduleCount + 2 * margin` is meant to be
 * the viewBox edge (e.g. `<Svg viewBox="0 0 size size"><Path d={d} /></Svg>`),
 * or `null` when the payload is empty / too long for a QR code.
 */
export function qrSvgPath(
  data: string,
  opts?: QrSvgOptions
): { d: string; size: number } | null {
  if (!data) return null;
  const margin = Math.max(0, Math.round(opts?.margin ?? 4));
  const minVersion = Math.min(40, Math.max(0, Math.round(opts?.minVersion ?? 0)));

  const build = (typeNumber: number) => {
    // typeNumber is clamped to [0, 40]; the cast only satisfies the literal
    // union in qrcode-generator's typings. 0 = auto (smallest that fits).
    const qr = qrcode(typeNumber as 0, 'M');
    qr.addData(data);
    qr.make();
    return qr;
  };

  try {
    let qr = build(0);
    const version = (qr.getModuleCount() - 17) / 4;
    if (minVersion >= 1 && version < minVersion) {
      qr = build(minVersion);
    }

    const count = qr.getModuleCount();
    // One combined path, horizontally run-length encoded per row of dark
    // modules, offset by the quiet zone. Coordinates stay in module units.
    let d = '';
    for (let row = 0; row < count; row += 1) {
      let col = 0;
      while (col < count) {
        if (!qr.isDark(row, col)) {
          col += 1;
          continue;
        }
        let run = 1;
        while (col + run < count && qr.isDark(row, col + run)) {
          run += 1;
        }
        d += `M${col + margin} ${row + margin}h${run}v1h-${run}z`;
        col += run;
      }
    }
    return { d, size: count + 2 * margin };
  } catch {
    // qrcode-generator throws plain strings on code-length overflow / invalid
    // input — surface that as `null` so callers can render their fallback.
    return null;
  }
}

/**
 * Standalone `<svg>` markup (dark-on-transparent) for embedding in HTML —
 * used by the invoice/PDF builders. Size it via the surrounding container
 * (the svg has a viewBox only, so it scales to its box).
 */
export function qrSvgMarkup(data: string): string | null {
  const qr = qrSvgPath(data);
  if (!qr) return null;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" ` +
    `shape-rendering="crispEdges"><path d="${qr.d}" fill="#000"/></svg>`
  );
}
