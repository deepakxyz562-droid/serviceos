// Explicit product identity: business identities allowed, customer/superadmin excluded, BOS excluded.
export function isBgosIdentity(identity: {
  user?: { role?: string | null; isSuperAdmin?: boolean } | null;
  workspace?: { productType?: string | null } | null;
}) {
  if (!identity.user || identity.user.isSuperAdmin || identity.user.role === 'customer'
    || ['superadmin', 'super_admin'].includes(identity.user.role || '')) {
    return false;
  }
  const pt = identity.workspace?.productType?.toLowerCase() || '';
  if (pt === 'bos') return false;
  return true;
}
