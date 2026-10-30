import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';

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

  const profiles = discover.data?.profiles || [];
  const activeId = discover.data?.activeProfileId || profiles[0]?.id || '';
  const email = discover.data?.email || '';
  const phone = discover.data?.phone || '';
  const version = discover.data?.version || 'v2.83';

  async function handleSelectProfile(p: GbpProfile) {
    if (switchingId) return;
    setSwitchingId(p.id);
    try {
      await apiRequest('/api/gbp/accounts/discover', {
        method: 'POST',
        body: { profileId: p.id },
      });
      await discover.refresh();
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

  return (
    <Screen
      title="Select profile"
      subtitle={`${phone} | ${version}`}
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)');
      }}
      onRefresh={discover.refresh}
    >
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 32 }}>
        {/* Email Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <MaterialIcons name="check-circle" size={18} color="#2563EB" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
            {email}
          </Text>
          <View
            style={{
              backgroundColor: '#E2E8F0',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
              {profiles.length}
            </Text>
          </View>
        </View>

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
          {profiles.map((p, idx) => {
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
          })}
        </View>

        {/* Connect with Google Button (Screenshot 6) */}
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Alert.alert(
                'Add Google Account',
                'Connecting an additional Google account will discover all Business Profiles linked to that email.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Connect', onPress: () => router.push('/(tabs)/growth') },
                ]
              );
            }}
            style={({ pressed }) => ({
              width: '100%',
              height: 50,
              borderRadius: 14,
              overflow: 'hidden',
              opacity: pressed ? 0.9 : 1,
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
            </View>
          </Pressable>
          <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>
            Use Google to add more emails
          </Text>
        </View>

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
              Dhanda AI connects to Google Business Only
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
              It can't read your Emails
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
              It is 100% Safe & Secure
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
        </View>
      </ScrollView>
    </Screen>
  );
}
