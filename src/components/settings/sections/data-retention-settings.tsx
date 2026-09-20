'use client';

/**
 * Data Retention Settings section.
 *
 * G1.3: Admin UI for configuring data retention policies.
 * Admins can set retention days + auto-delete per resource type.
 * The cron at /api/cron/data-retention enforces these daily.
 */

import { useState, useEffect, useCallback } from 'react';
import { Database, Trash2, Archive, Clock, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface RetentionPolicy {
  id?: string;
  resourceType: string;
  retentionDays: number;
  autoDelete: boolean;
  archiveFirst: boolean;
}

const RESOURCE_TYPES = [
  { id: 'conversations', label: 'Conversations', description: 'WhatsApp, SMS, web chat conversations' },
  { id: 'form_responses', label: 'Form Responses', description: 'Submitted form data' },
  { id: 'audit_logs', label: 'Audit Logs', description: 'User activity logs' },
  { id: 'notifications', label: 'Notifications', description: 'In-app and push notifications' },
  { id: 'campaigns', label: 'Campaigns', description: 'Marketing campaign data' },
];

export function DataRetentionSettings() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data-retention');
      const data = await res.json();
      if (data.success && data.policies) {
        // Merge with defaults for any missing resource types
        const existing = new Map(data.policies.map((p: RetentionPolicy) => [p.resourceType, p]));
        const merged = RESOURCE_TYPES.map((rt) => {
          const existing_policy = existing.get(rt.id);
          return existing_policy || {
            resourceType: rt.id,
            retentionDays: 365,
            autoDelete: false,
            archiveFirst: true,
          };
        });
        setPolicies(merged);
      } else {
        // Initialize with defaults
        setPolicies(RESOURCE_TYPES.map((rt) => ({
          resourceType: rt.id,
          retentionDays: 365,
          autoDelete: false,
          archiveFirst: true,
        })));
      }
    } catch {
      setPolicies(RESOURCE_TYPES.map((rt) => ({
        resourceType: rt.id,
        retentionDays: 365,
        autoDelete: false,
        archiveFirst: true,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const updatePolicy = (resourceType: string, field: keyof RetentionPolicy, value: unknown) => {
    setPolicies((prev) =>
      prev.map((p) => (p.resourceType === resourceType ? { ...p, [field]: value } : p)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/data-retention', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Retention policies saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Database className="size-4 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-base">Data Retention Policies</CardTitle>
            <CardDescription>Configure how long data is kept before automatic deletion</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {policies.map((policy, idx) => {
              const resourceType = RESOURCE_TYPES.find((rt) => rt.id === policy.resourceType);
              return (
                <div key={policy.resourceType}>
                  {idx > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-sm">{resourceType?.label || policy.resourceType}</span>
                        {policy.autoDelete && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700">
                            Auto-delete ON
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{resourceType?.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 ml-5">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Keep for</Label>
                      <Input
                        type="number"
                        value={policy.retentionDays}
                        onChange={(e) => updatePolicy(policy.resourceType, 'retentionDays', parseInt(e.target.value) || 365)}
                        className="w-20 h-8 text-xs"
                        min={1}
                        max={3650}
                      />
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={policy.autoDelete}
                        onCheckedChange={(v) => updatePolicy(policy.resourceType, 'autoDelete', v)}
                      />
                      <Label className="text-xs flex items-center gap-1">
                        <Trash2 className="size-3" /> Auto-delete
                      </Label>
                    </div>

                    {policy.autoDelete && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={policy.archiveFirst}
                          onCheckedChange={(v) => updatePolicy(policy.resourceType, 'archiveFirst', v)}
                        />
                        <Label className="text-xs flex items-center gap-1">
                          <Archive className="size-3" /> Archive first
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <Separator className="my-3" />
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save Policies
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Policies are enforced daily by the automated cron. Archive-first mode soft-deletes data
              (preserves it with status=archived). Direct delete permanently removes records.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
