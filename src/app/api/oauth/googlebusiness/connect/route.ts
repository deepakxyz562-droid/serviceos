/**
 * GET /api/oauth/googlebusiness/connect
 *
 * Thin alias for `/api/oauth/googlebusiness` — the actual implementation
 * lives in `../route.ts`. This file exists so the Social Accounts UI
 * (which uses the generic `/api/oauth/{platform}/connect` URL pattern
 * shared by all 6 social platforms) can redirect here without special-
 * casing Google Business Profile.
 *
 * The full OAuth flow is documented in `../route.ts`.
 */
export { GET } from '../route';
