'use client';

import { authFetch } from '@/lib/client-auth';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Variable,
  ShieldCheck,
  Clock,
  Hash,
  Braces,
  Type,
  AlertTriangle,
} from 'lucide-react';

interface VariableItem {
  id: string;
  key: string;
  value: string;
  type: string;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string; badgeClass: string }> = {
  string: { icon: Type, label: 'String', color: 'text-emerald-600', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  number: { icon: Hash, label: 'Number', color: 'text-amber-600', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  json: { icon: Braces, label: 'JSON', color: 'text-violet-600', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  secret: { icon: ShieldCheck, label: 'Secret', color: 'text-rose-600', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function VariablesView() {
  const { toast } = useToast();
  const [variables, setVariables] = useState<VariableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Revealed values state - tracks which variable IDs have their values visible
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<VariableItem | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formType, setFormType] = useState('string');
  const [formShowValue, setFormShowValue] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVariable, setDeletingVariable] = useState<VariableItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchVariables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/variables');
      if (!res.ok) throw new Error('Failed to fetch variables');
      const data = await res.json();
      setVariables(data.variables || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  // Filter variables by search
  const filtered = variables.filter((v) =>
    v.key.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalCount = variables.length;
  const secretCount = variables.filter((v) => v.type === 'secret').length;
  const recentlyUpdated = variables.filter((v) => {
    const updated = new Date(v.updatedAt);
    const now = new Date();
    return now.getTime() - updated.getTime() < 24 * 60 * 60 * 1000; // last 24 hours
  }).length;

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openAddDialog = () => {
    setEditingVariable(null);
    setFormKey('');
    setFormValue('');
    setFormType('string');
    setFormShowValue(false);
    setDialogOpen(true);
  };

  const openEditDialog = (variable: VariableItem) => {
    setEditingVariable(variable);
    setFormKey(variable.key);
    setFormValue(''); // Value is masked; user must re-enter
    setFormType(variable.type);
    setFormShowValue(false);
    setDialogOpen(true);
  };

  const openDeleteDialog = (variable: VariableItem) => {
    setDeletingVariable(variable);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formKey.trim()) {
      toast({ title: 'Validation Error', description: 'Variable key is required', variant: 'destructive' });
      return;
    }

    if (editingVariable && !formValue.trim()) {
      toast({ title: 'Validation Error', description: 'Enter a new value to update', variant: 'destructive' });
      return;
    }

    if (!editingVariable && !formValue.trim()) {
      toast({ title: 'Validation Error', description: 'Variable value is required', variant: 'destructive' });
      return;
    }

    try {
      setFormSaving(true);
      const res = await authFetch('/api/variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: formKey.trim(), value: formValue, type: formType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save variable');
      }

      const savedVar = await res.json();

      setVariables((prev) => {
        const existingIdx = prev.findIndex((v) => v.key === savedVar.key);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = savedVar;
          return updated;
        }
        return [...prev, savedVar];
      });

      setDialogOpen(false);
      toast({
        title: editingVariable ? 'Variable Updated' : 'Variable Created',
        description: `${formKey} has been ${editingVariable ? 'updated' : 'created'} successfully`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save variable',
        variant: 'destructive',
      });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVariable) return;

    try {
      setDeleteSaving(true);
      const res = await authFetch(`/api/variables?key=${encodeURIComponent(deletingVariable.key)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete variable');
      }

      setVariables((prev) => prev.filter((v) => v.id !== deletingVariable.id));
      setDeleteDialogOpen(false);
      toast({
        title: 'Variable Deleted',
        description: `${deletingVariable.key} has been removed`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete variable',
        variant: 'destructive',
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 font-medium mb-4">Error: {error}</p>
            <Button onClick={fetchVariables} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Variable className="size-6 text-emerald-600" />
            Environment Variables
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage environment variables for your workflows
          </p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={openAddDialog}>
          <Plus className="size-4" />
          Add Variable
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-50 shrink-0">
              <Variable className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Variables</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-rose-50 shrink-0">
              <ShieldCheck className="size-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{secretCount}</p>
              <p className="text-xs text-muted-foreground">Secret Variables</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-amber-50 shrink-0">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recentlyUpdated}</p>
              <p className="text-xs text-muted-foreground">Updated (24h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search variables by key..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Variables Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Variables</CardTitle>
          <CardDescription>
            {filtered.length} variable{filtered.length !== 1 ? 's' : ''} found
            {search && ` matching "${search}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="size-7 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Variable className="size-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No variables found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Try adjusting your search' : 'Add a variable to use in your workflows'}
              </p>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={openAddDialog}>
                <Plus className="size-4" />
                Add Variable
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_1.5fr_100px_140px_80px] gap-4 px-6 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Key</span>
                  <span>Value</span>
                  <span>Type</span>
                  <span>Last Updated</span>
                  <span className="text-right">Actions</span>
                </div>
                {/* Table Rows */}
                {filtered.map((variable) => {
                  const config = typeConfig[variable.type] || typeConfig.string;
                  const Icon = config.icon;
                  const isRevealed = revealedIds.has(variable.id);
                  const isSecret = variable.type === 'secret';

                  return (
                    <div
                      key={variable.id}
                      className="grid grid-cols-[1fr_1.5fr_100px_140px_80px] gap-4 px-6 py-3 items-center hover:bg-muted/30 transition-colors"
                    >
                      {/* Key */}
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="text-sm font-mono font-medium text-emerald-600 truncate">
                          {variable.key}
                        </code>
                      </div>

                      {/* Value */}
                      <div className="flex items-center gap-2 min-w-0">
                        <code className={cn(
                          'text-sm font-mono flex-1 truncate',
                          isRevealed ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {isRevealed ? variable.value : '••••••••'}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleReveal(variable.id)}
                          title={isRevealed ? 'Hide value' : 'Reveal value'}
                        >
                          {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </Button>
                      </div>

                      {/* Type */}
                      <div>
                        <Badge variant="outline" className={cn('text-xs gap-1', config.badgeClass)}>
                          <Icon className="size-3" />
                          {config.label}
                        </Badge>
                      </div>

                      {/* Last Updated */}
                      <span className="text-xs text-muted-foreground" title={formatDate(variable.updatedAt)}>
                        {formatRelativeTime(variable.updatedAt)}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(variable)}
                          title="Edit variable"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => openDeleteDialog(variable)}
                          title="Delete variable"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Variable Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVariable ? 'Edit Variable' : 'Add Variable'}</DialogTitle>
            <DialogDescription>
              {editingVariable
                ? `Update the value and type for "${editingVariable.key}"`
                : 'Create a new environment variable for your workflows'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="var-key">Key</Label>
              <Input
                id="var-key"
                placeholder="e.g., API_BASE_URL"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                disabled={!!editingVariable}
                className={cn(editingVariable && 'bg-muted')}
              />
              {editingVariable && (
                <p className="text-xs text-muted-foreground">Key cannot be changed. Delete and recreate to rename.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-value">
                Value
                {editingVariable && <span className="text-muted-foreground font-normal ml-1">(enter new value)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="var-value"
                  type={formShowValue ? 'text' : 'password'}
                  placeholder={editingVariable ? 'Enter new value...' : 'Enter value...'}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setFormShowValue((prev) => !prev)}
                  title={formShowValue ? 'Hide value' : 'Show value'}
                >
                  {formShowValue ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {formType === 'json' && (
                <p className="text-xs text-muted-foreground">Enter a valid JSON string (e.g., {"{"}"key": "value"{"}"})</p>
              )}
              {formType === 'number' && (
                <p className="text-xs text-muted-foreground">Enter a numeric value</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-type">Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger id="var-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, config]) => {
                    const ItemIcon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <ItemIcon className={cn('size-3.5', config.color)} />
                          {config.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {formType === 'secret' && (
                <p className="text-xs text-rose-600 flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  Secret values are encrypted and never shown in plain text in the list view
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={formSaving}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSave}
              disabled={formSaving || !formKey.trim() || (!editingVariable && !formValue.trim())}
            >
              {formSaving ? 'Saving...' : editingVariable ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Variable</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <code className="font-mono text-emerald-600 font-semibold">{deletingVariable?.key}</code>?
              This action cannot be undone and may break workflows that reference this variable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteSaving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSaving}
            >
              {deleteSaving ? 'Deleting...' : 'Delete Variable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
