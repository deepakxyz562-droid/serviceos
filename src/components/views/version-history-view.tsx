'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  Clock,
  RotateCcw,
  ChevronRight,
  FileJson,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Version {
  id: string;
  workflowId: string;
  message: string | null;
  snapshotSize: number;
  createdAt: string;
  createdBy?: string;
}

export function VersionHistoryView() {
  const { currentWorkflowId, setCurrentView } = useAppStore();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [snapshotJson, setSnapshotJson] = useState<string>('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<Version | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (!currentWorkflowId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${currentWorkflowId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || data);
      } else {
        toast.error('Failed to load version history');
      }
    } catch {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [currentWorkflowId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleSelectVersion = async (version: Version) => {
    setSelectedVersion(version);
    setSnapshotLoading(true);
    try {
      const res = await fetch(`/api/workflows/${currentWorkflowId}/versions`);
      if (res.ok) {
        // Fetch individual version for full snapshot
        const versionRes = await fetch(`/api/workflows/${currentWorkflowId}/versions/${version.id}`);
        if (versionRes.ok) {
          const versionData = await versionRes.json();
          const v = versionData.version || versionData;
          setSnapshotJson(v.snapshotJson || '{}');
        } else {
          setSnapshotJson('// Snapshot data not available');
        }
      }
    } catch {
      setSnapshotJson('// Failed to load snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleRestoreClick = (version: Version) => {
    setRestoreVersion(version);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreVersion || !currentWorkflowId) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/workflows/${currentWorkflowId}/versions/${restoreVersion.id}`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success(`Restored version from ${formatDate(restoreVersion.createdAt)}`);
        setRestoreDialogOpen(false);
        setRestoreVersion(null);
        setSelectedVersion(null);
        fetchVersions(); // Refresh list
      } else {
        toast.error('Failed to restore version');
      }
    } catch {
      toast.error('Failed to restore version');
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!currentWorkflowId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground gap-4">
        <FileJson className="size-16 opacity-30" />
        <h2 className="text-xl font-semibold text-foreground">No Workflow Selected</h2>
        <p className="text-sm max-w-md text-center">
          Open a workflow first to view its version history.
        </p>
        <Button variant="outline" onClick={() => setCurrentView('workflows')}>
          Go to Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('workflows')}>
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Version History</h1>
          <p className="text-sm text-muted-foreground">
            Workflow ID: {currentWorkflowId.slice(0, 8)}...
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVersions} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Timeline */}
        <Card className="flex-1 min-w-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Versions ({versions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full max-h-[calc(100vh-260px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="size-10 opacity-30 mb-3" />
                  <p className="text-sm">No versions yet</p>
                  <p className="text-xs mt-1">Versions are created when you save changes</p>
                </div>
              ) : (
                <div className="px-4 pb-4">
                  {versions.map((version, index) => (
                    <div key={version.id}>
                      <button
                        onClick={() => handleSelectVersion(version)}
                        className={cn(
                          'w-full flex items-start gap-3 rounded-lg p-3 text-left transition-all',
                          'hover:bg-accent/50',
                          selectedVersion?.id === version.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
                            : 'border border-transparent'
                        )}
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center pt-0.5">
                          <div className={cn(
                            'w-3 h-3 rounded-full border-2 shrink-0',
                            index === 0
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'bg-background border-muted-foreground/30'
                          )} />
                          {index < versions.length - 1 && (
                            <div className="w-0.5 h-8 bg-border mt-1" />
                          )}
                        </div>

                        {/* Version info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {version.message || `Version ${versions.length - index}`}
                            </span>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(version.createdAt)}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <HardDrive className="size-3" />
                              {formatSize(version.snapshotSize)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/60 block mt-0.5">
                            {formatFullDate(version.createdAt)}
                          </span>
                        </div>

                        {/* Restore button */}
                        {index !== 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-foreground h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreClick(version);
                            }}
                          >
                            <RotateCcw className="size-3.5 mr-1" />
                            Restore
                          </Button>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {selectedVersion && (
          <Card className="w-[400px] shrink-0 hidden md:flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Snapshot Details</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => handleRestoreClick(selectedVersion)}
                  disabled={versions[0]?.id === selectedVersion.id}
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  Restore
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full max-h-[calc(100vh-280px)]">
                <div className="p-4 space-y-4">
                  {/* Version metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Message</span>
                      <span className="font-medium">{selectedVersion.message || 'No message'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium text-xs">{formatFullDate(selectedVersion.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Size</span>
                      <span className="font-medium">{formatSize(selectedVersion.snapshotSize)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ID</span>
                      <span className="font-mono text-xs">{selectedVersion.id.slice(0, 12)}...</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Snapshot JSON */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileJson className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Snapshot JSON</span>
                    </div>
                    {snapshotLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto border">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(snapshotJson), null, 2);
                          } catch {
                            return snapshotJson || '// No snapshot data';
                          }
                        })()}
                      </pre>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Restore this version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will create a backup of the current workflow state, then restore the version
              from <strong>{restoreVersion ? formatFullDate(restoreVersion.createdAt) : ''}</strong>.
              {restoreVersion?.message && (
                <span className="block mt-1">&quot;{restoreVersion.message}&quot;</span>
              )}
              You can always restore back from the backup version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              disabled={restoring}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {restoring ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="size-4 mr-2" />
                  Restore Version
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
