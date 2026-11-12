import { invalidateResourceScope } from '../src/lib/resource-cache';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { applyWorkspaceSession, type SessionResponse } from '../src/stores/auth-store';
import type { WorkspaceListItem } from '../src/components/navigation/workspace-switcher-section';
import { apiRequest } from '../src/lib/api';
import { getToken } from '../src/lib/auth';
import { WEB_URL } from '../src/lib/constants';

interface GbpProfile {
  id: string;
  name: string;
  shortId: string;
  initial: string;
  category?: string;
  address?: string;
  isPrimary?: boolean;
}

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  hasConnectedGbp?: boolean;
  activeProfileId: string;
  activeProfile?: GbpProfile;
  profiles: GbpProfile[];
}

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  F: { bg: '#E0E7FF', text: '#4338CA' }, // indigo
  Z: { bg: '#DBEAFE', text: '#2563EB' }, // blue
  S: { bg: '#DCFCE7', text: '#16A34A' }, // green
  D: { bg: '#DCFCE7', text: '#16A34A' }, // green
};

async function fetchCategorySuggestions(query: string, businessName?: string): Promise<string[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (businessName) params.set('businessName', businessName);
    const res = await apiRequest<{ categories: string[] }>(`/api/gbp/categories?${params.toString()}`);
    return res.categories || [];
  } catch {
    return [];
  }
}

async function fetchDynamicServices(category: string, businessName: string, query?: string): Promise<string[]> {
  try {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (businessName) params.set('businessName', businessName);
    if (query) params.set('query', query);
    const res = await apiRequest<{ services: string[] }>(`/api/gbp/services/suggest?${params.toString()}`);
    return res.services || [];
  } catch {
    return [];
  }
}

/**
 * Select profile screen — matches Dhanda AI benchmark (Screenshot 6).
 * Displays all Google Business listings linked to the authenticated Gmail account,
 * allows 1-tap switching, and displays security assurances.
 */
