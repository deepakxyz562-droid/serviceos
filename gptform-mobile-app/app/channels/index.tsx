import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_PATHS } from '@/lib/constants';
import { apiRequest } from '@/lib/api';

interface ChannelItem {
  id: string;
  name: string;
  category: string;
  description: string;
  iconName: string;
  iconType: 'fa' | 'fa5' | 'ionicons';
  color: string;
  connected: boolean;
  statusText: string;
  route?: string;
}

export default function ChannelsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [liveConfigs, setLiveConfigs] = useState<any[]>([]);

  useEffect(() => {
    apiRequest<any[]>(API_PATHS.channels)
      .then((data) => {
        if (Array.isArray(data)) {
          setLiveConfigs(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isChannelConnected = (type: string) => {
    const found = liveConfigs.find((c) => c.type === type || c.channel === type);
    return found ? !!found.connected || found.status === 'active' : false;
  };

  const channels: ChannelItem[] = [
    {
      id: 'website',
      name: 'Website Chat Widget',
      category: 'WEB',
      description: 'Embed floating live chat & AI assistant widget onto WordPress, Shopify, Wix, or custom websites.',
      iconName: 'globe-outline',
      iconType: 'ionicons',
      color: '#0284C7',
      connected: isChannelConnected('website'),
      statusText: isChannelConnected('website') ? 'Active & Ready to Embed' : 'Embed script ready',
      route: '/channels/website',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      category: 'MESSAGING',
      description: 'Receive and reply to customer WhatsApp messages automatically with 24/7 AI employee.',
      iconName: 'whatsapp',
      iconType: 'fa',
      color: '#25D366',
      connected: isChannelConnected('whatsapp'),
      statusText: isChannelConnected('whatsapp') ? 'Connected & Listening' : 'Connect via Cloud API or Phone',
      route: '/channels/whatsapp',
    },
    {
      id: 'instagram',
      name: 'Instagram Direct',
      category: 'SOCIAL',
      description: 'Turn Instagram followers, story replies, and DM inquiries into qualified leads and bookings automatically.',
      iconName: 'instagram',
      iconType: 'fa',
      color: '#E1306C',
      connected: isChannelConnected('instagram'),
      statusText: isChannelConnected('instagram') ? 'Active on Direct Messages' : 'Connect Professional Account',
      route: '/channels/instagram',
    },
    {
      id: 'messenger',
      name: 'Facebook Messenger',
      category: 'SOCIAL',
      description: 'Instantly respond to inquiries on your Facebook Business Page with automated qualification.',
      iconName: 'facebook-messenger',
      iconType: 'fa5',
      color: '#0084FF',
      connected: isChannelConnected('messenger'),
      statusText: isChannelConnected('messenger') ? 'Active on Facebook Page' : 'Connect Facebook Page',
      route: '/channels/messenger',
    },
    {
      id: 'voice',
      name: 'AI Voice Receptionist',
      category: 'VOICE & PHONE',
      description: '24/7 autonomous phone answering, call screening, and calendar appointment booking.',
      iconName: 'call-outline',
      iconType: 'ionicons',
      color: '#8B5CF6',
      connected: true,
      statusText: 'Dedicated Inbound Answering',
      route: '/receptionist',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Channels & Integrations</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Intro Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconCircle}>
              <Ionicons name="layers-outline" size={22} color="#10B981" />
            </View>
            <Text style={styles.bannerTitle}>Omnichannel AI Hub</Text>
          </View>
          <Text style={styles.bannerDesc}>
            Connect your customer touchpoints. When a customer reaches out via Website, WhatsApp, Instagram, or Phone, your trained AI agent answers instantly and captures leads in your mobile inbox.
          </Text>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>AVAILABLE CHANNELS</Text>
          {loading && <ActivityIndicator size="small" color="#10B981" />}
        </View>

        {/* Channels List */}
        {channels.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            style={styles.channelCard}
            onPress={() => {
              hapticFeedback.light();
              if (channel.route) {
                router.push(channel.route as any);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconWrapper, { backgroundColor: `${channel.color}15` }]}>
                {channel.iconType === 'fa' && (
                  <FontAwesome name={channel.iconName as any} size={24} color={channel.color} />
                )}
                {channel.iconType === 'fa5' && (
                  <FontAwesome5 name={channel.iconName as any} size={22} color={channel.color} />
                )}
                {channel.iconType === 'ionicons' && (
                  <Ionicons name={channel.iconName as any} size={24} color={channel.color} />
                )}
              </View>

              <View style={styles.channelMeta}>
                <View style={styles.nameStatusRow}>
                  <Text style={styles.channelName}>{channel.name}</Text>
                  {channel.connected ? (
                    <View style={styles.connectedBadge}>
                      <View style={styles.greenDot} />
                      <Text style={styles.connectedText}>Connected</Text>
                    </View>
                  ) : (
                    <View style={styles.connectActionBadge}>
                      <Text style={styles.connectActionText}>Setup</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.channelCategory}>{channel.category}</Text>
              </View>
            </View>

            <Text style={styles.channelDesc}>{channel.description}</Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.statusText, channel.connected && styles.activeStatusText]}>
                {channel.statusText}
              </Text>
              <View style={styles.manageRow}>
                <Text style={styles.manageText}>{channel.connected ? 'Manage' : 'Configure'}</Text>
                <Ionicons name="chevron-forward" size={16} color="#0F172A" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  channelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelMeta: {
    flex: 1,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  connectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  connectActionBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  connectActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  channelCategory: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  channelDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  activeStatusText: {
    color: '#059669',
    fontWeight: '600',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
});
