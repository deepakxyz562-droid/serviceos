// Explicit product identity only: legacy BGOS names are supported, BOS is not.
export function isBgosIdentity(identity: {
  user?: { role?: string | null; isSuperAdmin?: boolean } | null;
  workspace?: { productType?: string | null } | null;
}) {
  return !!identity.user && !identity.user.isSuperAdmin && identity.user.role !== 'customer'
    && !['superadmin', 'super_admin'].includes(identity.user.role || '')
    && ['bgos', 'chatbotly', 'chatboly', 'forms', 'gptform'].includes(identity.workspace?.productType || '');
}
