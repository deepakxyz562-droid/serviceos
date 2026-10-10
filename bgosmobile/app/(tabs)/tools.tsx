import React, { useState } from 'react';
import { Alert, Image, Linking, Share, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Action,
  ErrorNotice,
  Loading,
  ui,
  colors,
  Avatar,
  MenuRow,
  MeterBar,
  Badge,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import { useAuthStore } from '../../src/stores/auth-store';
import { enablePush } from '../../src/lib/push';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';

export default function ToolsScreen() {
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const router = useRouter();
  const { logout, deleteAccount, user } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function update(body: object) {
    await apiRequest('/api/bgos/workspace', { method: 'PATCH', body });
    await workspace.refresh();
  }

  function absolute(path: string) {
    return path.startsWith('https://') ? path : `${WEB_URL}${path}`;
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all associated workspace data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await deleteAccount();
              router.replace('/login');
            }),
        },
      ]
    );
  }

  const data = workspace.data;

  return (
    <Screen
      title="More & Settings"
      subtitle="Business hub, plans, team & integrations."
      showBack={true}
      onRefresh={workspace.refresh}
    >
      <ErrorNotice message={error || workspace.error} retry={workspace.refresh} />

      {notice ? (
        <Card style={{ backgroundColor: colors.successSoft }}>
          <Text style={{ color: colors.success, fontWeight: '700' }}>✓ {notice}</Text>
        </Card>
      ) : null}

      {/* User & Workspace Profile Header Card */}
      <Card style={{ padding: 18, backgroundColor: colors.surface }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 14 }]}>
            <Avatar name={user?.name || workspace.data?.name || 'My Account'} size={52} />
            <View>
              <Text style={[ui.heading, { fontSize: 18 }]}>{user?.name || 'Account Owner'}</Text>
              <Text style={ui.body}>{workspace.data?.name || 'Your Business'}</Text>
              <Text style={ui.caption}>{user?.email || 'Registered Business Profile'}</Text>
            </View>
          </View>
          <Badge label={data?.plan.code || 'All-in-One Pro'} accent />
        </View>
      </Card>

      {/* MY PLAN & USAGE METERS (Screen 24 in mockups) */}
      <Card style={{ gap: 14 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={ui.heading}>My Plan & Usage</Text>
            <Text style={ui.caption}>All-in-One Pro · ₹1,499/month</Text>
          </View>
          <Badge label="Active" success />
        </View>

        <MeterBar label="Outgoing Phone Minutes" current={82} max={120} unit="min" />
        <MeterBar label="WhatsApp Outreach Credits" current={1245} max={5000} unit="credits" />
        <MeterBar label="AI Agent Minutes" current={312} max={1000} unit="min" />

        <View style={[ui.row, { gap: 10, marginTop: 4 }]}>
          <View style={{ flex: 1 }}>
            <Action
              secondary
              label="Manage Plan"
              icon="credit-card"
              onPress={() => run(() => Linking.openURL(`${WEB_URL}/app?view=billing`))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Action
              secondary
              label="Billing History"
              icon="receipt"
              onPress={() => run(() => Linking.openURL(`${WEB_URL}/app?view=billing`))}
            />
          </View>
        </View>
      </Card>

      {/* TEAM & AGENTS ROSTER (Screen 7 in mockups) */}
      <Card style={{ gap: 12 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>Team & AI Chatbots</Text>
          <Badge label="5 Active" accent />
        </View>

        {[
          { name: user?.name || 'Account Owner', email: user?.email || 'owner@bgos.com', badge: 'Owner', success: true },
          { name: 'AI Receptionist', email: 'Auto-pilot phone & chat', badge: 'AI Agent', accent: true },
          { name: 'Instagram Assistant', email: 'Story & DM automation', badge: 'Chatbot' },
          { name: 'WhatsApp Catalog Bot', email: 'Brochures & order inquiry', badge: 'Chatbot' },
          { name: 'Twilio SMS Dispatcher', email: 'SMS notifications', badge: 'Chatbot' },
        ].map((m, i) => (
          <View
            key={i}
            style={[
              ui.row,
              {
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: i === 4 ? 0 : 1,
                borderBottomColor: colors.line,
              },
            ]}
          >
            <View style={[ui.row, { gap: 10, flex: 1 }]}>
              <Avatar name={m.name} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>{m.name}</Text>
                <Text style={ui.caption}>{m.email}</Text>
              </View>
            </View>
            <Badge label={m.badge} success={m.success} accent={m.accent} />
          </View>
        ))}
      </Card>

      {/* OPERATIONAL NAVIGATION HUB (Side Menu Screen 7 in mockups) */}
      <Card>
        <Text style={ui.heading}>Core Operations</Text>
        <MenuRow title="Unified Inbox & Chat" detail="WhatsApp, Instagram & visitor radar" icon="chat" onPress={() => router.push('/(tabs)/inbox')} />
        <MenuRow title="Business Phone & Keypad" detail="Dialpad, call logs & transcription" icon="phone" onPress={() => router.push('/(tabs)/phone')} />
        <MenuRow title="Leads & CRM Pipeline" detail="24 qualified inquiries & follow-ups" icon="people-outline" onPress={() => router.push('/(tabs)/leads')} />
        <MenuRow title="Appointments Calendar" detail="Review agenda & book time slots" icon="event" onPress={() => router.push('/(tabs)/appointments')} />
        <MenuRow title="Marketing Studio" detail="AI caption generator & post calendar" icon="auto-awesome" onPress={() => router.push('/(tabs)/marketing')} />
        <MenuRow title="Campaigns & Outreach" detail="WhatsApp & SMS broadcast sequences" icon="send" onPress={() => router.push('/(tabs)/outreach')} />
        <MenuRow title="Google Business & Reviews" detail="4.1 ★ rating & WhatsApp review requests" icon="star-outline" onPress={() => router.push('/(tabs)/growth')} />
        <MenuRow title="AI Assistant Studio" detail="Test lab sandbox & knowledge training" icon="smart-toy" onPress={() => router.push('/(tabs)/agents')} />
        <MenuRow title="Form Inquiries & Surveys" detail="Intake forms & customer submissions" icon="description" onPress={() => router.push('/(tabs)/submissions')} />
        <MenuRow title="Channel Integrations" detail="Connected social and messaging accounts" icon="link" onPress={() => router.push('/(tabs)/integrations')} />
        <MenuRow title="Automated Workflows" detail="Instant trigger actions & follow-ups" icon="alt-route" onPress={() => router.push('/(tabs)/automations')} />
      </Card>

      {/* DIGITAL IDENTITY & SCANNABLE QR */}
      {data && (
        <Card style={{ gap: 12 }}>
          <Text style={ui.heading}>Digital Identity & QR</Text>
          {([['profile', 'Digital Business Card'], ['booking', 'Online Booking Page'], ['form', 'Customer Intake Form']] as const).map(
            ([key, label]) => (
              <View key={key} style={{ gap: 6 }}>
                <Text style={ui.label}>{label}</Text>
                <Text style={ui.caption}>
                  {data.links[key] ? absolute(data.links[key]!) : 'Configure in BGOS web to activate link.'}
                </Text>
                {data.links[key] && (
                  <Action
                    secondary
                    disabled={busy}
                    label={`Share ${label}`}
                    icon="share"
                    onPress={() => run(() => Share.share({ message: absolute(data.links[key]!), url: absolute(data.links[key]!) }))}
                  />
                )}
              </View>
            )
          )}

          <Action
            disabled={busy || !data.links.profile}
            label="Show Scannable QR Code"
            icon="qr-code"
            onPress={() =>
              run(async () => {
                const result = await apiRequest<{ image: string }>('/api/bgos/qr');
                setQr(result.image);
              })
            }
          />
          {qr && (
            <Image
              accessibilityLabel="QR code for your business"
              source={{ uri: qr }}
              style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
            />
          )}
        </Card>
      )}

      {/* WORKSPACE PREFERENCES */}
      {data && (
        <Card style={{ gap: 12 }}>
          <Text style={ui.heading}>Preferences & Notifications</Text>

          {([['profileAssistant', 'AI Assistant on Digital Card'], ['offlineReply', 'Instant Offline Auto-reply']] as const).map(
            ([key, label]) => (
              <View key={key} style={[ui.row, { justifyContent: 'space-between' }]}>
                <Text style={[ui.body, { flex: 1, color: colors.ink }]}>{label}</Text>
                <Switch
                  accessibilityLabel={label}
                  disabled={busy}
                  value={data.automations[key]}
                  onValueChange={(val) => run(() => update({ [key]: val }))}
                  trackColor={{ true: colors.brand }}
                />
              </View>
            )
          )}

          <Action
            secondary
            disabled={busy}
            label="Enable Push Notifications"
            icon="notifications"
            onPress={() =>
              run(async () => {
                await enablePush();
                setNotice('Push notifications enabled for this device.');
              })
            }
          />

          <Action
            secondary
            disabled={busy}
            label={data.mode === 'local' ? 'Workspace: Local Business (Switch to Agency)' : 'Workspace: Agency (Switch to Local)'}
            onPress={() => run(() => update({ mode: data.mode === 'local' ? 'agency' : 'local' }))}
          />
        </Card>
      )}

      {/* ACCOUNT & SIGNOUT */}
      <Card style={{ gap: 10 }}>
        <Action
          secondary
          disabled={busy}
          label="Sign Out of BGOS"
          icon="logout"
          onPress={() =>
            run(async () => {
              await logout();
              router.replace('/login');
            })
          }
        />
        <Action
          danger
          disabled={busy}
          label="Delete Account & Workspace"
          icon="delete-forever"
          onPress={confirmDeleteAccount}
        />
      </Card>
    </Screen>
  );
}
