export function validateSocialPost(
  content: string,
  platforms: string[],
  mediaUrls: string[],
  options?: { isPoster?: boolean }
): string | null {
  if (!content.trim() || !platforms.length) {
    return 'Add caption content and select at least one connected publishing account.';
  }

  // When publishing a Canva/poster design (isPoster: true), the backend server composites
  // and renders the design into a public HTTPS asset before queuing publication.
  // Relative paths (/images/...), data URIs, local files, and server relative URLs are completely valid.
  if (!options?.isPoster) {
    if (mediaUrls.some((url) => {
      if (!url || typeof url !== 'string') return true;
      if (url.startsWith('/') || url.startsWith('data:image/') || url.startsWith('file://')) return false;
      try {
        const u = new URL(url);
        return (u.protocol !== 'https:' && u.protocol !== 'http:') || !u.hostname || !!u.username || !!u.password;
      } catch {
        return true;
      }
    })) {
      return 'Please provide valid media URLs for external publishing.';
    }

    if (platforms.includes('instagram') && !mediaUrls.length) {
      return 'Instagram requires an image or video. Add media or remove Instagram.';
    }
    if (platforms.includes('pinterest') && !mediaUrls.length) {
      return 'Pinterest requires an image pin. Add media or select poster mode.';
    }
  }

  const limits: Record<string, number> = {
    twitter: 280,
    threads: 500,
    pinterest: 500,
    googlebusiness: 1500,
    instagram: 2200,
    linkedin: 3000,
    facebook: 5000,
  };
  const limit = Math.min(...platforms.map((p) => limits[p] || 5000));
  if (content.length > limit) {
    return `Keep the caption within ${limit} characters for the selected channels.`;
  }
  return null;
}

