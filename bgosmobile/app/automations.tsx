import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Action, Badge, ErrorNotice, Empty, Loading, ui, colors } from '../src/components/ui';
import { apiRequest } from '../src/lib/api';
import { useResource } from '../src/hooks/use-resource';
import { withProtectedRoute } from '../src/components/navigation/protected-route';

type Workflow = { id: string; name: string; description?: string; active: boolean };
type PlaybookTemplate = {
  id: string;
  name: string;
  description: string;
  category: 'employee' | 'customer' | 'full';
  triggerEvent: string;
  installed: boolean;
  installedWorkflowId: string | null;
  installedActive: boolean;
};

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'New Lead',
  appointment_reminder: 'Quote / Booking',
  customer_inactive_60d: '60d Comeback',
  job_created: 'Booking Created',
  job_status_changed: 'Job Status',
};

function AutomationsScreen() {
  const router = useRouter();
  const workflowsRes = useResource<{ workflows: Workflow[] }>('/api/workflows?limit=100');
  const playbooksRes = useResource<{ templates: PlaybookTemplate[] }>('/api/whatsapp/workflows');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshAll() {
    await Promise.all([workflowsRes.refresh(), playbooksRes.refresh()]);
  }

  async function togglePlaybook(tpl: PlaybookTemplate, nextActive: boolean) {
    setBusyId(tpl.id);
    setError(null);
    try {
      if (!tpl.installed || !tpl.installedWorkflowId) {
        await apiRequest('/api/whatsapp/workflows', {
          method: 'POST',
          body: { templateId: tpl.id, active: nextActive },
        });
      } else {
        await apiRequest(`/api/workflows/${tpl.installedWorkflowId}/activate`, {
          method: nextActive ? 'POST' : 'DELETE',
        });
      }
      await refreshAll();
    } catch (e) {
      setError((e as Error).message || 'Could not update automation playbook');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleWorkflow(item: Workflow, active: boolean) {
    setBusyId(item.id);
    setError(null);
    try {
      await apiRequest(`/api/workflows/${item.id}/activate`, {
        method: active ? 'POST' : 'DELETE',
      });
      await refreshAll();
    } catch (e) {
      setError((e as Error).message || 'Could not toggle workflow');
    } finally {
      setBusyId(null);
    }
  }

  const playbooks = playbooksRes.data?.templates || [];
  const playbookNames = new Set(playbooks.map((t) => t.name));
  const customWorkflows = (workflowsRes.data?.workflows || []).filter((w) => !playbookNames.has(w.name));
  const loading = workflowsRes.loading || playbooksRes.loading;

  return (
    <Screen
      title="Automations & Playbooks"
      subtitle="1-tap WhatsApp follow-ups, booking reminders & comeback flows."
      showBack
      onRefresh={refreshAll}
    >
      <ErrorNotice message={error || workflowsRes.error || playbooksRes.error} retry={refreshAll} />

      {/* Always-available AI Agent Shortcuts */}
      <Card style={{ gap: 10, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
        <Text style={ui.heading}>AI Agent Follow-Up &amp; Repeat Marketing</Text>
        <Text style={ui.caption}>
          Configure quiet-chat auto-nudges (10m / 30m / 2h) or launch Hinglish/English festival &amp; 60-day comeback campaigns directly from mobile.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Action
              compact
              secondary
              label="Quiet-Chat Rules"
              icon="smart-toy"
              onPress={() => router.push('/agents')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Action
              compact
              label="Repeat Campaigns"
              icon="campaign"
              onPress={() => router.push('/whatsapp-campaigns' as any)}
            />
          </View>
        </View>
      </Card>

      {loading && playbooks.length === 0 ? (
        <Loading />
      ) : (
        <>
          <Card style={{ gap: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>1-Tap WhatsApp Playbooks</Text>
              <Badge accent label={`${playbooks.filter((p) => p.installedActive).length} Active`} />
            </View>
            {playbooks.map((tpl) => {
              const isBusy = busyId === tpl.id;
              return (
                <View
                  key={tpl.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                        {tpl.name}
                      </Text>
                      <Badge
                        label={TRIGGER_LABELS[tpl.triggerEvent] || tpl.category}
                        success={tpl.installedActive}
                      />
                    </View>
                    <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>
                      {tpl.description}
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel={`Enable ${tpl.name}`}
                    value={tpl.installedActive}
                    disabled={Boolean(busyId) || isBusy}
                    onValueChange={(next) => void togglePlaybook(tpl, next)}
                    trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
                    thumbColor={tpl.installedActive ? colors.brand : '#94A3B8'}
                  />
                </View>
              );
            })}
          </Card>

          {customWorkflows.length > 0 ? (
            <Card style={{ gap: 10 }}>
              <Text style={ui.heading}>Custom Studio Workflows ({customWorkflows.length})</Text>
              {customWorkflows.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>{item.name}</Text>
                    <Text style={ui.caption}>{item.description || 'Workflow automation'}</Text>
                  </View>
                  <Switch
                    accessibilityLabel={`Enable ${item.name}`}
                    value={item.active}
                    disabled={Boolean(busyId)}
                    onValueChange={(active) => void toggleWorkflow(item, active)}
                    trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
                    thumbColor={item.active ? colors.brand : '#94A3B8'}
                  />
                </View>
              ))}
            </Card>
          ) : !playbooks.length && !workflowsRes.error && !playbooksRes.error ? (
            <Empty
              title="No workflows available yet"
              detail="Refresh or configure a WhatsApp playbook above."
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

export default withProtectedRoute(AutomationsScreen);
