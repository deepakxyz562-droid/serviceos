'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';
import { useAppStore } from '@/store/app-store';
import {
  FileInput,
  Inbox,
  TrendingUp,
  PhoneCall,
  BookOpen,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FormsDashboardStats {
  totalForms: number;
  totalSubmissions: number;
  conversionRate: number;
  activeForms: number;
  aiAgentStatus: 'none' | 'draft' | 'active' | 'paused';
  kbDocuments: number;
  recentSubmissions: Array<{
    id: string;
    respondent: string | null;
    formName: string;
    source: string;
    createdAt: string;
    hasLead: boolean;
  }>;
}

/**
 * FormsDashboardView — dedicated dashboard for the standalone AI Forms product.
 *
 * Shows Forms-specific KPIs (total forms, submissions, conversion rate),
 * AI agent status, knowledge base status, and recent submissions.
 * This is the landing view for users with workspace.productType='forms'.
 */
export function FormsDashboardView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [stats, setStats] = useState<FormsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/forms/dashboard-stats');
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Forms',
      value: stats?.totalForms ?? 0,
      icon: FileInput,
      color: 'text-emerald-600',
      onClick: () => setCurrentView('formBuilder'),
    },
    {
      label: 'Submissions',
      value: stats?.totalSubmissions ?? 0,
      icon: Inbox,
      color: 'text-blue-600',
      onClick: () => setCurrentView('formSubmissions'),
    },
    {
      label: 'Conversion Rate',
      value: `${(stats?.conversionRate ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-amber-600',
    },
    {
      label: 'Active Forms',
      value: stats?.activeForms ?? 0,
      icon: FileInput,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Forms Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build intelligent forms, train your AI agent, and capture leads — all in one place.
          </p>
        </div>
        <Button onClick={() => setCurrentView('formBuilder')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.label}
            className={cn('cursor-pointer transition-shadow hover:shadow-md', kpi.onClick ? '' : 'cursor-default')}
            onClick={kpi.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={cn('w-4 h-4', kpi.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Agent + Knowledge Status */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              AI Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={
                  stats?.aiAgentStatus === 'active' ? 'default' :
                  stats?.aiAgentStatus === 'draft' ? 'secondary' :
                  stats?.aiAgentStatus === 'paused' ? 'secondary' :
                  'outline'
                }
              >
                {stats?.aiAgentStatus === 'none' ? 'Not configured' :
                 stats?.aiAgentStatus === 'draft' ? 'Draft' :
                 stats?.aiAgentStatus === 'active' ? 'Active' :
                 stats?.aiAgentStatus === 'paused' ? 'Paused' : 'Unknown'}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCurrentView('aiReceptionist')}
            >
              {stats?.aiAgentStatus === 'none' ? 'Set up AI Agent' : 'Manage Agent'}
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Documents indexed</span>
              <span className="text-lg font-semibold">{stats?.kbDocuments ?? 0}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setCurrentView('aiAssistant')}
            >
              Manage Knowledge
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Recent Submissions</span>
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('formSubmissions')}>
              View all
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Inbox className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {sub.respondent || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {sub.formName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sub.hasLead && (
                      <Badge variant="default" className="text-xs">Lead</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{sub.source}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No submissions yet. Create a form and share it to start collecting leads.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
