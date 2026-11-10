import { invalidateResourceScope } from '../src/lib/resource-cache';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
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

  const profiles = discover.data?.profiles || [];
  const activeId = discover.data?.activeProfileId || profiles[0]?.id || '';
  const email = discover.data?.email || '';
  const phone = discover.data?.phone || '';
  const version = discover.data?.version || 'BGOS v2.0';
  const isConnected = Boolean(discover.data?.hasConnectedGbp || profiles.length > 0);

  async function handleSelectProfile(p: GbpProfile) {
    if (switchingId) return;
    setSwitchingId(p.id);
    try {
      await apiRequest('/api/gbp/accounts/discover', {
        method: 'POST',
        body: { profileId: p.id },
      });
      invalidateResourceScope();
      Alert.alert('Profile Switched', `Active profile is now ${p.name} (${p.shortId})`, [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack?.()) router.back();
            else router.replace('/(tabs)');
          },
        },
      ]);
    } catch (err: unknown) {
      Alert.alert('Switch Failed', (err as Error).message || 'Could not switch profile.');
    } finally {
      setSwitchingId(null);
    }
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

              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => handleSelectProfile(p)}
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
                    <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 2, fontWeight: '500' }}>
                      {p.shortId}
                    </Text>
                  </View>

                  {/* Indicator / Spinner / Chevron */}
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
                      <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
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
    </Screen>
  );
}
