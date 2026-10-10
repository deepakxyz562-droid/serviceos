export function validateSocialPost(content: string, platforms: string[], mediaUrls: string[]): string | null {
  if (!content.trim() || !platforms.length) return 'Add content and select a connected account.';
  if (mediaUrls.some(url => { try { const u = new URL(url); return u.protocol !== 'https:' || !u.hostname || !!u.username || !!u.password; } catch { return true; } })) return 'Use one valid public HTTPS media URL per line.';
  if (platforms.includes('instagram') && !mediaUrls.length) return 'Instagram requires an image or video. Add media or remove Instagram.';
  const limits: Record<string, number> = { twitter: 280, instagram: 2200, googlebusiness: 1500, linkedin: 3000, facebook: 5000 };
  const limit = Math.min(...platforms.map(p => limits[p] || 5000));
  if (content.length > limit) return `Keep the caption within ${limit} characters for the selected channels.`;
  return null;
}
