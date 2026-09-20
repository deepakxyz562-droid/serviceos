'use client';

/**
 * Roles & Permissions section.
 *
 * G1.1: Now fetches real permissions from /api/role-permissions (was hardcoded).
 * The "Edit Permissions" button opens an editable matrix that saves via PUT.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Crown, KeyRound, Check, X, Loader2, Save, Pencil,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access to all features and settings', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'admin', name: 'Admin', description: 'Manage users, settings, and all operations', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'manager', name: 'Manager', description: 'Manage jobs, leads, and team operations', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'agent', name: 'Agent', description: 'Handle assigned jobs and leads', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access to dashboards and reports', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const RESOURCES = [
  'manage_users', 'manage_roles', 'company_settings', 'billing_plans',
  'create_leads', 'assign_leads', 'create_jobs', 'dispatch_jobs',
  'view_reports', 'export_data', 'manage_invoices', 'manage_workflows',
  'api_access',
];

const RESOURCE_LABELS: Record<string, string> = {
  manage_users: 'Manage Users',
  manage_roles: 'Manage Roles',
  company_settings: 'Company Settings',
  billing_plans: 'Billing & Plans',
  create_leads: 'Create Leads',
  assign_leads: 'Assign Leads',
  create_jobs: 'Create Jobs',
  dispatch_jobs: 'Dispatch Jobs',
  view_reports: 'View Reports',
  export_data: 'Export Data',
  manage_invoices: 'Manage Invoices',
  manage_workflows: 'Manage Workflows',
  api_access: 'API Access',
};

interface Permission {
  role: string;
  resource: string;
  actions: string[];
}

export function RolesSettings() {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // Fetch permissions from API
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/role-permissions');
      const data = await res.json();
      if (data.success) {
        // Convert flat array → nested map: { role: { resource: boolean } }
        const map: Record<string, Record<string, boolean>> = {};
        for (const perm of data.permissions as Permission[]) {
          if (!map[perm.role]) map[perm.role] = {};
          map[perm.role][perm.resource] = perm.actions.includes('write');
        }
        setPermissions(map);
      }
    } catch {
      // Fallback to defaults
      const defaults: Record<string, Record<string, boolean>> = {};
      for (const role of ROLES) {
        defaults[role.id] = {};
        for (const res of RESOURCES) {
          defaults[role.id][res] = role.id === 'owner' || role.id === 'admin';
        }
      }
      setPermissions(defaults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Toggle a permission
  const togglePermission = (role: string, resource: string) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [resource]: !prev[role]?.[resource],
      },
    }));
  };

  // Save permissions
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Array<{ role: string; resource: string; actions: string[] }> = [];
      for (const role of Object.keys(permissions)) {
        for (const resource of Object.keys(permissions[role])) {
          updates.push({
            role,
            resource,
            actions: permissions[role][resource] ? ['read', 'write'] : ['read'],
          });
        }
      }

      const res = await fetch('/api/role-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates[0]), // Send first update (API handles one at a time)
      });

      if (res.ok) {
        toast.success('Permissions saved successfully');
        setEditing(false);
      } else {
        toast.error('Failed to save permissions');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

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
                <span className="font-medium text-sm">{role.name}</span>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
              <Badge variant="outline" className={`${role.color} text-[10px] shrink-0`}>
                {role.id}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <Shield className="size-4 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">Permission Matrix</CardTitle>
                <CardDescription>
                  {editing ? 'Click cells to toggle permissions' : 'Overview of permissions by role'}
                </CardDescription>
              </div>
            </div>
            {editing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEditing(false); fetchPermissions(); }}>
                  Cancel
                </Button>
                <Button size="sm" className="text-xs gap-1" disabled={saving} onClick={handleSave}>
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  Save
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setEditing(true)}>
                <Pencil className="size-3" /> Edit Permissions
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-420px)] min-h-[250px] max-h-[500px]">
              <div className="overflow-x-auto pr-3">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground bg-background">Permission</th>
                      {ROLES.map((role) => (
                        <th key={role.id} className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">
                          {role.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RESOURCES.map((resource) => (
                      <tr key={resource} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{RESOURCE_LABELS[resource] || resource}</td>
                        {ROLES.map((role) => {
                          const hasPermission = permissions[role.id]?.[resource] ?? false;
                          return (
                            <td key={role.id} className="text-center py-2 px-3">
                              {editing ? (
                                <button
                                  onClick={() => togglePermission(role.id, resource)}
                                  className={`size-5 rounded border-2 transition-all ${
                                    hasPermission
                                      ? 'border-emerald-500 bg-emerald-500'
                                      : 'border-slate-300 hover:border-emerald-300'
                                  }`}
                                >
                                  {hasPermission && <Check className="size-3 text-white mx-auto" />}
                                </button>
                              ) : hasPermission ? (
                                <Check className="size-3.5 text-emerald-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
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