export default function SelectProfileScreen() {
  const router = useRouter();
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const localParams = useLocalSearchParams<{ error?: string; google?: string }>();
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Verification & Edit Profile Modal State
  const [verifyModalProfile, setVerifyModalProfile] = useState<GbpProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [offerings, setOfferings] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Dynamic Category Autocomplete Dropdown State
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categoryResults, setCategoryResults] = useState<string[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [recommendedCategories, setRecommendedCategories] = useState<string[]>([]);

  // Dynamic Service Autocomplete Dropdown State
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceResults, setServiceResults] = useState<string[]>([]);

  const profiles = discover.data?.profiles || [];
  const activeId = discover.data?.activeProfileId || profiles[0]?.id || '';
  const email = discover.data?.email || '';
  const phone = discover.data?.phone || '';
  const version = discover.data?.version || 'BGOS v2.0';
  const isConnected = Boolean(discover.data?.hasConnectedGbp || profiles.length > 0);

  // Debounced search for Google categories as user types
  useEffect(() => {
    if (!verifyModalProfile) return;
    const query = editCategory.trim();
    if (query.length < 2) {
      setCategoryResults([]);
      setCategoryDropdownOpen(false);
      return;
    }

    setCategoryLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchCategorySuggestions(query, editName);
        setCategoryResults(results);
        setCategoryDropdownOpen(results.length > 0);
      } finally {
        setCategoryLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [editCategory, editName, verifyModalProfile]);

  // Debounced search for services as user types in add service field
  useEffect(() => {
    const q = customTagInput.trim();
    if (q.length < 1) {
      setServiceResults([]);
      setServiceDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const matches = await fetchDynamicServices(editCategory, editName, q);
        const filtered = matches.filter((m) => !offerings.includes(m));
        setServiceResults(filtered);
        setServiceDropdownOpen(filtered.length > 0);
      } catch {}
    }, 250);

    return () => clearTimeout(timer);
  }, [customTagInput, editCategory, editName, offerings]);

  async function handleCardPress(p: GbpProfile) {
    const initialCategory = p.category && !/corporate|holding|community centre/i.test(p.category)
      ? p.category
      : '';
    setVerifyModalProfile(p);
    setEditName(p.name);
    setEditCategory(initialCategory);
    setOfferings([]);
    setCustomTagInput('');
    setCategoryDropdownOpen(false);
    setServiceDropdownOpen(false);

    // 1. Fetch dynamic category recommendations tailored specifically to this business
    void fetchCategorySuggestions('', p.name).then((cats) => {
      setRecommendedCategories(cats);
      if (!initialCategory && cats.length > 0) {
        setEditCategory(cats[0]);
        setServicesLoading(true);
        void fetchDynamicServices(cats[0], p.name)
          .then(setOfferings)
          .finally(() => setServicesLoading(false));
      }
    });

    // 2. If profile already had a genuine Google category, dynamically fetch tailored offerings for it
    if (initialCategory) {
      setServicesLoading(true);
      void fetchDynamicServices(initialCategory, p.name)
        .then(setOfferings)
        .finally(() => setServicesLoading(false));
    }
  }

  async function handleSelectCategory(cat: string) {
    setEditCategory(cat);
    setCategoryDropdownOpen(false);
    setCategoryResults([]);
    // Regenerate tailored services for this category
    setServicesLoading(true);
    try {
      const prods = await fetchDynamicServices(cat, editName);
      setOfferings(prods);
    } finally {
      setServicesLoading(false);
    }
  }

  async function handleConfirmProfile(p: GbpProfile, name: string, category: string, prods: string[]) {
    if (switchingId) return;
    setSwitchingId(p.id);
    try {
      await apiRequest('/api/gbp/accounts/discover', {
        method: 'POST',
        body: {
          profileId: p.id,
          businessName: name.trim() || p.name,
          category: category.trim(),
          products: prods,
          services: prods,
        },
      });
      invalidateResourceScope();
      setVerifyModalProfile(null);
      Alert.alert(
        'Profile & Services Verified',
        `Active profile is now ${name.trim() || p.name} (${category || 'Local Business'}).\n\nAI posts, designs, and captions are now calibrated to this business.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (router.canGoBack?.()) router.back();
              else router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (err: unknown) {
      Alert.alert('Update Failed', (err as Error).message || 'Could not verify profile.');
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleQuickSelect(p: GbpProfile) {
    let cat = p.category && !/corporate|holding|community centre/i.test(p.category) ? p.category : '';
    if (!cat) {
      const recs = await fetchCategorySuggestions('', p.name);
      cat = recs[0] || 'Local Business';
    }
    const defaults = await fetchDynamicServices(cat, p.name);
    await handleConfirmProfile(p, p.name, cat, defaults);
  }

  async function handleSelectProfile(p: GbpProfile) {
    handleCardPress(p);
  }

  const handleOAuthReturn = useCallback(
    async (rawUrl?: string | null) => {
      if (!rawUrl) return;
      try {
        let searchParams: URLSearchParams | null = null;
        if (rawUrl.includes('?')) {
          const query = rawUrl.substring(rawUrl.indexOf('?') + 1);
          searchParams = new URLSearchParams(query);
        }
        const err = searchParams?.get('error');
        const google = searchParams?.get('google');
        if (err === 'no_gbp_accounts') {
          Alert.alert(
            'No Business Profile Found on Google Maps',
            'Your Google account does not own any verified business listings on Google Maps yet.\n\nPlease tap "Create Business Profile on Google Maps" to set up your free listing on Google in 2 minutes, then return here to connect.',
            [
              {
                text: 'Create Profile ↗',
                onPress: () => Linking.openURL('https://business.google.com/create').catch(() => {}),
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ],
          );
        } else if (err) {
          Alert.alert('Connection Failed', `Google Business Profile connection failed: ${decodeURIComponent(err)}`);
        } else if (google === 'connected') {
          await discover.refresh();
          setStatusNotice('✓ Google account connected! Business profiles updated.');
          setTimeout(() => setStatusNotice(null), 4000);
        }
      } catch (e) {
        console.warn('[select-profile.handleOAuthReturn] parse error:', e);
      }
    },
    [discover],
  );

  useEffect(() => {
    if (localParams.error || localParams.google) {
      const query = new URLSearchParams();
      if (localParams.error) query.set('error', localParams.error);
      if (localParams.google) query.set('google', localParams.google);
      void handleOAuthReturn(`bgos://select-profile?${query.toString()}`);
    }
  }, [localParams.error, localParams.google, handleOAuthReturn]);

  async function handleConnectGoogle() {
    setConnectingGoogle(true);
    const returnUrl = 'bgos://select-profile';
    try {
      const token = await getToken();
      const url =
        `${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&client=mobile&returnView=select-profile` +
        `&redirectUri=${encodeURIComponent(returnUrl)}` +
        `&originHost=${encodeURIComponent(WEB_URL)}` +
        (token ? `&auth=${encodeURIComponent(token)}` : '');

      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      if (result.type === 'success' && result.url) {
        await handleOAuthReturn(result.url);
      }
    } catch {
      try {
        const token = await getToken();
        const url =
          `${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&client=mobile&returnView=select-profile` +
          `&redirectUri=${encodeURIComponent(returnUrl)}` +
          `&originHost=${encodeURIComponent(WEB_URL)}` +
          (token ? `&auth=${encodeURIComponent(token)}` : '');
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Could not open Google connect. Please connect from BGOS Web.');
      }
    } finally {
      setConnectingGoogle(false);
      await discover.refresh();
    }
  }

  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceModalOpen, setNewWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceCategory, setNewWorkspaceCategory] = useState('');
  const [newWorkspaceCity, setNewWorkspaceCity] = useState('');

  const discoverExtra = (discover.data || {}) as {
    boundProfileId?: string | null;
    hasWorkspaceActivity?: boolean;
    workspaceActivityReason?: string | null;
    workspaces?: WorkspaceListItem[];
  };
  const boundProfileId = discoverExtra.boundProfileId || null;
  const hasWorkspaceActivity = Boolean(discoverExtra.hasWorkspaceActivity);
  const workspaces = Array.isArray(discoverExtra.workspaces) ? discoverExtra.workspaces : [];

  async function handleSwitchExistingWorkspace(workspaceId: string, label?: string) {
    if (switchingId || creatingWorkspace) return;
    setSwitchingId(workspaceId);
    try {
      const session = await apiRequest<SessionResponse & { success?: boolean }>(
        '/api/bgos/workspaces/switch',
        {
          method: 'POST',
          body: { workspaceId },
        },
      );
      if (session?.user && session?.token) {
        await applyWorkspaceSession(session);
      }
      setStatusNotice(`✓ Switched to ${label || 'business workspace'}`);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(
        'Switch Failed',
        e instanceof Error ? e.message : 'Could not switch business workspace.',
      );
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleCreateSeparateWorkspace(params: {
    businessName: string;
    profileId?: string | null;
    category?: string | null;
    city?: string | null;
    services?: string[];
  }) {
    if (creatingWorkspace) return;
    setCreatingWorkspace(true);
    try {
      const res = await apiRequest<SessionResponse & { success?: boolean; workspace?: WorkspaceListItem }>(
        '/api/bgos/workspaces',
        {
          method: 'POST',
          body: {
            businessName: params.businessName,
            profileId: params.profileId || undefined,
            category: params.category || undefined,
            city: params.city || undefined,
            services: params.services && params.services.length > 0 ? params.services : undefined,
          },
        },
      );
      if (res?.user && res?.token) {
        await applyWorkspaceSession(res);
      }
      setNewWorkspaceModalOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceCategory('');
      setNewWorkspaceCity('');
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(
        'Could Not Create Workspace',
        e instanceof Error ? e.message : 'Failed to create dedicated business workspace.',
      );
    } finally {
      setCreatingWorkspace(false);
    }
  }

  function handleSelectProfileRow(p: any) {
    if (p.isBoundToOtherWorkspace && p.boundWorkspaceId) {
      Alert.alert(
        `Switch to ${p.boundBusinessName || p.name}?`,
        `This Google Business already has its own dedicated workspace (${String(p.boundPlanTier || 'free').toUpperCase()} plan). Switch to manage it without mixing data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch Workspace',
            onPress: () => void handleSwitchExistingWorkspace(p.boundWorkspaceId, p.boundBusinessName || p.name),
          },
        ],
      );
      return;
    }

    if (boundProfileId && boundProfileId !== p.id) {
      Alert.alert(
        'Separate Workspace Required',
        hasWorkspaceActivity
          ? `Your current workspace already has live data (${discoverExtra.workspaceActivityReason || 'activity'}). Each business gets its own isolated CRM, page URL, AI chatbot & subscription.\n\nCreate a dedicated workspace for "${p.name}"?`
          : `Your current workspace is already linked to another Google Business. Create a separate workspace for "${p.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Business Workspace',
            onPress: () =>
              void handleCreateSeparateWorkspace({
                businessName: p.name,
                profileId: p.id,
                category: p.category || null,
              }),
          },
        ],
      );
      return;
    }

    handleCardPress(p);
  }

  async function handleConfirmOrCreateFromModal(
    p: any,
    name: string,
    category: string,
    offeringsList: string[],
  ) {
    if (boundProfileId && boundProfileId !== p.id) {
      await handleCreateSeparateWorkspace({
        businessName: name || p.name,
        profileId: p.id,
        category: category || p.category,
        services: offeringsList,
      });
      return;
    }
    await handleConfirmProfile(p, name, category, offeringsList);
  }

  return (
    <Screen
      title="Select profile"
      subtitle={`Google Business Profile • ${version}`}
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)');
      }}
      onRefresh={discover.refresh}
    >
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 32 }}>
        {/* Account Connection Status Header */}
        {isConnected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#2563EB' }}>G</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                  {email || 'Google Business Account'}
                </Text>
                <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600' }}>
                  ✓ Connected &amp; Verified
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: '#DCFCE7',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#16A34A' }}>
                {profiles.length} {profiles.length === 1 ? 'Location' : 'Locations'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
            <MaterialIcons name="link-off" size={20} color="#94A3B8" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>
              No Google Business Profile Connected
            </Text>
          </View>
        )}

        {/* Active Business Workspaces Switcher (1 Business = 1 Workspace & Subscription) */}
        {workspaces.length > 0 && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                  Your Business Workspaces ({workspaces.length})
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  Each business gets its own CRM, page URL, chatbot &amp; plan
                </Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              {workspaces.map((ws) => (
                <Pressable
                  key={ws.workspaceId}
                  accessibilityRole="button"
                  disabled={Boolean(switchingId || creatingWorkspace)}
                  onPress={() => {
                    if (!ws.isCurrent) void handleSwitchExistingWorkspace(ws.workspaceId, ws.name);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: ws.isCurrent ? '#F0FDF4' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: ws.isCurrent ? '#86EFAC' : '#E2E8F0',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                      {ws.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                      {ws.planTier.toUpperCase()} Plan · /{ws.slug}
                    </Text>
                  </View>
                  {ws.isCurrent ? (
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>Active</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>Switch</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Profiles Card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            overflow: 'hidden',
          }}
        >
          {profiles.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <MaterialIcons name="storefront" size={36} color="#94A3B8" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
                No Google Business Profiles connected yet
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18 }}>
                Connect your Google account below to discover all verified business locations on Google Maps.
              </Text>
            </View>
          ) : (
            profiles.map((p: any, idx) => {
              const isSelected = p.id === activeId;
              const isSwitching = switchingId === p.id;
              const colorScheme = AVATAR_COLORS[p.initial] || { bg: '#F1F5F9', text: '#0F172A' };
              const displayCat = p.category && !/corporate|holding/i.test(p.category) ? p.category : 'Google Business Profile';

              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => handleSelectProfileRow(p)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 14,
                    backgroundColor: pressed ? '#F8FAFC' : isSelected ? '#F0FDF4' : '#FFFFFF',
                    borderBottomWidth: idx < profiles.length - 1 ? 1 : 0,
                    borderBottomColor: '#F1F5F9',
                  })}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: colorScheme.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colorScheme.text }}>
                      {p.initial}
                    </Text>
                  </View>

                  {/* Profile info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                      {p.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                        {p.shortId}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#CBD5E1' }}>•</Text>
                      <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }} numberOfLines={1}>
                          {displayCat}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Indicator / Spinner / Action */}
                  {isSwitching ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : isSelected ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          backgroundColor: '#DCFCE7',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>Active</Text>
                      </View>
                      <MaterialIcons name="edit" size={17} color="#16A34A" />
                    </View>
                  ) : p.isBoundToOtherWorkspace ? (
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>Switch</Text>
                    </View>
                  ) : (
                    <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Connection Action Section */}
        <Pressable
          accessibilityRole="button"
          disabled={creatingWorkspace}
          onPress={() => setNewWorkspaceModalOpen(true)}
          style={({ pressed }) => ({
            width: '100%',
            height: 48,
            borderRadius: 14,
            backgroundColor: '#0F172A',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed || creatingWorkspace ? 0.8 : 1,
          })}
        >
          <MaterialIcons name="add-business" size={20} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
            Add Another Business Workspace
          </Text>
        </Pressable>

        {isConnected ? (
          <View style={{ gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Another Google Account"
              disabled={connectingGoogle}
              onPress={() => void handleConnectGoogle()}
              style={({ pressed }) => ({
                width: '100%',
                height: 48,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed || connectingGoogle ? 0.75 : 1,
              })}
            >
              {connectingGoogle ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '700' }}>
                    Connecting Google…
                  </Text>
                </View>
              ) : (
                <>
                  <MaterialIcons name="add" size={20} color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '700' }}>
                    Add Another Google Account
                  </Text>
                </>
              )}
            </Pressable>

            {statusNotice ? (
              <View
                style={{
                  backgroundColor: '#DCFCE7',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#86EFAC',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MaterialIcons name="check-circle" size={16} color="#16A34A" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#16A34A' }}>
                  {statusNotice}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                Connected to {email || 'Google'}. Tap above to link another Google account or switch.
              </Text>
            )}
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Connect with Google"
              disabled={connectingGoogle}
              onPress={() => void handleConnectGoogle()}
              style={({ pressed }) => ({
                width: '100%',
                height: 50,
                borderRadius: 14,
                overflow: 'hidden',
                opacity: pressed || connectingGoogle ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                }}
              >
                <View style={{ flex: 1, backgroundColor: '#9333EA' }} />
                <View style={{ flex: 1, backgroundColor: '#EA580C' }} />
              </View>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {connectingGoogle ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                      Connecting Google…
                    </Text>
                  </View>
                ) : (
                  <>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#2563EB' }}>G</Text>
                    </View>
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                      Connect with Google
                    </Text>
                  </>
                )}
              </View>
            </Pressable>

            {statusNotice ? (
              <View
                style={{
                  backgroundColor: '#DCFCE7',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#86EFAC',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MaterialIcons name="check-circle" size={16} color="#16A34A" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#16A34A' }}>
                  {statusNotice}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>
                Connect your Google account to discover all verified business locations on Google Maps
              </Text>
            )}
          </View>
        )}

        {/* Security Reassurance Card (Screenshot 6) */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 18,
            gap: 14,
            marginTop: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#EFF6FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="place" size={20} color="#EA580C" />
            </View>
            <Text style={{ fontSize: 13.5, color: '#1E293B', fontWeight: '600', flex: 1 }}>
              BGOS AI connects to Google Business Profile only
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="mail-lock" size={20} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 13.5, color: '#1E293B', fontWeight: '600', flex: 1 }}>
              Zero access to your private emails or files
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#F0FDF4',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="verified-user" size={20} color="#16A34A" />
            </View>
            <Text style={{ fontSize: 13.5, color: '#1E293B', fontWeight: '600', flex: 1 }}>
              100% Secure Official Google OAuth 2.0 Integration
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
            }}
          >
            <MaterialIcons name="info-outline" size={15} color="#64748B" />
            <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
              You can disconnect Google Business anytime
            </Text>
          </View>

          {/* Quick Access to Brand Brain */}
          <Pressable
            onPress={() => router.push('/preferences')}
            style={{
              marginTop: 6,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="tune" size={18} color={colors.brand} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                Edit Brand Brain & Preferences
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Verification & Category Confirmation Modal */}
      <Modal
        visible={Boolean(verifyModalProfile)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!switchingId) setVerifyModalProfile(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Platform.OS === 'ios' ? 36 : 24,
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  Verify Business Profile
                </Text>
                <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                  Confirm category &amp; offerings for dynamic AI marketing
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => {
                  if (!switchingId) setVerifyModalProfile(null);
                }}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: pressed ? '#E2E8F0' : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <MaterialIcons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {/* 1. Business Name */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                  Business Name
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. shiv-ganga market"
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14.5,
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                  }}
                />
              </View>

              {/* 2. Business Category */}
              <View style={{ gap: 6, zIndex: 30 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Business Category
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Search Google categories or select</Text>
                </View>

                {/* Category Input */}
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={editCategory}
                    onChangeText={setEditCategory}
                    placeholder="Search Google categories (e.g. Software company, Bakery...)"
                    placeholderTextColor="#94A3B8"
                    onFocus={() => {
                      if (categoryResults.length > 0) setCategoryDropdownOpen(true);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: categoryDropdownOpen ? '#2563EB' : '#CBD5E1',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      paddingRight: categoryLoading ? 38 : 14,
                      fontSize: 14.5,
                      color: '#0F172A',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                  {categoryLoading && (
                    <View style={{ position: 'absolute', right: 12, top: 12 }}>
                      <ActivityIndicator size="small" color="#2563EB" />
                    </View>
                  )}
                </View>

                {/* Floating Live Autocomplete Dropdown */}
                {categoryDropdownOpen && categoryResults.length > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#3B82F6',
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.14,
                      shadowRadius: 8,
                      elevation: 6,
                      maxHeight: 210,
                      overflow: 'hidden',
                      marginTop: 2,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        backgroundColor: '#EFF6FF',
                        borderBottomWidth: 1,
                        borderBottomColor: '#DBEAFE',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="search" size={14} color="#2563EB" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                          Google Business Categories
                        </Text>
                      </View>
                      <Pressable onPress={() => setCategoryDropdownOpen(false)} hitSlop={6}>
                        <MaterialIcons name="close" size={16} color="#64748B" />
                      </Pressable>
                    </View>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 165 }}>
                      {categoryResults.map((cat, idx) => (
                        <Pressable
                          key={`${cat}-${idx}`}
                          onPress={() => void handleSelectCategory(cat)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 11,
                            borderBottomWidth: idx < categoryResults.length - 1 ? 1 : 0,
                            borderBottomColor: '#F1F5F9',
                            backgroundColor: pressed ? '#EFF6FF' : '#FFFFFF',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          })}
                        >
                          <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>
                            {cat}
                          </Text>
                          <MaterialIcons name="check" size={16} color="#2563EB" />
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Dynamic Contextual Recommendations Chips for this Business */}
                {recommendedCategories.length > 0 && (
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
                      Suggested categories for {editName || 'your business'}:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {recommendedCategories.map((cat) => {
                        const isCatSelected = editCategory.toLowerCase() === cat.toLowerCase();
                        return (
                          <Pressable
                            key={cat}
                            onPress={() => void handleSelectCategory(cat)}
                            style={({ pressed }) => ({
                              backgroundColor: isCatSelected ? '#EFF6FF' : pressed ? '#F1F5F9' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isCatSelected ? '#2563EB' : '#E2E8F0',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 20,
                            })}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: isCatSelected ? '700' : '500',
                                color: isCatSelected ? '#2563EB' : '#475569',
                              }}
                            >
                              {cat}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* 3. Products & Services */}
              <View style={{ gap: 6, zIndex: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Key Products &amp; Services
                  </Text>
                  {servicesLoading && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ActivityIndicator size="small" color="#2563EB" />
                      <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '600' }}>AI generating…</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  AI generates photorealistic visuals, posts, and captions tailored specifically to these items:
                </Text>

                {/* Active Offerings Tags */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                  {offerings.map((tag, idx) => (
                    <View
                      key={`${tag}-${idx}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F0FDF4',
                        borderWidth: 1,
                        borderColor: '#86EFAC',
                        paddingLeft: 10,
                        paddingRight: 6,
                        paddingVertical: 5,
                        borderRadius: 16,
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534' }}>
                        {tag}
                      </Text>
                      <Pressable
                        onPress={() => setOfferings(offerings.filter((_, i) => i !== idx))}
                        hitSlop={8}
                      >
                        <MaterialIcons name="cancel" size={16} color="#16A34A" />
                      </Pressable>
                    </View>
                  ))}
                  {offerings.length === 0 && !servicesLoading && (
                    <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 4 }}>
                      Select a category above or add services below.
                    </Text>
                  )}
                </View>

                {/* Add Service Input with Autocomplete */}
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={customTagInput}
                      onChangeText={setCustomTagInput}
                      placeholder="Type to search or add a custom service…"
                      placeholderTextColor="#94A3B8"
                      onFocus={() => {
                        if (serviceResults.length > 0) setServiceDropdownOpen(true);
                      }}
                      onSubmitEditing={() => {
                        const trimmed = customTagInput.trim();
                        if (trimmed && !offerings.includes(trimmed)) {
                          setOfferings([...offerings, trimmed]);
                          setCustomTagInput('');
                          setServiceDropdownOpen(false);
                        }
                      }}
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: serviceDropdownOpen ? '#16A34A' : '#CBD5E1',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13.5,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <Pressable
                      onPress={() => {
                        const trimmed = customTagInput.trim();
                        if (trimmed && !offerings.includes(trimmed)) {
                          setOfferings([...offerings, trimmed]);
                          setCustomTagInput('');
                          setServiceDropdownOpen(false);
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      })}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
                    </Pressable>
                  </View>

                  {/* Service Autocomplete Dropdown */}
                  {serviceDropdownOpen && serviceResults.length > 0 && (
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#86EFAC',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 5,
                        maxHeight: 180,
                        overflow: 'hidden',
                        marginTop: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: '#F0FDF4',
                          borderBottomWidth: 1,
                          borderBottomColor: '#DCFCE7',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialIcons name="auto-awesome" size={13} color="#16A34A" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>
                            Suggested Offerings for {editCategory || 'Business'}
                          </Text>
                        </View>
                        <Pressable onPress={() => setServiceDropdownOpen(false)} hitSlop={6}>
                          <MaterialIcons name="close" size={15} color="#64748B" />
                        </Pressable>
                      </View>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 140 }}>
                        {serviceResults.map((s, idx) => (
                          <Pressable
                            key={`${s}-${idx}`}
                            onPress={() => {
                              if (!offerings.includes(s)) {
                                setOfferings([...offerings, s]);
                              }
                              setCustomTagInput('');
                              setServiceDropdownOpen(false);
                            }}
                            style={({ pressed }) => ({
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderBottomWidth: idx < serviceResults.length - 1 ? 1 : 0,
                              borderBottomColor: '#F1F5F9',
                              backgroundColor: pressed ? '#F0FDF4' : '#FFFFFF',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            })}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{s}</Text>
                            <MaterialIcons name="add-circle-outline" size={16} color="#16A34A" />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(switchingId || creatingWorkspace)}
                onPress={() => {
                  if (verifyModalProfile) {
                    void handleConfirmOrCreateFromModal(
                      verifyModalProfile,
                      editName,
                      editCategory,
                      offerings
                    );
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#15803D' : '#16A34A',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: switchingId || creatingWorkspace ? 0.7 : 1,
                })}
              >
                {switchingId || creatingWorkspace ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                      Saving &amp; Activating Profile…
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    {verifyModalProfile && boundProfileId && boundProfileId !== verifyModalProfile.id
                      ? 'Create Workspace & Activate'
                      : 'Confirm & Set Active Profile'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={Boolean(switchingId || creatingWorkspace)}
                onPress={() => {
                  if (verifyModalProfile) {
                    if (boundProfileId && boundProfileId !== verifyModalProfile.id) {
                      void handleCreateSeparateWorkspace({
                        businessName: verifyModalProfile.name,
                        profileId: verifyModalProfile.id,
                        category: verifyModalProfile.category || null,
                      });
                    } else {
                      void handleQuickSelect(verifyModalProfile);
                    }
                  }
                }}
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>
                  Quick Select (Keep Default Category)
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Dedicated Business Workspace Modal */}
      <Modal
        visible={newWorkspaceModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNewWorkspaceModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                Add Business Workspace
              </Text>
              <Pressable onPress={() => setNewWorkspaceModalOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12.5, color: '#64748B', lineHeight: 18 }}>
              Each business runs in an isolated workspace with its own Google location, public card URL (/b/...), auto-trained AI chatbot, CRM leads, and subscription (starts Free).
            </Text>

            <View style={{ gap: 10 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Business Name *</Text>
                <TextInput
                  value={newWorkspaceName}
                  onChangeText={setNewWorkspaceName}
                  placeholder="e.g. Royal Unisex Salon"
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                  }}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Category</Text>
                <TextInput
                  value={newWorkspaceCategory}
                  onChangeText={setNewWorkspaceCategory}
                  placeholder="e.g. Hair Salon, Dental Clinic, Plumber"
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                  }}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>City</Text>
                <TextInput
                  value={newWorkspaceCity}
                  onChangeText={setNewWorkspaceCity}
                  placeholder="e.g. Patna, Noida, Austin"
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                  }}
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!newWorkspaceName.trim() || creatingWorkspace}
              onPress={() =>
                void handleCreateSeparateWorkspace({
                  businessName: newWorkspaceName.trim(),
                  category: newWorkspaceCategory.trim() || null,
                  city: newWorkspaceCity.trim() || null,
                })
              }
              style={{
                backgroundColor: !newWorkspaceName.trim() || creatingWorkspace ? '#94A3B8' : '#16A34A',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                {creatingWorkspace ? 'Creating Business Workspace...' : 'Create Free Business Workspace'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
