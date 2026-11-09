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
import {
  COUNTRIES,
  detectDeviceCountryAndTimezone,
  getCountryByCode,
  getTimeZoneShortLabel,
  type CountryItem,
} from '../../src/lib/country-codes';
import type { BgosWorkspace } from '../../src/types/bgos-contracts';

export default function ToolsScreen() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [localeModalOpen, setLocaleModalOpen] = useState(false);
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

  React.useEffect(() => {
    if (params.open === 'booking') {
      router.setParams({ open: undefined });
      router.push('/booking-page');
    }
  }, [params.open]);

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
  const detectedLocale = detectDeviceCountryAndTimezone();
  const activeCountry: CountryItem = getCountryByCode(data?.locale?.country || detectedLocale.country.code);
  const activeTimeZone = data?.locale?.timeZone || activeCountry.timeZone;
  const tzShortLabel = getTimeZoneShortLabel(activeTimeZone);
  const planCode = data?.plan.code ? data.plan.code.toUpperCase() : 'STARTER';
  const isTrial = data?.plan.status === 'trial';
  const isActive = data?.plan.status === 'active';

  return (
    <Screen
      title="Tools"
      headerIcon="settings"
      subtitle="Open a tool or manage your business."
      onRefresh={workspace.refresh}
    >
      <ErrorNotice message={error || workspace.error} retry={workspace.refresh} />

      {notice ? (
        <Card style={{ backgroundColor: colors.successSoft }}>
          <Text style={{ color: colors.success, fontWeight: '700' }}>✓ {notice}</Text>
        </Card>
      ) : null}

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
          title="Call Tracker & Leads"
          detail="Call logs, 1-tap CRM capture & follow-ups"
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

      <Pressable accessibilityRole="button" accessibilityState={{expanded:openGroup==='Plan & billing'}} onPress={()=>setOpenGroup(openGroup==='Plan & billing'?null:'Plan & billing')} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,padding:16,backgroundColor:'white'}}>
        <Text style={ui.heading}>Plan & billing</Text><MaterialIcons name={openGroup==='Plan & billing'?'expand-less':'expand-more'} size={22} color={colors.muted}/>
      </Pressable>
      {openGroup==='Plan & billing' && <>
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

      </>}
      <Pressable accessibilityRole="button" accessibilityState={{expanded:openGroup==='Channels'}} onPress={()=>setOpenGroup(openGroup==='Channels'?null:'Channels')} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,padding:16,backgroundColor:'white'}}>
        <Text style={ui.heading}>Channels</Text><MaterialIcons name={openGroup==='Channels'?'expand-less':'expand-more'} size={22} color={colors.muted}/>
      </Pressable>
      {openGroup==='Channels' && <>
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

      </>}
      <Pressable accessibilityRole="button" accessibilityState={{expanded:openGroup==='Business profile & booking'}} onPress={()=>setOpenGroup(openGroup==='Business profile & booking'?null:'Business profile & booking')} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,padding:16,backgroundColor:'white'}}>
        <Text style={ui.heading}>Business profile & booking</Text><MaterialIcons name={openGroup==='Business profile & booking'?'expand-less':'expand-more'} size={22} color={colors.muted}/>
      </Pressable>
      {openGroup==='Business profile & booking' && <>
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

      </>}
      <Pressable accessibilityRole="button" accessibilityState={{expanded:openGroup==='Account & settings'}} onPress={()=>setOpenGroup(openGroup==='Account & settings'?null:'Account & settings')} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,padding:16,backgroundColor:'white'}}>
        <Text style={ui.heading}>Account & settings</Text><MaterialIcons name={openGroup==='Account & settings'?'expand-less':'expand-more'} size={22} color={colors.muted}/>
      </Pressable>
      {openGroup==='Account & settings' && <>
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

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setLocaleModalOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.line,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Text style={{ fontSize: 22 }}>{activeCountry.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                    Country &amp; Schedule Timezone
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: 1 }} numberOfLines={1}>
                    {activeCountry.name} (+{activeCountry.callingCode}) • {activeTimeZone} ({tzShortLabel})
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
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

      </>}

      <Modal
        visible={localeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLocaleModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(7, 11, 45, 0.45)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '76%',
              paddingBottom: Math.max(insets.bottom, 20),
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  Country &amp; Schedule Timezone
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  Used for review invite times, scheduled media &amp; SMS phone formatting.
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setLocaleModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  const dev = detectDeviceCountryAndTimezone();
                  setLocaleModalOpen(false);
                  void run(async () => {
                    await update({ country: dev.country.code, timeZone: dev.timeZone });
                    setNotice(`Updated workspace locale to ${dev.country.name} (${dev.timeZone}).`);
                  });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#F0FDF4',
                  borderWidth: 1,
                  borderColor: '#BBF7D0',
                  borderRadius: 12,
                  paddingVertical: 10,
                  marginBottom: 8,
                }}
              >
                <MaterialIcons name="my-location" size={16} color="#0B9042" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0B9042' }}>
                  Use Device Region ({detectedLocale.country.flag} {detectedLocale.country.name} • {detectedLocale.timeZone})
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              {COUNTRIES.map((c) => {
                const isSelected = c.code === activeCountry.code;
                return (
                  <Pressable
                    key={c.code}
                    disabled={busy}
                    onPress={() => {
                      setLocaleModalOpen(false);
                      void run(async () => {
                        await update({ country: c.code, timeZone: c.timeZone });
                        setNotice(`Updated workspace locale to ${c.name} (${c.timeZone}).`);
                      });
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: isSelected ? '#F0FDF4' : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{c.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0B9042' : '#0F172A',
                        }}
                      >
                        {c.name} (+{c.callingCode})
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                        {c.timeZone} • {getTimeZoneShortLabel(c.timeZone)}
                      </Text>
                    </View>
                    {isSelected ? (
                      <MaterialIcons name="check" size={18} color="#0B9042" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}
