import type { AuthUser } from '@/lib/auth';

/** An inbox is an operator surface. Customer sessions never grant inbox access. */
export function canUseInbox(user: AuthUser | null): user is AuthUser {
  return !!user && user.role !== 'customer' && (!!user.tenantId || user.isSuperAdmin === true);
}

export function canAccessConversation(user: AuthUser, conversation: { tenantId: string | null; workspaceId?: string | null }): boolean {
  if (user.isSuperAdmin === true) return true;
  if (!user.tenantId || conversation.tenantId !== user.tenantId) return false;
  return !user.workspaceId || !conversation.workspaceId || user.workspaceId === conversation.workspaceId;
}
