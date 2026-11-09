export interface SocialPostLinkSource {
  permalink?: string | null;
  googleUrl?: string | null;
  publishTargets?: Array<{
    platform: string;
    permalink?: string | null;
  }>;
}

export function getGooglePostUrl(post: SocialPostLinkSource): string | null {
  if (typeof post.googleUrl === 'string' && post.googleUrl.trim()) {
    return post.googleUrl.trim();
  }
  const gbpTarget = post.publishTargets?.find(
    (t) =>
      t.platform === 'googlebusiness' &&
      typeof t.permalink === 'string' &&
      t.permalink.trim().length > 0,
  );
  if (gbpTarget?.permalink) return gbpTarget.permalink.trim();
  if (
    typeof post.permalink === 'string' &&
    post.permalink.trim() &&
    post.permalink.includes('google.')
  ) {
    return post.permalink.trim();
  }
  return null;
}
