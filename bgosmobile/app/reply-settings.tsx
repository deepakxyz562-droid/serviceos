import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { Screen, colors } from '../src/components/ui';

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

interface ReplySettingsResponse {
  accountName: string;
  email: string;
  replies24hCount: number;
  category: '3-5' | '1-2';
  replyLength: 'ultra-short' | 'short' | 'medium' | 'long';
  replyLanguage: string;
  sampleReplies: {
    positive: string;
    critical: string;
  };
}

const LENGTH_STOPS: Array<{ id: 'ultra-short' | 'short' | 'medium' | 'long'; label: string }> = [
  { id: 'ultra-short', label: 'Ultra Short' },
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
];

export default function ReplySettingsScreen() {
  const router = useRouter();
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');
  const settingsRes = useResource<ReplySettingsResponse>('/api/gbp/reply-settings');

  const [category, setCategory] = useState<'3-5' | '1-2'>('3-5');
  const [lengthIndex, setLengthIndex] = useState(1); // 'short'
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');
  const [langSearch, setLangSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (settingsRes.data) {
      if (settingsRes.data.category) setCategory(settingsRes.data.category);
      if (settingsRes.data.replyLength) {
        const idx = LENGTH_STOPS.findIndex((s) => s.id === settingsRes.data?.replyLength);
        if (idx >= 0) setLengthIndex(idx);
      }
      if (settingsRes.data.replyLanguage === 'Hindi') setLanguage('Hindi');
      else setLanguage('English');
    }
  }, [settingsRes.data]);

  const activeProfile = discover.data?.activeProfile;
  const shortId = activeProfile?.shortId || '';
  const phone = discover.data?.phone || '';
  const version = discover.data?.version || 'v2.83';

  const accountName = settingsRes.data?.accountName || activeProfile?.name || 'My Business';
  const email = settingsRes.data?.email || discover.data?.email || '';
  const repliesCount = settingsRes.data?.replies24hCount ?? 0;

  const currentLength = LENGTH_STOPS[lengthIndex].id;

  const sampleReply =
    category === '3-5'
      ? settingsRes.data?.sampleReplies?.positive ||
        "Thank you so much for your kind words! 😊 We're really glad you had a great experience with our team. Looking forward to seeing you again soon!"
      : settingsRes.data?.sampleReplies?.critical ||
        "Dear customer, We're deeply sorry to hear about your experience. We understand how frustrating this must be, and we take customer satisfaction very seriously. Please reach out to our support team so we can assist you directly.";

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    try {
      await apiRequest('/api/gbp/reply-settings', {
        method: 'POST',
        body: {
          category,
          replyLength: currentLength,
          replyLanguage: language,
        },
      });
      setNotice('✓ Settings saved successfully');
      setTimeout(() => setNotice(null), 3000);
      await settingsRes.refresh();
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to save reply settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Reply Settings"
      subtitle={`${phone} | ${shortId.replace('#', '')} | ${version}`}
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.push('/(tabs)/reviews');
      }}
      rightAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save Reply Settings"
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#CBD5E1',
            backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF',
            opacity: saving ? 0.6 : 1,
          })}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>Save</Text>
          )}
        </Pressable>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingBottom: 40 }}>
        {notice ? (
          <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' }}>
            <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13 }}>{notice}</Text>
          </View>
        ) : null}

        {/* ── ACCOUNT SECTION ── */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 }}>
            ACCOUNT
          </Text>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#2563EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                  {accountName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                  {accountName}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }} numberOfLines={1}>
                  {email}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: '#FCE7F3',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 14,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#BE185D' }}>
                {repliesCount} replies in 24 hours
              </Text>
            </View>
          </View>
        </View>

        {/* ── SELECT REPLY CATEGORY ── */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 }}>
            SELECT REPLY CATEGORY
          </Text>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F1F5F9',
              borderRadius: 12,
              padding: 4,
            }}
          >
            <Pressable
              onPress={() => setCategory('3-5')}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 9,
                backgroundColor: category === '3-5' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: category === '3-5' ? 0.08 : 0,
                shadowRadius: 2,
                elevation: category === '3-5' ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: category === '3-5' ? '800' : '600',
                  color: category === '3-5' ? '#0F172A' : '#64748B',
                }}
              >
                3-5 Stars
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCategory('1-2')}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 9,
                backgroundColor: category === '1-2' ? '#FFFFFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: category === '1-2' ? 0.08 : 0,
                shadowRadius: 2,
                elevation: category === '1-2' ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: category === '1-2' ? '800' : '600',
                  color: category === '1-2' ? '#0F172A' : '#64748B',
                }}
              >
                1-2 Stars
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── SAMPLE REPLY BOX ── */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 }}>
            SAMPLE REPLY
          </Text>
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderLeftWidth: 4,
              borderLeftColor: '#E11D48',
            }}
          >
            <Text style={{ fontSize: 13.5, lineHeight: 21, color: '#1E293B', fontWeight: '500' }}>
              {sampleReply}
            </Text>
          </View>
        </View>

        {/* ── REPLY SETTINGS ── */}
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 }}>
            REPLY SETTINGS
          </Text>

          {/* Reply Length Slider */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Reply Length</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              How long AI replies should be for {category === '3-5' ? '3-5' : '1-2'} star reviews
            </Text>

            {/* Custom Track & Thumb Slider */}
            <View style={{ paddingVertical: 12, paddingHorizontal: 10 }}>
              <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, position: 'relative' }}>
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: `${(lengthIndex / 3) * 100}%`,
                    height: 4,
                    backgroundColor: '#0F172A',
                    borderRadius: 2,
                  }}
                />
                {/* Thumb */}
                <View
                  style={{
                    position: 'absolute',
                    left: `${(lengthIndex / 3) * 100}%`,
                    marginLeft: -10,
                    top: -8,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#0F172A',
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 4,
                  }}
                />
              </View>

              {/* Labels clickable */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                {LENGTH_STOPS.map((stop, idx) => (
                  <Pressable
                    key={stop.id}
                    onPress={() => setLengthIndex(idx)}
                    style={{ alignItems: 'center' }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: lengthIndex === idx ? '800' : '500',
                        color: lengthIndex === idx ? '#0F172A' : '#94A3B8',
                      }}
                    >
                      {stop.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Reply Language */}
          <View style={{ gap: 10, marginTop: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Reply Language</Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setLanguage('English')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderWidth: 1.5,
                  borderColor: language === 'English' ? '#0F172A' : '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>English</Text>
                <MaterialIcons
                  name={language === 'English' ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={language === 'English' ? '#0F172A' : '#CBD5E1'}
                />
              </Pressable>

              <Pressable
                onPress={() => setLanguage('Hindi')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderWidth: 1.5,
                  borderColor: language === 'Hindi' ? '#0F172A' : '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Hindi</Text>
                <MaterialIcons
                  name={language === 'Hindi' ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={language === 'Hindi' ? '#0F172A' : '#CBD5E1'}
                />
              </Pressable>
            </View>

            {/* Search Language Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                paddingHorizontal: 12,
                marginTop: 4,
              }}
            >
              <TextInput
                placeholder="Search Language"
                placeholderTextColor="#94A3B8"
                value={langSearch}
                onChangeText={setLangSearch}
                style={{ flex: 1, paddingVertical: 12, fontSize: 13.5, color: '#0F172A' }}
              />
              <MaterialIcons name="search" size={20} color="#94A3B8" />
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
