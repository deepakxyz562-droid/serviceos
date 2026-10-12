'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TeamSettings } from '@/components/settings/sections/team-settings';
import { GoogleBusinessProfileSettings } from '@/components/settings/sections/google-business-profile-settings';
import { BgosBilling } from './billing';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';

export function BgosSettings({ initialTab }: { initialTab?: string } = {}) {
  const pendingSettingsSection = useAppStore((s) => s.pendingSettingsSection);
  const setPendingSettingsSection = useAppStore((s) => s.setPendingSettingsSection);
  const navigate = useAppStore((s) => s.setCurrentView);

  const [tab, setTab] = useState(() => {
    if (initialTab) return initialTab;
    if (pendingSettingsSection === 'subscription' || pendingSettingsSection === 'billing') {
      return 'billing';
    }
    return 'workspace';
  });

  useEffect(() => {
    if (pendingSettingsSection) {
      if (pendingSettingsSection === 'subscription' || pendingSettingsSection === 'billing') {
        setTab('billing');
      } else if (pendingSettingsSection === 'team' || pendingSettingsSection === 'users') {
        setTab('team');
      } else if (pendingSettingsSection === 'google-business-profile' || pendingSettingsSection === 'reputation') {
        setTab('reputation');
      }
      setPendingSettingsSection(null);
    }
  }, [pendingSettingsSection, setPendingSettingsSection]);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="w-full space-y-6 p-4 sm:p-8">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('dashboard')}
          className="gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">Workspace / Settings</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">A workspace that works your way.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your people, connected channels, and subscription billing.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="reputation">Google Business</TabsTrigger>
          <TabsTrigger value="billing">Billing &amp; Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6 shadow-xs">
              <h2 className="font-semibold">Team &amp; Permissions</h2>
              <p className="my-3 text-sm text-muted-foreground">Manage team members, roles and workspace access.</p>
              <Button variant="outline" onClick={() => setTab('team')}>Manage</Button>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-xs">
              <h2 className="font-semibold">Scheduling</h2>
              <p className="my-3 text-sm text-muted-foreground">Meeting types, availability and calendar connections.</p>
              <Button variant="outline" onClick={() => navigate('scheduling')}>Manage</Button>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-xs">
              <h2 className="font-semibold">Connected tools</h2>
              <p className="my-3 text-sm text-muted-foreground">Manage channels and integrations.</p>
              <Button variant="outline" onClick={() => navigate('integrations')}>Manage</Button>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-xs">
              <h2 className="font-semibold">Billing &amp; Subscription</h2>
              <p className="my-3 text-sm text-muted-foreground">Your subscription plan, usage limits and billing cycle.</p>
              <Button variant="outline" onClick={() => setTab('billing')}>Manage</Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="team"><TeamSettings /></TabsContent>
        <TabsContent value="reputation"><GoogleBusinessProfileSettings /></TabsContent>
        <TabsContent value="billing"><BgosBilling /></TabsContent>
      </Tabs>
    </div>
  );
}
