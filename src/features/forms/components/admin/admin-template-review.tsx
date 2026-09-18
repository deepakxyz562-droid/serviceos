'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Admin Template Review Queue — review community template submissions.
 *
 * Lists all templates with status='submitted' (or any status via filter).
 * Admin can approve (→published), reject (→rejected), or mark under review.
 *
 * This is the content-moderation gate for Release 5's community flywheel.
 * Only admins should reach this view (auth check TODO).
 */

interface AdminTemplate {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  status: string;
  source: string;
  isPublic: boolean;
  usageCount: number;
  ratingAverage: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  published: 'bg-emerald-600 text-white',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  archived: 'bg-muted text-muted-foreground',
};

export function AdminTemplateReview() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('submitted');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/templates?status=${filter}&limit=100`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const updateStatus = async (templateId: string, status: 'published' | 'rejected' | 'under_review') => {
    try {
      await fetch('/api/admin/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, status }),
      });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Template Review Queue</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review community-submitted templates before publishing.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
          <RefreshCw className="size-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['submitted', 'under_review', 'approved', 'published', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              filter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No templates with status &ldquo;{filter}&rdquo;.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-3 pr-4">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground truncate">{t.name}</h3>
                        <Badge className={`text-[9px] ${STATUS_COLORS[t.status] || ''}`}>
                          {t.status}
                        </Badge>
                        {t.source === 'community' && (
                          <Badge variant="outline" className="text-[9px]">community</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {t.shortDescription || 'No description'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Submitted {new Date(t.createdAt).toLocaleDateString()} ·
                        {' '}{t.usageCount} uses ·
                        {' '}{t.ratingAverage > 0 ? `${t.ratingAverage.toFixed(1)}★` : 'no rating'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {t.status === 'submitted' && (
                        <>
                          <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(t.id, 'published')}>
                            <Check className="size-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, 'under_review')}>
                            <Eye className="size-3 mr-1" /> Review
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 hover:bg-red-50" onClick={() => updateStatus(t.id, 'rejected')}>
                            <X className="size-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {t.status === 'under_review' && (
                        <>
                          <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(t.id, 'published')}>
                            <Check className="size-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 hover:bg-red-50" onClick={() => updateStatus(t.id, 'rejected')}>
                            <X className="size-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
