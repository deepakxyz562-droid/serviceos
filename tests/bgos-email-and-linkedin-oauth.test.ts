import { describe, it, expect, vi } from 'vitest';
import { resolveEffectiveBusinessName } from '@/lib/bgos-daily-push';
import { isAllowedOAuthOriginHost, resolveOAuthOrigin } from '@/lib/social/oauth-page';

describe('BGOS Business Name Resolution & Email Sender Branding', () => {
  it('cleans up "Fieseros Support" and normalizes to "FieserOS"', () => {
    const result = resolveEffectiveBusinessName(
      { name: 'Fieseros Support' },
      { businessName: 'Fieseros Support' },
    );
    expect(result).toBe('FieserOS');
  });

  it('strips "Support Workspace" or "Support" suffix from business name', () => {
    const res1 = resolveEffectiveBusinessName(
      { name: 'Acme Services Support' },
      { businessName: 'Acme Services Support' },
    );
    expect(res1).toBe('Acme Services');

    const res2 = resolveEffectiveBusinessName(
      { name: 'City Plumbing' },
      { businessName: 'City Plumbing Support Workspace' },
    );
    expect(res2).toBe('City Plumbing');
  });

  it('prioritizes activeGbpTitle from settingsJson when present', () => {
    const result = resolveEffectiveBusinessName(
      {
        name: 'Fieseros Support',
        settingsJson: JSON.stringify({ activeGbpTitle: 'FieserOS Official' }),
      },
      { businessName: 'Fieseros Support' },
    );
    expect(result).toBe('FieserOS Official');
  });

  it('falls back to "Your Business" when no names are present', () => {
    const result = resolveEffectiveBusinessName(null, null);
    expect(result).toBe('Your Business');
  });
});

describe('LinkedIn OAuth Origin & Redirect URI Resolution', () => {
  it('validates allowed OAuth origins correctly', () => {
    expect(isAllowedOAuthOriginHost('https://fieseros.com')).toBe(true);
    expect(isAllowedOAuthOriginHost('https://bgos.fieseros.com')).toBe(true);
    expect(isAllowedOAuthOriginHost('https://bgos.site')).toBe(true);
    expect(isAllowedOAuthOriginHost('http://localhost:3000')).toBe(true);
    expect(isAllowedOAuthOriginHost('https://evil-attacker.com')).toBe(false);
  });

  it('resolves OAuth origin using originHostParam when valid', () => {
    const mockReq = {
      headers: { get: () => 'fieseros.com' },
    };
    const resolved = resolveOAuthOrigin(mockReq, 'https://bgos.site');
    expect(resolved).toBe('https://bgos.site');
  });

  it('ignores invalid originHostParam and falls back to host header or default', () => {
    const mockReq = {
      headers: {
        get: (name: string) => {
          if (name === 'host') return 'bgos.fieseros.com';
          if (name === 'x-forwarded-proto') return 'https';
          return null;
        },
      },
    };
    const resolved = resolveOAuthOrigin(mockReq, 'https://malicious.com');
    expect(resolved).toBe('https://bgos.fieseros.com');
  });
});
