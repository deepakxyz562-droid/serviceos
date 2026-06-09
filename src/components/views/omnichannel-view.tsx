'use client';

import { useState } from 'react';
import {
  Radio, MessageSquare, Mail, Phone, Instagram, Facebook,
  Send, Plus, Settings, Wifi, WifiOff, BarChart3, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  type: 'whatsapp' | 'email' | 'sms' | 'instagram' | 'facebook' | 'telegram';
  connected: boolean;
  messages: number;
  responseRate: number;
  avgResponseTime: string;
  lastActivity: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_CHANNELS: Channel[] = [
  { id: 'ch1', name: 'WhatsApp Business', type: 'whatsapp', connected: true, messages: 2450, responseRate: 94, avgResponseTime: '3 min', lastActivity: '2 min ago' },
  { id: 'ch2', name: 'Business Email', type: 'email', connected: true, messages: 1890, responseRate: 87, avgResponseTime: '45 min', lastActivity: '15 min ago' },
  { id: 'ch3', name: 'SMS', type: 'sms', connected: true, messages: 560, responseRate: 78, avgResponseTime: '8 min', lastActivity: '1 hr ago' },
  { id: 'ch4', name: 'Instagram DM', type: 'instagram', connected: false, messages: 0, responseRate: 0, avgResponseTime: '--', lastActivity: 'Never' },
  { id: 'ch5', name: 'Facebook Messenger', type: 'facebook', connected: false, messages: 0, responseRate: 0, avgResponseTime: '--', lastActivity: 'Never' },
  { id: 'ch6', name: 'Telegram', type: 'telegram', connected: false, messages: 0, responseRate: 0, avgResponseTime: '--', lastActivity: 'Never' },
];

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="size-6" />,
  email: <Mail className="size-6" />,
  sms: <Phone className="size-6" />,
  instagram: <Instagram className="size-6" />,
  facebook: <Facebook className="size-6" />,
  telegram: <Send className="size-6" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  email: 'bg-blue-100 text-blue-700 border-blue-200',
  sms: 'bg-purple-100 text-purple-700 border-purple-200',
  instagram: 'bg-pink-100 text-pink-700 border-pink-200',
  facebook: 'bg-blue-100 text-blue-700 border-blue-200',
  telegram: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function OmnichannelView() {
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const handleToggleConnection = (id: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id === id ? { ...ch, connected: !ch.connected } : ch
    ));
    const ch = channels.find(c => c.id === id);
    toast.success(ch?.connected ? `${ch?.name} disconnected` : `${ch?.name} connected`);
  };

  const totalMessages = channels.reduce((s, c) => s + c.messages, 0);
  const connectedCount = channels.filter(c => c.connected).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <Radio className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Omnichannel</h2>
          <p className="text-sm text-muted-foreground">Unified communication foundation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Connected', value: `${connectedCount}/${channels.length}`, color: 'text-emerald-600' },
          { label: 'Total Messages', value: totalMessages.toLocaleString(), color: 'text-blue-600' },
          { label: 'Avg Response Rate', value: `${channels.filter(c => c.connected).length > 0 ? Math.round(channels.filter(c => c.connected).reduce((s, c) => s + c.responseRate, 0) / channels.filter(c => c.connected).length) : 0}%`, color: 'text-purple-600' },
          { label: 'Active Channels', value: channels.filter(c => c.connected).length, color: 'text-orange-600' },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Unified Inbox Concept */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 justify-center flex-wrap">
            {channels.map(ch => (
              <div key={ch.id} className="flex flex-col items-center gap-1">
                <div className={cn('size-12 rounded-full flex items-center justify-center', ch.connected ? CHANNEL_COLORS[ch.type] : 'bg-slate-100 text-slate-400')}>
                  {CHANNEL_ICONS[ch.type]}
                </div>
                <span className="text-[10px]">{ch.type}</span>
              </div>
            ))}
            <ArrowIcon />
            <div className="flex flex-col items-center gap-1">
              <div className="size-12 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Radio className="size-6" />
              </div>
              <span className="text-[10px] font-medium">Unified Inbox</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {channels.map(channel => (
          <Card key={channel.id} className={cn('hover:shadow-md transition-all', !channel.connected && 'opacity-70')}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('size-10 rounded-lg flex items-center justify-center', CHANNEL_COLORS[channel.type])}>
                    {CHANNEL_ICONS[channel.type]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{channel.name}</h4>
                    <Badge variant="outline" className={channel.connected ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-slate-100 text-slate-600 text-[10px]'}>
                      {channel.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                </div>
                <Switch checked={channel.connected} onCheckedChange={() => handleToggleConnection(channel.id)} />
              </div>
              {channel.connected && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div><p className="text-sm font-bold">{channel.messages.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Messages</p></div>
                    <div><p className="text-sm font-bold text-emerald-600">{channel.responseRate}%</p><p className="text-[10px] text-muted-foreground">Response</p></div>
                    <div><p className="text-sm font-bold">{channel.avgResponseTime}</p><p className="text-[10px] text-muted-foreground">Avg Time</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Last activity: {channel.lastActivity}</p>
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => { setSelectedChannel(channel); setShowConfigDialog(true); }}>
                    <Settings className="size-3 mr-1" /> Configure
                  </Button>
                </>
              )}
              {!channel.connected && (
                <Button className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleToggleConnection(channel.id)}>
                  Connect {channel.name}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedChannel?.name} - Configuration</DialogTitle>
          </DialogHeader>
          {selectedChannel && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="bg-emerald-100 text-emerald-700 text-[10px]">Connected</Badge></div>
                <div><span className="text-muted-foreground">Messages:</span> <span className="font-medium">{selectedChannel.messages.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Response Rate:</span> <span className="font-medium">{selectedChannel.responseRate}%</span></div>
                <div><span className="text-muted-foreground">Avg Time:</span> <span className="font-medium">{selectedChannel.avgResponseTime}</span></div>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">Channel configuration options will vary based on the channel type.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-muted-foreground">
      <path d="M6 16h18M20 10l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
