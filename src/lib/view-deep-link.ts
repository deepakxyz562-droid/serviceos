import { isViewType, type ViewType } from '@/types/workflow';
import { productForHostname } from '../../shared/product-context';

const VIEW_ALIASES: Record<string, ViewType> = {
  forms: 'formBuilder',
  formbuilder: 'formBuilder',
  formBuilder: 'formBuilder',
  'ai-employee': 'aiReceptionist',
  aireceptionist: 'aiReceptionist',
  aiReceptionist: 'aiReceptionist',
};

/**
 * Resolve a URL `view` or `tab` deep-link parameter into a valid `ViewType`.
 * Supports friendly aliases (`forms`, `ai-employee`), checks platform-admin
 * permission for `superadmin`, and accepts every canonical `ViewType`
 * (`reviews`, `socialMedia`, `integrations`, `billing`, `settings`, etc.).
 */
export function resolveRequestedView(
  rawView: string | null | undefined,
  opts?: { isPlatformAdmin?: boolean },
): ViewType | null {
  if (!rawView || typeof rawView !== 'string') return null;
  const trimmed = rawView.trim();
  if (!trimmed) return null;

  const alias = VIEW_ALIASES[trimmed] || VIEW_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  if (trimmed === 'superadmin') {
    return opts?.isPlatformAdmin ? 'superadmin' : null;
  }

  return isViewType(trimmed) ? trimmed : null;
}

/**
 * Decide whether a signed-out visitor landing on a BGOS app deep link (for
 * example `/app?product=bgos&view=reviews` from an email or push notification)
 * should see the Login form immediately rather than the CRM landing page.
 */
export function shouldAutoOpenAuthForDeepLink(
  search: string,
  hostname: string,
  pathname = '/',
): boolean {
  try {
    const cleanSearch = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(cleanSearch);

    // Explicit interactive flows handle their own screen/state.
    if (
      params.has('auth') ||
      params.has('verify') ||
      params.has('claim') ||
      params.has('mgl') ||
      params.get('logout') === '1'
    ) {
      return false;
    }

    const isBgosSurface =
      params.get('product') === 'bgos' ||
      productForHostname(hostname || '') === 'bgos';
    if (!isBgosSurface) return false;

    const hasViewOrTab = Boolean((params.get('view') || params.get('tab') || '').trim());
    return hasViewOrTab || pathname === '/app';
  } catch {
    return false;
  }
}
