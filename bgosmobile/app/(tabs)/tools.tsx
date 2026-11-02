import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Action,
  ErrorNotice,
  ui,
  colors,
  Avatar,
  MenuRow,
  Badge,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import { getBgosWebUrl } from '../../src/lib/bgos-urls';
import { useAuthStore } from '../../src/stores/auth-store';
import { enablePush } from '../../src/lib/push';
import type { BgosWorkspace } from '../../src/types/bgos-contracts';

export default function ToolsScreen() {
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const router = useRouter();
  const { logout, deleteAccount, user } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  // Booking Page & Services Editor State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [servicesList, setServicesList] = useState<
    Array<{ id: string; name: string; duration: number; basePrice: number; isActive: boolean }>
  >([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const [savingService, setSavingService] = useState(false);

  async function openBookingManager() {
    setBookingModalOpen(true);
    setLoadingServices(true);
    try {
      const res = await apiRequest<{ services: any[] }>('/api/services?limit=50');
      setServicesList(res?.services || []);
    } catch {
      setServicesList([]);
    } finally {
      setLoadingServices(false);
    }
  }

  async function handleCreateService() {
    if (!newServiceName.trim()) {
      Alert.alert('Required', 'Please enter a service name.');
      return;
    }
    setSavingService(true);
    try {
      await apiRequest('/api/services', {
        method: 'POST',
        body: {
          name: newServiceName.trim(),
          basePrice: parseFloat(newServicePrice) || 0,
          duration: parseInt(newServiceDuration, 10) || 60,
          isActive: true,
        },
      });
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDuration('60');
      const res = await apiRequest<{ services: any[] }>('/api/services?limit=50');
      setServicesList(res?.services || []);
      Alert.alert('Service Added', 'Your new service is now live on your online booking page!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save service');
    } finally {
      setSavingService(false);
    }
  }

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
    if (path.startsWith('https://')) return path;
    if (path.startsWith('/app')) {
      const match = path.match(/[?&]view=([^&]+)/);
      return getBgosWebUrl(match ? match[1] : undefined);
    }
    return `${WEB_URL}${path}`;
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account & Workspace',
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
  const planCode = data?.plan.code ? data.plan.code.toUpperCase() : 'STARTER';
  const isTrial = data?.plan.status === 'trial';
  const isActive = data?.plan.status === 'active';

  return (
    <Screen
      title="Settings & Hub"
      subtitle="My plan, social accounts, growth tools, privacy & settings."
      onRefresh={workspace.refresh}
    >
      <ErrorNotice message={error || workspace.error} retry={workspace.refresh} />

      {notice ? (
        <Card style={{ backgroundColor: colors.successSoft }}>
          <Text style={{ color: colors.success, fontWeight: '700' }}>✓ {notice}</Text>
        </Card>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          1. MY PLAN & BILLING
          ───────────────────────────────────────────────────────────── */}
      <Card style={{ gap: 14 }}>
        <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View style={{ gap: 2 }}>
            <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
              <MaterialIcons name="credit-card" size={20} color={colors.brand} />
              <Text style={ui.heading}>My Plan</Text>
            </View>
            <Text style={ui.caption}>
              {isTrial ? '7-Day Free Trial' : isActive ? `${planCode} Plan Active` : 'Subscriptions & Billing'}
            </Text>
          </View>
          <Badge label={planCode} accent />
        </View>

        {isTrial && (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: '#FDE68A',
              gap: 4,
            }}
          >
            <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
              <MaterialIcons name="verified" size={16} color="#D97706" />
              <Text style={{ color: '#92400E', fontWeight: '800', fontSize: 13 }}>
                7 Days Free Trial Active
              </Text>
            </View>
            <Text style={{ color: '#B45309', fontSize: 11, lineHeight: 16 }}>
              All Growth Employee AI automations, Google Business synchronization & WhatsApp review requests are unlocked.
            </Text>
          </View>
        )}

        <View style={[ui.row, { gap: 8 }]}>
          <View style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.background }}>
            <Text style={ui.caption}>Contacts</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
              {data?.usage?.contacts ?? 0}
            </Text>
          </View>
          <View style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.background }}>
            <Text style={ui.caption}>Active Forms</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
              {data?.usage?.forms ?? 0}
            </Text>
          </View>
          <View style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.background }}>
            <Text style={ui.caption}>Lead Credits</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
              {data?.usage?.usedLeadCredits ?? 0}/{data?.usage?.leadCreditLimit ?? 100}
            </Text>
          </View>
        </View>

        <View style={[ui.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}>
            <Action
              label="Upgrade Plan (₹)"
              icon="stars"
              onPress={() => router.push('/my-plan')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Action
              secondary
              label="Web Billing"
              icon="receipt"
              onPress={() => run(() => Linking.openURL(getBgosWebUrl('billing')))}
            />
          </View>
        </View>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          2. SOCIAL ACCOUNTS & CHANNELS
          ───────────────────────────────────────────────────────────── */}
      <Card style={{ gap: 12 }}>
        <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
            <MaterialIcons name="share" size={20} color={colors.brand} />
            <Text style={ui.heading}>Social Accounts</Text>
          </View>
          <Badge label="Connected Channels" />
        </View>

        <View style={{ gap: 8 }}>
          <View
            style={[
              ui.row,
              {
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.background,
                justifyContent: 'space-between',
              },
            ]}
          >
            <View style={[ui.row, { gap: 8, alignItems: 'center' }]}>
              <MaterialIcons name="storefront" size={20} color="#4285F4" />
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                  Google Business Profile
                </Text>
                <Text style={{ fontSize: 10, color: colors.muted }}>
                  100% Safe · Reviews, Posts & Photos
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>Active</Text>
          </View>

          <View
            style={[
              ui.row,
              {
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.background,
                justifyContent: 'space-between',
              },
            ]}
          >
            <View style={[ui.row, { gap: 8, alignItems: 'center' }]}>
              <MaterialIcons name="chat" size={20} color="#25D366" />
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                  Meta WhatsApp Cloud API
                </Text>
                <Text style={{ fontSize: 10, color: colors.muted }}>
                  Review requests & lead follow-up
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>Enabled</Text>
          </View>

          <View
            style={[
              ui.row,
              {
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.background,
                justifyContent: 'space-between',
              },
            ]}
          >
            <View style={[ui.row, { gap: 8, alignItems: 'center' }]}>
              <MaterialIcons name="public" size={20} color="#1877F2" />
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                  Facebook & Instagram
                </Text>
                <Text style={{ fontSize: 10, color: colors.muted }}>
                  Cross-post promotional campaigns
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>Available</Text>
          </View>
        </View>

        <Action
          secondary
          label="Manage Integrations & Channels"
          icon="link"
          onPress={() => router.push('/(tabs)/integrations')}
        />
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          3. TOOLS & OPERATIONS
          ───────────────────────────────────────────────────────────── */}
      <Card>
        <View style={[ui.row, { gap: 6, alignItems: 'center', marginBottom: 6 }]}>
          <MaterialIcons name="build" size={20} color={colors.brand} />
          <Text style={ui.heading}>Tools</Text>
        </View>
        <MenuRow
          title="Brand Brain (AI Preferences)"
          detail="Products, branding, founder bio & AI guardrails"
          icon="psychology"
          onPress={() => router.push('/preferences')}
        />
        <MenuRow
          title="1-Tap WhatsApp Reviews"
          detail="Send personalized 5★ Google review invites to customer chats"
          icon="chat"
          onPress={() => router.push('/(tabs)/reviews')}
        />
        <MenuRow
          title="Manage Google Profile"
          detail="Contact & Address, AI & Automation, Post on Google"
          icon="storefront"
          onPress={() => router.push('/manage-profile')}
        />
        <MenuRow
          title="QR Standee Studio"
          detail="Printable countertop review cards with verified Google rating"
          icon="qr-code-2"
          onPress={() => router.push('/qr-standee')}
        />
        <MenuRow
          title="Keyword Planner"
          detail="Local SEO ranking discovery for your city"
          icon="travel-explore"
          onPress={() => router.push('/keyword-planner')}
        />
        <MenuRow
          title="4-Tier Growth Report"
          detail="Interactions → Enquiries → Qualified Leads → Revenue"
          icon="insights"
          onPress={() => router.push('/growth-report')}
        />
        <MenuRow
          title="Review Reply Settings"
          detail="Salutations, response length & auto-replies"
          icon="reviews"
          onPress={() => router.push('/reply-settings')}
        />
        <MenuRow
          title="Unified Inbox & Chat"
          detail="WhatsApp, Instagram & visitor radar"
          icon="chat"
          onPress={() => router.push('/(tabs)/inbox')}
        />
        <MenuRow
          title="Business Phone & Keypad"
          detail="Dialpad, call logs & transcription"
          icon="phone"
          onPress={() => router.push('/(tabs)/phone')}
        />
        <MenuRow
          title="Leads & CRM Pipeline"
          detail="Manage leads, statuses & follow-ups"
          icon="people-outline"
          onPress={() => router.push('/(tabs)/leads')}
        />
      </Card>

      {/* Digital Identity & Scannable QR */}
      {data && (
        <Card style={{ gap: 12 }}>
          <Text style={ui.heading}>Digital Identity & Scannable QR</Text>
          {([['profile', 'Digital Business Card'], ['booking', 'Online Booking Page'], ['form', 'Customer Intake Form']] as const).map(
            ([key, label]) => (
              <View key={key} style={{ gap: 6 }}>
                <Text style={ui.label}>{label}</Text>
                <Text style={ui.caption}>
                  {data.links[key] ? absolute(data.links[key]!) : 'Configure in BGOS web to activate link.'}
                </Text>
                {data.links[key] && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Action
                        secondary
                        disabled={busy}
                        label={`Share ${label}`}
                        icon="share"
                        onPress={() => run(() => Share.share({ message: absolute(data.links[key]!), url: absolute(data.links[key]!) }))}
                      />
                    </View>
                    <Action
                      secondary
                      disabled={busy}
                      label="Open"
                      icon="open-in-new"
                      onPress={() => void Linking.openURL(absolute(data.links[key]!))}
                    />
                    {key === 'booking' && (
                      <Action
                        disabled={busy}
                        label="Modify"
                        icon="tune"
                        onPress={() => void openBookingManager()}
                      />
                    )}
                  </View>
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
              alt="QR code for your business"
              source={{ uri: qr }}
              style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
            />
          )}
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. ACCOUNT & WORKSPACE
          ───────────────────────────────────────────────────────────── */}
      <Card style={{ gap: 12 }}>
        <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
          <MaterialIcons name="person" size={20} color={colors.brand} />
          <Text style={ui.heading}>Account</Text>
        </View>

        <View style={[ui.row, { gap: 14, alignItems: 'center' }]}>
          <Avatar name={user?.name || workspace.data?.name || 'My Account'} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={[ui.heading, { fontSize: 16 }]}>{user?.name || 'Account Owner'}</Text>
            <Text style={ui.body}>{workspace.data?.name || 'Your Business'}</Text>
            <Text style={ui.caption}>{user?.email || 'Registered Business Profile'}</Text>
          </View>
        </View>

        {data && (
          <View style={{ gap: 10, marginTop: 4 }}>
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
          </View>
        )}

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
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          5. PRIVACY & DATA SECURITY
          ───────────────────────────────────────────────────────────── */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
          <MaterialIcons name="shield" size={20} color={colors.brand} />
          <Text style={ui.heading}>Privacy & Security</Text>
        </View>

        <View style={{ gap: 6, backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
          <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
            <MaterialIcons name="lock" size={16} color={colors.brand} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
              100% Safe & Secure
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }}>
            • BGOS connects to Google Business Profile only for reviews, posts, and profile management.
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }}>
            • It cannot read your personal Gmail inbox or private emails.
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }}>
            • Your customer contacts, leads, and review responses remain 100% isolated to your workspace.
          </Text>
        </View>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          6. LEGAL & COMPLIANCE
          ───────────────────────────────────────────────────────────── */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
          <MaterialIcons name="policy" size={20} color={colors.brand} />
          <Text style={ui.heading}>Legal</Text>
        </View>

        <MenuRow
          title="Terms of Service"
          detail="Merchant terms, usage boundaries & subscription policies"
          icon="description"
          onPress={() => run(() => Linking.openURL(absolute('/terms-of-service')))}
        />
        <MenuRow
          title="Privacy Policy"
          detail="Google API Limited Use & data handling disclosures"
          icon="verified-user"
          onPress={() => run(() => Linking.openURL(absolute('/privacy-policy')))}
        />
        <MenuRow
          title="Data Deletion Request"
          detail="Permanently remove third-party integration tokens"
          icon="security"
          onPress={() => run(() => Linking.openURL(absolute('/data-deletion')))}
        />

        <View style={{ marginTop: 8 }}>
          <Action
            danger
            disabled={busy}
            label="Delete Account & Workspace"
            icon="delete-forever"
            onPress={confirmDeleteAccount}
          />
        </View>
      </Card>

      {/* ── Booking Page & Services Editor Sheet ── */}
      <Modal
        visible={bookingModalOpen}
        animationType="slide"
        onRequestClose={() => setBookingModalOpen(false)}
      >
        <Screen
          title="Booking Page & Services"
          subtitle="Manage your public booking URL and service menu"
          showBack={true}
          onBack={() => setBookingModalOpen(false)}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}
          >
            {/* Live URL Preview Card */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="link" size={20} color="#009F50" />
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                  Live Booking Page Link
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB' }}>
                  {data?.links.booking ? absolute(data.links.booking) : 'Resolving booking link...'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => {
                    if (data?.links.booking) {
                      void Linking.openURL(absolute(data.links.booking));
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#0F172A',
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    Open in Browser
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (data?.links.booking) {
                      void Share.share({
                        message: `Book services directly online: ${absolute(data.links.booking)}`,
                        url: absolute(data.links.booking),
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#EFF6FF',
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <MaterialIcons name="share" size={16} color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '700' }}>
                    Share Link
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* Current Active Services */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="miscellaneous-services" size={18} color="#009F50" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                    Services on Booking Page
                  </Text>
                </View>
                <Badge label={`${servicesList.length} Active`} accent />
              </View>

              {loadingServices ? (
                <ActivityIndicator size="small" color="#009F50" style={{ paddingVertical: 16 }} />
              ) : servicesList.length === 0 ? (
                <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', paddingVertical: 8 }}>
                  No custom services added yet. Default consultation & service calls are shown.
                </Text>
              ) : (
                servicesList.map((svc) => (
                  <View
                    key={svc.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                        {svc.name}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                        ⏱ {svc.duration || 60} mins
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669' }}>
                      {svc.basePrice > 0 ? `₹${svc.basePrice}` : 'Free'}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            {/* Add New Service Form */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="add-circle-outline" size={18} color="#009F50" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  Add Service to Booking Page
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Service Name *
                </Text>
                <TextInput
                  placeholder="e.g. Full Diagnostic Inspection"
                  value={newServiceName}
                  onChangeText={setNewServiceName}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Duration (Minutes)
                  </Text>
                  <TextInput
                    placeholder="60"
                    keyboardType="number-pad"
                    value={newServiceDuration}
                    onChangeText={setNewServiceDuration}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Price (₹ or $)
                  </Text>
                  <TextInput
                    placeholder="499"
                    keyboardType="number-pad"
                    value={newServicePrice}
                    onChangeText={setNewServicePrice}
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>
              </View>

              <Pressable
                disabled={savingService}
                onPress={() => void handleCreateService()}
                style={({ pressed }) => ({
                  backgroundColor: '#009F50',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  marginTop: 6,
                  opacity: savingService ? 0.7 : pressed ? 0.9 : 1,
                })}
              >
                {savingService ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      Add to Booking Menu
                    </Text>
                  </>
                )}
              </Pressable>
            </Card>

            <Pressable
              onPress={() => setBookingModalOpen(false)}
              style={({ pressed }) => ({
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F1F5F9',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>
                Done
              </Text>
            </Pressable>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}
