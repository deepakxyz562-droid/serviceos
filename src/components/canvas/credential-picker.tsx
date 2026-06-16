'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getCreateFields,
  getFieldLabel,
  isSensitiveField,
} from '@/lib/credential-fields';
import type { NodeProperty } from '@/types/workflow';

interface PickerCredential {
  id: string;
  name: string;
  type: string;
}

interface CredentialPickerProps {
  property: NodeProperty;
  value: string | undefined;
  onChange: (value: string) => void;
  /**
   * Optional list of credential types that this picker should filter by
   * (taken from the node definition's `credentialTypes` field). If
   * provided, only credentials of these types are shown. If omitted, all
   * credentials are listed.
   */
  credentialTypes?: string[];
}

/**
 * Inline credential picker used inside the workflow node config panel.
 *
 * - Renders a `<Select>` populated from `GET /api/credentials`.
 * - A "+" button opens a small dialog to create a new credential inline.
 *   After successful creation, the new credential is auto-selected.
 *
 * The picker is intentionally simple — it does NOT include a "Test" button
 * because the API returns masked data, so testing from here wouldn't have
 * the real secret. Testing is done from the Credentials page (where the
 * user enters the raw secret in the create dialog before saving).
 */
export function CredentialPicker({
  property,
  value,
  onChange,
  credentialTypes,
}: CredentialPickerProps) {
  const [credentials, setCredentials] = useState<PickerCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter the credential list by `credentialTypes` when provided so the
  // AI nodes (which declare `credentialTypes: ['apiKey']`) only show
  // matching credentials. Otherwise list everything.
  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      // Pick the first declared type to filter on the server; if multiple
      // types are declared we fetch all and filter client-side instead.
      let url = '/api/credentials';
      if (credentialTypes && credentialTypes.length === 1) {
        url += `?type=${encodeURIComponent(credentialTypes[0])}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load credentials (${res.status})`);
      const json = await res.json();
      let list: PickerCredential[] = (json.credentials || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }));
      if (credentialTypes && credentialTypes.length > 1) {
        const allowed = new Set(credentialTypes);
        list = list.filter((c) => allowed.has(c.type));
      }
      setCredentials(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load credentials';
      // Don't toast on initial mount failures — too noisy. Just log.
      console.warn('[CredentialPicker]', msg);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [credentialTypes]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCredentials().catch(() => {
      /* handled inside fetchCredentials */
    });
    return () => controller.abort();
  }, [fetchCredentials]);

  // Re-fetch when the create dialog closes (a new credential may have been
  // added). This keeps the dropdown fresh without refetching on every render.
  useEffect(() => {
    if (!dialogOpen) {
      fetchCredentials();
    }
  }, [dialogOpen, fetchCredentials]);

  const handleCreated = (newCred: PickerCredential) => {
    setCredentials((prev) =>
      prev.some((c) => c.id === newCred.id) ? prev : [newCred, ...prev]
    );
    onChange(newCred.id);
    setDialogOpen(false);
    toast.success('Credential created and selected');
  };

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-gray-500 flex items-center gap-1">
        <KeyRound className="size-2.5" />
        {property.displayName}
        {property.required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <div className="flex items-center gap-1.5">
        <Select
          value={value ?? ''}
          onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
        >
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue placeholder="Select credential..." />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-gray-500">
                <Loader2 className="size-3 animate-spin" /> Loading...
              </div>
            ) : credentials.length === 0 ? (
              <div className="px-2 py-3 text-xs text-gray-500">
                No credentials yet. Click + to create one.
              </div>
            ) : (
              <>
                {/* Allow the user to clear the selection. */}
                <SelectItem value="__none__" className="text-xs italic text-gray-400">
                  — None —
                </SelectItem>
                {credentials.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{c.name}</span>
                      <span className="text-[9px] uppercase text-gray-400">
                        {c.type}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setDialogOpen(true)}
          title="Create new credential"
          aria-label="Create new credential"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <CreateCredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        credentialTypes={credentialTypes}
        onCreated={handleCreated}
      />
    </div>
  );
}

// ─── Inline Create Dialog ────────────────────────────────────────────────────

interface CreateCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialTypes?: string[];
  onCreated: (cred: PickerCredential) => void;
}

function CreateCredentialDialog({
  open,
  onOpenChange,
  credentialTypes,
  onCreated,
}: CreateCredentialDialogProps) {
  // Default the type to the first declared credentialType (e.g. 'apiKey'
  // for AI nodes) so the user only sees the fields they actually need.
  // If no credentialTypes were declared, fall back to 'apiKey' as a sane
  // default — the user can still pick a different type from the dropdown.
  const defaultType =
    credentialTypes && credentialTypes.length > 0 ? credentialTypes[0] : 'apiKey';

  const [name, setName] = useState('');
  const [type, setType] = useState(defaultType);
  const [serviceName, setServiceName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the dialog opens (so a previous session's
  // values don't linger).
  useEffect(() => {
    if (open) {
      setName('');
      setType(defaultType);
      setServiceName('');
      setFields({});
      setRevealed({});
    }
  }, [open, defaultType]);

  const createFieldList = getCreateFields(type);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Credential name is required');
      return;
    }
    setSubmitting(true);
    try {
      const data: Record<string, string> = { ...fields };
      if (serviceName.trim()) data._serviceName = serviceName.trim();
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type, data }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to create credential (${res.status})`);
      }
      const created = await res.json();
      onCreated({ id: created.id, name: created.name, type: created.type });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create credential';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Credential</DialogTitle>
          <DialogDescription>
            Add a credential for this node to use. The new credential will be
            auto-selected after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Credential Name *</Label>
            <Input
              placeholder="e.g., OpenAI Production Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Service Name</Label>
            <Input
              placeholder="e.g., OpenAI, Anthropic (optional)"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v);
                setFields({});
              }}
              disabled={
                // Lock the type when the parent node declares exactly one
                // allowed credential type — picking anything else wouldn't
                // show up in the picker's filtered list afterwards.
                !!credentialTypes && credentialTypes.length === 1
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Show only allowed types when the parent restricts them. */}
                {(credentialTypes && credentialTypes.length > 0
                  ? credentialTypes
                  : ['apiKey', 'httpBasic', 'httpBearer', 'oAuth2', 'dbConnection', 'sshKey', 'awsIam', 'googleServiceAccount', 'whatsapp']
                ).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          {createFieldList.map((field) => {
            const sensitive = isSensitiveField(field);
            const isRevealed = revealed[field];
            return (
              <div key={field} className="space-y-2">
                <Label className="text-xs">{getFieldLabel(field)}</Label>
                <div className="relative">
                  <Input
                    type={sensitive && !isRevealed ? 'password' : 'text'}
                    placeholder={`Enter ${getFieldLabel(field).toLowerCase()}...`}
                    value={fields[field] || ''}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    className={cn(sensitive && 'pr-9')}
                  />
                  {sensitive && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setRevealed((prev) => ({ ...prev, [field]: !prev[field] }))
                      }
                    >
                      {isRevealed ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <Plus className="size-4 mr-1.5" /> Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
