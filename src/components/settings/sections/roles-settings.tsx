'use client';

/**
 * Roles & Permissions section.
 *
 * Extracted from the legacy settings-view.tsx Roles tab. Static roles
 * list + permission matrix + a Security settings card (2FA + session
 * timeout). Read-only for now — the editable permission grid is part
 * of the upcoming Team v2 work.
 */

import { useState } from 'react';
import {
  Shield,
  Crown,
  KeyRound,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access to all features and settings', users: 1, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'admin', name: 'Admin', description: 'Manage users, settings, and all operations', users: 0, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'manager', name: 'Manager', description: 'Manage jobs, leads, and team operations', users: 0, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'agent', name: 'Agent', description: 'Handle assigned jobs and leads', users: 0, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access to dashboards and reports', users: 0, color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const PERMISSION_ROWS: Array<{ name: string; perms: boolean[] }> = [
  { name: 'Manage Users', perms: [true, true, false, false, false] },
  { name: 'Manage Roles', perms: [true, true, false, false, false] },
  { name: 'Company Settings', perms: [true, true, false, false, false] },
  { name: 'Billing & Plans', perms: [true, true, false, false, false] },
  { name: 'Create Leads', perms: [true, true, true, true, false] },
  { name: 'Assign Leads', perms: [true, true, true, false, false] },
  { name: 'Create Jobs', perms: [true, true, true, true, false] },
  { name: 'Dispatch Jobs', perms: [true, true, true, false, false] },
  { name: 'View Reports', perms: [true, true, true, true, true] },
  { name: 'Export Data', perms: [true, true, true, false, false] },
  { name: 'Manage Invoices', perms: [true, true, true, false, false] },
  { name: 'Manage Workflows', perms: [true, true, true, false, false] },
  { name: 'API Access', perms: [true, true, false, false, false] },
];

export function RolesSettings() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Roles &amp; Permissions</CardTitle>
              <CardDescription>Define access levels for team members</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ROLES.map((role) => (
            <div key={role.id} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0">
                {role.id === 'owner' ? (
                  <Crown className="size-4 text-amber-600" />
                ) : (
                  <Shield className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{role.name}</span>
                  <Badge variant="outline" className={`${role.color} text-[10px] shrink-0`}>
                    {role.users} member{role.users !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 text-xs gap-1">
                Edit Permissions
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Shield className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Permission Matrix</CardTitle>
              <CardDescription>Overview of permissions by role</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[250px] max-h-[500px]">
            <div className="overflow-x-auto pr-3">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground bg-background">Permission</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Owner</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Admin</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Manager</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Agent</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Viewer</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_ROWS.map((row) => (
                    <tr key={row.name} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium">{row.name}</td>
                      {row.perms.map((has, i) => (
                        <td key={i} className="text-center py-2 px-3">
                          {has ? (
                            <Check className="size-3.5 text-emerald-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Security Settings (basic) — fuller security UI lives in the dedicated Security section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <KeyRound className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription>Security and access control settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Two-Factor Authentication</Label>
              <p className="text-xs text-muted-foreground">Require 2FA for account access</p>
            </div>
            <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Session Timeout</Label>
            <Input
              placeholder="30 minutes"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="max-w-xs"
              type="number"
            />
            <p className="text-xs text-muted-foreground">Minutes of inactivity before session expires</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
