/** Product identity comes from the workspace, never from its business industry. */
export function isGptFormWorkspace(auth: {
    workspace?: {
        productType?: string | null;
    } | null;
    tenant?: {
        productType?: string | null;
        signupMode?: string | null;
        plan?: string | null;
    } | null;
    user?: {
        role?: string | null;
        isSuperAdmin?: boolean;
    } | null;
}): boolean {
    if (auth.user?.isSuperAdmin || ['superadmin', 'super_admin'].includes(auth.user?.role || ''))
        return false;
    const product = auth.workspace?.productType || auth.tenant?.productType;
    if (product)
        return ['forms', 'gptform'].includes(product);
    return ['standalone', 'forms_standalone'].includes(auth.tenant?.signupMode || '') ||
        (auth.tenant?.plan || '').startsWith('standalone') || auth.user?.role === 'standalone_user';
}
