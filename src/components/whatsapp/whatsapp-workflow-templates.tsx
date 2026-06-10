'use client';
import { authFetch } from '@/lib/client-auth';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, UserCheck, User, Truck, Star, Workflow,
  CalendarCheck, Play, CheckCircle2, Loader2, ArrowRight,
  Zap, Clock, RefreshCw, GitBranch,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// ==========================================
// TYPES
// ==========================================

interface WorkflowTemplateNode {
  type: string;
  name: string;
  subtype: string;
  config: Record<string, unknown>;
}

interface WorkflowTemplateData {
  id: string;
  name: string;
  description: string;
  category: 'employee' | 'customer' | 'full';
  icon: string;
  triggerEvent: string;
  nodeCount: number;
  nodesJson: WorkflowTemplateNode[];
  edgesJson: Array<Record<string, unknown>>;
  installed: boolean;
  installedWorkflowId: string | null;
  installedActive: boolean;
}

// ==========================================
// ICON MAPPING
// ==========================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UserCheck,
  User,
  Truck,
  Star,
  Workflow,
  CalendarCheck,
  MessageCircle,
};

const categoryColors: Record<string, string> = {
  employee: 'bg-amber-100 text-amber-700 border-amber-200',
  customer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  full: 'bg-purple-100 text-purple-700 border-purple-200',
};

const categoryLabels: Record<string, string> = {
  employee: 'Employee',
  customer: 'Customer',
  full: 'Full Lifecycle',
};

// ==========================================
// NODE TYPE ICONS (for the mini flow preview)
// ==========================================

function NodeIcon({ type }: { type: string }) {
  switch (type) {
    case 'trigger':
      return <Zap className="size-3 text-amber-600" />;
    case 'whatsapp':
      return <MessageCircle className="size-3 text-emerald-600" />;
    case 'switch':
      return <GitBranch className="size-3 text-orange-600" />;
    case 'delay':
      return <Clock className="size-3 text-blue-600" />;
    default:
      return <Play className="size-3 text-gray-600" />;
  }
}

// ==========================================
// MINI FLOW PREVIEW
// ==========================================

function MiniFlowPreview({ nodes }: { nodes: WorkflowTemplateNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {nodes.map((node, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/80 border text-xs">
            <NodeIcon type={node.type} />
            <span className="max-w-[80px] truncate">{node.name}</span>
          </div>
          {idx < nodes.length - 1 && (
            <ArrowRight className="size-3 text-muted-foreground shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function WhatsAppWorkflowTemplates() {
  const [templates, setTemplates] = useState<WorkflowTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'employee' | 'customer' | 'full'>('all');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/whatsapp/workflows');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      } else {
        toast.error('Failed to load workflow templates');
      }
    } catch {
      toast.error('Network error loading workflow templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleInstall = async (templateId: string) => {
    setInstallingId(templateId);
    try {
      const res = await authFetch('/api/whatsapp/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Workflow "${data.name}" installed successfully!`, {
          description: 'You can activate it from the Workflows page.',
        });
        // Update the local state to reflect installation
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === templateId
              ? { ...t, installed: true, installedWorkflowId: data.id, installedActive: false }
              : t
          )
        );
      } else if (res.status === 409) {
        toast.info('This workflow is already installed.', {
          description: `Workflow ID: ${data.workflow?.id}`,
        });
        // Mark as installed in local state
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === templateId
              ? { ...t, installed: true, installedWorkflowId: data.workflow?.id || null }
              : t
          )
        );
      } else {
        toast.error(data.error || 'Failed to install workflow');
      }
    } catch {
      toast.error('Network error installing workflow');
    } finally {
      setInstallingId(null);
    }
  };

  const filteredTemplates = filter === 'all'
    ? templates
    : templates.filter((t) => t.category === filter);

  const installedCount = templates.filter((t) => t.installed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Workflow className="size-5 text-emerald-600" />
            Notification Workflows
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-built workflow templates for WhatsApp job notifications. One-click install, then customize.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {templates.length} templates
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            {installedCount} installed
          </Badge>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All Templates' },
          { value: 'employee', label: 'Employee' },
          { value: 'customer', label: 'Customer' },
          { value: 'full', label: 'Full Lifecycle' },
        ].map((cat) => (
          <Button
            key={cat.value}
            variant={filter === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(cat.value as typeof filter)}
            className={filter === cat.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-8 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Workflow className="size-12 mb-3 opacity-30" />
          <p className="text-sm">No workflow templates found for this category</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const IconComponent = iconMap[template.icon] || MessageCircle;
            const isInstalling = installingId === template.id;

            return (
              <Card
                key={template.id}
                className="flex flex-col hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 shrink-0">
                      <IconComponent className="size-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm leading-tight">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${categoryColors[template.category] || ''}`}
                        >
                          {categoryLabels[template.category] || template.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {template.nodeCount} node{template.nodeCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <CardDescription className="text-xs leading-relaxed">
                    {template.description}
                  </CardDescription>

                  {/* Mini Flow Preview */}
                  {template.nodesJson && template.nodesJson.length > 0 && (
                    <MiniFlowPreview nodes={template.nodesJson} />
                  )}

                  {/* Install Button / Status */}
                  <div className="mt-auto">
                    {template.installed ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                          disabled
                        >
                          <CheckCircle2 className="size-3.5 mr-1.5" />
                          Installed
                        </Button>
                        {template.installedActive && (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleInstall(template.id)}
                        disabled={isInstalling}
                      >
                        {isInstalling ? (
                          <>
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                            Installing...
                          </>
                        ) : (
                          <>
                            <Zap className="size-3.5 mr-1.5" />
                            Install Workflow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Banner */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Zap className="size-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">How Notification Workflows Work</p>
              <p>
                Each template creates an automated workflow that triggers on job events (assigned, started, completed)
                and sends WhatsApp notifications to the right people. After installing, you can customize the messages,
                add conditions, and activate the workflow from the Workflows page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
