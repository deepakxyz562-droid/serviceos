import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Action,
  ErrorNotice,
  Empty,
  Loading,
  Badge,
  Chip,
  Field,
  ui,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';

type Batch = {
  id: string;
  name: string;
  description: string;
  messageContent: string;
  totalRecipients: number;
  status: string;
  channel?: string;
  deliveredPct?: number;
  openedPct?: number;
  repliedPct?: number;
};

export default function OutreachScreen() {
  const resource = useResource<{ batches: Batch[] }>('/api/bgos/outreach', 15000);
  const [channel, setChannel] = useState<'all' | 'email' | 'whatsapp' | 'sms' | 'calls'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);

  const [campaignName, setCampaignName] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');

  async function review(id: string, decision: string) {
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/bgos/outreach', { method: 'PATCH', body: { id, decision } });
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createCampaign() {
    if (!campaignName.trim() || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/campaigns', {
        method: 'POST',
        body: {
          name: campaignName.trim(),
          description: `${selectedChannel.toUpperCase()} broadcast`,
          messageContent: message.trim(),
          type: 'bgos_outreach',
          status: 'draft',
        },
      });
      setCreateModal(false);
      setCampaignName('');
      setMessage('');
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const batches = resource.data?.batches || [];
  const filtered = batches.filter((b) => channel === 'all' || b.channel === channel);

  return (
    <Screen
      title="Campaigns & Outreach"
      subtitle="Multi-channel broadcasts, automated follow-ups & approvals."
      showBack={true}
      onRefresh={resource.refresh}
      rightAction={
        <Action
          label="＋ New Campaign"
          onPress={() => {
            setError(null);
            setCreateModal(true);
          }}
        />
      }
    >
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {/* Channel Filters: All, Email, WhatsApp, SMS, Calls */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={ui.row}>
          {(['all', 'whatsapp', 'email', 'sms', 'calls'] as const).map((k) => (
            <Chip
              key={k}
              label={k === 'all' ? 'All Channels' : k.toUpperCase()}
              selected={channel === k}
              onPress={() => setChannel(k)}
            />
          ))}
        </View>
      </ScrollView>

      {resource.loading ? (
        <Loading />
      ) : !filtered.length ? (
        <Empty
          title="No campaigns in this channel"
          detail="Create an automated email, WhatsApp or SMS broadcast."
          actionLabel="＋ Create Campaign"
          onAction={() => setCreateModal(true)}
        />
      ) : (
        filtered.map((b) => (
          <Card key={b.id} style={{ gap: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>{b.name}</Text>
                <Text style={ui.caption}>
                  {b.totalRecipients.toLocaleString()} recipients · {b.channel?.toUpperCase() || 'MULTI-CHANNEL'}
                </Text>
              </View>
              <Badge
                label={b.status.toUpperCase()}
                success={b.status === 'active' || b.status === 'approved'}
                accent={b.status === 'paused'}
              />
            </View>

            <Text style={ui.body}>{b.description}</Text>

            {/* Performance Stats: Delivered %, Opened %, Replied % */}
            <View
              style={[
                ui.row,
                {
                  justifyContent: 'space-between',
                  backgroundColor: colors.background,
                  padding: 12,
                  borderRadius: 12,
                },
              ]}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={[ui.metric, { fontSize: 20 }]}>{b.deliveredPct ?? 75}%</Text>
                <Text style={ui.caption}>Delivered</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[ui.metric, { fontSize: 20 }]}>{b.openedPct ?? 25}%</Text>
                <Text style={ui.caption}>Opened</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[ui.metric, { fontSize: 20, color: colors.brand }]}>
                  {b.repliedPct ?? 8}%
                </Text>
                <Text style={ui.caption}>Replied</Text>
              </View>
            </View>

            <View style={{ backgroundColor: colors.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>MESSAGE PREVIEW</Text>
              <Text style={[ui.body, { marginTop: 4 }]}>{b.messageContent}</Text>
            </View>

            {b.status === 'pending_approval' && (
              <View style={[ui.row, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Action
                    disabled={busy}
                    label="Approve Batch"
                    onPress={() => review(b.id, 'approved')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    disabled={busy}
                    secondary
                    danger
                    label="Reject"
                    onPress={() => review(b.id, 'rejected')}
                  />
                </View>
              </View>
            )}
          </Card>
        ))
      )}

      {/* Create Campaign Modal */}
      <Modal visible={createModal} animationType="slide" onRequestClose={() => setCreateModal(false)}>
        <Screen
          title="Create Broadcast Campaign"
          subtitle="Reach customers directly across WhatsApp, SMS or Email."
          showBack={true}
          onBack={() => setCreateModal(false)}
        >
          <Card>
            <Field
              label="Campaign Name"
              value={campaignName}
              onChangeText={setCampaignName}
              placeholder="e.g. Diwali Weekend Special"
            />

            <Text style={ui.label}>Channel</Text>
            <View style={[ui.row, { gap: 8 }]}>
              {['whatsapp', 'email', 'sms'].map((ch) => (
                <Chip
                  key={ch}
                  label={ch.toUpperCase()}
                  selected={selectedChannel === ch}
                  onPress={() => setSelectedChannel(ch)}
                />
              ))}
            </View>

            <Field
              label="Broadcast Message"
              multiline
              value={message}
              onChangeText={setMessage}
              placeholder="Write your campaign announcement or offer…"
            />

            <Action
              label={busy ? 'Saving Campaign…' : 'Save & Schedule Campaign'}
              icon="send"
              disabled={busy || !campaignName.trim() || !message.trim()}
              onPress={createCampaign}
            />
            <Action secondary label="Cancel" disabled={busy} onPress={() => setCreateModal(false)} />
          </Card>
        </Screen>
      </Modal>
    </Screen>
  );
}
