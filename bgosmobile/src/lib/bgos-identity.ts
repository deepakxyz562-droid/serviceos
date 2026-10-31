// Only BGOS and its legacy aliases are valid BGOS identities.
export function isBgosIdentity(identity: {
  user?: { role?: string | null; isSuperAdmin?: boolean } | null;
  workspace?: { productType?: string | null } | null;
}) {
  if (!identity.user || identity.user.isSuperAdmin || identity.user.role === 'customer'
    || ['superadmin', 'super_admin'].includes(identity.user.role || '')) {
    return false;
  }
  const pt = identity.workspace?.productType?.toLowerCase() || '';
  return ['bgos', 'chatbotly', 'forms'].includes(pt);
}
