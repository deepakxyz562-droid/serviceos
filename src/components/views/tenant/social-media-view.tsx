'use client';

/**
 * Social Media View — unified tabbed page for all social features.
 *
 * Consolidates 4 previously-separate nav items into one page with tabs:
 *   - Accounts    → SocialAccountsView (connect/manage social accounts)
 *   - Create Post  → PostComposerView (compose + publish)
 *   - Posts        → PostsListView (published posts history)
 *   - Analytics    → SocialAnalyticsView (performance metrics)
 *
 * The individual views are lazy-loaded so only the active tab's code is
 * fetched. This reduces the initial bundle size vs. the old layout where
 * each view was a separate full-page route.
 */

import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Share2, PenSquare, FileText, BarChart3 } from 'lucide-react';

// Lazy-load each social view so only the active tab's code is fetched
const SocialAccountsView = lazy(() =>
  import('@/components/views/tenant/social-accounts-view').then((m) => ({ default: m.SocialAccountsView }))
);
const PostComposerView = lazy(() =>
  import('@/components/views/tenant/post-composer-view').then((m) => ({ default: m.PostComposerView }))
);
const PostsListView = lazy(() =>
  import('@/components/views/tenant/posts-list-view').then((m) => ({ default: m.PostsListView }))
);
const SocialAnalyticsView = lazy(() =>
  import('@/components/views/tenant/social-analytics-view').then((m) => ({ default: m.SocialAnalyticsView }))
);

type SocialTab = 'accounts' | 'create' | 'posts' | 'analytics';

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function SocialMediaView() {
  const [activeTab, setActiveTab] = useState<SocialTab>('accounts');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50">
          <Share2 className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social Media</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect accounts, publish posts, and track engagement — all in one place.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SocialTab)}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="accounts" className="gap-1.5">
            <Share2 className="size-4" /> Accounts
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <PenSquare className="size-4" /> Create Post
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1.5">
            <FileText className="size-4" /> Posts
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="size-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <Suspense fallback={<TabLoader />}>
            <SocialAccountsView />
          </Suspense>
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <Suspense fallback={<TabLoader />}>
            <PostComposerView />
          </Suspense>
        </TabsContent>

        <TabsContent value="posts" className="mt-6">
          <Suspense fallback={<TabLoader />}>
            <PostsListView />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Suspense fallback={<TabLoader />}>
            <SocialAnalyticsView />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
