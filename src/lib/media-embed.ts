/**
 * Media Embed and Portfolio Parser Utility
 * Provides safe parsing, normalization, and embed generation for
 * YouTube videos, YouTube Shorts, Instagram Reels/Posts, Vimeo, and photo galleries.
 */

export type MediaType = 'youtube' | 'instagram' | 'vimeo' | 'image' | 'link';

export interface ParsedMedia {
  type: MediaType;
  originalUrl: string;
  embedUrl?: string;
  embedId?: string;
  thumbnailUrl?: string;
  isShortOrReel?: boolean;
}

/**
 * Validates that a URL is a valid http or https web address.
 * Rejects javascript:, data:, and malformed protocols.
 */
export function isSafeWebUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - Raw 11-char ID
 */
export function parseYouTubeId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // If already an 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  if (!isSafeWebUrl(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      // 1. /watch?v=ID
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      // 2. /shorts/ID, /embed/ID, /v/ID
      const match = url.pathname.match(/^\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) return match[1];
    } else if (hostname === 'youtu.be') {
      // 3. youtu.be/ID
      const id = url.pathname.slice(1).split('/')[0].split('?')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Generates a clean, privacy-enhanced YouTube embed URL using youtube-nocookie.com.
 */
export function getYouTubeEmbedUrl(
  urlOrId: string,
  options?: { autoplay?: boolean; mute?: boolean; rel?: number }
): string | null {
  const id = parseYouTubeId(urlOrId);
  if (!id) return null;

  const params = new URLSearchParams({
    rel: String(options?.rel ?? 0),
    modestbranding: '1',
    playsinline: '1',
  });

  if (options?.autoplay) params.set('autoplay', '1');
  if (options?.mute) params.set('mute', '1');

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/**
 * Returns the default high-quality thumbnail image URL for a YouTube video.
 */
export function getYouTubeThumbnail(
  urlOrId: string,
  quality: 'default' | 'hq' | 'maxres' = 'hq'
): string | null {
  const id = parseYouTubeId(urlOrId);
  if (!id) return null;

  const qualityName = quality === 'maxres' ? 'maxresdefault.jpg' : 'hqdefault.jpg';
  return `https://img.youtube.com/vi/${id}/${qualityName}`;
}

/**
 * Extracts the shortcode and embed URL for Instagram Reels and Posts.
 * Supports:
 * - https://www.instagram.com/reel/SHORTCODE/
 * - https://www.instagram.com/p/SHORTCODE/
 * - https://www.instagram.com/tv/SHORTCODE/
 */
export function parseInstagramUrl(input?: string | null): {
  shortcode: string | null;
  type: 'reel' | 'post' | 'tv' | 'unknown';
  embedUrl: string | null;
  directUrl: string;
} | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!isSafeWebUrl(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (hostname !== 'instagram.com' && hostname !== 'instagr.am') return null;

    const match = url.pathname.match(/^\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/);
    if (!match || !match[2]) {
      return {
        shortcode: null,
        type: 'unknown',
        embedUrl: null,
        directUrl: trimmed,
      };
    }

    const kind = match[1] === 'reel' ? 'reel' : match[1] === 'tv' ? 'tv' : 'post';
    const shortcode = match[2];
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

    return {
      shortcode,
      type: kind,
      embedUrl,
      directUrl: `https://www.instagram.com/p/${shortcode}/`,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts Vimeo video ID from URL.
 */
export function parseVimeoId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!isSafeWebUrl(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, '');
    if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
      const match = url.pathname.match(/\/(?:video\/)?([0-9]+)/);
      if (match && match[1]) return match[1];
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Detects whether a URL is an image by extension.
 */
export function isImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return (
    /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(trimmed) ||
    trimmed.includes('images.unsplash.com') ||
    trimmed.includes('cloudinary.com') ||
    trimmed.includes('cdn.')
  );
}

/**
 * Universal media detector and normalizer.
 * Analyzes any web URL and returns structured media metadata.
 */
export function parseMediaUrl(input?: string | null): ParsedMedia {
  if (!input || typeof input !== 'string' || !isSafeWebUrl(input)) {
    return {
      type: 'link',
      originalUrl: input || '',
    };
  }

  const trimmed = input.trim();

  // 1. YouTube
  const youtubeId = parseYouTubeId(trimmed);
  if (youtubeId) {
    const isShorts = trimmed.includes('/shorts/');
    return {
      type: 'youtube',
      originalUrl: trimmed,
      embedId: youtubeId,
      embedUrl: getYouTubeEmbedUrl(youtubeId) || undefined,
      thumbnailUrl: getYouTubeThumbnail(youtubeId) || undefined,
      isShortOrReel: isShorts,
    };
  }

  // 2. Instagram
  const insta = parseInstagramUrl(trimmed);
  if (insta && insta.shortcode) {
    return {
      type: 'instagram',
      originalUrl: insta.directUrl,
      embedId: insta.shortcode,
      embedUrl: insta.embedUrl || undefined,
      isShortOrReel: insta.type === 'reel',
    };
  }

  // 3. Vimeo
  const vimeoId = parseVimeoId(trimmed);
  if (vimeoId) {
    return {
      type: 'vimeo',
      originalUrl: trimmed,
      embedId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  // 4. Image
  if (isImageUrl(trimmed)) {
    return {
      type: 'image',
      originalUrl: trimmed,
      thumbnailUrl: trimmed,
    };
  }

  return {
    type: 'link',
    originalUrl: trimmed,
  };
}
