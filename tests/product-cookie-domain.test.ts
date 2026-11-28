import { afterEach, expect, it, vi } from 'vitest';
import { getCookieDomain } from '@/lib/brand';
import { getAuthCookieOptions } from '@/lib/auth';
afterEach(()=>vi.unstubAllEnvs());
it.each(['https://fieseros.com','https://www.fieseros.com','https://bos.fieseros.com','https://chatbotly.fieseros.com','https://quoteflow.fieseros.com'])('shares the apex scope for %s', url=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_APP_URL',url);
 expect(getCookieDomain()).toBe('.fieseros.com');
});
it('does not share cookies with a lookalike host',()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_APP_URL','https://fieseros.com.example.org');vi.stubEnv('AUTH_COOKIE_DOMAIN','.fieseros.com');
 expect(getCookieDomain()).toBeUndefined();
});
it('keeps local development cookies host-only',()=>{
 vi.stubEnv('NODE_ENV','development');vi.stubEnv('NEXT_PUBLIC_APP_URL','https://fieseros.com');
 expect(getCookieDomain()).toBeUndefined();
});
it('keeps bgos.site session cookies host-only even when NEXT_PUBLIC_APP_URL is fieseros.com', () => {
 vi.stubEnv('NODE_ENV', 'production');
 vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fieseros.com');
 const bgosReq = { headers: new Headers({ 'x-forwarded-host': 'bgos.site' }), url: 'https://bgos.site/api/bgos/mobile-auth/handoff' };
 const fieserReq = { headers: new Headers({ 'x-forwarded-host': 'app.fieseros.com' }), url: 'https://app.fieseros.com/api/auth/login' };
 expect(getCookieDomain(bgosReq)).toBeUndefined();
 expect(getAuthCookieOptions(bgosReq).access.domain).toBeUndefined();
 expect(getCookieDomain(fieserReq)).toBe('.fieseros.com');
 expect(getAuthCookieOptions(fieserReq).access.domain).toBe('.fieseros.com');
});
