'use client';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TeamSettings } from '@/components/settings/sections/team-settings';
import { GoogleBusinessProfileSettings } from '@/components/settings/sections/google-business-profile-settings';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
export function BgosSettings() {
  const [tab,setTab] = useState('workspace');
  const navigate = useAppStore(s => s.setCurrentView);
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8"><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace / Settings</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">A workspace that works your way.</h1><p className="mt-2 text-sm text-muted-foreground">Manage your people, public identity and connected channels.</p></header><Tabs value={tab} onValueChange={setTab}><TabsList className="mb-6"><TabsTrigger value="workspace">Workspace</TabsTrigger><TabsTrigger value="team">Team</TabsTrigger><TabsTrigger value="reputation">Google Business</TabsTrigger></TabsList><TabsContent value="workspace"><div className="grid gap-4 sm:grid-cols-2">{([{ title: 'Business identity', detail: 'Your public profile, appearance and digital card.', view: 'creatorProfile' },{ title: 'Scheduling', detail: 'Meeting types, availability and calendar connections.', view: 'scheduling' },{ title: 'Connected tools', detail: 'Manage channels and integrations.', view: 'integrations' },{ title: 'Plan & usage', detail: 'Your subscription and included growth tools.', view: 'billing' }] as const).map(item => <div key={item.view} className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">{item.title}</h2><p className="my-3 text-sm text-muted-foreground">{item.detail}</p><Button variant="outline" onClick={() => navigate(item.view)}>Manage</Button></div>)}</div></TabsContent><TabsContent value="team"><TeamSettings /></TabsContent><TabsContent value="reputation"><GoogleBusinessProfileSettings /></TabsContent></Tabs></div>;
}
