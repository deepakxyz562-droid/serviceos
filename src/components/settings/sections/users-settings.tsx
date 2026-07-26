'use client';

/**
 * Team / Users section.
 *
 * Extracted from the legacy settings-view.tsx Users tab. Lists team
 * members and supports inviting new ones. Self-contained: fetches its
 * own user list, manages its own invite dialog state.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'owner': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'admin': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'agent': return 'bg-sky-100 text-sky-700 border-sky-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function UsersSettings() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'agent' });
  const [inviting, setInviting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // silently fail
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInviteUser = async () => {
    if (!inviteForm.name || !inviteForm.email) {
      toast.error('Name and email are required');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/users?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        toast.success('User invited successfully');
        setShowInviteUser(false);
        setInviteForm({ name: '', email: '', role: 'agent' });
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to invite user');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <UsersIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>Manage your team and invite new members</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={() => setShowInviteUser(true)}
            >
              <UserPlus className="size-3.5" /> Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UsersIcon className="size-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">No team members found</p>
              <p className="text-xs">Invite users to your workspace</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px] max-h-[600px]">
              <div className="space-y-2 pr-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-center size-9 rounded-full bg-muted shrink-0">
                      <span className="text-sm font-medium text-muted-foreground">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{user.name}</span>
                        <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} text-[10px] shrink-0 capitalize`}>
                          {user.role}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {user.lastLoginAt && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join your workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteUser(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleInviteUser}
              disabled={!inviteForm.name || !inviteForm.email || inviting}
            >
              {inviting ? <Loader2 className="size-4 animate-spin mr-1" /> : <UserPlus className="size-4 mr-1" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
