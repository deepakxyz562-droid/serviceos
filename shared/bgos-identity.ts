// Valid business workspace types for BGOS mobile.
// Business owners using BGOS, Chatbotly, Forms, CRM, BOS, or ServiceOS are all valid BGOS identities.
const VALID_BGOS_PRODUCT_TYPES = ['bgos', 'chatbotly', 'forms', 'crm', 'bos', 'serviceos', 'business', 'marketing', ''];

export function isBgosIdentity(identity: {
  user?: { role?: string | null; isSuperAdmin?: boolean } | null;
  workspace?: { productType?: string | null } | null;
}) {
  if (!identity.user || identity.user.isSuperAdmin || identity.user.role === 'customer'
    || ['superadmin', 'super_admin'].includes(identity.user.role || '')) {
    return false;
  }
  const pt = identity.workspace?.productType?.toLowerCase() || '';
  return VALID_BGOS_PRODUCT_TYPES.includes(pt);
}
