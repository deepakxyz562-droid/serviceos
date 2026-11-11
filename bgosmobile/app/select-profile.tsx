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

const CATEGORY_SUGGESTIONS = [
  'Grocery & Supermarket',
  'Retail & Department Store',
  'Bakery & Cake Shop',
  'Restaurant & Cafe',
  'Hardware & Tools',
  'Paint & Home Decor',
  'Fashion & Boutique',
  'Farmhouse & Resort',
  'Clinic & Healthcare',
  'Software & IT Services',
];

function inferCategoryFromName(name: string, fallbackCategory?: string): string {
  if (fallbackCategory && !/corporate|holding|community centre/i.test(fallbackCategory)) {
    return fallbackCategory;
  }
  const n = name.toLowerCase();
  if (/(market|grocery|supermarket|mart|kirana|retail|store|bazaar|provisions)/i.test(n)) {
    return 'Grocery & Supermarket';
  }
  if (/(bakery|cake|pastry|mithai|sweet)/i.test(n)) {
    return 'Bakery & Sweets';
  }
  if (/(hardware|tool|pipe|sanitary|plywood)/i.test(n)) {
    return 'Hardware & Tools';
  }
  if (/(paint|color|wall decor)/i.test(n)) {
    return 'Paint & Home Decor';
  }
  if (/(pool|farmhouse|resort|villa|cottage|homestay)/i.test(n)) {
    return 'Farmhouse & Resort';
  }
  if (/(restaurant|cafe|dining|bistro|kitchen)/i.test(n)) {
    return 'Restaurant & Cafe';
  }
  if (/(fashion|boutique|clothing|saree|garment)/i.test(n)) {
    return 'Fashion & Boutique';
  }
  if (fallbackCategory) return fallbackCategory;
  return 'Retail & Local Services';
}

function getSuggestedOfferings(category: string, name: string): string[] {
  const c = `${category} ${name}`.toLowerCase();
  if (/(market|grocery|supermarket|mart|kirana|retail)/i.test(c)) {
    return ['Fresh Produce', 'Daily Groceries', 'Packaged Food', 'Household Essentials'];
  }
  if (/(bakery|cake|pastry|sweet)/i.test(c)) {
    return ['Designer Celebration Cakes', 'Fresh Pastries', 'Handcrafted Cookies', 'Custom Birthday Orders'];
  }
  if (/(hardware|tool|pipe)/i.test(c)) {
    return ['Power Tools', 'Plumbing Fixtures', 'Fasteners & Screws', 'Electrical Supplies'];
  }
  if (/(paint|color|decor)/i.test(c)) {
    return ['Interior Wall Emulsion', 'Exterior Weatherproof Coat', 'Texture Finishes', 'Waterproofing'];
  }
  if (/(pool|farmhouse|resort|villa)/i.test(c)) {
    return ['Private Villa Stay', 'Swimming Pool Access', 'Lawn Event Booking', 'Family Day Outing'];
  }
  if (/(restaurant|cafe|dining)/i.test(c)) {
    return ['Dine-in Service', 'Specialty Coffee', 'Takeaway Orders', 'Party Catering'];
  }
  if (/(fashion|boutique|saree)/i.test(c)) {
    return ['Designer Sarees', 'Bridal Wear', 'Custom Tailoring', 'Festive Collection'];
  }
  return ['In-Store Shopping', 'Home Delivery', 'Customer Support', 'Consultation'];
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

  const profiles = discover.data?.profiles || [];
  const activeId = discover.data?.activeProfileId || profiles[0]?.id || '';
  const email = discover.data?.email || '';
  const phone = discover.data?.phone || '';
  const version = discover.data?.version || 'BGOS v2.0';
  const isConnected = Boolean(discover.data?.hasConnectedGbp || profiles.length > 0);

  function handleCardPress(p: GbpProfile) {
    const cat = inferCategoryFromName(p.name, p.category);
    setVerifyModalProfile(p);
    setEditName(p.name);
    setEditCategory(cat);
    setOfferings(getSuggestedOfferings(cat, p.name));
    setCustomTagInput('');
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
    const cat = inferCategoryFromName(p.name, p.category);
    const defaults = getSuggestedOfferings(cat, p.name);
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
            profiles.map((p, idx) => {
              const isSelected = p.id === activeId;
              const isSwitching = switchingId === p.id;
              const colorScheme = AVATAR_COLORS[p.initial] || { bg: '#F1F5F9', text: '#0F172A' };
              const inferredCat = inferCategoryFromName(p.name, p.category);

              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => handleCardPress(p)}
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
                          {inferredCat}
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
                  ) : (
                    <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Connection Action Section */}
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
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Business Category
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Tap to select or type</Text>
                </View>
                <TextInput
                  value={editCategory}
                  onChangeText={setEditCategory}
                  placeholder="e.g. Grocery & Supermarket"
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
                {/* Category Chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {CATEGORY_SUGGESTIONS.map((cat) => {
                    const isCatSelected = editCategory.toLowerCase() === cat.toLowerCase();
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => {
                          setEditCategory(cat);
                          setOfferings(getSuggestedOfferings(cat, editName));
                        }}
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

              {/* 3. Products & Services */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                  Key Products &amp; Services
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  AI generates photorealistic visuals and captions tailored to these items:
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
                </View>

                {/* Add Tag Input */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TextInput
                    value={customTagInput}
                    onChangeText={setCustomTagInput}
                    placeholder="Add custom product or service..."
                    placeholderTextColor="#94A3B8"
                    onSubmitEditing={() => {
                      const trimmed = customTagInput.trim();
                      if (trimmed && !offerings.includes(trimmed)) {
                        setOfferings([...offerings, trimmed]);
                        setCustomTagInput('');
                      }
                    }}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
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
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(switchingId)}
                onPress={() => {
                  if (verifyModalProfile) {
                    void handleConfirmProfile(
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
                  opacity: switchingId ? 0.7 : 1,
                })}
              >
                {switchingId ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                      Saving &amp; Activating Profile…
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    Confirm &amp; Set Active Profile
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={Boolean(switchingId)}
                onPress={() => {
                  if (verifyModalProfile) {
                    void handleQuickSelect(verifyModalProfile);
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
    </Screen>
  );
}
