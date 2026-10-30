import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResource } from '../../hooks/use-resource';
import { useAuthStore } from '../../stores/auth-store';
import { enablePush, isPushPermissionGranted, unregisterPush } from '../../lib/push';
import { getBgosWebUrl } from '../../lib/bgos-urls';
import { WEB_URL } from '../../lib/constants';
import type { BgosWorkspace } from '../../types/bgos-contracts';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 320);

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ visible, onClose }: SidebarDrawerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, deleteAccount, user } = useAuthStore();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushChecking, setPushChecking] = useState(false);

  React.useEffect(() => {
    if (visible) {
      void isPushPermissionGranted().then(setPushEnabled);
    }
  }, [visible]);

  const data = workspace.data;
  const businessName = data?.name || user?.name || 'My Business';
  const email = user?.email || '';
  const initial = businessName.charAt(0).toUpperCase() || 'M';

  function navigate(route: string) {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  }

  async function handleTogglePush(next: boolean) {
    setPushChecking(true);
    try {
      if (next) {
        const res = await enablePush();
        setPushEnabled(res.success);
        if (!res.success) Alert.alert('Notifications', res.message);
      } else {
        await unregisterPush();
        setPushEnabled(false);
      }
    } finally {
      setPushChecking(false);
    }
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
          onPress: async () => {
            onClose();
            await deleteAccount();
            router.replace('/login');
          },
        },
      ]
    );
  }

  function absolute(path: string) {
    if (path.startsWith('https://')) return path;
    if (path.startsWith('/app')) {
      const match = path.match(/[?&]view=([^&]+)/);
      return getBgosWebUrl(match ? match[1] : undefined);
    }
    return `${WEB_URL}${path}`;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.55)' }}>
        {/* Drawer Panel covering ~75% width */}
        <View
          style={{
            width: DRAWER_WIDTH,
            backgroundColor: '#FFFFFF',
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            shadowColor: '#000',
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 16,
          }}
        >
          {/* Top Header Card */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              onPress={() => navigate('/select-profile')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: '#4F46E5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                  {businessName}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                  {email}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Menu"
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="close" size={18} color="#64748B" />
            </Pressable>
          </View>

          {/* Scrollable Menu Items */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 18 }}
          >
            {/* GOOGLE GROWTH & BRAND BRAIN */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 }}>
                GROWTH & BRAND COCKPIT
              </Text>
              <DrawerItem
                icon="psychology"
                title="Brand Brain"
                subtitle="Products, tone & business story"
                onPress={() => navigate('/preferences')}
              />
              <DrawerItem
                icon="storefront"
                title="Manage Profile"
                subtitle="Edit GBP hours, description & photos"
                onPress={() => navigate('/manage-profile')}
              />
              <DrawerItem
                icon="qr-code-2"
                title="QR Standee Studio"
                subtitle="Printable review table-top standees"
                onPress={() => navigate('/qr-standee')}
              />
              <DrawerItem
                icon="picture-as-pdf"
                title="Growth Report"
                subtitle="Executive monthly PDF performance"
                onPress={() => navigate('/growth-report')}
              />
            </View>

            {/* COMMUNICATIONS & SALES */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 }}>
                COMMUNICATIONS & SALES
              </Text>
              <DrawerItem
                icon="chat"
                title="Unified Inbox & Chat"
                subtitle="WhatsApp, SMS & web radar"
                onPress={() => navigate('/(tabs)/inbox')}
              />
              <DrawerItem
                icon="phone"
                title="Business Phone & Keypad"
                subtitle="Dialpad, call logs & transcripts"
                onPress={() => navigate('/(tabs)/phone')}
              />
              <DrawerItem
                icon="people-outline"
                title="Leads & CRM Pipeline"
                subtitle="Lead stages & follow-ups"
                onPress={() => navigate('/(tabs)/leads')}
              />
              <DrawerItem
                icon="event"
                title="Appointments Calendar"
                subtitle="Bookings & agenda"
                onPress={() => navigate('/(tabs)/appointments')}
              />
              <DrawerItem
                icon="description"
                title="Form Inquiries & Surveys"
                subtitle="Customer intake submissions"
                onPress={() => navigate('/(tabs)/submissions')}
              />
            </View>

            {/* AI & AUTOMATION */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 }}>
                AI & AUTOMATION
              </Text>
              <DrawerItem
                icon="smart-toy"
                title="AI Assistant Studio"
                subtitle="Bot agents & prompt lab"
                onPress={() => navigate('/(tabs)/agents')}
              />
              <DrawerItem
                icon="link"
                title="Channel Integrations"
                subtitle="Connected messaging & accounts"
                onPress={() => navigate('/(tabs)/integrations')}
              />
            </View>

            {/* DIGITAL IDENTITY */}
            {data?.links && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 }}>
                  DIGITAL IDENTITY
                </Text>
                {data.links.profile && (
                  <DrawerItem
                    icon="badge"
                    title="Digital Business Card"
                    subtitle="Share online profile link"
                    onPress={() => {
                      onClose();
                      void Share.share({ message: absolute(data.links.profile!) });
                    }}
                  />
                )}
                {data.links.booking && (
                  <DrawerItem
                    icon="event-available"
                    title="Booking Page"
                    subtitle="Share direct booking link"
                    onPress={() => {
                      onClose();
                      void Share.share({ message: absolute(data.links.booking!) });
                    }}
                  />
                )}
              </View>
            )}

            {/* NOTIFICATIONS SETTINGS */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 }}>
                PREFERENCES
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#EEF2FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="notifications-none" size={18} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                      Push Notifications
                    </Text>
                    <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                      {pushEnabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pushEnabled}
                  disabled={pushChecking}
                  onValueChange={handleTogglePush}
                  trackColor={{ false: '#CBD5E1', true: '#4F46E5' }}
                />
              </View>

              <DrawerItem
                icon="switch-account"
                title="Switch Business Profile"
                subtitle="Choose active Google listing"
                onPress={() => navigate('/select-profile')}
              />
            </View>

            {/* ACCOUNT & LOGOUT */}
            <View style={{ gap: 6, paddingTop: 4 }}>
              <DrawerItem
                icon="logout"
                title="Log Out"
                subtitle="Sign out of this session"
                danger
                onPress={async () => {
                  onClose();
                  await logout();
                  router.replace('/login');
                }}
              />
              <DrawerItem
                icon="delete-outline"
                title="Delete Account"
                subtitle="Permanently erase workspace"
                danger
                onPress={confirmDeleteAccount}
              />
            </View>
          </ScrollView>
        </View>

        {/* Backdrop overlay covering the rest of the screen */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss Menu"
          onPress={onClose}
          style={{ flex: 1 }}
        />
      </View>
    </Modal>
  );
}

function DrawerItem({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: danger ? '#FEF2F2' : '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={17} color={danger ? '#DC2626' : '#334155'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: danger ? '#DC2626' : '#0F172A' }}>
          {title}
        </Text>
        <Text style={{ fontSize: 10.5, color: '#64748B' }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={16} color="#CBD5E1" />
    </Pressable>
  );
}
