'use client';

// ─────────────────────────────────────────────────────────────────────────────
// UsersTab — platform-wide user list with search, role filter, and
// activate/deactivate/change-role/delete actions.
//
// Extracted from `superadmin-view.tsx` so it's a stable module-level component
// — no more unmount/remount on parent re-render. All data + handlers arrive
// via props. The internal `useQueryClient()` call is preserved from the
// original (the original also called it directly inside the function body).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Loader2, Ban, CheckCircle2, UserCog, Trash2, Users,
} from 'lucide-react';

import {
  ROLE_BADGE_CLASSES,
} from '@/components/views/superadmin/_shared';
import type { UserRecord } from '@/components/views/superadmin/types';

export interface UsersTabProps {
  users: UserRecord[];
  usersLoading: boolean;
}

export function UsersTab({ users, usersLoading }: UsersTabProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState<{ user: UserRecord; action: 'activate' | 'deactivate' | 'change_role' | 'delete' } | null>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const queryClient = useQueryClient();

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.tenantName || '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleAction = async () => {
    if (!actionDialog) return;
    setSaving(true);
    try {
      // Delete uses DELETE method with query param; all others use PUT
      if (actionDialog.action === 'delete') {
        const res = await fetch(`/api/admin/users?id=${encodeURIComponent(actionDialog.user.id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const empCount = data?.report?.employeesDeleted ?? 0;
          toast.success(`User permanently deleted${empCount > 0 ? ` (${empCount} employee record${empCount > 1 ? 's' : ''} also removed)` : ''}`);
          // Invalidate users list so the deleted user disappears
          queryClient.invalidateQueries({ queryKey: ['users'] });
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error('Failed to delete user', {
            description: err.error || 'Unknown error',
            duration: 8000,
          });
        }
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: actionDialog.user.id,
            action: actionDialog.action === 'activate' ? 'unlock' : actionDialog.action === 'deactivate' ? 'lock' : 'change_role',
            role: actionDialog.action === 'change_role' ? newRole : undefined,
          }),
        });
        if (res.ok) {
          toast.success(`User ${actionDialog.action === 'activate' ? 'activated' : actionDialog.action === 'deactivate' ? 'deactivated' : 'role changed'} successfully`);
          queryClient.invalidateQueries({ queryKey: ['users'] });
        } else {
          toast.error('Failed to update user');
        }
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
      setActionDialog(null);
    }
  };

  const userColumns: Column<UserRecord>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-foreground">{u.name}</span> },
    { key: 'email', header: 'Email', render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    {
      key: 'role', header: 'Role', render: (u) => (
        <Badge variant="outline" className={cn('capitalize text-[10px]', ROLE_BADGE_CLASSES[u.role] || ROLE_BADGE_CLASSES.employee)}>
          {u.role}
        </Badge>
      ),
    },
    {
      key: 'status', header: 'Status', render: (u) => {
        // 3-way status: Inactive (red) / Pending Verification (amber) / Active (green)
        // Previously only checked `isActive` — which defaulted to true on registration,
        // so unverified users showed a green "Active" badge. Now we also check
        // `emailVerified` so users who haven't clicked the verify link show
        // an amber "Pending Verification" badge instead.
        if (!u.isActive) {
          return (
            <Badge variant="outline" className={cn('text-[10px]', 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20')}>
              Inactive
            </Badge>
          );
        }
        if (!u.emailVerified) {
          return (
            <Badge variant="outline" className={cn('text-[10px]', 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20')}>
              Pending Verification
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className={cn('text-[10px]', 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20')}>
            Active
          </Badge>
        );
      },
    },
    { key: 'tenant', header: 'Tenant', render: (u) => <span className="text-muted-foreground text-sm">{u.tenantName || '—'}</span> },
    {
      key: 'actions', header: 'Actions', render: (u) => (
        <div className="flex items-center justify-end gap-0.5">
          {u.isActive ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => setActionDialog({ user: u, action: 'deactivate' })} title="Deactivate">
              <Ban className="size-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => setActionDialog({ user: u, action: 'activate' })} title="Activate">
              <CheckCircle2 className="size-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sky-600 hover:text-sky-700" onClick={() => { setNewRole(u.role); setActionDialog({ user: u, action: 'change_role' }); }} title="Change Role">
            <UserCog className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => { setDeleteConfirmText(''); setActionDialog({ user: u, action: 'delete' }); }} title="Delete User">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ), className: 'text-right',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search users by name, email, or tenant..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={userColumns}
        data={filteredUsers}
        rowKey={(u) => u.id}
        loading={usersLoading}
        emptyMessage="No users found"
        emptyIcon={Users}
        className="max-h-[calc(100vh-320px)]"
      />

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.action === 'delete' && <Trash2 className="size-5 text-red-500" />}
              {actionDialog?.action === 'activate'
                ? 'Activate User'
                : actionDialog?.action === 'deactivate'
                  ? 'Deactivate User'
                  : actionDialog?.action === 'delete'
                    ? 'Permanently Delete User'
                    : 'Change Role'}
            </DialogTitle>
            <DialogDescription>User: {actionDialog?.user.name} ({actionDialog?.user.email})</DialogDescription>
          </DialogHeader>

          {actionDialog?.action === 'change_role' && (
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          )}

          {actionDialog?.action === 'delete' && (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3 text-sm">
              <p className="font-medium text-red-900 dark:text-red-100">
                ⚠️ This action cannot be undone.
              </p>
              <p className="text-red-700 dark:text-red-300">
                The user account will be <strong>permanently deleted</strong> along with:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-red-700 dark:text-red-300">
                <li>Employee profile(s) linked to this account</li>
                <li>API keys, push subscriptions, notification preferences</li>
                <li>Agent monitor + conversation assignment records</li>
              </ul>
              <p className="text-red-700 dark:text-red-300">
                Historical records (jobs, invoices, photos, timeline entries) will be <strong>preserved</strong> but the user reference will be cleared.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Type the user&apos;s email to confirm:
              </p>
              <Input
                placeholder={actionDialog?.user.email}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="border-red-300 dark:border-red-800"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog?.action === 'deactivate' || actionDialog?.action === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={
                saving ||
                (actionDialog?.action === 'delete' &&
                  deleteConfirmText.trim().toLowerCase() !== (actionDialog?.user.email || '').toLowerCase())
              }
            >
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
              {actionDialog?.action === 'delete'
                ? 'Delete Permanently'
                : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
