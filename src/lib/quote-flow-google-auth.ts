export interface VerifiedGoogleUser {
  email: string;
  name?: string;
  picture?: string;
  sub: string;
}

function getAllowedGoogleAudiences(): Set<string> {
  const configured = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    ...(process.env.QUOTEFLOW_GOOGLE_CLIENT_IDS || '').split(','),
  ];
  return new Set(
    configured
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
}

function isApprovedAudience(audience: unknown): boolean {
  return typeof audience === 'string' && getAllowedGoogleAudiences().has(audience);
}

export async function verifyGoogleToken(
  idToken?: string,
  accessToken?: string,
): Promise<VerifiedGoogleUser | null> {
  if (idToken) {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (response.ok) {
        const payload = await response.json();
        const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
        const validIssuer =
          payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com';
        if (
          payload.email &&
          payload.sub &&
          emailVerified &&
          validIssuer &&
          isApprovedAudience(payload.aud)
        ) {
          return {
            email: String(payload.email).toLowerCase().trim(),
            name: payload.name || String(payload.email).split('@')[0],
            picture: payload.picture,
            sub: String(payload.sub),
          };
        }
      }
    } catch (error) {
      console.warn('[QuoteFlow Google Auth] ID token verification network error:', error);
    }
  }

  if (accessToken) {
    try {
      const tokenInfoResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!tokenInfoResponse.ok) return null;
      const tokenInfo = await tokenInfoResponse.json();
      if (!isApprovedAudience(tokenInfo.aud)) return null;

      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const payload = await response.json();
        const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
        if (payload.email && payload.sub && emailVerified) {
          return {
            email: String(payload.email).toLowerCase().trim(),
            name: payload.name || String(payload.email).split('@')[0],
            picture: payload.picture,
            sub: String(payload.sub),
          };
        }
      }
    } catch (error) {
      console.warn('[QuoteFlow Google Auth] Access token verification network error:', error);
    }
  }

  return null;
}
