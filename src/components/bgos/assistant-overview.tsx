'use client';
import { useState } from 'react';
import { Bot, Globe, MessageSquare, Phone, Mail, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { FormAgentData, AgentChannelType, ConnectedFormRef } from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from '@/features/forms/components/agent-builder/agent-device-simulator';

type Props = {
  agent: FormAgentData;
  onChange: (updated: FormAgentData | ((prev: FormAgentData) => FormAgentData)) => void;
  onNavigateTab: (tab: 'setup' | 'channels' | 'train' | 'test' | 'analytics') => void;
  onOpenSettings: () => void;
  onOpenForm: (form: ConnectedFormRef) => void;
  businessName: string;
  channelStatus?: Partial<Record<AgentChannelType, 'ACTIVE' | 'Connect'>>;
};
export function BgosAssistantOverview({ agent, onChange, onNavigateTab, onOpenSettings, onOpenForm, businessName, channelStatus = {} }: Props) {
  const [previewPage, setPreviewPage] = useState<'conversation' | 'greeting'>('greeting');
  const config = agent.channels?.chatbot;
  const updateChatbot = (patch: Partial<NonNullable<typeof config>>) => onChange(prev => ({ ...prev, channels: { ...prev.channels, chatbot: { ...prev.channels.chatbot, ...patch } } }));
  const channels = [{ id: 'chatbot', label: 'Website chat', icon: Globe }, { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare }, { id: 'phone', label: 'Phone', icon: Phone }, { id: 'instagram', label: 'Instagram', icon: MessageSquare }, { id: 'gmail', label: 'Email', icon: Mail }] as const;
  return <div className="flex-1 overflow-auto bg-background p-4 lg:p-6"><div className="grid min-w-0 gap-5 xl:grid-cols-[250px_minmax(300px,1fr)_300px]">
    <aside className="space-y-4"><section className="rounded-2xl border bg-card p-5"><Bot className="mb-3 size-7 text-primary" /><h2 className="font-semibold">{agent.name || 'Business assistant'}</h2><p className="mt-2 text-sm text-muted-foreground">{agent.roleTitle || 'Configure your assistant for customer conversations.'}</p><Button className="mt-4" variant="outline" onClick={() => onNavigateTab('setup')}>Assistant setup</Button></section>
    <section className="rounded-2xl border bg-card p-5"><h2 className="mb-3 font-semibold">Channels</h2>{channels.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigateTab('channels')} className="flex w-full items-center gap-3 border-t py-3 text-left text-sm hover:bg-muted"><Icon className="size-4 text-primary" /><span className="flex-1">{label}<small className="block text-muted-foreground">{id === 'chatbot' ? (config?.enabled ? 'Enabled in configuration' : 'Not enabled') : channelStatus[id] === 'ACTIVE' ? 'Connected' : channelStatus[id] === 'Connect' ? 'Not connected' : 'Status unavailable'}</small></span></button>)}</section><Button variant="outline" className="w-full" onClick={() => onNavigateTab('train')}>Manage knowledge</Button></aside>
    <section className="min-w-0 rounded-2xl border bg-card p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Assistant preview</h2><p className="text-xs text-muted-foreground">{businessName} · test conversation</p></div><Button variant="outline" onClick={() => onNavigateTab('test')}>Open Test Lab</Button></div><div className="min-h-[540px] overflow-auto"><AgentDeviceSimulator agent={agent} isTestMode={true} previewPage={previewPage} onSwitchPage={setPreviewPage} onOpenFormInModal={onOpenForm} /></div></section>
    <aside className="space-y-4"><section className="space-y-4 rounded-2xl border bg-card p-5"><h2 className="font-semibold">Chat appearance</h2><p className="text-xs text-muted-foreground">Changes are a draft until you select Save Changes.</p><div className="space-y-2"><Label htmlFor="bgos-agent-name">Assistant name</Label><Input id="bgos-agent-name" value={agent.name} onChange={e => { const name = e.currentTarget.value; onChange(prev => ({ ...prev, name })); }} /></div><div className="space-y-2"><Label htmlFor="bgos-agent-greeting">Welcome message</Label><Textarea id="bgos-agent-greeting" value={agent.welcomeGreeting || ''} onChange={e => { const welcomeGreeting = e.currentTarget.value; onChange(prev => ({ ...prev, welcomeGreeting })); }} /></div><div className="space-y-2"><Label htmlFor="bgos-agent-color">Widget color</Label><Input id="bgos-agent-color" type="color" value={config?.primaryColor || '#007F73'} onChange={e => updateChatbot({ primaryColor: e.target.value })} /></div><div className="flex items-center justify-between gap-3"><Label htmlFor="bgos-agent-enabled">Enable website chat</Label><Switch id="bgos-agent-enabled" checked={!!config?.enabled} onCheckedChange={enabled => updateChatbot({ enabled })} /></div><Button variant="outline" className="w-full" onClick={onOpenSettings}><Settings className="mr-2 size-4" />Advanced settings</Button></section>
    <section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Recorded activity</h2><dl className="mt-3 space-y-3 text-sm"><div className="flex justify-between"><dt>Conversations</dt><dd>{agent.metrics?.totalConversations ?? '—'}</dd></div><div className="flex justify-between"><dt>Form submissions</dt><dd>{agent.metrics?.totalFormSubmissions ?? '—'}</dd></div></dl><Button variant="ghost" className="mt-3" onClick={() => onNavigateTab('analytics')}>View analytics</Button></section></aside>
  </div></div>;
}
