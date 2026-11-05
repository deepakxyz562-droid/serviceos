import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar as RNStatusBar,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ open?: string }>();
  const modalTopInset = Platform.OS === 'ios'
    ? Math.max(insets.top, 54)
    : Math.max(insets.top, (RNStatusBar.currentHeight || 24) + 10);
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
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const [savingService, setSavingService] = useState(false);

  // Booking Page Branding & SEO Customization State
  const [brandingFields, setBrandingFields] = useState({
    businessName: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    headline: '',
    seoDescription: '',
    onlineBookingEnabled: true,
  });
  const [savingBranding, setSavingBranding] = useState(false);

  async function openBookingManager() {
    setBookingModalOpen(true);
    setLoadingServices(true);
    if (workspace.data) {
      const cfg = workspace.data.bookingPageConfig || {};
      setBrandingFields({
        businessName: cfg.businessName || workspace.data.name || '',
        phone: cfg.phone || '',
        whatsapp: cfg.whatsapp || '',
        email: cfg.email || '',
        website: cfg.website || '',
        headline: cfg.headline || '',
        seoDescription: cfg.seoDescription || '',
        onlineBookingEnabled: cfg.onlineBookingEnabled ?? true,
      });
    }
    try {
      const res = await apiRequest<{ services: any[] }>('/api/services?limit=50');
      setServicesList(res?.services || []);
    } catch {
      setServicesList([]);
    } finally {
      setLoadingServices(false);
    }
  }

  React.useEffect(() => {
    if (params.open === 'booking') {
      void openBookingManager();
    }
  }, [params.open]);

  async function handleSaveAllBranding() {
    setSavingBranding(true);
    try {
      await apiRequest('/api/bgos/workspace', {
        method: 'PATCH',
        body: {
          bookingPageConfig: brandingFields,
        },
      });
      await workspace.refresh();
      Alert.alert('Saved', 'Your public booking page & SEO details have been updated!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save booking page details');
    } finally {
      setSavingBranding(false);
    }
  }

  function startEditService(svc: any) {
    setEditingServiceId(svc.id);
    setNewServiceName(svc.name || '');
    setNewServicePrice(String(svc.basePrice || 0));
    setNewServiceDuration(String(svc.duration || 60));
  }

  function cancelEditService() {
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('60');
  }

  async function handleSaveService() {
    if (!newServiceName.trim()) {
      Alert.alert('Required', 'Please enter a service name.');
      return;
    }
    setSavingService(true);
    try {
      if (editingServiceId) {
        await apiRequest(`/api/services/${editingServiceId}`, {
          method: 'PUT',
          body: {
            name: newServiceName.trim(),
            basePrice: parseFloat(newServicePrice) || 0,
            duration: parseInt(newServiceDuration, 10) || 60,
          },
        });
        cancelEditService();
        Alert.alert('Service Updated', 'Changes are now live on your booking page!');
      } else {
        await apiRequest('/api/services', {
          method: 'POST',
          body: {
            name: newServiceName.trim(),
            basePrice: parseFloat(newServicePrice) || 0,
            duration: parseInt(newServiceDuration, 10) || 60,
            isActive: true,
          },
        });
        cancelEditService();
        Alert.alert('Service Added', 'Your new service is now live on your booking page!');
      }
      const res = await apiRequest<{ services: any[] }>('/api/services?limit=50');
      setServicesList(res?.services || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save service');
    } finally {
      setSavingService(false);
    }
  }

  function confirmDeleteService(svcId: string, svcName: string) {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to remove "${svcName}" from your booking menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/api/services/${svcId}`, { method: 'DELETE' });
              if (editingServiceId === svcId) cancelEditService();
              const res = await apiRequest<{ services: any[] }>('/api/services?limit=50');
              setServicesList(res?.services || []);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete service');
            }
          },
        },
      ]
    );
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

      {/* ── DIGITAL IDENTITY & PUBLIC ASSETS ── */}
      {data && (
        <View style={{ gap: 14 }}>
          <Text style={[ui.heading, { fontSize: 16 }]}>Digital Identity & Public Portals</Text>

          {/* CARD 1: DIGITAL BUSINESS CARD */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="credit-card" size={18} color="#2563EB" />
                </View>
                <View>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                    Digital Business Card
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    Contactless vCard & Standee
                  </Text>
                </View>
              </View>
              <Badge label="NFC Ready" accent />
            </View>

            <Text style={{ fontSize: 12.5, color: '#64748B' }}>
              NFC & QR-ready card with 1-tap contact save (.vcf), WhatsApp, and direct calling.
            </Text>

            {data.links.profile && (
              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text numberOfLines={1} selectable style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#334155' }}>
                  {absolute(data.links.profile)}
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => router.push('/qr-standee')}
              style={({ pressed }) => ({
                backgroundColor: '#1E293B',
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <MaterialIcons name="qr-code" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                View Card & Standee QR
              </Text>
            </Pressable>

            {data.links.profile && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => {
                    const profileUrl = absolute(data.links.profile!);
                    const waText = encodeURIComponent(`Hello! Here is my digital business card: ${profileUrl}`);
                    void Linking.openURL(`https://wa.me/?text=${waText}`);
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    backgroundColor: '#25D366',
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <MaterialIcons name="chat" size={14} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>WhatsApp</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const profileUrl = absolute(data.links.profile!);
                    void Share.share({ message: profileUrl, url: profileUrl });
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    backgroundColor: '#F1F5F9',
                    paddingVertical: 9,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <MaterialIcons name="share" size={14} color="#334155" />
                  <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700' }}>Share</Text>
                </Pressable>

                <Pressable
                  onPress={() => void Linking.openURL(absolute(data.links.profile!))}
                  style={{
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <MaterialIcons name="open-in-new" size={16} color="#334155" />
                </Pressable>
              </View>
            )}
          </Card>

          {/* CARD 2: ONLINE BOOKING PAGE & SERVICES */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="event-available" size={18} color="#009F50" />
                </View>
                <View>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                    Online Booking Page
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    Public Portal & Services Menu
                  </Text>
                </View>
              </View>
              <Badge label="Live Portal" accent />
            </View>

            <Text style={{ fontSize: 12.5, color: '#64748B' }}>
              Clients browse your service catalog, check real-time availability, and schedule appointments.
            </Text>

            {data.links.booking && (
              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text numberOfLines={1} selectable style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#334155' }}>
                  {absolute(data.links.booking)}
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => router.push('/booking-page')}
              style={({ pressed }) => ({
                backgroundColor: '#009F50',
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <MaterialIcons name="tune" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Customize Page & Services
              </Text>
            </Pressable>

            {data.links.booking && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => {
                    const bookingUrl = absolute(data.links.booking!);
                    const waText = encodeURIComponent(`Hello! You can view our available time slots and book an appointment with us online here: ${bookingUrl}`);
                    void Linking.openURL(`https://wa.me/?text=${waText}`);
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    backgroundColor: '#25D366',
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <MaterialIcons name="chat" size={14} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>WhatsApp</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const bookingUrl = absolute(data.links.booking!);
                    void Share.share({ message: bookingUrl, url: bookingUrl });
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    backgroundColor: '#F1F5F9',
                    paddingVertical: 9,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <MaterialIcons name="share" size={14} color="#334155" />
                  <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700' }}>Share</Text>
                </Pressable>

                <Pressable
                  onPress={() => void Linking.openURL(absolute(data.links.booking!))}
                  style={{
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <MaterialIcons name="open-in-new" size={16} color="#334155" />
                </Pressable>
              </View>
            )}
          </Card>

          {/* CARD 3: CUSTOMER INTAKE FORM */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FAF5FF', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="assignment" size={18} color="#9333EA" />
                </View>
                <View>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                    Customer Intake Form
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    {data.intakeForm?.name ? `Connected: ${data.intakeForm.name}` : 'Lead Qualification & Questions'}
                  </Text>
                </View>
              </View>
              <Badge label="Lead Capture" accent />
            </View>

            <Text style={{ fontSize: 12.5, color: '#64748B' }}>
              Collect client inquiry details, project requirements, and intake answers before starting work.
            </Text>

            {data.intakeForm?.name && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FAF5FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F3E8FF' }}>
                <MaterialIcons name="link" size={14} color="#7C3AED" />
                <Text style={{ fontSize: 11.5, color: '#6B21A8', fontWeight: '700' }}>
                  Active Form: {data.intakeForm.name}
                </Text>
              </View>
            )}

            {data.links.form ? (
              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text numberOfLines={1} selectable style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#334155' }}>
                  {absolute(data.links.form)}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                Intake form not published yet. Publish a form in BGOS Web to activate.
              </Text>
            )}

            <Pressable
              onPress={() => router.push('/(tabs)/submissions')}
              style={({ pressed }) => ({
                backgroundColor: '#7C3AED',
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <MaterialIcons name="inbox" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                View Customer Submissions
              </Text>
            </Pressable>

            {data.links.form && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => {
                    const formUrl = absolute(data.links.form!);
                    const waText = encodeURIComponent(`Hello! Please fill out our brief inquiry form here: ${formUrl}`);
                    void Linking.openURL(`https://wa.me/?text=${waText}`);
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    backgroundColor: '#25D366',
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <MaterialIcons name="chat" size={14} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>WhatsApp</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const formUrl = absolute(data.links.form!);
                    void Share.share({ message: formUrl, url: formUrl });
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    backgroundColor: '#F1F5F9',
                    paddingVertical: 9,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <MaterialIcons name="share" size={14} color="#334155" />
                  <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700' }}>Share</Text>
                </Pressable>

                <Pressable
                  onPress={() => void Linking.openURL(absolute(data.links.form!))}
                  style={{
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <MaterialIcons name="open-in-new" size={16} color="#334155" />
                </Pressable>
              </View>
            )}
          </Card>
        </View>
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
                  const res = await enablePush();
                  setNotice(res.message);
                })
              }
            />

            <Action
              secondary
              disabled={busy}
              label="Send Test Push Notification"
              icon="notifications-active"
              onPress={() =>
                run(async () => {
                  try {
                    const res = await apiRequest<{ ok: boolean; result?: { sent: number; failed: number } }>('/api/notifications/push/test', {
                      method: 'POST',
                    });
                    if (res?.result && res.result.sent > 0) {
                      Alert.alert('Test Push Sent', `Dispatched test notification to ${res.result.sent} device(s)! Check your device notification tray.`);
                    } else {
                      Alert.alert('Test Push Notice', 'No active push device registered. Please tap "Enable Push Notifications" first.');
                    }
                  } catch (e: unknown) {
                    Alert.alert('Test Push Failed', e instanceof Error ? e.message : 'Could not send test push.');
                  }
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

      {/* ── Booking Page & Services Customizer Sheet ── */}
      <Modal
        visible={bookingModalOpen}
        animationType="slide"
        onRequestClose={() => setBookingModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          {/* Top Bar with Guaranteed Safe Status Bar Insets (No clipping from notch, dynamic island or status bar) */}
          <View
            style={{
              paddingTop: modalTopInset,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                minHeight: 56,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => setBookingModalOpen(false)}
                hitSlop={12}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
              </Pressable>

              <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                  Booking Page & Services
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                  Online portal, SEO & service menu
                </Text>
              </View>

              <Pressable
                disabled={savingBranding}
                onPress={() => void handleSaveAllBranding()}
                hitSlop={12}
                style={{
                  backgroundColor: '#009F50',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  opacity: savingBranding ? 0.7 : 1,
                }}
              >
                {savingBranding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Single ScrollView for entire customizer */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 90 }}
          >
            {/* ── CARD 1: LIVE LINK PREVIEW & ACTIONS ── */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="link" size={20} color="#009F50" />
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                  Live Booking Link
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
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: '#0F172A',
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    opacity: pressed ? 0.85 : 1,
                  })}
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
                  style={({ pressed }) => ({
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
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <MaterialIcons name="share" size={16} color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '700' }}>
                    Share Link
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* ── CARD 2: BOOKING PAGE BRANDING, CONTACT & SEO ── */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="tune" size={18} color="#009F50" />
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                  Page Identity, Contact & SEO
                </Text>
              </View>

              {/* Online Booking Toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    Accept Bookings Online
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                    When enabled, clients can schedule appointments directly from your booking page.
                  </Text>
                </View>
                <Switch
                  value={brandingFields.onlineBookingEnabled}
                  onValueChange={(val) => setBrandingFields((prev) => ({ ...prev, onlineBookingEnabled: val }))}
                  trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                  thumbColor={brandingFields.onlineBookingEnabled ? '#009F50' : '#94A3B8'}
                />
              </View>

              {/* Business Name */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Business Display Name
                </Text>
                <TextInput
                  value={brandingFields.businessName}
                  onChangeText={(val) => setBrandingFields((prev) => ({ ...prev, businessName: val }))}
                  placeholder="e.g. Acme Plumbing Solutions"
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13.5,
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </View>

              {/* Headline / Tagline */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Public Tagline / Hero Headline
                </Text>
                <TextInput
                  value={brandingFields.headline}
                  onChangeText={(val) => setBrandingFields((prev) => ({ ...prev, headline: val }))}
                  placeholder="e.g. 24/7 Licensed Emergency Plumbing & Leak Repair"
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13.5,
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </View>

              {/* Phone & WhatsApp */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Contact Phone
                  </Text>
                  <TextInput
                    value={brandingFields.phone}
                    onChangeText={(val) => setBrandingFields((prev) => ({ ...prev, phone: val }))}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13.5,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    WhatsApp Number
                  </Text>
                  <TextInput
                    value={brandingFields.whatsapp}
                    onChangeText={(val) => setBrandingFields((prev) => ({ ...prev, whatsapp: val }))}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13.5,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>
              </View>

              {/* Email & Website */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Support Email
                  </Text>
                  <TextInput
                    value={brandingFields.email}
                    onChangeText={(val) => setBrandingFields((prev) => ({ ...prev, email: val }))}
                    placeholder="contact@acme.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13.5,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Main Website
                  </Text>
                  <TextInput
                    value={brandingFields.website}
                    onChangeText={(val) => setBrandingFields((prev) => ({ ...prev, website: val }))}
                    placeholder="https://acme.com"
                    keyboardType="url"
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13.5,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>
              </View>

              {/* SEO Meta Description */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  SEO Meta Description & Bio
                </Text>
                <TextInput
                  value={brandingFields.seoDescription}
                  onChangeText={(val) => setBrandingFields((prev) => ({ ...prev, seoDescription: val }))}
                  placeholder="Summary shown on Google Search & WhatsApp links..."
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13.5,
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    minHeight: 70,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              <Pressable
                disabled={savingBranding}
                onPress={() => void handleSaveAllBranding()}
                style={({ pressed }) => ({
                  backgroundColor: '#009F50',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                  opacity: savingBranding ? 0.7 : pressed ? 0.9 : 1,
                })}
              >
                {savingBranding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    Save Branding & SEO Details
                  </Text>
                )}
              </Pressable>
            </Card>

            {/* ── CARD 3: SERVICES OFFERINGS WITH EDIT & DELETE ── */}
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
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                        {svc.name}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                        ⏱ {svc.duration || 60} mins • {svc.basePrice > 0 ? `₹${svc.basePrice}` : 'Free'}
                      </Text>
                    </View>

                    {/* Action Icons: Edit ✏️ and Delete 🗑️ */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Pressable
                        onPress={() => startEditService(svc)}
                        hitSlop={8}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: editingServiceId === svc.id ? '#DCFCE7' : '#F1F5F9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MaterialIcons
                          name="edit"
                          size={16}
                          color={editingServiceId === svc.id ? '#166534' : '#475569'}
                        />
                      </Pressable>

                      <Pressable
                        onPress={() => confirmDeleteService(svc.id, svc.name)}
                        hitSlop={8}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#FEE2E2',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </Card>

            {/* ── CARD 4: ADD / EDIT SERVICE FORM ── */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons
                    name={editingServiceId ? 'edit' : 'add-circle-outline'}
                    size={18}
                    color="#009F50"
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                    {editingServiceId ? 'Edit Service' : 'Add Service to Booking Page'}
                  </Text>
                </View>
                {editingServiceId && (
                  <Pressable onPress={cancelEditService}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                      Cancel Edit
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={{ gap: 4 }}>
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
                    padding: 10,
                    fontSize: 13.5,
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
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
                      padding: 10,
                      fontSize: 13.5,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
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
                      padding: 10,
                      fontSize: 13.5,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </View>
              </View>

              <Pressable
                disabled={savingService}
                onPress={() => void handleSaveService()}
                style={({ pressed }) => ({
                  backgroundColor: editingServiceId ? '#1E293B' : '#009F50',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  marginTop: 4,
                  opacity: savingService ? 0.7 : pressed ? 0.9 : 1,
                })}
              >
                {savingService ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons
                      name={editingServiceId ? 'save' : 'add'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      {editingServiceId ? 'Update Service' : 'Add to Booking Menu'}
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
        </View>
      </Modal>
    </Screen>
  );
}
