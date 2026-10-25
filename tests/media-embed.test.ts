import { describe, it, expect } from 'vitest';
import {
  parseYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  parseInstagramUrl,
  parseVimeoId,
  parseMediaUrl,
  isSafeWebUrl,
} from '@/lib/media-embed';

describe('Media Embed Parser Utility', () => {
  describe('isSafeWebUrl', () => {
    it('allows valid http and https URLs', () => {
      expect(isSafeWebUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isSafeWebUrl('http://instagram.com/reel/C3abc123')).toBe(true);
    });

    it('rejects malicious or invalid protocols', () => {
      expect(isSafeWebUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeWebUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeWebUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeWebUrl('')).toBe(false);
      expect(isSafeWebUrl(null)).toBe(false);
      expect(isSafeWebUrl(undefined)).toBe(false);
    });
  });

  describe('parseYouTubeId', () => {
    it('parses standard watch URLs', () => {
      expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(parseYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
      expect(parseYouTubeId('https://m.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('parses short URLs (youtu.be)', () => {
      expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=abcdef12345')).toBe('dQw4w9WgXcQ');
    });

    it('parses YouTube Shorts', () => {
      expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(parseYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ');
    });

    it('parses embed URLs', () => {
      expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('accepts raw 11-char ID', () => {
      expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for non-youtube URLs or invalid IDs', () => {
      expect(parseYouTubeId('https://example.com/watch?v=123')).toBe(null);
      expect(parseYouTubeId('not_a_valid_youtube_url')).toBe(null);
    });
  });

  describe('getYouTubeEmbedUrl and getYouTubeThumbnail', () => {
    it('creates privacy-friendly nocookie embed URL', () => {
      const embed = getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(embed).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(embed).toContain('rel=0');
    });

    it('supports autoplay & mute flags', () => {
      const embed = getYouTubeEmbedUrl('dQw4w9WgXcQ', { autoplay: true, mute: true });
      expect(embed).toContain('autoplay=1');
      expect(embed).toContain('mute=1');
    });

    it('generates high quality thumbnail URL', () => {
      const thumb = getYouTubeThumbnail('dQw4w9WgXcQ');
      expect(thumb).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    });
  });

  describe('parseInstagramUrl', () => {
    it('parses Instagram Reels', () => {
      const parsed = parseInstagramUrl('https://www.instagram.com/reel/C8qL1234567/?igsh=xyz');
      expect(parsed).not.toBeNull();
      expect(parsed?.shortcode).toBe('C8qL1234567');
      expect(parsed?.type).toBe('reel');
      expect(parsed?.embedUrl).toBe('https://www.instagram.com/p/C8qL1234567/embed/captioned/');
    });

    it('parses Instagram Posts', () => {
      const parsed = parseInstagramUrl('https://instagram.com/p/B_123456789/');
      expect(parsed).not.toBeNull();
      expect(parsed?.shortcode).toBe('B_123456789');
      expect(parsed?.type).toBe('post');
    });

    it('returns null for non-instagram domains', () => {
      expect(parseInstagramUrl('https://facebook.com/reel/123')).toBe(null);
    });
  });

  describe('parseVimeoId', () => {
    it('parses Vimeo video URLs', () => {
      expect(parseVimeoId('https://vimeo.com/123456789')).toBe('123456789');
      expect(parseVimeoId('https://player.vimeo.com/video/987654321')).toBe('987654321');
    });
  });

  describe('parseMediaUrl (Universal)', () => {
    it('identifies and enriches YouTube URLs', () => {
      const res = parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.type).toBe('youtube');
      expect(res.embedId).toBe('dQw4w9WgXcQ');
      expect(res.embedUrl).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(res.thumbnailUrl).toContain('img.youtube.com');
      expect(res.isShortOrReel).toBe(false);
    });

    it('identifies YouTube Shorts', () => {
      const res = parseMediaUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
      expect(res.type).toBe('youtube');
      expect(res.isShortOrReel).toBe(true);
    });

    it('identifies Instagram Reels', () => {
      const res = parseMediaUrl('https://www.instagram.com/reel/C8qL1234567/');
      expect(res.type).toBe('instagram');
      expect(res.embedId).toBe('C8qL1234567');
      expect(res.isShortOrReel).toBe(true);
    });

    it('identifies image URLs', () => {
      const res = parseMediaUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb');
      expect(res.type).toBe('image');
      expect(res.thumbnailUrl).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');
    });

    it('falls back to safe link for other URLs', () => {
      const res = parseMediaUrl('https://mywebsite.com/article');
      expect(res.type).toBe('link');
    });
  });
});
