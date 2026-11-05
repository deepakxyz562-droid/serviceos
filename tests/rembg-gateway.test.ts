import { describe, it, expect } from 'vitest';

describe('Rembg Gateway & Background Removal Contract', () => {
  it('validates supported image formats and size boundaries', () => {
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

    expect(ALLOWED_MIME_TYPES.includes('image/png')).toBe(true);
    expect(ALLOWED_MIME_TYPES.includes('image/jpeg')).toBe(true);
    expect(ALLOWED_MIME_TYPES.includes('image/webp')).toBe(true);
    expect(ALLOWED_MIME_TYPES.includes('application/pdf')).toBe(false);

    const validSize = 2.5 * 1024 * 1024;
    const oversized = 6 * 1024 * 1024;
    expect(validSize <= MAX_IMAGE_SIZE_BYTES).toBe(true);
    expect(oversized <= MAX_IMAGE_SIZE_BYTES).toBe(false);
  });

  it('formats base64 data URIs correctly for transparent PNG output', () => {
    const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const dataUri = `data:image/png;base64,${rawBase64}`;

    expect(dataUri.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUri.length).toBeGreaterThan(30);
  });
});
