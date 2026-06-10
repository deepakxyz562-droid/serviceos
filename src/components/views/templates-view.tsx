'use client';
import { authFetch } from '@/lib/client-auth';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Star,
  Users,
  Mail,
  Database,
  FileText,
  Globe,
  Rss,
  HardDrive,
  UserPlus,
  AlertTriangle,
  Share2,
  Brain,
  Receipt,
  MessageSquare,
  Webhook,
  Zap,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Truck,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';

interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  featured: boolean;
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

const iconMap: Record<string, React.ElementType> = {
  Mail, Database, FileText, Webhook, Rss, HardDrive, UserPlus, AlertTriangle,
  Share2, Brain, Receipt, MessageSquare, Globe, Zap,
};

const categoryColors: Record<string, string> = {
  Communication: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  Data: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Productivity: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Monitoring: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  Marketing: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  AI: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  Finance: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

export function TemplatesView() {
  const { setCurrentView, setCurrentWorkflowId } = useAppStore();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [creatingJobFlow, setCreatingJobFlow] = useState(false);
  const [seedingData, setSeedingData] = useState(false);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await authFetch('/api/templates');
        if (!res.ok) throw new Error('Failed to fetch templates');
        const data = await res.json();
        setTemplates(data.templates || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  const filtered = templates.filter((t) => {
    const matchesCategory = category === 'all' || t.category === category;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = async (template: TemplateItem) => {
    try {
      // Create a new workflow from the template
      const res = await authFetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          tags: [template.category],
        }),
      });
      if (!res.ok) throw new Error('Failed to create workflow from template');
      const data = await res.json();
      setCurrentWorkflowId(data.id);
      setCurrentView('canvas');
    } catch {
      // Fallback: just navigate to canvas
      setCurrentView('canvas');
    }
  };

  // ─── Job Assignment Workflow Quick Create ──────────────────────────────
  const handleCreateJobAssignmentFlow = useCallback(async () => {
    setCreatingJobFlow(true);
    try {
      const res = await authFetch('/api/templates/job-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create workflows');
      }
      const data = await res.json();
      toast.success(`${data.workflows?.length || 2} Job Assignment workflows created!`);
      // Navigate to workflows view
      setCurrentView('workflows');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workflows');
    } finally {
      setCreatingJobFlow(false);
    }
  }, [setCurrentView]);

  const handleSeedDemoData = useCallback(async () => {
    setSeedingData(true);
    try {
      const res = await authFetch('/api/seed-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error('Failed to seed demo data');
      const data = await res.json();
      toast.success(data.message || 'Demo data seeded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed data');
    } finally {
      setSeedingData(false);
    }
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Job Assignment Workflow Quick Create Card ──────────────────────── */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-600 shrink-0">
              <Truck className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Job Assignment Workflow</CardTitle>
              <CardDescription className="text-xs mt-1">
                2 connected workflows: New Job → Assign Employee
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Architecture diagram - Two-Step Workflow */}
          <div className="bg-white rounded-lg border p-4 mb-4 space-y-3">
            {/* Message 1 flow */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5 shrink-0">MSG 1</span>
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Webhook className="size-4 text-amber-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">New Job Webhook</span>
                </div>
                <ArrowRight className="size-4 text-gray-300 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <MessageCircle className="size-4 text-emerald-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">WhatsApp Button</span>
                </div>
                <ArrowRight className="size-4 text-gray-300 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Phone className="size-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Admin clicks &quot;Assign Job&quot;</span>
                </div>
              </div>
            </div>
            {/* Connector */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-px h-4 bg-gray-200" />
            </div>
            {/* Message 2 flow */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 rounded px-1.5 py-0.5 shrink-0">MSG 2</span>
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Webhook className="size-4 text-amber-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Callback</span>
                </div>
                <ArrowRight className="size-4 text-gray-300 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Database className="size-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Fetch Employees</span>
                </div>
                <ArrowRight className="size-4 text-gray-300 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <MessageCircle className="size-4 text-emerald-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">WhatsApp List</span>
                </div>
                <ArrowRight className="size-4 text-gray-300 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Phone className="size-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Admin selects</span>
                </div>
                <ArrowRight className="size-4 text-gray-300 shrink-0" />
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-green-600" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Assigned ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {[
              { name: '1. New Job Alert', desc: 'Webhook → Format → WhatsApp Button to Admin', icon: Webhook },
              { name: '2. Assign Employee', desc: 'Callback → Get Employees → WhatsApp List → Update Job', icon: Database },
            ].map((wf) => (
              <div key={wf.name} className="flex items-start gap-2 p-2 rounded-md bg-white border text-xs">
                <wf.icon className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">{wf.name}</p>
                  <p className="text-gray-400 text-[10px]">{wf.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-3" />

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleCreateJobAssignmentFlow}
              disabled={creatingJobFlow}
            >
              {creatingJobFlow ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Zap className="size-3.5" />
              )}
              {creatingJobFlow ? 'Creating...' : 'Create 2 Workflows'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSeedDemoData}
              disabled={seedingData}
            >
              {seedingData ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Database className="size-3.5" />
              )}
              {seedingData ? 'Seeding...' : 'Seed Demo Data'}
            </Button>
            <span className="text-[10px] text-gray-400">Adds 5 employees, 3 customers, 3 jobs</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
              {cat === 'all' ? 'All' : cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={category} className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="size-10 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              : filtered.map((template) => {
                  const Icon = iconMap[template.icon] || Zap;
                  const catColor = categoryColors[template.category] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';

                  return (
                    <Card
                      key={template.id}
                      className="hover:shadow-md transition-shadow group"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center size-10 rounded-xl bg-muted shrink-0">
                            <Icon className="size-5 text-emerald-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5 line-clamp-2">
                              {template.description || 'No description'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`text-xs ${catColor}`}>
                              {template.category}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="size-3 text-amber-400 fill-amber-400" />
                              {template.rating}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleUseTemplate(template)}
                          >
                            Use Template
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          {template.usageCount.toLocaleString()} uses
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <Search className="size-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No templates found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
