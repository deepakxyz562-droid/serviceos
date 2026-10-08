import { afterEach, expect, it, vi } from 'vitest';
import { getCookieDomain } from '@/lib/brand';
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
